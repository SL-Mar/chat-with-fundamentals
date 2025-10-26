# Implementation Roadmap - Multi-Asset Trading Platform

**Date:** 2025-10-25
**Architecture:** QuantCoderFS-v2 UI/UX + PostgreSQL Database + Multi-Asset Expansion
**Timeline:** 8-10 weeks

---

## Executive Summary

**What We're Building:**
Professional multi-asset trading platform with AI-powered analysis across 5 asset classes:
- Stocks (expand existing)
- Currencies (new)
- ETFs (new)
- Macro (new)
- Portfolios (new)

**Architecture Pattern:**
```
QuantCoderFS-v2 Structure (Module/Tab UI)
    +
PostgreSQL + TimescaleDB (Already Built)
    +
Extensive Backend API (64 → 150+ endpoints)
    +
Comprehensive Frontend Components (22 pages → 5 modules × 11 tabs)
    +
MarketSense AI + Deep Research (All Asset Classes)
```

---

## Module × Tab Matrix

### Complete Feature Grid

| Module | EOD | Intraday | Live | Fundamentals | News | Research | AI Analysis | Peer | Backtest | Alerts | Trading |
|--------|-----|----------|------|--------------|------|----------|-------------|------|----------|--------|---------|
| **Stocks** | ✅ | ✅ | ⭐ | ✅ | ⭐ | ⭐ | ⭐ | ⭐ | Later | Later | Later |
| **Currencies** | ⭐ | ⭐ | ⭐ | N/A | ⭐ | ⭐ | ⭐ | ⭐ | Later | Later | Later |
| **ETFs** | ⭐ | ⭐ | ⭐ | ⭐ | ⭐ | ⭐ | ⭐ | ⭐ | Later | Later | Later |
| **Macro** | ⭐ | N/A | N/A | ⭐ | ⭐ | ⭐ | ⭐ | ⭐ | N/A | Later | N/A |
| **Portfolios** | ⭐ | N/A | ⭐ | ⭐ | N/A | ⭐ | ⭐ | N/A | Later | Later | Later |

**Legend:**
- ✅ Exists (keep/refactor)
- ⭐ New (build)
- N/A (not applicable)
- Later (post-launch)

---

## Backend API Expansion

### Current State: 64 Endpoints
```
/equity/* (6 endpoints)
/technical/* (6 endpoints)
/historical/* (4 endpoints)
/news/* (3 endpoints)
/corporate/* (3 endpoints)
/calendar/* (3 endpoints)
/special/* (9 endpoints)
/macro/* (3 endpoints)
/monitoring/* (12 endpoints)
/admin/* (8 endpoints)
/analyzer/* (2 endpoints)
/quantanalyzer/* (1 endpoint)
/chat/* (1 endpoint)
/settings/llm/* (3 endpoints)
```

### Target State: 150+ Endpoints

#### 1. Stocks Module API (30 endpoints)
```python
# EOD Data
GET  /api/v2/stocks/{ticker}/eod
GET  /api/v2/stocks/{ticker}/eod/range?from={date}&to={date}

# Intraday Data (already built ✅)
GET  /api/v2/stocks/{ticker}/intraday?interval={1m|5m|15m|30m|1h}

# Live Data
GET  /api/v2/stocks/{ticker}/live/quote
GET  /api/v2/stocks/{ticker}/live/orderbook
WS   /ws/stocks/{ticker}/live  # WebSocket for real-time

# Fundamentals (already built ✅)
GET  /api/v2/stocks/{ticker}/fundamentals/balance-sheet
GET  /api/v2/stocks/{ticker}/fundamentals/income-statement
GET  /api/v2/stocks/{ticker}/fundamentals/cash-flow
GET  /api/v2/stocks/{ticker}/fundamentals/ratios
GET  /api/v2/stocks/{ticker}/fundamentals/metrics

# News & Sentiment
GET  /api/v2/stocks/{ticker}/news?limit={n}&offset={n}
GET  /api/v2/stocks/{ticker}/sentiment
GET  /api/v2/stocks/{ticker}/social-mentions

# Deep Research (Tavily)
POST /api/v2/stocks/{ticker}/research
     Body: {"query": "latest developments", "depth": "comprehensive"}
GET  /api/v2/stocks/{ticker}/research/history

# AI Analysis (MarketSense)
POST /api/v2/stocks/{ticker}/ai-analysis
     Body: {"include_deep_research": true}
GET  /api/v2/stocks/{ticker}/ai-analysis/history
GET  /api/v2/stocks/{ticker}/ai-analysis/{analysis_id}
GET  /api/v2/stocks/{ticker}/ai-analysis/{analysis_id}/agents  # Agent outputs

# Peer Comparison
GET  /api/v2/stocks/{ticker}/peers?sector={sector}
GET  /api/v2/stocks/{ticker}/peers/comparison?peers={AAPL,MSFT,GOOGL}

# Technical Analysis
GET  /api/v2/stocks/{ticker}/technical/indicators?indicators={RSI,MACD,BB}
GET  /api/v2/stocks/{ticker}/technical/patterns

# Corporate Actions
GET  /api/v2/stocks/{ticker}/dividends
GET  /api/v2/stocks/{ticker}/splits
GET  /api/v2/stocks/{ticker}/insider-transactions
```

#### 2. Currencies Module API (25 endpoints)
```python
# EOD Data
GET  /api/v2/currencies/{pair}/eod
GET  /api/v2/currencies/{pair}/eod/range?from={date}&to={date}

# Intraday Data
GET  /api/v2/currencies/{pair}/intraday?interval={1m|5m|15m|30m|1h}

# Live Data
GET  /api/v2/currencies/{pair}/live/quote
GET  /api/v2/currencies/{pair}/live/bid-ask
WS   /ws/currencies/{pair}/live

# Economic Calendar
GET  /api/v2/currencies/calendar/events?country={US|EU|UK|JP}
GET  /api/v2/currencies/calendar/central-banks

# News & Sentiment
GET  /api/v2/currencies/{pair}/news
GET  /api/v2/currencies/{pair}/sentiment

# Deep Research (Tavily)
POST /api/v2/currencies/{pair}/research
GET  /api/v2/currencies/{pair}/research/history

# AI Analysis (MarketSense adapted for Forex)
POST /api/v2/currencies/{pair}/ai-analysis
GET  /api/v2/currencies/{pair}/ai-analysis/history

# Peer Comparison (similar pairs)
GET  /api/v2/currencies/{pair}/peers  # e.g., EUR/USD → GBP/USD, USD/JPY

# Technical Analysis
GET  /api/v2/currencies/{pair}/technical/indicators
GET  /api/v2/currencies/{pair}/technical/patterns

# Correlation Analysis
GET  /api/v2/currencies/{pair}/correlation?pairs={EUR/USD,GBP/USD}
```

#### 3. ETFs Module API (28 endpoints)
```python
# EOD Data
GET  /api/v2/etfs/{symbol}/eod
GET  /api/v2/etfs/{symbol}/eod/range

# Intraday Data
GET  /api/v2/etfs/{symbol}/intraday?interval={1m|5m|15m|30m|1h}

# Live Data
GET  /api/v2/etfs/{symbol}/live/quote
WS   /ws/etfs/{symbol}/live

# Holdings Analysis
GET  /api/v2/etfs/{symbol}/holdings
GET  /api/v2/etfs/{symbol}/holdings/sector-allocation
GET  /api/v2/etfs/{symbol}/holdings/top-10
GET  /api/v2/etfs/{symbol}/holdings/concentration

# Fundamentals
GET  /api/v2/etfs/{symbol}/fundamentals
     # expense_ratio, AUM, tracking_error, inception_date, etc.
GET  /api/v2/etfs/{symbol}/performance
     # YTD, 1Y, 3Y, 5Y returns vs benchmark

# News & Sentiment
GET  /api/v2/etfs/{symbol}/news
GET  /api/v2/etfs/{symbol}/sentiment

# Deep Research (Tavily)
POST /api/v2/etfs/{symbol}/research
GET  /api/v2/etfs/{symbol}/research/history

# AI Analysis (MarketSense adapted for ETFs)
POST /api/v2/etfs/{symbol}/ai-analysis
GET  /api/v2/etfs/{symbol}/ai-analysis/history

# Peer Comparison
GET  /api/v2/etfs/{symbol}/peers?category={equity|bond|commodity}
GET  /api/v2/etfs/{symbol}/peers/comparison

# Technical Analysis
GET  /api/v2/etfs/{symbol}/technical/indicators
GET  /api/v2/etfs/{symbol}/technical/patterns

# Index Tracking
GET  /api/v2/etfs/{symbol}/tracking-error
GET  /api/v2/etfs/{symbol}/benchmark-correlation
```

#### 4. Macro Module API (22 endpoints)
```python
# Indicator Data
GET  /api/v2/macro/{indicator}/data?country={US|EU|UK|CN}
GET  /api/v2/macro/{indicator}/data/range?from={date}&to={date}

# Available Indicators
GET  /api/v2/macro/indicators/list?category={gdp|inflation|employment}
GET  /api/v2/macro/indicators/{code}/metadata

# Economic Calendar
GET  /api/v2/macro/calendar/events?country={US}
GET  /api/v2/macro/calendar/upcoming?days={7}

# Cross-Country Comparison
GET  /api/v2/macro/{indicator}/comparison?countries={US,EU,UK,JP}
GET  /api/v2/macro/indicators/correlation

# News & Analysis
GET  /api/v2/macro/news?category={central-banks|trade|policy}
GET  /api/v2/macro/sentiment

# Deep Research (Tavily)
POST /api/v2/macro/{indicator}/research
GET  /api/v2/macro/{indicator}/research/history

# AI Analysis (MarketSense adapted for Macro)
POST /api/v2/macro/{indicator}/ai-analysis
     Body: {"countries": ["US", "EU"], "timeframe": "5Y"}
GET  /api/v2/macro/{indicator}/ai-analysis/history

# Forecasts & Predictions
GET  /api/v2/macro/{indicator}/forecasts?source={fed|ecb|imf}

# Visualization Data
GET  /api/v2/macro/{indicator}/chart-data
GET  /api/v2/macro/{indicator}/heatmap?countries={US,EU,UK,JP}
```

#### 5. Portfolios Module API (30 endpoints)
```python
# Portfolio CRUD
POST   /api/v2/portfolios
       Body: {"name": "Tech Growth", "description": "..."}
GET    /api/v2/portfolios
GET    /api/v2/portfolios/{id}
PATCH  /api/v2/portfolios/{id}
       Body: {"name": "Updated Name"}
DELETE /api/v2/portfolios/{id}

# Holdings Management (Multi-Asset)
POST   /api/v2/portfolios/{id}/holdings
       Body: {"asset_type": "stock|etf|currency", "symbol": "AAPL", "weight": 0.1}
GET    /api/v2/portfolios/{id}/holdings
PATCH  /api/v2/portfolios/{id}/holdings/{holding_id}
DELETE /api/v2/portfolios/{id}/holdings/{holding_id}

# Portfolio Analysis
GET    /api/v2/portfolios/{id}/performance
       Query: ?from={date}&to={date}
GET    /api/v2/portfolios/{id}/returns
       # daily, weekly, monthly returns
GET    /api/v2/portfolios/{id}/risk-metrics
       # volatility, beta, Sharpe, Sortino, max drawdown

# Optimization
POST   /api/v2/portfolios/{id}/optimize
       Body: {"method": "mean_variance|black_litterman|risk_parity|min_variance"}
GET    /api/v2/portfolios/{id}/optimization-history
GET    /api/v2/portfolios/{id}/efficient-frontier

# Risk Analysis
POST   /api/v2/portfolios/{id}/monte-carlo
       Body: {"scenarios": 10000, "horizon_days": 252}
GET    /api/v2/portfolios/{id}/var
       Query: ?confidence={0.95|0.99}
GET    /api/v2/portfolios/{id}/cvar  # Conditional VaR
GET    /api/v2/portfolios/{id}/stress-test
       Body: {"scenario": "2008_crisis|covid_crash|custom"}

# Asset Allocation
GET    /api/v2/portfolios/{id}/allocation/asset-class
GET    /api/v2/portfolios/{id}/allocation/sector
GET    /api/v2/portfolios/{id}/allocation/geography
GET    /api/v2/portfolios/{id}/allocation/currency

# Rebalancing
POST   /api/v2/portfolios/{id}/rebalance
       Body: {"target_weights": {"AAPL": 0.15, "MSFT": 0.12, ...}}
GET    /api/v2/portfolios/{id}/rebalancing-history

# Deep Research (Tavily)
POST   /api/v2/portfolios/{id}/research
       Body: {"query": "portfolio optimization strategies"}
GET    /api/v2/portfolios/{id}/research/history

# AI Analysis (Portfolio-level MarketSense)
POST   /api/v2/portfolios/{id}/ai-analysis
GET    /api/v2/portfolios/{id}/ai-analysis/history

# Benchmark Comparison
GET    /api/v2/portfolios/{id}/benchmark-comparison?benchmark={SPY|QQQ}
```

#### 6. Shared Services API (15 endpoints)
```python
# Agent Console (WebSocket)
WS   /ws/agent-console  # Real-time agent logs

# Market Data (Common)
GET  /api/v2/market/status  # open, closed, pre-market, after-hours
GET  /api/v2/market/hours?exchange={NYSE|NASDAQ}
GET  /api/v2/market/holidays

# Benchmarks (SPY, QQQ, DIA, IWM)
GET  /api/v2/benchmarks
GET  /api/v2/benchmarks/{ticker}/eod
POST /api/v2/benchmarks/{ticker}/sync

# Search & Discovery
GET  /api/v2/search?query={AAPL}&type={stock|etf|currency}
GET  /api/v2/screener?filters={...}

# User Preferences
GET  /api/v2/preferences
PATCH /api/v2/preferences
      Body: {"default_benchmark": "SPY", "chart_theme": "dark"}

# System Health
GET  /api/v2/health
GET  /api/v2/metrics/cache
GET  /api/v2/metrics/database
```

**Total: ~150 endpoints** (30 stocks + 25 currencies + 28 ETFs + 22 macro + 30 portfolios + 15 shared)

---

## Frontend Component Structure

### Component Hierarchy

```
/pages
  /stocks
    index.tsx                    # Stocks module landing (list of projects)
    [ticker].tsx                 # Dynamic ticker page with tabs
  /currencies
    index.tsx                    # Currencies module landing
    [pair].tsx                   # Dynamic pair page with tabs
  /etfs
    index.tsx                    # ETFs module landing
    [symbol].tsx                 # Dynamic ETF page with tabs
  /macro
    index.tsx                    # Macro module landing
    [indicator].tsx              # Dynamic indicator page with tabs
  /portfolios
    index.tsx                    # Portfolios module landing
    [id].tsx                     # Dynamic portfolio page with tabs

/components
  /layout
    Header.tsx                   # Top navigation (5 modules)
    Footer.tsx
    AgentConsole.tsx             # Bottom panel (WebSocket logs)
    AssetSelector.tsx            # Dropdown for ticker/pair/symbol
    TabNavigation.tsx            # Reusable tab component

  /modules
    /stocks
      /tabs
        EODTab.tsx               # EOD chart + data table
        IntradayTab.tsx          # Intraday chart (already exists ✅)
        LiveTab.tsx              # Live quote + order book
        FundamentalsTab.tsx      # Financial statements (already exists ✅)
        NewsTab.tsx              # News feed + sentiment
        ResearchTab.tsx          # Tavily deep research UI
        AIAnalysisTab.tsx        # MarketSense AI results
        PeerComparisonTab.tsx    # Peer comparison charts
      /components
        StockCard.tsx            # Draggable stock card
        FinancialStatementsTable.tsx  # Already exists ✅
        TechnicalIndicatorsPanel.tsx
        DividendsTable.tsx

    /currencies
      /tabs
        EODTab.tsx
        IntradayTab.tsx
        LiveTab.tsx
        EconomicCalendarTab.tsx  # Central bank events
        NewsTab.tsx
        ResearchTab.tsx
        AIAnalysisTab.tsx
        PeerComparisonTab.tsx    # Similar pairs
      /components
        CurrencyPairCard.tsx
        BidAskSpread.tsx
        EconomicEventsTable.tsx

    /etfs
      /tabs
        EODTab.tsx
        IntradayTab.tsx
        LiveTab.tsx
        HoldingsTab.tsx          # ETF holdings breakdown
        FundamentalsTab.tsx      # Expense ratio, AUM, tracking error
        NewsTab.tsx
        ResearchTab.tsx
        AIAnalysisTab.tsx
        PeerComparisonTab.tsx
      /components
        ETFCard.tsx
        HoldingsTable.tsx
        SectorAllocationChart.tsx
        TrackingErrorChart.tsx

    /macro
      /tabs
        IndicatorTab.tsx         # Time-series chart
        CalendarTab.tsx          # Economic calendar
        ComparisonTab.tsx        # Cross-country comparison
        NewsTab.tsx
        ResearchTab.tsx
        AIAnalysisTab.tsx
      /components
        MacroIndicatorCard.tsx
        CountryComparisonChart.tsx
        EconomicEventsTable.tsx
        HeatmapChart.tsx

    /portfolios
      /tabs
        BuilderTab.tsx           # Drag-and-drop portfolio builder
        PerformanceTab.tsx       # Returns, Sharpe, drawdown
        RiskTab.tsx              # VaR, CVaR, Monte Carlo
        OptimizationTab.tsx      # MVO, Black-Litterman
        AllocationTab.tsx        # Asset class, sector, geography
        RebalancingTab.tsx       # Rebalancing simulation
        ResearchTab.tsx
        AIAnalysisTab.tsx
      /components
        PortfolioCard.tsx
        HoldingsDragDrop.tsx
        OptimizationResults.tsx
        MonteCarloChart.tsx
        EfficientFrontier.tsx

  /shared
    /charts
      LightweightChart.tsx       # TradingView candlesticks
      LineChart.tsx
      AreaChart.tsx
      BarChart.tsx
      HeatmapChart.tsx
    /tables
      DataTable.tsx              # Reusable table component
      SortableTable.tsx
    /forms
      TickerInput.tsx
      DateRangePicker.tsx
      FilterPanel.tsx
    /ai
      AgentConsole.tsx           # Real-time agent logs
      AIAnalysisDisplay.tsx      # Format AI analysis results
      DeepResearchDisplay.tsx    # Format Tavily research results
```

**Total: ~80 components** (reusable + module-specific)

---

## MarketSense AI Adaptation

### Core Framework (Asset-Agnostic)

```python
# backend/services/marketsense/framework.py

class MarketSenseAI:
    """
    Multi-agent AI framework adapted for all asset classes.

    Architecture:
    - 5 agents with weighted voting
    - Asset-specific agent implementations
    - WebSocket logging for transparency
    - Deep research integration (Tavily)
    """

    def __init__(self, asset_type: str, asset_id: str):
        self.asset_type = asset_type  # "stock", "currency", "etf", "macro"
        self.asset_id = asset_id       # ticker, pair, symbol, indicator_code

        # Initialize agents based on asset type
        self.agents = self._get_agents_for_asset_type(asset_type)

    def _get_agents_for_asset_type(self, asset_type: str):
        if asset_type == "stock":
            return {
                "fundamentals": StockFundamentalsAgent(weight=0.30),
                "news": StockNewsAgent(weight=0.25),
                "price_dynamics": StockPriceDynamicsAgent(weight=0.25),
                "macro": MacroEnvironmentAgent(weight=0.20),
                "signal_generator": SignalGeneratorAgent()
            }
        elif asset_type == "currency":
            return {
                "economic_factors": CurrencyEconomicAgent(weight=0.30),
                "news": CurrencyNewsAgent(weight=0.25),
                "price_dynamics": CurrencyPriceDynamicsAgent(weight=0.25),
                "macro": MacroEnvironmentAgent(weight=0.20),
                "signal_generator": SignalGeneratorAgent()
            }
        elif asset_type == "etf":
            return {
                "holdings_analysis": ETFHoldingsAgent(weight=0.30),
                "performance": ETFPerformanceAgent(weight=0.25),
                "price_dynamics": ETFPriceDynamicsAgent(weight=0.25),
                "macro": MacroEnvironmentAgent(weight=0.20),
                "signal_generator": SignalGeneratorAgent()
            }
        elif asset_type == "macro":
            return {
                "indicator_analysis": MacroIndicatorAgent(weight=0.30),
                "cross_country": CrossCountryAgent(weight=0.25),
                "trends": MacroTrendsAgent(weight=0.25),
                "policy": PolicyAnalysisAgent(weight=0.20),
                "signal_generator": MacroSignalGeneratorAgent()
            }

    async def analyze(self, deep_research: bool = False, ws_manager = None):
        """
        Run full analysis with all agents.

        Args:
            deep_research: Include Tavily research
            ws_manager: WebSocket manager for real-time logging
        """

        # Step 1: Deep Research (optional)
        research_context = None
        if deep_research:
            await self._log(ws_manager, "research", "progress",
                           f"Starting deep research for {self.asset_id}...")
            research_context = await self._run_deep_research()
            await self._log(ws_manager, "research", "success",
                           "Deep research complete")

        # Step 2: Run all agents in parallel
        agent_results = {}
        tasks = []

        for agent_name, agent in self.agents.items():
            if agent_name == "signal_generator":
                continue  # Run this last

            await self._log(ws_manager, agent_name, "progress",
                           f"Analyzing {self.asset_id}...")
            task = agent.analyze(self.asset_id, research_context)
            tasks.append((agent_name, task))

        # Gather results
        for agent_name, task in tasks:
            result = await task
            agent_results[agent_name] = result
            await self._log(ws_manager, agent_name, "success",
                           f"Score: {result.score}/10")

        # Step 3: Signal generation (master orchestrator)
        await self._log(ws_manager, "signal_generator", "progress",
                       "Synthesizing final signal...")

        signal_agent = self.agents["signal_generator"]
        final_signal = await signal_agent.synthesize(agent_results)

        await self._log(ws_manager, "signal_generator", "success",
                       f"Signal: {final_signal.signal} (confidence: {final_signal.confidence})")

        return final_signal

    async def _run_deep_research(self):
        """Run Tavily deep research"""
        from services.tavily_research import TavilyResearch

        tavily = TavilyResearch()
        query = self._generate_research_query()
        results = await tavily.research(query, depth="comprehensive")
        return results

    def _generate_research_query(self) -> str:
        """Generate Tavily search query based on asset type"""
        if self.asset_type == "stock":
            return f"Latest news and analysis for {self.asset_id} stock"
        elif self.asset_type == "currency":
            return f"Latest developments affecting {self.asset_id} exchange rate"
        elif self.asset_type == "etf":
            return f"Latest news and holdings changes for {self.asset_id} ETF"
        elif self.asset_type == "macro":
            return f"Latest economic data and forecasts for {self.asset_id} indicator"

    async def _log(self, ws_manager, agent: str, status: str, message: str):
        """Emit log to WebSocket"""
        if ws_manager:
            await ws_manager.broadcast({
                "type": "agent_log",
                "agent": agent,
                "status": status,
                "message": message,
                "timestamp": datetime.now().isoformat()
            })
```

### Agent Implementations

```python
# backend/services/marketsense/agents/stock_fundamentals_agent.py

class StockFundamentalsAgent(BaseAgent):
    """Analyzes stock fundamentals (30% weight)"""

    async def analyze(self, ticker: str, research_context: dict = None):
        # Fetch financial data
        fundamentals = await self.fetch_fundamentals(ticker)

        # Compute ratios
        ratios = self.compute_ratios(fundamentals)

        # Score fundamentals (0-10)
        score = self.score_fundamentals(ratios)

        # Generate reasoning
        reasoning = self.generate_reasoning(fundamentals, ratios, score)

        return AgentOutput(
            agent_name="fundamentals",
            score=score,
            reasoning=reasoning,
            weight=0.30
        )

# backend/services/marketsense/agents/currency_economic_agent.py

class CurrencyEconomicAgent(BaseAgent):
    """Analyzes currency economic factors (30% weight)"""

    async def analyze(self, pair: str, research_context: dict = None):
        base, quote = pair.split("/")

        # Fetch economic indicators for both currencies
        base_indicators = await self.fetch_economic_indicators(base)
        quote_indicators = await self.fetch_economic_indicators(quote)

        # Compare interest rates, inflation, GDP
        comparison = self.compare_economies(base_indicators, quote_indicators)

        # Score (0-10)
        score = self.score_currency_strength(comparison)

        # Generate reasoning
        reasoning = self.generate_reasoning(comparison, score)

        return AgentOutput(
            agent_name="economic_factors",
            score=score,
            reasoning=reasoning,
            weight=0.30
        )
```

---

## Deep Research (Tavily) Integration

### Service Layer

```python
# backend/services/tavily_research.py

class TavilyResearch:
    """Tavily API integration for deep research"""

    def __init__(self):
        self.api_key = os.getenv("TAVILY_API_KEY")
        self.base_url = "https://api.tavily.com/search"

    async def research(
        self,
        query: str,
        depth: str = "basic",  # basic, comprehensive
        max_results: int = 5
    ) -> dict:
        """
        Run Tavily deep research.

        Args:
            query: Search query
            depth: "basic" (fast, 5 sources) or "comprehensive" (slow, 20+ sources)
            max_results: Maximum number of results

        Returns:
            {
                "query": "...",
                "results": [
                    {"title": "...", "url": "...", "content": "...", "score": 0.95},
                    ...
                ],
                "summary": "AI-generated summary of findings"
            }
        """

        response = await httpx.post(
            self.base_url,
            json={
                "api_key": self.api_key,
                "query": query,
                "search_depth": depth,
                "max_results": max_results,
                "include_answer": True,
                "include_raw_content": False
            }
        )

        return response.json()

    def format_for_agents(self, research_results: dict) -> str:
        """Format research results for agent consumption"""
        summary = research_results.get("summary", "")
        top_results = research_results.get("results", [])[:3]

        context = f"Research Summary:\n{summary}\n\nTop Sources:\n"
        for i, result in enumerate(top_results, 1):
            context += f"{i}. {result['title']}\n   {result['content'][:200]}...\n"

        return context
```

### API Endpoints

```python
# backend/routers/stocks.py

@router.post("/api/v2/stocks/{ticker}/research")
async def deep_research_stock(
    ticker: str,
    query: Optional[str] = None,
    depth: str = "comprehensive",
    db: Session = Depends(get_db)
):
    """Run Tavily deep research on stock"""

    tavily = TavilyResearch()

    # Auto-generate query if not provided
    if not query:
        query = f"Latest news, developments, and analysis for {ticker} stock"

    # Run research
    results = await tavily.research(query, depth=depth)

    # Store in database
    research = StockResearch(
        ticker=ticker,
        query=query,
        results=results,
        created_at=datetime.now()
    )
    db.add(research)
    db.commit()

    return results

@router.get("/api/v2/stocks/{ticker}/research/history")
async def get_research_history(ticker: str, db: Session = Depends(get_db)):
    """Get research history for ticker"""
    research = db.query(StockResearch).filter(
        StockResearch.ticker == ticker
    ).order_by(desc(StockResearch.created_at)).limit(10).all()

    return research
```

### Frontend Component

```typescript
// components/modules/stocks/tabs/ResearchTab.tsx

export default function ResearchTab({ ticker }: { ticker: string }) {
  const [loading, setLoading] = useState(false);
  const [research, setResearch] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const runResearch = async () => {
    setLoading(true);
    try {
      const result = await api.post(`/api/v2/stocks/${ticker}/research`, {
        depth: 'comprehensive'
      });
      setResearch(result);
      fetchHistory();
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    const history = await api.get(`/api/v2/stocks/${ticker}/research/history`);
    setHistory(history);
  };

  return (
    <div className="research-tab">
      <button onClick={runResearch} disabled={loading}>
        {loading ? 'Researching...' : 'Run Deep Research'}
      </button>

      {research && (
        <div className="research-results">
          <h3>Research Summary</h3>
          <p>{research.summary}</p>

          <h3>Top Sources ({research.results.length})</h3>
          {research.results.map((result: any, i: number) => (
            <div key={i} className="source">
              <h4>{result.title}</h4>
              <a href={result.url} target="_blank">{result.url}</a>
              <p>{result.content}</p>
              <span>Relevance: {(result.score * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="research-history">
          <h3>Previous Research</h3>
          {history.map((item: any) => (
            <div key={item.id} onClick={() => setResearch(item.results)}>
              <span>{new Date(item.created_at).toLocaleString()}</span>
              <span>{item.query}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)

**Backend:**
- [x] PostgreSQL + TimescaleDB already set up ✅
- [ ] Create new schemas (currencies, etfs, macro)
- [ ] Extract MarketSense AI from QuantCoderFS-v2 patterns
- [ ] Implement Tavily integration
- [ ] Set up WebSocket Agent Console

**Frontend:**
- [ ] Create 5 module pages (stocks, currencies, etfs, macro, portfolios)
- [ ] Implement TabNavigation component
- [ ] Implement AssetSelector component
- [ ] Implement AgentConsole component (bottom panel)
- [ ] Set up module routing

**Deliverables:**
- [ ] 5 module skeleton pages
- [ ] Agent Console working
- [ ] Tavily service operational

---

### Phase 2: Stocks Module (Week 3-4)

**Backend (Refactor + Expand):**
- [ ] Refactor existing 64 endpoints into `/api/v2/stocks/*` structure
- [ ] Add Live Data endpoints (WebSocket)
- [ ] Add Deep Research endpoint
- [ ] Add AI Analysis endpoint (MarketSense)
- [ ] Add Peer Comparison endpoint

**Frontend:**
- [ ] EODTab (refactor existing)
- [ ] IntradayTab (already exists ✅, just refactor)
- [ ] LiveTab (new - WebSocket)
- [ ] FundamentalsTab (already exists ✅, just refactor)
- [ ] NewsTab (new)
- [ ] ResearchTab (new - Tavily)
- [ ] AIAnalysisTab (new - MarketSense)
- [ ] PeerComparisonTab (new)

**Deliverables:**
- [ ] Stocks module 100% functional
- [ ] All 8 tabs working
- [ ] MarketSense AI working for stocks
- [ ] Deep research integrated

---

### Phase 3: Currencies Module (Week 5)

**Backend:**
- [ ] Create currencies schema
- [ ] Implement 25 endpoints
- [ ] Adapt MarketSense AI for forex
- [ ] Add economic calendar integration

**Frontend:**
- [ ] All 8 tabs (EOD, Intraday, Live, Calendar, News, Research, AI, Peer)
- [ ] Currency-specific components

**Deliverables:**
- [ ] Currencies module complete
- [ ] AI analysis for forex working

---

### Phase 4: ETFs Module (Week 6)

**Backend:**
- [ ] Create etfs schema
- [ ] Implement 28 endpoints
- [ ] Add holdings analysis
- [ ] Adapt MarketSense AI for ETFs

**Frontend:**
- [ ] All 9 tabs (+ Holdings tab)
- [ ] Holdings breakdown visualization

**Deliverables:**
- [ ] ETFs module complete
- [ ] Holdings analysis working

---

### Phase 5: Macro Module (Week 7)

**Backend:**
- [ ] Create macro schema
- [ ] Implement 22 endpoints
- [ ] Add cross-country comparison
- [ ] Adapt MarketSense AI for macro

**Frontend:**
- [ ] All 6 tabs
- [ ] Country comparison charts

**Deliverables:**
- [ ] Macro module complete
- [ ] Cross-country analysis working

---

### Phase 6: Portfolios Module (Week 8)

**Backend:**
- [ ] Create portfolios schema
- [ ] Implement 30 endpoints
- [ ] Add optimization algorithms (MVO, Black-Litterman)
- [ ] Add Monte Carlo simulation
- [ ] Add VaR/CVaR analysis

**Frontend:**
- [ ] Portfolio builder (drag-and-drop)
- [ ] All 8 tabs
- [ ] Optimization visualizations

**Deliverables:**
- [ ] Portfolios module complete
- [ ] Multi-asset support working

---

### Phase 7: Integration & Polish (Week 9-10)

**Tasks:**
- [ ] Cross-module drag-and-drop
- [ ] Agent Console refinement
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation
- [ ] Bug fixes

**Deliverables:**
- [ ] Full platform functional
- [ ] Test coverage > 80%
- [ ] User documentation complete

---

## Success Criteria

### Technical ✅
- 150+ API endpoints functional
- PostgreSQL + TimescaleDB performing well
- MarketSense AI working for all asset classes
- Agent Console providing full transparency
- Deep research (Tavily) integrated across all modules
- WebSocket real-time updates stable
- <200ms API response time (95th percentile)

### Functional ✅
- All 5 modules operational
- 8-11 tabs per module working
- Drag-and-drop across modules
- AI analysis for all asset types
- Multi-asset portfolios functional

### User Experience ✅
- Professional trading platform appearance
- Consistent module/tab navigation
- Fast page loads (<2s)
- Real-time updates smooth
- Intuitive drag-and-drop

---

## Next Steps

1. **Get access to QuantCoderFS-v2 source code** (MarketSense AI implementation)
2. **Create new branch:** `refactor/multi-asset-platform`
3. **Start Phase 1:** Core infrastructure (Agent Console, Tavily, module skeleton)
4. **Implement modules sequentially:** Stocks → Currencies → ETFs → Macro → Portfolios

**Ready to start Phase 1 once you provide QuantCoderFS-v2 code access!** 🚀
