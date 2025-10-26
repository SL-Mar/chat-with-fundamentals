# QuantCoderFS-v2 Architecture Analysis

**Date:** 2025-10-25
**Purpose:** Extract patterns from QuantCoderFS-v2 to apply to Chat-with-Fundamentals refactoring

---

## Architecture Overview (QuantCoderFS-v2)

### Module Structure

QuantCoderFS-v2 has **5 main sections**:

1. **Stocks** - Market intelligence with AI signals
2. **Strategies** - Automated code generation from papers
3. **Portfolio** - Optimization and risk analysis
4. **Pairs** - Pair trading analysis
5. **Settings** - Configuration and API keys

### Technology Stack

**Frontend:**
- Next.js 15 + React 19 + TypeScript
- TailwindCSS for styling
- Lightweight Charts (TradingView) for candlesticks
- Monaco Editor for code editing
- WebSocket for real-time agent console

**Backend:**
- FastAPI + Python
- CrewAI for agent orchestration
- SQLAlchemy ORM
- SQLite (default) / PostgreSQL-ready

**Key Libraries:**
- **Tavily API** - Deep research
- **EODHD API** - Market data
- **QuantConnect API** - Strategy deployment

---

## MarketSense AI Framework

**Core Concept:** Multi-agent weighted voting system for stock analysis

### 5 Agent Architecture

```
┌─────────────────────────────────────────────────────────┐
│           Signal Generation Agent (Master)              │
│                  (Orchestrator)                         │
└──────────────────┬──────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┬──────────────┬───────────────┐
    │              │              │              │               │
┌───▼────┐  ┌──────▼─────┐ ┌─────▼────┐  ┌─────▼────┐   ┌─────▼────┐
│Fundame-│  │Progressive │ │Stock-    │  │Macroeco- │   │          │
│ntals   │  │News        │ │Price     │  │nomic     │   │  Deep    │
│Summar- │  │Summarizer  │ │Dynamics  │  │Environ-  │   │ Research │
│izer    │  │            │ │Summar-   │  │ment      │   │ (Tavily) │
│(30%)   │  │(25%)       │ │izer      │  │Summar-   │   │          │
│        │  │            │ │(25%)     │  │izer      │   │          │
│        │  │            │ │          │  │(20%)     │   │          │
└────────┘  └────────────┘ └──────────┘  └──────────┘   └──────────┘
```

### Agent Responsibilities

**1. Fundamentals Summarizer (30% weight)**
- Analyzes financial statements (balance sheet, income statement, cash flow)
- Computes financial ratios (P/E, P/B, ROE, debt/equity)
- Evaluates company fundamentals
- Output: Fundamental score + reasoning

**2. Progressive News Summarizer (25% weight)**
- Aggregates recent news articles
- Performs sentiment analysis
- Identifies key events (earnings, mergers, regulatory)
- Output: Sentiment score + key themes

**3. Stock-Price Dynamics Summarizer (25% weight)**
- Analyzes price action and volume
- Computes technical indicators (RSI, MACD, moving averages)
- Identifies chart patterns
- Output: Technical score + trend analysis

**4. Macroeconomic Environment Summarizer (20% weight)**
- Evaluates broader economic conditions
- Analyzes sector trends
- Considers interest rates, GDP, inflation
- Output: Macro score + market regime

**5. Signal Generation Agent (Master Orchestrator)**
- Receives outputs from all 4 agents
- Applies weighted voting (30%, 25%, 25%, 20%)
- Synthesizes into final recommendation
- Output: **BUY / HOLD / SELL** signal with confidence score

**6. Deep Research (Tavily) - Optional Enhancement**
- Web research for comprehensive context
- Available in all tiers (Free + Paid)
- Provides additional insights to agents

---

## Agent Console (Real-Time Logging)

**Key Feature:** Transparency into AI decision-making

### Implementation Pattern

**WebSocket Architecture:**
```python
# Backend: Emit logs during agent execution
from core.websocket_manager import ws_manager

async def analyze_stock(ticker: str):
    await ws_manager.broadcast({
        "type": "agent_log",
        "agent": "fundamentals",
        "status": "progress",
        "message": f"Analyzing financials for {ticker}..."
    })

    # Agent logic here...

    await ws_manager.broadcast({
        "type": "agent_log",
        "agent": "fundamentals",
        "status": "success",
        "message": f"Fundamental score: 8.2/10"
    })
```

**Frontend: Real-time console component**
```typescript
// components/AgentConsole.tsx
const AgentConsole = () => {
  const [logs, setLogs] = useState<AgentLog[]>([]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/agent-logs');

    ws.onmessage = (event) => {
      const log = JSON.parse(event.data);
      setLogs(prev => [...prev, log]);
    };

    return () => ws.close();
  }, []);

  return (
    <div className="agent-console">
      {logs.map((log, i) => (
        <div key={i} className={`log-${log.status}`}>
          [{log.agent}] {log.message}
        </div>
      ))}
    </div>
  );
};
```

**Features:**
- ✅ Real-time streaming via WebSocket
- ✅ Filter by agent type
- ✅ Color-coded status (info, progress, success, error)
- ✅ Export logs for auditability
- ✅ Auto-scroll and minimize/expand controls

---

## Frontend Architecture (QuantCoderFS-v2)

### Navigation Pattern

**Top-Level:** Section selector (horizontal menu)
```
┌─────────────────────────────────────────────────────────┐
│  Stocks  │  Strategies  │  Portfolio  │  Pairs  │  Settings  │
└─────────────────────────────────────────────────────────┘
```

**Section Pages:** `/stocks`, `/strategies`, `/portfolio`, `/pairs`, `/settings`

**Dynamic Routes:** `/stocks/[project_id]` (with tabs)

### Tab Pattern Within Section

```typescript
// pages/stocks/[project_id].tsx
const StockPage = () => {
  const [activeTab, setActiveTab] = useState('data');

  return (
    <div>
      {/* Asset Selector */}
      <AssetSelector ticker={ticker} />

      {/* Tab Navigation */}
      <Tabs active={activeTab} onChange={setActiveTab}>
        <Tab id="data">Data</Tab>
        <Tab id="analysis">Analysis</Tab>
        <Tab id="research">Research</Tab>
      </Tabs>

      {/* Tab Content */}
      {activeTab === 'data' && <DataTab />}
      {activeTab === 'analysis' && <AnalysisTab />}
      {activeTab === 'research' && <ResearchTab />}
    </div>
  );
};
```

### State Persistence

**Two-layer approach:**
1. **URL params** - For shareable state (ticker, tab)
2. **localStorage** - For UI preferences (collapsed panels, filters)

```typescript
// URL params for shareable state
const router = useRouter();
router.push(`/stocks/123?tab=analysis`);

// localStorage for UI state
localStorage.setItem('stocks:panel_collapsed', 'true');
```

---

## Drag-and-Drop Interface

**Key Pattern:** Cross-section interactions

### Portfolio Example

```typescript
// components/PortfolioDragDrop.tsx
const PortfolioBuilder = () => {
  const handleDrop = (event: DragEvent) => {
    const ticker = event.dataTransfer.getData('ticker');

    // Add to portfolio
    addStockToPortfolio(portfolioId, ticker);
  };

  return (
    <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <h3>Drop stocks here</h3>
      {holdings.map(stock => (
        <div key={stock.ticker}>{stock.ticker}</div>
      ))}
    </div>
  );
};

// components/StockCard.tsx (draggable)
const StockCard = ({ ticker }) => {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('ticker', ticker)}
    >
      {ticker}
    </div>
  );
};
```

**Use Cases:**
- Drag stock from Stocks → Portfolio
- Drag stock from Stocks → Pairs (Ticker 1 / Ticker 2)
- Reorder holdings within portfolio

---

## Database Schema (QuantCoderFS-v2)

### Simplified SQLite Approach

```sql
-- Stocks (Projects)
CREATE TABLE stocks (
    id INTEGER PRIMARY KEY,
    ticker TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolios
CREATE TABLE portfolios (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio Holdings
CREATE TABLE portfolio_holdings (
    id INTEGER PRIMARY KEY,
    portfolio_id INTEGER REFERENCES portfolios(id),
    ticker TEXT NOT NULL,
    weight REAL,
    shares REAL,
    UNIQUE(portfolio_id, ticker)
);

-- Pairs
CREATE TABLE pairs (
    id INTEGER PRIMARY KEY,
    ticker1 TEXT,
    ticker2 TEXT,
    name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Benchmarks (SPY, QQQ, DIA, IWM)
CREATE TABLE benchmarks (
    id INTEGER PRIMARY KEY,
    ticker TEXT UNIQUE NOT NULL,
    name TEXT,
    last_sync TIMESTAMP
);

-- Benchmark Data
CREATE TABLE benchmark_data (
    id INTEGER PRIMARY KEY,
    ticker TEXT NOT NULL,
    date DATE NOT NULL,
    open REAL,
    high REAL,
    low REAL,
    close REAL,
    volume INTEGER,
    UNIQUE(ticker, date)
);

-- AI Signals
CREATE TABLE signals (
    id INTEGER PRIMARY KEY,
    ticker TEXT NOT NULL,
    signal TEXT CHECK(signal IN ('BUY', 'HOLD', 'SELL')),
    confidence REAL,
    reasoning TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent Outputs (for audit trail)
CREATE TABLE agent_outputs (
    id INTEGER PRIMARY KEY,
    signal_id INTEGER REFERENCES signals(id),
    agent_name TEXT,
    agent_output TEXT,
    weight REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Principles:**
- SQLite for simplicity (single-file database)
- No complex migrations
- Easy to backup (copy .db file)
- PostgreSQL-ready (same schema works)

---

## API Structure (QuantCoderFS-v2)

### Modular Routers

```python
# backend/main.py
from routers import stocks, portfolios, pairs, benchmarks, signals

app.include_router(stocks.router, prefix="/api/stocks")
app.include_router(portfolios.router, prefix="/api/portfolios")
app.include_router(pairs.router, prefix="/api/pairs")
app.include_router(benchmarks.router, prefix="/api/benchmarks")
app.include_router(signals.router, prefix="/api/signals")
```

### Example Router

```python
# routers/stocks.py
from fastapi import APIRouter, Depends
from services.market_intelligence import MarketIntelligenceService

router = APIRouter()

@router.post("/")
async def create_stock(ticker: str, db: Session = Depends(get_db)):
    """Create new stock project"""
    stock = Stock(ticker=ticker.upper())
    db.add(stock)
    db.commit()
    return stock

@router.get("/{project_id}")
async def get_stock(project_id: int, db: Session = Depends(get_db)):
    """Get stock data"""
    stock = db.query(Stock).filter(Stock.id == project_id).first()
    return stock

@router.delete("/delete/{project_id}")
async def delete_stock(project_id: int, db: Session = Depends(get_db)):
    """Delete stock project"""
    db.query(Stock).filter(Stock.id == project_id).delete()
    db.commit()
    return {"status": "deleted"}
```

### Signal Generation Endpoint

```python
# routers/signals.py
from services.marketsense_ai import MarketSenseAI

@router.post("/generate/{ticker}")
async def generate_signal(
    ticker: str,
    deep_research: bool = False,
    db: Session = Depends(get_db)
):
    """Generate AI signal using MarketSense framework"""

    # Initialize MarketSense AI
    ai = MarketSenseAI(ticker=ticker)

    # Run all agents (with WebSocket logging)
    result = await ai.analyze(
        deep_research=deep_research,
        ws_manager=ws_manager
    )

    # Store signal in database
    signal = Signal(
        ticker=ticker,
        signal=result.signal,  # BUY/HOLD/SELL
        confidence=result.confidence,
        reasoning=result.reasoning
    )
    db.add(signal)
    db.commit()

    # Store agent outputs for audit trail
    for agent_output in result.agent_outputs:
        output = AgentOutput(
            signal_id=signal.id,
            agent_name=agent_output.agent_name,
            agent_output=agent_output.output,
            weight=agent_output.weight
        )
        db.add(output)
    db.commit()

    return signal
```

---

## Key Patterns to Replicate

### 1. MarketSense AI Multi-Agent Framework

**File Structure:**
```
backend/services/marketsense/
├── __init__.py
├── framework.py               # Main orchestrator
├── agents/
│   ├── fundamentals_agent.py
│   ├── news_agent.py
│   ├── price_dynamics_agent.py
│   ├── macro_agent.py
│   └── signal_generator.py
└── utils/
    ├── tavily_research.py
    └── websocket_logger.py
```

**Implementation:**
- CrewAI for agent orchestration
- Weighted voting system (30%, 25%, 25%, 20%)
- WebSocket logging for transparency
- Tavily deep research integration

### 2. Agent Console Component

**WebSocket Real-Time Logging:**
- Backend emits logs during agent execution
- Frontend displays in scrollable console
- Filter by agent, status, timestamp
- Export logs as JSON/CSV

### 3. Drag-and-Drop Cross-Module Interactions

**Pattern:**
- Make stock cards draggable
- Portfolio/Pairs sections accept drops
- Update via API on drop
- Optimistic UI updates

### 4. State Persistence

**Two-layer approach:**
- URL params: `?ticker=AAPL&tab=analysis`
- localStorage: UI preferences

### 5. Lightweight Charts (TradingView)

**Use for:**
- Candlestick charts (EOD)
- Volume bars
- Technical indicators overlays
- Professional appearance

### 6. Simplified Database (SQLite)

**Approach:**
- Start with SQLite for simplicity
- No complex migrations
- Easy backup/restore
- PostgreSQL-ready schema

---

## Mapping to Chat-with-Fundamentals

### QuantCoderFS-v2 → Multi-Asset Platform

| QuantCoderFS-v2 | Chat-with-Fundamentals | Notes |
|-----------------|------------------------|-------|
| Stocks section | Stocks module | ✅ Keep + expand with intraday |
| Portfolio section | Portfolios module | ✅ Keep as-is |
| Pairs section | Removed or → Peer Comparison | Move to Stocks module |
| Strategies section | Removed | Not needed for multi-asset platform |
| Settings section | Settings module | ✅ Keep as-is |
| - | **Currencies module** | ⭐ NEW - Forex pairs |
| - | **ETFs module** | ⭐ NEW - ETF analysis |
| - | **Macro module** | ⭐ NEW - Economic indicators |

### Feature Expansion

**Stocks Module (Expand):**
- ✅ Keep: AI signals, deep research, fundamentals
- ⭐ Add: Intraday charts (1m, 5m, 15m, 30m, 1h)
- ⭐ Add: Live data streaming
- ⭐ Add: Peer comparison (move from Pairs)

**Currencies Module (New):**
- Forex pairs (EUR/USD, GBP/USD, etc.)
- EOD + Intraday data
- Economic calendar integration
- AI analysis (adapt MarketSense for forex)

**ETFs Module (New):**
- ETF holdings analysis
- Peer comparison
- Fundamentals (expense ratio, AUM, tracking error)
- AI analysis

**Macro Module (New):**
- Economic indicators (GDP, CPI, unemployment)
- Cross-country comparison
- Time-series visualization
- AI trend analysis

**Portfolios Module (Keep):**
- ✅ Already excellent in QuantCoderFS-v2
- ✅ Optimization (MVO, Black-Litterman)
- ✅ Monte Carlo & VaR
- ⭐ Expand: Multi-asset portfolios (stocks + ETFs + currencies)

---

## Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1)
1. Extract MarketSense AI framework from QuantCoderFS-v2 patterns
2. Set up WebSocket Agent Console
3. Create module skeleton (5 modules)
4. Implement drag-and-drop base components

### Phase 2: Stocks Module (Week 2-3)
1. Migrate existing stocks functionality
2. Add MarketSense AI integration
3. Add Tavily deep research
4. Add intraday charts (multiple granularities)
5. Add live data streaming
6. Add peer comparison

### Phase 3: New Modules (Week 4-6)
1. Currencies module (Week 4)
2. ETFs module (Week 5)
3. Macro module (Week 6)

### Phase 4: Portfolios Module (Week 7)
1. Adapt from QuantCoderFS-v2
2. Add multi-asset support

### Phase 5: Polish & Testing (Week 8-10)
1. Comprehensive testing
2. Performance optimization
3. Documentation

---

## Success Criteria

### Technical
- ✅ MarketSense AI working across all asset classes
- ✅ Agent Console provides full transparency
- ✅ Drag-and-drop works seamlessly
- ✅ <200ms API response time
- ✅ WebSocket stable with no disconnects

### User Experience
- ✅ Consistent module/tab navigation
- ✅ Professional trading platform UX
- ✅ Fast page loads (<2s)
- ✅ Intuitive drag-and-drop
- ✅ Real-time updates

### Functional
- ✅ AI analysis for stocks, currencies, ETFs, macro
- ✅ Deep research (Tavily) integrated
- ✅ Multi-asset portfolios working
- ✅ Intraday + EOD + live data
- ✅ Peer comparison functional

---

## Next Steps

1. **Clone or describe QuantCoderFS-v2 code** (if available locally)
2. **Extract MarketSense AI implementation details**
3. **Create new branch:** `refactor/multi-asset-platform`
4. **Start Phase 1:** Core infrastructure with MarketSense AI
5. **Implement Stocks module first** (most complete)
6. **Roll out remaining modules iteratively**

**Ready to proceed once you provide access to QuantCoderFS-v2 code or confirm the patterns above are sufficient to start!**
