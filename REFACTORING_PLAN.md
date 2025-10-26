# Chat with Fundamentals - Refactoring Plan

**Date:** 2025-10-25
**Objective:** Transform current chat-based app into multi-asset trading platform
**Reference:** QuantCoderFS-v2 architecture patterns

---

## Vision Statement

Build a **multi-asset trading platform** providing seamless integration of various analysis tools to extract actionable insights across:
- Stocks (US equities)
- Currencies (Forex)
- ETFs
- Macro Indicators
- Portfolios (simulation + optimization)

**Key Principle:** Consistent functionality across all asset classes with clean modular architecture.

---

## Architecture Overview

### Current State (Problems)
- ❌ Chat-first interface with bolted-on features
- ❌ 22 flat pages without clear grouping
- ❌ Navigation unclear and inconsistent
- ❌ No clear separation between asset classes
- ❌ Fetch errors due to architectural issues
- ❌ Features scattered across codebase

### Target State (Vision)
- ✅ Module-first architecture (5 core modules)
- ✅ Consistent tab-based functions within each module
- ✅ Clear navigation: Module → Asset → Function
- ✅ Separate databases per asset class
- ✅ Shared components and utilities
- ✅ Professional trading platform UX

---

## Module Structure

### 1. Stocks Module 📈

**Database:**
- `stocks_eod` - Daily OHLCV data (30+ years)
- `stocks_intraday_1m` - 1-minute bars
- `stocks_intraday_5m` - 5-minute bars
- `stocks_intraday_15m` - 15-minute bars
- `stocks_intraday_30m` - 30-minute bars
- `stocks_intraday_1h` - 1-hour bars
- `stocks_fundamentals` - Financial statements, ratios, metrics
- `stocks_news` - News articles with sentiment scores
- `stocks_metadata` - Company info, sector, industry

**Tabs (Functions):**
1. **EOD Visualization** - Candlestick charts, volume, indicators
2. **Intraday Visualization** - Real-time/historical intraday charts
3. **Live Data** - Live quotes, order book (if available)
4. **Fundamentals** - Balance sheet, income statement, cash flow, ratios
5. **News & Sentiment** - News feed with sentiment analysis
6. **Deep Research** - Tavily AI-powered research
7. **AI Analysis** - MarketSense AI framework analysis
8. **Peer Comparison** - Compare vs. similar stocks in sector
9. **Backtest** - Strategy backtesting (later)
10. **Alerts** - Price/indicator alerts (later)
11. **Live Trading** - Order placement (later)

**Navigation Flow:**
```
Stocks → Select Ticker (AAPL) → Choose Tab (AI Analysis)
```

---

### 2. Currencies Module 💱

**Database:**
- `currencies_eod` - Daily forex data
- `currencies_intraday_1m` - 1-minute forex bars
- `currencies_intraday_5m` - 5-minute bars
- `currencies_news` - Forex news with sentiment
- `currencies_metadata` - Currency pair info

**Tabs (Functions):**
1. **EOD Visualization**
2. **Intraday Visualization**
3. **Live Data**
4. **Economic Calendar** - Interest rates, central bank decisions
5. **News & Sentiment**
6. **Deep Research**
7. **AI Analysis**
8. **Backtest** (later)
9. **Alerts** (later)
10. **Live Trading** (later)

**Navigation Flow:**
```
Currencies → Select Pair (EUR/USD) → Choose Tab (Live Data)
```

---

### 3. ETFs Module 🎯

**Database:**
- `etfs_eod` - Daily ETF OHLCV
- `etfs_intraday_1m` - 1-minute bars
- `etfs_holdings` - ETF holdings data
- `etfs_fundamentals` - ETF metrics (expense ratio, AUM, etc.)
- `etfs_news` - ETF news

**Tabs (Functions):**
1. **EOD Visualization**
2. **Intraday Visualization**
3. **Live Data**
4. **Holdings Analysis** - Top holdings, sector allocation
5. **Fundamentals** - Expense ratio, tracking error, performance
6. **News & Sentiment**
7. **Deep Research**
8. **AI Analysis**
9. **Peer Comparison** - Compare similar ETFs
10. **Backtest** (later)
11. **Alerts** (later)

**Navigation Flow:**
```
ETFs → Select ETF (SPY) → Choose Tab (Holdings Analysis)
```

---

### 4. Macro Indicators Module 🌍

**Database:**
- `macro_indicators` - Time-series macro data (GDP, CPI, unemployment, etc.)
- `macro_metadata` - Indicator descriptions, sources
- `macro_news` - Economic news

**Tabs (Functions):**
1. **Indicator Visualization** - Time-series charts
2. **Economic Calendar** - Upcoming releases
3. **Cross-Country Comparison** - Compare indicators across countries
4. **News & Events**
5. **Deep Research**
6. **AI Analysis** - MarketSense framework for macro trends

**Navigation Flow:**
```
Macro → Select Indicator (US GDP) → Choose Tab (Visualization)
```

---

### 5. Portfolios Module 💼

**Database:**
- `portfolios` - Portfolio definitions (holdings, weights)
- `portfolio_history` - Historical portfolio performance
- `portfolio_optimization` - Optimization results

**Tabs (Functions):**
1. **Portfolio Builder** - Create/edit portfolios
2. **Performance Analysis** - Returns, Sharpe, drawdown
3. **Risk Analysis** - VaR, volatility, factor exposures
4. **Optimization** - Mean-variance, risk parity, HRP
5. **Rebalancing** - Automated rebalancing strategies
6. **Backtesting** - Portfolio strategy backtesting
7. **AI Analysis** - MarketSense portfolio recommendations

**Navigation Flow:**
```
Portfolios → Select Portfolio (Tech Growth) → Choose Tab (Optimization)
```

---

## Frontend Architecture

### Technology Stack
- **Framework:** Next.js 15 (keep current)
- **UI Library:** TailwindCSS + shadcn/ui (upgrade from current)
- **Charts:** TradingView Lightweight Charts (replace current charting)
- **State Management:** Zustand or React Context
- **Data Fetching:** React Query (TanStack Query)

### Navigation Structure

**Top-Level Navigation:**
```
┌─────────────────────────────────────────────────────────┐
│  📈 Stocks  │  💱 Currencies  │  🎯 ETFs  │  🌍 Macro  │  💼 Portfolios  │
└─────────────────────────────────────────────────────────┘
```

**Module Page Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Module: Stocks                                          │
│  ┌─────────────────────────────────────────────┐        │
│  │  Asset Selector:  [AAPL ▼]                 │        │
│  └─────────────────────────────────────────────┘        │
│                                                          │
│  Tabs:                                                   │
│  [ EOD ] [ Intraday ] [ Live ] [ Fundamentals ] ...     │
│  ──────────────────────────────────────────────────     │
│                                                          │
│  Tab Content (Dynamic):                                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │                                                   │  │
│  │  [Chart / Table / AI Analysis / etc.]            │  │
│  │                                                   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Component Hierarchy
```
/pages
  /stocks
    index.tsx          → Stocks module landing
    [ticker].tsx       → Dynamic ticker page with tabs
  /currencies
    index.tsx
    [pair].tsx
  /etfs
    index.tsx
    [etf].tsx
  /macro
    index.tsx
    [indicator].tsx
  /portfolios
    index.tsx
    [portfolio].tsx

/components
  /modules
    /stocks
      EODChart.tsx
      IntradayChart.tsx
      FundamentalsTable.tsx
      AIAnalysis.tsx
      PeerComparison.tsx
    /currencies
      ForexChart.tsx
      EconomicCalendar.tsx
    /etfs
      ETFChart.tsx
      HoldingsTable.tsx
    /macro
      IndicatorChart.tsx
      CountryComparison.tsx
    /portfolios
      PortfolioBuilder.tsx
      PerformanceChart.tsx
      Optimizer.tsx
  /shared
    AssetSelector.tsx
    TabNavigation.tsx
    NewsPanel.tsx
    AIAnalysisPanel.tsx
```

---

## Backend Architecture

### API Structure

**Current (Flat):**
```
/equity/*
/technical/*
/historical/*
/news/*
/corporate/*
/calendar/*
/special/*
/macro/*
```

**New (Modular):**
```
/api/v2
  /stocks
    /{ticker}/eod
    /{ticker}/intraday
    /{ticker}/live
    /{ticker}/fundamentals
    /{ticker}/news
    /{ticker}/research
    /{ticker}/ai-analysis
    /{ticker}/peers
  /currencies
    /{pair}/eod
    /{pair}/intraday
    /{pair}/live
    /{pair}/news
    /{pair}/ai-analysis
  /etfs
    /{etf}/eod
    /{etf}/intraday
    /{etf}/holdings
    /{etf}/fundamentals
    /{etf}/peers
  /macro
    /{indicator}/data
    /{indicator}/calendar
    /{indicator}/comparison
  /portfolios
    /list
    /{id}/performance
    /{id}/risk
    /{id}/optimize
```

### Database Schema (PostgreSQL)

**Per-Asset-Class Approach:**

```sql
-- Stocks
CREATE TABLE stocks_eod (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    open NUMERIC(12,4),
    high NUMERIC(12,4),
    low NUMERIC(12,4),
    close NUMERIC(12,4),
    volume BIGINT,
    adjusted_close NUMERIC(12,4),
    UNIQUE(ticker, date)
);

-- Use TimescaleDB hypertables for intraday data
SELECT create_hypertable('stocks_intraday_1m', 'timestamp');
SELECT create_hypertable('stocks_intraday_5m', 'timestamp');
-- etc.

-- Currencies
CREATE TABLE currencies_eod (
    id SERIAL PRIMARY KEY,
    pair VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    open NUMERIC(12,6),
    high NUMERIC(12,6),
    low NUMERIC(12,6),
    close NUMERIC(12,6),
    UNIQUE(pair, date)
);

-- ETFs
CREATE TABLE etfs_eod (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    open NUMERIC(12,4),
    high NUMERIC(12,4),
    low NUMERIC(12,4),
    close NUMERIC(12,4),
    volume BIGINT,
    UNIQUE(symbol, date)
);

CREATE TABLE etfs_holdings (
    id SERIAL PRIMARY KEY,
    etf_symbol VARCHAR(10) NOT NULL,
    holding_ticker VARCHAR(20) NOT NULL,
    weight NUMERIC(8,4),
    shares BIGINT,
    market_value NUMERIC(15,2),
    date DATE NOT NULL,
    UNIQUE(etf_symbol, holding_ticker, date)
);

-- Macro
CREATE TABLE macro_indicators (
    id SERIAL PRIMARY KEY,
    indicator_code VARCHAR(50) NOT NULL,
    country VARCHAR(3) NOT NULL,
    date DATE NOT NULL,
    value NUMERIC(15,4),
    UNIQUE(indicator_code, country, date)
);

-- Portfolios
CREATE TABLE portfolios (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE portfolio_holdings (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER REFERENCES portfolios(id),
    asset_type VARCHAR(20) NOT NULL, -- 'stock', 'etf', 'currency'
    asset_symbol VARCHAR(20) NOT NULL,
    weight NUMERIC(8,4),
    shares NUMERIC(15,4),
    date DATE NOT NULL,
    UNIQUE(portfolio_id, asset_symbol, date)
);
```

### Backend Services

**Per-Module Services:**
```python
/backend
  /services
    /stocks
      eod_service.py
      intraday_service.py
      fundamentals_service.py
      news_service.py
      ai_analysis_service.py
      peer_comparison_service.py
    /currencies
      forex_service.py
      calendar_service.py
    /etfs
      etf_service.py
      holdings_service.py
    /macro
      indicators_service.py
      comparison_service.py
    /portfolios
      portfolio_service.py
      optimization_service.py
      risk_service.py
    /shared
      marketsense_ai.py  ← Core AI framework
      tavily_research.py
      cache_service.py
```

---

## MarketSense AI Framework

**Core Concept:** Multi-agent AI system for comprehensive market analysis

### Components (To be migrated from QuantCoderFS-v2)

1. **Research Agent** - Tavily deep research
2. **Technical Agent** - Chart pattern recognition, indicators
3. **Fundamental Agent** - Financial statement analysis
4. **Sentiment Agent** - News + social media sentiment
5. **Risk Agent** - Portfolio risk analysis
6. **Strategy Agent** - Trading strategy recommendations

### Implementation Pattern
```python
# /backend/services/shared/marketsense_ai.py

class MarketSenseAI:
    """Multi-agent AI framework for market analysis"""

    def __init__(self):
        self.research_agent = TavilyResearchAgent()
        self.technical_agent = TechnicalAnalysisAgent()
        self.fundamental_agent = FundamentalAnalysisAgent()
        self.sentiment_agent = SentimentAnalysisAgent()
        self.risk_agent = RiskAnalysisAgent()
        self.strategy_agent = StrategyAgent()

    async def analyze_stock(self, ticker: str) -> AnalysisReport:
        """Comprehensive stock analysis using all agents"""
        tasks = [
            self.research_agent.research(ticker),
            self.technical_agent.analyze(ticker),
            self.fundamental_agent.analyze(ticker),
            self.sentiment_agent.analyze(ticker),
        ]
        results = await asyncio.gather(*tasks)

        # Synthesize results
        report = self.strategy_agent.synthesize(results)
        return report

    async def analyze_portfolio(self, portfolio_id: int) -> PortfolioReport:
        """Portfolio-level analysis"""
        # Similar multi-agent approach
        pass
```

---

## Migration Strategy

### Phase 1: Setup & Foundation (Week 1)

**Tasks:**
1. ✅ Study QuantCoderFS-v2 architecture
2. ✅ Create REFACTORING_PLAN.md (this document)
3. Create new branch: `refactor/multi-asset-platform`
4. Set up new frontend structure:
   - Module pages (/stocks, /currencies, /etfs, /macro, /portfolios)
   - Tab navigation components
   - Asset selector components
5. Set up new backend structure:
   - Module-based routers
   - Service layer per module
   - Database migrations

**Deliverables:**
- [ ] New branch created
- [ ] Frontend skeleton with 5 modules
- [ ] Backend skeleton with modular routers
- [ ] Database migration scripts

---

### Phase 2: Stocks Module (Week 2-3)

**Migrate existing functionality:**
1. ✅ EOD data (already working)
2. ✅ Intraday pipeline (Phase 3D complete)
3. ✅ Financial statements viewer (already complete)
4. Refactor into module/tab structure
5. Add peer comparison functionality
6. Integrate MarketSense AI framework

**New functionality:**
7. Deep research (Tavily integration)
8. Live data streaming (WebSocket)

**Deliverables:**
- [ ] Stocks module fully functional
- [ ] All 11 tabs implemented (except backtest, alerts, trading)
- [ ] MarketSense AI working for stocks

---

### Phase 3: Currencies Module (Week 4)

**Implement:**
1. Forex data ingestion (EODHD API)
2. EOD/Intraday charts
3. Live forex data
4. Economic calendar
5. News & sentiment
6. AI analysis

**Deliverables:**
- [ ] Currencies module functional
- [ ] Database tables created
- [ ] API endpoints working

---

### Phase 4: ETFs Module (Week 5)

**Implement:**
1. ETF data ingestion
2. Holdings analysis
3. Peer comparison
4. Performance metrics
5. AI analysis

**Deliverables:**
- [ ] ETFs module functional
- [ ] Holdings visualization working

---

### Phase 5: Macro Module (Week 6)

**Implement:**
1. Macro indicators ingestion
2. Time-series visualization
3. Cross-country comparison
4. Economic calendar
5. AI trend analysis

**Deliverables:**
- [ ] Macro module functional
- [ ] Indicator database populated

---

### Phase 6: Portfolios Module (Week 7-8)

**Implement:**
1. Portfolio builder UI
2. Performance tracking
3. Risk analysis
4. Optimization (mean-variance, risk parity, HRP)
5. AI portfolio recommendations

**Deliverables:**
- [ ] Portfolios module functional
- [ ] Optimization algorithms working

---

### Phase 7: Testing & Polish (Week 9-10)

**Tasks:**
1. Comprehensive testing (all modules)
2. Performance optimization
3. UI/UX polish
4. Documentation
5. Deployment preparation

**Deliverables:**
- [ ] Test coverage > 80%
- [ ] Performance benchmarks passed
- [ ] Documentation complete

---

## Success Metrics

### Technical
- ✅ All 5 modules functional
- ✅ All tabs within each module working
- ✅ Consistent UI/UX across modules
- ✅ <200ms API response time (95th percentile)
- ✅ >80% test coverage
- ✅ Zero architectural fetch errors

### Functional
- ✅ Seamless asset switching (Stocks → ETFs → Currencies)
- ✅ Consistent tab experience across modules
- ✅ MarketSense AI working across all asset classes
- ✅ Deep research (Tavily) integrated
- ✅ Professional trading platform UX

### User Experience
- ✅ Clear navigation: Module → Asset → Function
- ✅ Fast page loads (<2s)
- ✅ Intuitive interface
- ✅ No confusion about where to find features

---

## Key Design Principles

### 1. Consistency
**Same tabs across modules** (where applicable):
- EOD Visualization
- Intraday Visualization
- Live Data
- News & Sentiment
- Deep Research
- AI Analysis

### 2. Modularity
**Each module is self-contained:**
- Own database tables
- Own service layer
- Own frontend components
- Shared utilities (AI, research, charting)

### 3. Scalability
**Easy to add new modules:**
- Follow same pattern
- Reuse shared components
- Plug into existing infrastructure

### 4. Professional UX
**Trading platform standards:**
- Fast, responsive
- Real-time updates
- Clean, uncluttered interface
- Power-user shortcuts

---

## Questions for User

1. **QuantCoderFS-v2 Access:**
   - Can you grant access to the repo or clone it locally?
   - Or describe the key patterns I should follow?

2. **MarketSense AI:**
   - Can you point me to the specific files/modules in quantcoderfs-v2?
   - Are there specific prompt templates to reuse?

3. **Tavily Integration:**
   - Do you have Tavily API key?
   - Any specific research templates?

4. **Timeline:**
   - 10-week timeline acceptable?
   - Any priority modules? (Stocks first, then others?)

5. **Current Branch:**
   - Abandon completely? Or cherry-pick specific components?

---

## Next Steps

Once I have access to QuantCoderFS-v2 or more details about MarketSense AI:

1. Create new branch: `refactor/multi-asset-platform`
2. Set up module skeleton (5 modules)
3. Implement Stocks module first (most complete in current branch)
4. Migrate MarketSense AI framework
5. Roll out remaining modules iteratively

**Ready to proceed once you provide QuantCoderFS-v2 access or key implementation details!**
