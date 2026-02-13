# Chat-with-Fundamentals SDK Specification

> End-to-end spec for turning the current "chat + data" platform into a
> survivorship-bias-free, self-improving quantitative research & trading SDK.

---

## 0. Glossary

| Term | Definition |
|------|-----------|
| **Universe** | A set of tickers + their OHLCV/fundamental data stored in a per-universe Postgres DB |
| **Strategy** | A user-defined Python class that emits orders on each rebalance |
| **Backtest** | An event-driven simulation that feeds historical bars to a Strategy |
| **Paper** | An ArXiv paper whose methodology is extracted and turned into a Strategy |
| **Memory** | A persistent key-value + vector store that agents read/write between sessions |
| **Runner** | A live execution engine that connects a Strategy to TWS (Interactive Brokers) |
| **Loop** | The self-improvement cycle: backtest → evaluate → learn → mutate → repeat |

---

## 1. Survivorship-Bias-Free Universe

### 1.1 Problem

The current `universe_populator.py` only ingests *currently listed* tickers
(via EODHD screener or ETF holdings).  Strategies trained on this universe
suffer survivorship bias because delisted companies (bankruptcies, take-privates,
M&A) are invisible.

### 1.2 Existing Code to Leverage

| File | What it gives us |
|------|-----------------|
| `tools/eodhd_client/exchange_data.py` → `get_exchange_symbols(exchange, delisted=1)` | Full symbol list including delisted tickers |
| `tools/eodhd_client/exchange_data.py` → `get_delisted_symbols(exchange, from_date, to_date)` | Delisted symbols with delisting date & reason |
| `tools/eodhd_client/historical_data.py` → `get_eod(symbol)` | OHLCV for any symbol (active or delisted) |
| `database/models/universe_registry.py` → `UniverseTicker` | Already has `ticker`, `ohlcv_status`, `fundamentals_status` |

### 1.3 Schema Changes

**`universe_tickers` table — add columns:**

```sql
ALTER TABLE universe_tickers
  ADD COLUMN is_delisted        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN delisted_date      DATE,
  ADD COLUMN delisting_reason   VARCHAR(200),
  ADD COLUMN last_traded_price  FLOAT;
```

**`universes` table — add column:**

```sql
ALTER TABLE universes
  ADD COLUMN include_delisted   BOOLEAN NOT NULL DEFAULT TRUE;
```

### 1.4 Implementation

**File:** `ingestion/universe_populator.py`

Add a new function called after the primary ticker screen:

```python
async def _fetch_delisted_tickers(
    client: EODHDClient,
    from_date: str,
    to_date: str,
) -> list[dict]:
    """Fetch US delisted tickers within the universe date range."""
    raw = await asyncio.to_thread(
        client.exchange.get_delisted_symbols,
        "US",
        from_date=from_date,
        to_date=to_date,
    )
    _wait_for_rate_limit()
    return [
        {
            "code": r["Code"],
            "name": r.get("Name", ""),
            "delisted_date": r.get("Delisting_Date"),
            "delisting_reason": r.get("Description", ""),
        }
        for r in raw
        if r.get("Code")
    ]
```

Wire into `populate_universe()` after step 3 (insert active tickers):

```python
if universe.include_delisted:
    delisted = await _fetch_delisted_tickers(client, from_date_str, to_date_str)
    async with db_manager.get_registry_session() as session:
        for d in delisted:
            ut = UniverseTicker(
                universe_id=universe_id,
                ticker=d["code"],
                company_name=d["name"],
                is_delisted=True,
                delisted_date=d.get("delisted_date"),
                delisting_reason=d.get("delisting_reason"),
            )
            session.add(ut)
    # Append delisted tickers to the ingestion list
    screened.extend(delisted)
```

The OHLCV ingestion loop (step 4) already processes every item in `screened`,
so delisted tickers get their historical price data ingested identically.

### 1.5 Backtest Integration

When the backtest engine loads the universe, it must:

1. Include delisted tickers in the price panel.
2. On the bar where `timestamp > delisted_date`, set price to `last_traded_price`
   and mark the position as force-closed (simulating a real delisting event).
3. This prevents look-ahead bias: the strategy can hold a stock that later gets
   delisted, and the backtest correctly penalizes it.

---

## 2. Strategy Base Class

### 2.1 Location

```
backend/strategies/base.py
backend/strategies/__init__.py
```

### 2.2 Interface

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class Order:
    """A single order emitted by a strategy."""
    ticker: str
    side: str              # "buy" | "sell"
    quantity: float        # shares (fractional OK)
    order_type: str = "market"  # "market" | "limit"
    limit_price: Optional[float] = None
    reason: str = ""       # free-text rationale for logging


@dataclass
class PortfolioState:
    """Read-only snapshot passed to the strategy on each rebalance."""
    timestamp: datetime
    cash: float
    equity: float                          # cash + sum(positions * price)
    positions: dict[str, float]            # ticker → shares held
    prices: dict[str, float]               # ticker → current close price
    fundamentals: dict[str, dict]          # ticker → latest fundamental row (dict)
    bar_data: "pd.DataFrame"               # full OHLCV panel for the universe up to `timestamp`


class Strategy(ABC):
    """Base class for all strategies."""

    name: str = "Unnamed Strategy"
    rebalance_frequency: str = "monthly"   # "daily" | "weekly" | "monthly" | "quarterly"
    max_positions: int = 30
    position_size_method: str = "equal_weight"  # "equal_weight" | "risk_parity" | "custom"

    def __init__(self, params: dict | None = None):
        self.params = params or {}

    @abstractmethod
    def rebalance(self, state: PortfolioState) -> list[Order]:
        """
        Called on each rebalance date.

        Receives the current portfolio state (positions, prices, fundamentals,
        full historical bar data up to this point).

        Returns a list of Order objects. The backtest engine will execute them
        at the *next bar's open* to avoid look-ahead bias.
        """
        ...

    def on_start(self, state: PortfolioState) -> None:
        """Optional hook called once at the start of the backtest."""
        pass

    def on_end(self, state: PortfolioState) -> None:
        """Optional hook called once at the end of the backtest."""
        pass

    # ---- Convenience helpers (not abstract) ----

    def buy(self, ticker: str, quantity: float, reason: str = "") -> Order:
        return Order(ticker=ticker, side="buy", quantity=quantity, reason=reason)

    def sell(self, ticker: str, quantity: float, reason: str = "") -> Order:
        return Order(ticker=ticker, side="sell", quantity=quantity, reason=reason)

    def target_weights(
        self, weights: dict[str, float], state: PortfolioState
    ) -> list[Order]:
        """
        Convenience: given target portfolio weights {ticker: 0.05, ...},
        compute the trades needed to rebalance from current positions.
        Weights must sum to <= 1.0 (remainder stays in cash).
        """
        orders = []
        total_equity = state.equity
        for ticker, target_w in weights.items():
            target_value = total_equity * target_w
            current_shares = state.positions.get(ticker, 0)
            current_price = state.prices.get(ticker)
            if current_price is None or current_price <= 0:
                continue
            current_value = current_shares * current_price
            diff_value = target_value - current_value
            diff_shares = diff_value / current_price
            if abs(diff_shares) < 0.01:
                continue
            if diff_shares > 0:
                orders.append(self.buy(ticker, diff_shares))
            else:
                orders.append(self.sell(ticker, abs(diff_shares)))
        # Close positions not in target weights
        for ticker, shares in state.positions.items():
            if ticker not in weights and shares > 0:
                orders.append(self.sell(ticker, shares, reason="not in target"))
        return orders
```

### 2.3 Example Strategy

```python
# backend/strategies/examples/value_momentum.py

from strategies.base import Strategy, PortfolioState, Order
import numpy as np

class ValueMomentum(Strategy):
    name = "Value + Momentum Combo"
    rebalance_frequency = "monthly"
    max_positions = 20

    def rebalance(self, state: PortfolioState) -> list[Order]:
        scores = {}
        for ticker, fund in state.fundamentals.items():
            pe = fund.get("pe_ratio")
            price = state.prices.get(ticker)
            if pe is None or pe <= 0 or price is None:
                continue
            # Value: inverse PE z-score (computed later)
            value_score = 1.0 / pe
            # Momentum: 6-month return
            hist = state.bar_data[state.bar_data["ticker"] == ticker]
            if len(hist) < 126:
                continue
            mom = hist["close"].iloc[-1] / hist["close"].iloc[-126] - 1
            scores[ticker] = 0.5 * value_score + 0.5 * mom

        # Rank and pick top N
        ranked = sorted(scores, key=scores.get, reverse=True)[:self.max_positions]
        weights = {t: 1.0 / len(ranked) for t in ranked}
        return self.target_weights(weights, state)
```

---

## 3. Backtest Engine

### 3.1 Location

```
backend/backtest/engine.py
backend/backtest/metrics.py
backend/backtest/models.py
```

### 3.2 Data Flow

```
Universe DB (OHLCV + Fundamentals)
        │
        ▼
   ┌─────────┐      ┌──────────┐      ┌───────────┐
   │  Loader  │─────▶│  Engine   │─────▶│  Metrics  │
   └─────────┘      └──────────┘      └───────────┘
                          │
                     Strategy.rebalance()
```

### 3.3 Engine Interface

```python
# backend/backtest/engine.py

from dataclasses import dataclass
from datetime import date
from typing import Optional
import pandas as pd

from strategies.base import Strategy, PortfolioState, Order


@dataclass
class BacktestConfig:
    universe_db_name: str
    start_date: date
    end_date: date
    initial_capital: float = 1_000_000.0
    commission_bps: float = 5.0         # 5 basis points per trade
    slippage_bps: float = 5.0           # 5 basis points slippage
    margin_requirement: float = 1.0     # 1.0 = no leverage
    rebalance_frequency: str = "monthly"  # override strategy default if set
    benchmark_ticker: Optional[str] = "SPY"


@dataclass
class TradeRecord:
    timestamp: pd.Timestamp
    ticker: str
    side: str
    quantity: float
    price: float             # execution price (with slippage)
    commission: float
    reason: str


@dataclass
class BacktestResult:
    config: BacktestConfig
    strategy_name: str
    equity_curve: pd.Series          # date → portfolio value
    benchmark_curve: pd.Series       # date → benchmark value (if benchmark_ticker set)
    trades: list[TradeRecord]
    daily_returns: pd.Series
    metrics: dict                    # populated by metrics.py
    positions_over_time: pd.DataFrame  # date × ticker → shares


class BacktestEngine:
    """Event-driven backtest engine."""

    def __init__(self, config: BacktestConfig):
        self.config = config
        self._cash: float = config.initial_capital
        self._positions: dict[str, float] = {}
        self._trades: list[TradeRecord] = []
        self._equity_curve: list[tuple] = []

    async def run(self, strategy: Strategy) -> BacktestResult:
        """
        Main loop:
        1. Load universe OHLCV + fundamentals from the universe DB.
        2. Build a date index of rebalance dates.
        3. For each trading day:
           a. Update prices (mark-to-market).
           b. Handle delistings (force-close positions).
           c. If rebalance date: call strategy.rebalance(state).
           d. Execute orders at *next bar's open* with slippage + commission.
           e. Record equity.
        4. Compute metrics.
        """
        ohlcv, fundamentals = await self._load_data()
        dates = ohlcv[ohlcv["granularity"] == "d"]["timestamp"].sort_values().unique()

        rebalance_dates = self._compute_rebalance_dates(dates)

        strategy.on_start(self._build_state(dates[0], ohlcv, fundamentals))

        pending_orders: list[Order] = []

        for i, dt in enumerate(dates):
            prices = self._get_prices_at(ohlcv, dt)
            self._handle_delistings(dt, prices)

            # Execute pending orders at today's open
            if pending_orders:
                opens = self._get_opens_at(ohlcv, dt)
                self._execute_orders(pending_orders, opens, dt)
                pending_orders = []

            # Record equity
            equity = self._mark_to_market(prices)
            self._equity_curve.append((dt, equity))

            # Rebalance?
            if dt in rebalance_dates:
                state = self._build_state(dt, ohlcv, fundamentals)
                pending_orders = strategy.rebalance(state)

        strategy.on_end(self._build_state(dates[-1], ohlcv, fundamentals))

        return self._build_result(strategy, ohlcv)

    def _execute_orders(
        self, orders: list[Order], opens: dict[str, float], dt
    ) -> None:
        """Fill orders at open price with slippage and commission."""
        for order in orders:
            raw_price = opens.get(order.ticker)
            if raw_price is None or raw_price <= 0:
                continue  # skip unfillable

            # Apply slippage
            slip = raw_price * (self.config.slippage_bps / 10_000)
            fill_price = raw_price + slip if order.side == "buy" else raw_price - slip

            cost = order.quantity * fill_price
            commission = cost * (self.config.commission_bps / 10_000)

            if order.side == "buy":
                if self._cash < cost + commission:
                    continue  # insufficient cash
                self._cash -= cost + commission
                self._positions[order.ticker] = (
                    self._positions.get(order.ticker, 0) + order.quantity
                )
            else:
                held = self._positions.get(order.ticker, 0)
                actual_qty = min(order.quantity, held)
                if actual_qty <= 0:
                    continue
                self._cash += actual_qty * fill_price - commission
                self._positions[order.ticker] = held - actual_qty
                if self._positions[order.ticker] <= 0:
                    del self._positions[order.ticker]

            self._trades.append(TradeRecord(
                timestamp=dt,
                ticker=order.ticker,
                side=order.side,
                quantity=order.quantity,
                price=fill_price,
                commission=commission,
                reason=order.reason,
            ))

    async def _load_data(self) -> tuple[pd.DataFrame, pd.DataFrame]:
        """Load OHLCV and fundamentals from the universe database."""
        from database.universe_db_manager import db_manager
        db_name = self.config.universe_db_name
        async with db_manager.get_universe_session(db_name) as session:
            ohlcv_result = await session.execute(
                text(
                    "SELECT * FROM ohlcv WHERE granularity = 'd' "
                    "AND timestamp BETWEEN :start AND :end "
                    "ORDER BY ticker, timestamp"
                ),
                {"start": self.config.start_date, "end": self.config.end_date},
            )
            ohlcv = pd.DataFrame(ohlcv_result.fetchall(), columns=ohlcv_result.keys())

            fund_result = await session.execute(
                text("SELECT * FROM fundamentals ORDER BY ticker, date")
            )
            fundamentals = pd.DataFrame(fund_result.fetchall(), columns=fund_result.keys())

        return ohlcv, fundamentals
```

### 3.4 Metrics Module

```python
# backend/backtest/metrics.py

import numpy as np
import pandas as pd


def compute_metrics(
    equity_curve: pd.Series,
    benchmark_curve: pd.Series | None,
    trades: list,
    risk_free_rate: float = 0.04,
) -> dict:
    """Compute standard quant performance metrics."""
    returns = equity_curve.pct_change().dropna()
    trading_days = 252

    total_return = equity_curve.iloc[-1] / equity_curve.iloc[0] - 1
    n_years = len(returns) / trading_days
    cagr = (1 + total_return) ** (1 / max(n_years, 0.01)) - 1
    vol = returns.std() * np.sqrt(trading_days)
    sharpe = (cagr - risk_free_rate) / vol if vol > 0 else 0

    # Max drawdown
    cummax = equity_curve.cummax()
    drawdown = (equity_curve - cummax) / cummax
    max_drawdown = drawdown.min()
    calmar = cagr / abs(max_drawdown) if max_drawdown != 0 else 0

    # Sortino
    downside = returns[returns < 0].std() * np.sqrt(trading_days)
    sortino = (cagr - risk_free_rate) / downside if downside > 0 else 0

    # Win rate
    trade_pnls = _compute_trade_pnls(trades)
    win_rate = sum(1 for p in trade_pnls if p > 0) / max(len(trade_pnls), 1)
    profit_factor = (
        sum(p for p in trade_pnls if p > 0) / abs(sum(p for p in trade_pnls if p < 0))
        if any(p < 0 for p in trade_pnls)
        else float("inf")
    )

    result = {
        "total_return": round(total_return, 4),
        "cagr": round(cagr, 4),
        "volatility": round(vol, 4),
        "sharpe_ratio": round(sharpe, 2),
        "sortino_ratio": round(sortino, 2),
        "max_drawdown": round(max_drawdown, 4),
        "calmar_ratio": round(calmar, 2),
        "win_rate": round(win_rate, 4),
        "profit_factor": round(profit_factor, 2),
        "total_trades": len(trades),
        "avg_trade_pnl": round(np.mean(trade_pnls), 2) if trade_pnls else 0,
    }

    if benchmark_curve is not None:
        bench_returns = benchmark_curve.pct_change().dropna()
        aligned = pd.concat([returns, bench_returns], axis=1).dropna()
        if len(aligned) > 10:
            beta = aligned.iloc[:, 0].cov(aligned.iloc[:, 1]) / aligned.iloc[:, 1].var()
            alpha = cagr - (risk_free_rate + beta * (
                bench_returns.mean() * trading_days - risk_free_rate
            ))
            result["alpha"] = round(alpha, 4)
            result["beta"] = round(beta, 2)
            result["information_ratio"] = round(
                (returns - bench_returns).mean() / (returns - bench_returns).std()
                * np.sqrt(trading_days),
                2,
            )

    return result
```

---

## 4. ArXiv Paper Pipeline

### 4.1 Location

```
backend/research/arxiv_pipeline.py
backend/research/paper_parser.py
backend/research/strategy_generator.py
```

### 4.2 Data Flow

```
ArXiv API  ──search()──▶  Paper list
                              │
                         fetch(id)
                              │
                              ▼
                        PDF / abstract
                              │
                    extract_methodology()
                              │
                              ▼
                   Structured methodology JSON
                              │
                    generate_strategy()
                              │
                              ▼
                   Strategy subclass (Python code)
                              │
                       backtest + evaluate
```

### 4.3 Interface

```python
# backend/research/arxiv_pipeline.py

import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime


@dataclass
class ArxivPaper:
    arxiv_id: str
    title: str
    authors: list[str]
    abstract: str
    published: datetime
    pdf_url: str
    categories: list[str]


def search(
    query: str,
    max_results: int = 20,
    sort_by: str = "relevance",  # "relevance" | "lastUpdatedDate" | "submittedDate"
) -> list[ArxivPaper]:
    """
    Search ArXiv for quantitative finance papers.

    Examples:
        search("momentum factor cross-section")
        search("machine learning stock prediction")
        search("value investing fundamental analysis")
    """
    params = {
        "search_query": f"cat:q-fin.* AND ({query})",
        "start": 0,
        "max_results": max_results,
        "sortBy": sort_by,
        "sortOrder": "descending",
    }
    url = "http://export.arxiv.org/api/query?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=30) as resp:
        root = ET.fromstring(resp.read())

    ns = {"atom": "http://www.w3.org/2005/Atom"}
    papers = []
    for entry in root.findall("atom:entry", ns):
        papers.append(ArxivPaper(
            arxiv_id=entry.find("atom:id", ns).text.split("/abs/")[-1],
            title=entry.find("atom:title", ns).text.strip(),
            authors=[a.find("atom:name", ns).text for a in entry.findall("atom:author", ns)],
            abstract=entry.find("atom:summary", ns).text.strip(),
            published=datetime.fromisoformat(
                entry.find("atom:published", ns).text.replace("Z", "+00:00")
            ),
            pdf_url=next(
                (l.attrib["href"] for l in entry.findall("atom:link", ns)
                 if l.attrib.get("title") == "pdf"),
                "",
            ),
            categories=[c.attrib["term"] for c in entry.findall("atom:category", ns)],
        ))
    return papers


def fetch(arxiv_id: str) -> ArxivPaper:
    """Fetch a single paper by its ArXiv ID."""
    results = search(f"id:{arxiv_id}", max_results=1)
    if not results:
        raise ValueError(f"Paper not found: {arxiv_id}")
    return results[0]
```

### 4.4 Methodology Extraction

```python
# backend/research/paper_parser.py

from agents.llm.router import llm_router

EXTRACT_METHODOLOGY_PROMPT = """You are a quantitative finance researcher.
Given a paper's title and abstract, extract a structured methodology that
can be implemented as a trading strategy.

Return a JSON object with:
{
  "strategy_type": "momentum | value | quality | statistical_arbitrage | ml | multi_factor",
  "universe": "description of the stock universe used",
  "signals": [
    {"name": "signal_name", "formula": "how to compute it", "data_needed": "ohlcv | fundamentals | both"}
  ],
  "portfolio_construction": "equal_weight | risk_parity | optimization | custom",
  "rebalance_frequency": "daily | weekly | monthly | quarterly",
  "risk_management": "description of any risk controls mentioned",
  "lookback_periods": {"signal_name": "N days/months"},
  "key_findings": "one-sentence summary of the paper's main result",
  "implementability_score": 1-5  // 5 = easily implementable with OHLCV+fundamentals
}

If the paper is too theoretical or requires data we don't have, set
implementability_score to 1-2 and explain in key_findings."""


async def extract_methodology(paper: "ArxivPaper") -> dict:
    """Use LLM to extract implementable methodology from a paper."""
    user_msg = f"Title: {paper.title}\n\nAbstract: {paper.abstract}"
    result = await llm_router.chat(
        system_prompt=EXTRACT_METHODOLOGY_PROMPT,
        user_message=user_msg,
        temperature=0.0,
        max_tokens=2048,
    )
    # Parse JSON from response (reuse pipeline._extract_json)
    from agents.pipeline import _extract_json
    parsed = _extract_json(result.content)
    if not parsed:
        return {"error": "Failed to parse methodology", "raw": result.content[:500]}
    return parsed
```

### 4.5 Strategy Generation

```python
# backend/research/strategy_generator.py

from agents.llm.router import llm_router

GENERATE_STRATEGY_PROMPT = """You are a quantitative developer.
Given a structured methodology extracted from a research paper, write a
Python Strategy subclass.

The strategy MUST:
1. Inherit from `strategies.base.Strategy`
2. Implement `rebalance(self, state: PortfolioState) -> list[Order]`
3. Only use data available in `state.prices`, `state.fundamentals`, and `state.bar_data`
4. Use `self.target_weights(weights, state)` or `self.buy()`/`self.sell()` helpers
5. Handle missing data gracefully (skip tickers with NaN)

Available columns in state.fundamentals[ticker]:
  pe_ratio, pb_ratio, ps_ratio, roe, roa, roic, gross_margin, operating_margin,
  net_margin, revenue_growth_yoy, earnings_growth_yoy, debt_to_equity,
  current_ratio, free_cash_flow, market_cap, ev_ebitda, dividend_yield

Available columns in state.bar_data:
  ticker, timestamp, open, high, low, close, volume, adjusted_close

Return ONLY valid Python code. No markdown fencing. No explanation."""


async def generate_strategy(methodology: dict, paper_title: str) -> str:
    """Generate a Strategy subclass from an extracted methodology."""
    import json
    user_msg = (
        f"Paper: {paper_title}\n\n"
        f"Methodology:\n{json.dumps(methodology, indent=2)}"
    )
    result = await llm_router.chat(
        system_prompt=GENERATE_STRATEGY_PROMPT,
        user_message=user_msg,
        temperature=0.1,
        max_tokens=4096,
    )
    code = result.content.strip()
    # Strip markdown fences if present
    if code.startswith("```"):
        lines = code.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        code = "\n".join(lines)
    return code
```

---

## 5. Agent Memory

### 5.1 Location

```
backend/memory/store.py
backend/memory/models.py
```

### 5.2 Schema

**New table in the registry database:**

```sql
CREATE TABLE agent_memory (
    id            SERIAL PRIMARY KEY,
    category      VARCHAR(50)  NOT NULL,  -- 'strategy_result', 'paper', 'learning', 'user_pref'
    key           VARCHAR(200) NOT NULL,
    value         JSONB        NOT NULL,
    embedding     VECTOR(1536),           -- pgvector; nullable if no embedding needed
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW(),
    expires_at    TIMESTAMP,              -- optional TTL
    UNIQUE(category, key)
);

CREATE INDEX idx_memory_category ON agent_memory(category);
CREATE INDEX idx_memory_embedding ON agent_memory USING ivfflat (embedding vector_cosine_ops);
```

### 5.3 Interface

```python
# backend/memory/store.py

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
import json

from sqlalchemy import text
from database.universe_db_manager import db_manager


@dataclass
class MemoryEntry:
    category: str
    key: str
    value: dict
    created_at: datetime
    updated_at: datetime


class MemoryStore:
    """Persistent structured knowledge store for agents."""

    async def put(self, category: str, key: str, value: dict) -> None:
        """Insert or update a memory entry."""
        async with db_manager.get_registry_session() as session:
            await session.execute(
                text("""
                    INSERT INTO agent_memory (category, key, value, updated_at)
                    VALUES (:cat, :key, :val, NOW())
                    ON CONFLICT (category, key)
                    DO UPDATE SET value = :val, updated_at = NOW()
                """),
                {"cat": category, "key": key, "val": json.dumps(value)},
            )

    async def get(self, category: str, key: str) -> Optional[MemoryEntry]:
        """Retrieve a single memory entry."""
        async with db_manager.get_registry_session() as session:
            result = await session.execute(
                text("SELECT * FROM agent_memory WHERE category = :cat AND key = :key"),
                {"cat": category, "key": key},
            )
            row = result.fetchone()
            if not row:
                return None
            return MemoryEntry(
                category=row.category,
                key=row.key,
                value=row.value,
                created_at=row.created_at,
                updated_at=row.updated_at,
            )

    async def list_by_category(self, category: str, limit: int = 50) -> list[MemoryEntry]:
        """List all entries in a category, newest first."""
        async with db_manager.get_registry_session() as session:
            result = await session.execute(
                text(
                    "SELECT * FROM agent_memory WHERE category = :cat "
                    "ORDER BY updated_at DESC LIMIT :lim"
                ),
                {"cat": category, "lim": limit},
            )
            return [
                MemoryEntry(
                    category=row.category,
                    key=row.key,
                    value=row.value,
                    created_at=row.created_at,
                    updated_at=row.updated_at,
                )
                for row in result.fetchall()
            ]

    async def search_similar(
        self, embedding: list[float], category: str = None, limit: int = 10
    ) -> list[MemoryEntry]:
        """Semantic search via pgvector cosine similarity."""
        where = "WHERE embedding IS NOT NULL"
        params = {"emb": str(embedding), "lim": limit}
        if category:
            where += " AND category = :cat"
            params["cat"] = category
        async with db_manager.get_registry_session() as session:
            result = await session.execute(
                text(
                    f"SELECT *, embedding <=> :emb AS distance FROM agent_memory "
                    f"{where} ORDER BY distance LIMIT :lim"
                ),
                params,
            )
            return [
                MemoryEntry(
                    category=row.category,
                    key=row.key,
                    value=row.value,
                    created_at=row.created_at,
                    updated_at=row.updated_at,
                )
                for row in result.fetchall()
            ]

    async def delete(self, category: str, key: str) -> None:
        """Delete a memory entry."""
        async with db_manager.get_registry_session() as session:
            await session.execute(
                text("DELETE FROM agent_memory WHERE category = :cat AND key = :key"),
                {"cat": category, "key": key},
            )


# Singleton
memory = MemoryStore()
```

### 5.4 Memory Categories

| Category | Key pattern | Value schema |
|----------|-------------|-------------|
| `strategy_result` | `{strategy_name}_{date}` | `{sharpe, cagr, max_dd, trades, config}` |
| `paper` | `arxiv_{id}` | `{title, methodology, implementability, generated_strategy}` |
| `learning` | `{strategy}_{iteration}` | `{what_worked, what_failed, mutation_applied, before_sharpe, after_sharpe}` |
| `user_pref` | `{setting_name}` | Any JSON |

---

## 6. TWS Live Runner

### 6.1 Location

```
backend/live/tws_runner.py
backend/live/ib_wrapper.py
backend/live/models.py
```

### 6.2 Dependencies

```
ibapi>=9.81.1  # Official Interactive Brokers TWS API
```

### 6.3 Interface

```python
# backend/live/tws_runner.py

import asyncio
import logging
from datetime import datetime, time as dt_time
from typing import Optional

from ibapi.client import EClient
from ibapi.wrapper import EWrapper
from ibapi.contract import Contract
from ibapi.order import Order as IBOrder

from strategies.base import Strategy, PortfolioState

logger = logging.getLogger(__name__)


class IBWrapper(EWrapper):
    """Receives callbacks from TWS."""

    def __init__(self):
        super().__init__()
        self.positions: dict[str, float] = {}
        self.prices: dict[str, float] = {}
        self.account_value: float = 0.0
        self.cash: float = 0.0
        self._order_id: int = 0
        self._pending_orders: dict[int, asyncio.Future] = {}

    def nextValidId(self, orderId: int):
        self._order_id = orderId

    def position(self, account, contract, pos, avgCost):
        if pos != 0:
            self.positions[contract.symbol] = pos
        elif contract.symbol in self.positions:
            del self.positions[contract.symbol]

    def tickPrice(self, reqId, tickType, price, attrib):
        # tickType 4 = last price
        if tickType == 4 and price > 0:
            self.prices[self._ticker_for_req(reqId)] = price

    def orderStatus(self, orderId, status, filled, remaining, *args):
        if status in ("Filled", "Cancelled", "Error"):
            fut = self._pending_orders.pop(orderId, None)
            if fut and not fut.done():
                fut.set_result(status)


class IBClient(EClient):
    """Sends requests to TWS."""

    def __init__(self, wrapper: IBWrapper):
        super().__init__(wrapper)


class TWSRunner:
    """
    Connects a Strategy to Interactive Brokers TWS for live/paper trading.

    Usage:
        runner = TWSRunner(
            strategy=my_strategy,
            host="127.0.0.1",
            port=7497,          # 7497=paper, 7496=live
            client_id=1,
        )
        await runner.start()
    """

    def __init__(
        self,
        strategy: Strategy,
        host: str = "127.0.0.1",
        port: int = 7497,
        client_id: int = 1,
        universe_db_name: str = None,
        rebalance_time: dt_time = dt_time(9, 35),  # 9:35 AM ET
    ):
        self.strategy = strategy
        self.host = host
        self.port = port
        self.client_id = client_id
        self.universe_db_name = universe_db_name
        self.rebalance_time = rebalance_time

        self.wrapper = IBWrapper()
        self.client = IBClient(self.wrapper)
        self._running = False

    async def start(self) -> None:
        """Connect to TWS and start the rebalance loop."""
        self.client.connect(self.host, self.port, self.client_id)

        # Run the IB message loop in a background thread
        import threading
        thread = threading.Thread(target=self.client.run, daemon=True)
        thread.start()

        # Wait for connection
        await asyncio.sleep(2)
        self.client.reqPositions()
        self._running = True

        logger.info(
            f"TWSRunner started: strategy={self.strategy.name}, "
            f"port={self.port}, rebalance_time={self.rebalance_time}"
        )

        # Main loop
        while self._running:
            now = datetime.now()
            if self._is_rebalance_time(now):
                await self._rebalance()
                # Sleep until next day
                await asyncio.sleep(60 * 60)
            else:
                await asyncio.sleep(30)

    async def stop(self) -> None:
        """Disconnect from TWS."""
        self._running = False
        self.client.disconnect()
        logger.info("TWSRunner stopped")

    async def _rebalance(self) -> None:
        """Execute a single rebalance cycle."""
        logger.info("Starting rebalance...")

        state = await self._build_state()
        orders = self.strategy.rebalance(state)

        logger.info(f"Strategy emitted {len(orders)} orders")

        for order in orders:
            await self._submit_order(order)

    async def _submit_order(self, order) -> str:
        """Submit an order to TWS and wait for fill."""
        contract = Contract()
        contract.symbol = order.ticker
        contract.secType = "STK"
        contract.exchange = "SMART"
        contract.currency = "USD"

        ib_order = IBOrder()
        ib_order.action = "BUY" if order.side == "buy" else "SELL"
        ib_order.totalQuantity = int(order.quantity)
        ib_order.orderType = "MKT" if order.order_type == "market" else "LMT"
        if order.order_type == "limit":
            ib_order.lmtPrice = order.limit_price

        order_id = self.wrapper._order_id
        self.wrapper._order_id += 1

        fut = asyncio.get_event_loop().create_future()
        self.wrapper._pending_orders[order_id] = fut
        self.client.placeOrder(order_id, contract, ib_order)

        try:
            status = await asyncio.wait_for(fut, timeout=30)
            logger.info(f"Order {order.ticker} {order.side} {order.quantity}: {status}")
            return status
        except asyncio.TimeoutError:
            logger.warning(f"Order timeout: {order.ticker}")
            return "Timeout"

    async def _build_state(self) -> PortfolioState:
        """Build PortfolioState from live TWS data + universe DB."""
        import pandas as pd
        from database.universe_db_manager import db_manager
        from sqlalchemy import text

        # Get fundamentals from universe DB if configured
        fundamentals = {}
        bar_data = pd.DataFrame()
        if self.universe_db_name:
            async with db_manager.get_universe_session(self.universe_db_name) as session:
                result = await session.execute(text(
                    "SELECT DISTINCT ON (ticker) * FROM fundamentals "
                    "ORDER BY ticker, date DESC"
                ))
                for row in result.fetchall():
                    fundamentals[row.ticker] = dict(row._mapping)

                ohlcv_result = await session.execute(text(
                    "SELECT * FROM ohlcv WHERE granularity = 'd' "
                    "ORDER BY ticker, timestamp"
                ))
                bar_data = pd.DataFrame(
                    ohlcv_result.fetchall(), columns=ohlcv_result.keys()
                )

        return PortfolioState(
            timestamp=datetime.now(),
            cash=self.wrapper.cash,
            equity=self.wrapper.account_value,
            positions=dict(self.wrapper.positions),
            prices=dict(self.wrapper.prices),
            fundamentals=fundamentals,
            bar_data=bar_data,
        )

    def _is_rebalance_time(self, now: datetime) -> bool:
        """Check if current time matches the rebalance schedule."""
        if now.weekday() >= 5:  # Skip weekends
            return False
        return (
            now.hour == self.rebalance_time.hour
            and now.minute == self.rebalance_time.minute
        )
```

---

## 7. Self-Improvement Loop

### 7.1 Location

```
backend/loop/improver.py
backend/loop/mutator.py
```

### 7.2 Data Flow

```
                    ┌──────────────────────────────────────────┐
                    │           Self-Improvement Loop          │
                    │                                          │
  ┌─────────┐      │  ┌──────────┐  ┌──────────┐  ┌────────┐ │
  │  Memory  │◀────▶│  │ Evaluate │──│  Mutate  │──│Backtest│ │
  └─────────┘      │  └──────────┘  └──────────┘  └────────┘ │
                    │       │              ▲             │     │
                    │       └──────────────┘─────────────┘     │
                    │                                          │
                    └──────────────────────────────────────────┘
```

### 7.3 Interface

```python
# backend/loop/improver.py

import logging
from datetime import date
from typing import Optional

from backtest.engine import BacktestEngine, BacktestConfig, BacktestResult
from memory.store import memory
from strategies.base import Strategy

logger = logging.getLogger(__name__)


class StrategyImprover:
    """
    Runs a self-improvement loop:
    1. Backtest the current strategy.
    2. Evaluate results against thresholds.
    3. If underperforming, ask LLM to mutate the strategy.
    4. Backtest the mutated version.
    5. Keep the better version, store learnings in memory.
    6. Repeat up to max_iterations.
    """

    def __init__(
        self,
        strategy: Strategy,
        universe_db_name: str,
        start_date: date,
        end_date: date,
        max_iterations: int = 10,
        min_sharpe: float = 0.5,
        min_cagr: float = 0.05,
        max_drawdown: float = -0.25,
    ):
        self.strategy = strategy
        self.universe_db_name = universe_db_name
        self.start_date = start_date
        self.end_date = end_date
        self.max_iterations = max_iterations
        self.min_sharpe = min_sharpe
        self.min_cagr = min_cagr
        self.max_drawdown = max_drawdown

    async def run(self) -> dict:
        """Run the full improvement loop. Returns final metrics + history."""
        best_strategy = self.strategy
        best_result = await self._backtest(best_strategy)
        best_metrics = best_result.metrics

        history = [{"iteration": 0, "metrics": best_metrics, "mutation": None}]

        await memory.put("strategy_result", f"{best_strategy.name}_iter0", best_metrics)

        for i in range(1, self.max_iterations + 1):
            logger.info(
                f"Improvement iteration {i}/{self.max_iterations} — "
                f"current Sharpe={best_metrics.get('sharpe_ratio', 0)}"
            )

            # Check if we've met all targets
            if self._meets_targets(best_metrics):
                logger.info("All targets met, stopping early.")
                break

            # Load past learnings to inform mutation
            learnings = await memory.list_by_category("learning", limit=20)

            # Mutate
            mutated_code, mutation_desc = await self._mutate(
                best_strategy, best_metrics, learnings
            )
            if not mutated_code:
                logger.warning("Mutation failed, skipping iteration.")
                continue

            # Load mutated strategy
            mutated_strategy = self._load_strategy_from_code(mutated_code)
            if not mutated_strategy:
                logger.warning("Failed to load mutated strategy.")
                continue

            # Backtest mutated version
            mutated_result = await self._backtest(mutated_strategy)
            mutated_metrics = mutated_result.metrics

            # Compare
            improved = mutated_metrics.get("sharpe_ratio", 0) > best_metrics.get("sharpe_ratio", 0)

            # Store learning
            learning = {
                "iteration": i,
                "mutation": mutation_desc,
                "before_sharpe": best_metrics.get("sharpe_ratio", 0),
                "after_sharpe": mutated_metrics.get("sharpe_ratio", 0),
                "improved": improved,
                "what_worked": mutation_desc if improved else None,
                "what_failed": mutation_desc if not improved else None,
            }
            await memory.put("learning", f"{best_strategy.name}_iter{i}", learning)

            if improved:
                logger.info(
                    f"Improvement found! Sharpe: "
                    f"{best_metrics['sharpe_ratio']} → {mutated_metrics['sharpe_ratio']}"
                )
                best_strategy = mutated_strategy
                best_metrics = mutated_metrics
                best_result = mutated_result

            history.append({
                "iteration": i,
                "metrics": mutated_metrics,
                "mutation": mutation_desc,
                "accepted": improved,
            })

        # Store final result
        await memory.put(
            "strategy_result",
            f"{best_strategy.name}_final",
            best_metrics,
        )

        return {
            "final_metrics": best_metrics,
            "iterations_run": len(history) - 1,
            "history": history,
            "strategy_name": best_strategy.name,
        }

    def _meets_targets(self, metrics: dict) -> bool:
        return (
            metrics.get("sharpe_ratio", 0) >= self.min_sharpe
            and metrics.get("cagr", 0) >= self.min_cagr
            and metrics.get("max_drawdown", -1) >= self.max_drawdown
        )

    async def _backtest(self, strategy: Strategy) -> BacktestResult:
        config = BacktestConfig(
            universe_db_name=self.universe_db_name,
            start_date=self.start_date,
            end_date=self.end_date,
        )
        engine = BacktestEngine(config)
        return await engine.run(strategy)

    async def _mutate(
        self,
        strategy: Strategy,
        metrics: dict,
        learnings: list,
    ) -> tuple[Optional[str], Optional[str]]:
        """Ask LLM to suggest a mutation to the strategy."""
        from loop.mutator import mutate_strategy
        return await mutate_strategy(strategy, metrics, learnings)

    def _load_strategy_from_code(self, code: str) -> Optional[Strategy]:
        """Dynamically load a Strategy subclass from generated code."""
        namespace = {}
        try:
            exec(code, namespace)
        except Exception as e:
            logger.error(f"Failed to exec mutated strategy: {e}")
            return None
        # Find the Strategy subclass in the namespace
        for obj in namespace.values():
            if (
                isinstance(obj, type)
                and issubclass(obj, Strategy)
                and obj is not Strategy
            ):
                return obj()
        return None
```

### 7.4 Mutator

```python
# backend/loop/mutator.py

import json
from typing import Optional
import inspect

from agents.llm.router import llm_router
from strategies.base import Strategy

MUTATE_PROMPT = """You are a quantitative strategy optimizer. Given a strategy's
source code and its backtest metrics, suggest ONE specific improvement.

Rules:
1. Make exactly ONE change (don't rewrite everything).
2. Focus on the weakest metric.
3. If Sharpe is low, adjust signal weights or add a complementary signal.
4. If max drawdown is bad, add a risk filter (e.g., skip rebalance if SPY < 200-day MA).
5. If win rate is low, tighten entry criteria.
6. Learn from past failed mutations (provided as context).

Return ONLY a JSON object:
{
  "description": "one-sentence description of the mutation",
  "code": "complete Python code for the mutated Strategy subclass"
}"""


async def mutate_strategy(
    strategy: Strategy,
    metrics: dict,
    learnings: list,
) -> tuple[Optional[str], Optional[str]]:
    """Ask LLM to mutate a strategy based on metrics and learnings."""
    source = inspect.getsource(strategy.__class__)

    context = f"Current strategy code:\n```python\n{source}\n```\n\n"
    context += f"Backtest metrics:\n{json.dumps(metrics, indent=2)}\n\n"

    if learnings:
        context += "Past mutation learnings:\n"
        for entry in learnings[:10]:
            v = entry.value
            context += (
                f"- Mutation: {v.get('mutation', '?')} → "
                f"{'Improved' if v.get('improved') else 'Failed'} "
                f"(Sharpe {v.get('before_sharpe', '?')} → {v.get('after_sharpe', '?')})\n"
            )

    result = await llm_router.chat(
        system_prompt=MUTATE_PROMPT,
        user_message=context,
        temperature=0.3,
        max_tokens=4096,
    )

    from agents.pipeline import _extract_json
    parsed = _extract_json(result.content)
    if not parsed:
        return None, None

    return parsed.get("code"), parsed.get("description")
```

---

## 8. New Directory Structure

```
backend/
├── agents/           # (existing) LLM pipeline + prompts
├── backtest/         # NEW
│   ├── __init__.py
│   ├── engine.py     # BacktestEngine
│   ├── metrics.py    # compute_metrics()
│   └── models.py     # BacktestConfig, BacktestResult, TradeRecord
├── core/             # (existing) config
├── database/         # (existing) models + DB manager
├── ingestion/        # (existing) universe_populator — modified for delisted tickers
├── live/             # NEW
│   ├── __init__.py
│   ├── tws_runner.py # TWSRunner
│   ├── ib_wrapper.py # IBWrapper, IBClient
│   └── models.py
├── loop/             # NEW
│   ├── __init__.py
│   ├── improver.py   # StrategyImprover
│   └── mutator.py    # mutate_strategy()
├── memory/           # NEW
│   ├── __init__.py
│   ├── store.py      # MemoryStore
│   └── models.py     # agent_memory table model
├── research/         # NEW
│   ├── __init__.py
│   ├── arxiv_pipeline.py    # search(), fetch()
│   ├── paper_parser.py      # extract_methodology()
│   └── strategy_generator.py # generate_strategy()
├── routers/          # (existing) FastAPI routers
├── sandbox/          # (existing) Docker executor
├── services/         # (existing) business logic
├── strategies/       # NEW
│   ├── __init__.py
│   ├── base.py       # Strategy, Order, PortfolioState
│   └── examples/
│       └── value_momentum.py
├── tools/            # (existing) EODHD client
├── main.py
└── requirements.txt  # add: ibapi>=9.81.1, pgvector
```

---

## 9. New API Endpoints

Add to `backend/routers/`:

### 9.1 Backtest Router

```
POST   /api/backtest/run
  body: { strategy_code: str, universe_id: uuid, start_date, end_date, config: {} }
  returns: BacktestResult (equity_curve, metrics, trades)

GET    /api/backtest/{id}
  returns: stored BacktestResult

GET    /api/backtest/history
  returns: list of past backtests with summary metrics
```

### 9.2 Research Router

```
GET    /api/research/search?q=...&max_results=20
  returns: list[ArxivPaper]

POST   /api/research/extract
  body: { arxiv_id: str }
  returns: methodology JSON

POST   /api/research/generate-strategy
  body: { arxiv_id: str }
  returns: { strategy_code: str, methodology: dict }
```

### 9.3 Live Trading Router

```
POST   /api/live/start
  body: { strategy_code: str, universe_id: uuid, port: 7497, paper: true }
  returns: { runner_id: str, status: "connected" }

POST   /api/live/stop
  body: { runner_id: str }

GET    /api/live/status
  returns: { positions, equity, last_rebalance, orders_today }
```

### 9.4 Self-Improvement Router

```
POST   /api/loop/start
  body: { strategy_code: str, universe_id: uuid, max_iterations: 10, targets: {} }
  returns: SSE stream of { iteration, metrics, mutation, accepted }

GET    /api/loop/{id}/result
  returns: final StrategyImprover result
```

---

## 10. Dependencies to Add

```
# requirements.txt additions
ibapi>=9.81.1
pgvector>=0.3.0
```

The pgvector extension must be enabled in the registry database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 11. Implementation Order

| Phase | What | Depends on |
|-------|------|-----------|
| **1** | `strategies/base.py` — Strategy, Order, PortfolioState | Nothing |
| **2** | `backtest/engine.py` + `backtest/metrics.py` | Phase 1 |
| **3** | Survivorship-bias patches to `ingestion/universe_populator.py` | Nothing |
| **4** | `memory/store.py` + migration | Nothing |
| **5** | `research/arxiv_pipeline.py` + `paper_parser.py` + `strategy_generator.py` | Phases 1, 4 |
| **6** | `loop/improver.py` + `loop/mutator.py` | Phases 1, 2, 4 |
| **7** | `live/tws_runner.py` | Phase 1 |
| **8** | API routers for all new modules | All phases |

Phases 1-4 can be parallelized. Phase 5 and 6 depend on 1+2+4.
Phase 7 is independent aside from Phase 1.
