# Architecture Decisions - Multi-Asset Platform

**Date:** 2025-10-25
**Purpose:** Clarify what we adopt from QuantCoderFS-v2 vs. what we keep from current project

---

## What We Take from QuantCoderFS-v2 ✅

### 1. UI/UX Patterns
- ✅ Module-based navigation (Stocks, Currencies, ETFs, Macro, Portfolios)
- ✅ Tab structure within modules
- ✅ Drag-and-drop cross-module interactions
- ✅ State persistence (URL params + localStorage)
- ✅ Professional trading platform appearance

### 2. MarketSense AI Framework
- ✅ 5-agent multi-agent system
- ✅ Weighted voting (30%, 25%, 25%, 20%)
- ✅ Signal generation (BUY/HOLD/SELL)
- ✅ Agent orchestration patterns

### 3. Agent Console
- ✅ WebSocket real-time logging
- ✅ Transparency into AI decision-making
- ✅ Filter and export capabilities
- ✅ Color-coded status indicators

### 4. Frontend Components
- ✅ Lightweight Charts (TradingView) for candlesticks
- ✅ Monaco Editor for code editing (if needed)
- ✅ Drag-and-drop UI components
- ✅ Professional data tables and visualizations

### 5. Integration Patterns
- ✅ Tavily API for deep research
- ✅ EODHD API usage patterns
- ✅ CrewAI for agent orchestration
- ✅ WebSocket communication patterns

---

## What We KEEP from Current Project ✅

### 1. Database Architecture (PostgreSQL + TimescaleDB) ⭐
**CRITICAL: Do NOT move to SQLite!**

**Current Setup (Superior for Multi-Asset Platform):**
- ✅ PostgreSQL 15+ (production-grade RDBMS)
- ✅ TimescaleDB extension (optimized for time-series)
- ✅ Hypertables for OHLCV data (automatic partitioning)
- ✅ Compression policies (70-80% storage reduction)
- ✅ Retention policies (automatic old data cleanup)
- ✅ Continuous aggregates (pre-computed rollups)
- ✅ Composite primary keys (ticker, timestamp, interval)

**Why PostgreSQL + TimescaleDB > SQLite:**
```
┌─────────────────────┬──────────────┬──────────────────────┐
│ Feature             │ SQLite       │ PostgreSQL+TimescaleDB│
├─────────────────────┼──────────────┼──────────────────────┤
│ Concurrent Users    │ 1 (file lock)│ 1000s (MVCC)         │
│ Time-Series Queries │ Slow         │ Optimized (indexes)  │
│ Data Compression    │ None         │ 70-80% automatic     │
│ Partitioning        │ Manual       │ Automatic (hypertable)│
│ Retention Policies  │ Manual       │ Automatic (drop old) │
│ Continuous Aggs     │ None         │ Built-in (fast)      │
│ Intraday Scale      │ 10M rows     │ Billions of rows     │
│ Real-time Inserts   │ Slow (locks) │ Fast (parallel)      │
│ Production Ready    │ No (desktop) │ Yes (enterprise)     │
└─────────────────────┴──────────────┴──────────────────────┘
```

**Scale Comparison:**
- **SQLite**: Good for desktop apps, <10M rows, single user
- **PostgreSQL + TimescaleDB**: Multi-asset platform with:
  - 5 asset classes (stocks, currencies, ETFs, macro, portfolios)
  - Multiple granularities (1m, 5m, 15m, 30m, 1h, EOD)
  - 1,500+ tickers × 10 years × 252 days/year = **4M+ rows EOD**
  - Intraday: 1,500 tickers × 390 minutes/day × 252 days = **147M rows/year**
  - **Total: 150M+ rows easily** → PostgreSQL required

**Existing Database Schema (Keep As-Is):**
```sql
-- Already implemented in current project ✅

-- TimescaleDB hypertables for intraday data
CREATE TABLE intraday_ohlcv (
    ticker VARCHAR(20) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    interval VARCHAR(10) NOT NULL,  -- 1m, 5m, 15m, 30m, 1h
    open NUMERIC(12,4),
    high NUMERIC(12,4),
    low NUMERIC(12,4),
    close NUMERIC(12,4),
    volume BIGINT,
    PRIMARY KEY (ticker, timestamp, interval)
);

SELECT create_hypertable('intraday_ohlcv', 'timestamp');

-- Compression policy (reduce storage by 70-80%)
ALTER TABLE intraday_ohlcv SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'ticker,interval'
);

SELECT add_compression_policy('intraday_ohlcv', INTERVAL '7 days');

-- Retention policy (auto-delete old data)
SELECT add_retention_policy('intraday_ohlcv', INTERVAL '90 days');

-- Continuous aggregates (5m, 15m, 1h pre-computed)
CREATE MATERIALIZED VIEW intraday_ohlcv_5m
WITH (timescaledb.continuous) AS
SELECT
    ticker,
    time_bucket('5 minutes', timestamp) AS bucket,
    first(open, timestamp) AS open,
    max(high) AS high,
    min(low) AS low,
    last(close, timestamp) AS close,
    sum(volume) AS volume
FROM intraday_ohlcv
WHERE interval = '1m'
GROUP BY ticker, bucket;
```

### 2. Intraday Data Pipeline ✅
**Already Complete in Phase 3D:**
- ✅ Database models (IntradayOHLCV, IntradayQuote)
- ✅ Query layer with caching (5-minute TTL)
- ✅ Service layer (database-first approach)
- ✅ API endpoints (/historical/intraday)
- ✅ Frontend components (IntradayChart.tsx)

**Do NOT replace - this is production-ready!**

### 3. Test Suite Framework ✅
- ✅ 100+ pytest test cases
- ✅ Test fixtures and markers
- ✅ Integration test patterns
- ✅ Coverage tracking

### 4. Existing Backend Infrastructure ✅
- ✅ FastAPI with 14 routers (64 endpoints)
- ✅ SQLAlchemy ORM with database models
- ✅ Redis caching layer
- ✅ Background services (cache warming, data refresh)
- ✅ WebSocket logging infrastructure
- ✅ API authentication system

### 5. Existing Frontend Components ✅
- ✅ Financial Statements viewer
- ✅ Comprehensive navigation (Header.tsx)
- ✅ IntradayChart component
- ✅ API client (lib/api.ts with 64 methods)

---

## Hybrid Architecture (Best of Both Worlds)

### Database Strategy

```
┌─────────────────────────────────────────────────────────────┐
│          PostgreSQL 15 + TimescaleDB (KEEP)                 │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Stocks    │  │ Currencies │  │    ETFs    │           │
│  │            │  │            │  │            │           │
│  │ • EOD      │  │ • EOD      │  │ • EOD      │           │
│  │ • Intraday │  │ • Intraday │  │ • Intraday │           │
│  │   (1m-1h)  │  │   (1m-1h)  │  │   (1m-1h)  │           │
│  │ • Fundame- │  │ • News     │  │ • Holdings │           │
│  │   ntals    │  │            │  │ • Metrics  │           │
│  │ • News     │  │            │  │            │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│                                                              │
│  ┌────────────┐  ┌────────────────────────────────┐        │
│  │   Macro    │  │        Portfolios              │        │
│  │            │  │                                │        │
│  │ • Indicat- │  │ • Holdings (multi-asset)       │        │
│  │   ors      │  │ • Performance history          │        │
│  │ • Events   │  │ • Optimization results         │        │
│  └────────────┘  └────────────────────────────────┘        │
│                                                              │
│  ┌──────────────────────────────────────────────┐          │
│  │  Shared Tables                               │          │
│  │  • AI Signals (BUY/HOLD/SELL)                │          │
│  │  • Agent Outputs (audit trail)               │          │
│  │  • User preferences                          │          │
│  └──────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

**Schema Design:**
- ✅ Separate schemas per asset class (clean separation)
- ✅ TimescaleDB hypertables for all time-series data
- ✅ Compression + retention policies on all hypertables
- ✅ Continuous aggregates for common rollups
- ✅ Shared tables for cross-asset features (signals, portfolios)

### Frontend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│         Next.js 15 + React 19 + TypeScript                  │
│              (QuantCoderFS-v2 Patterns)                      │
│                                                              │
│  Navigation: [Stocks] [Currencies] [ETFs] [Macro] [Portfolio]│
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │  Module Page (e.g., /stocks/AAPL)             │         │
│  │                                                │         │
│  │  Asset Selector: [AAPL ▼]                     │         │
│  │                                                │         │
│  │  Tabs: [EOD] [Intraday] [Live] [Fundamental]  │         │
│  │        [News] [Research] [AI Analysis] [Peer] │         │
│  │                                                │         │
│  │  ┌──────────────────────────────────────────┐ │         │
│  │  │  Tab Content (Component)                 │ │         │
│  │  │                                          │ │         │
│  │  │  ✅ Uses existing API (lib/api.ts)       │ │         │
│  │  │  ✅ Lightweight Charts (TradingView)     │ │         │
│  │  │  ✅ Real-time via WebSocket             │ │         │
│  │  └──────────────────────────────────────────┘ │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │  Agent Console (Bottom Panel)                  │         │
│  │  [Fundamentals Agent] Analyzing AAPL...        │         │
│  │  [News Agent] Processing 15 articles...        │         │
│  │  [Price Agent] Computing RSI, MACD...          │         │
│  │  ✅ WebSocket real-time updates                │         │
│  └────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Backend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  FastAPI Backend                             │
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │  Routers (Keep existing + reorganize)         │         │
│  │                                                │         │
│  │  /api/stocks/{ticker}/*                        │         │
│  │  /api/currencies/{pair}/*                      │         │
│  │  /api/etfs/{etf}/*                             │         │
│  │  /api/macro/{indicator}/*                      │         │
│  │  /api/portfolios/{id}/*                        │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │  Services Layer                                │         │
│  │                                                │         │
│  │  ✅ Keep: DataService (intraday pipeline)     │         │
│  │  ✅ Keep: CacheService (Redis)                │         │
│  │  ⭐ Add: MarketSenseAI (from QuantCoderFS)    │         │
│  │  ⭐ Add: TavilyResearch                        │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │  Database Layer                                │         │
│  │                                                │         │
│  │  ✅ Keep: SQLAlchemy models                    │         │
│  │  ✅ Keep: Query layer (queries_improved.py)   │         │
│  │  ✅ Keep: TimescaleDB optimizations           │         │
│  └────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## Migration Strategy (Updated)

### What Changes ✏️
- Frontend: Reorganize into module/tab structure
- UI/UX: Adopt QuantCoderFS-v2 patterns
- Add: MarketSense AI framework
- Add: Agent Console component
- Add: Drag-and-drop interactions
- Expand: 3 new modules (Currencies, ETFs, Macro)

### What Stays the Same ✅
- **Database: PostgreSQL + TimescaleDB** (critical!)
- Backend: FastAPI + existing routers
- Database models: SQLAlchemy ORM
- Intraday pipeline: Complete as-is
- Test suite: Keep and expand
- Caching: Redis layer
- Background services: Cache warming, data refresh

---

## Key Takeaways

### ✅ Adopt from QuantCoderFS-v2:
- UI/UX patterns (module/tab navigation)
- MarketSense AI framework (5-agent system)
- Agent Console (WebSocket logging)
- Drag-and-drop components
- Professional trading platform appearance

### ✅ Keep from Current Project:
- **PostgreSQL + TimescaleDB** (NOT SQLite!)
- Intraday data pipeline (Phase 3D complete)
- All existing backend infrastructure
- Test suite framework
- API structure (reorganize, don't rebuild)

### ⭐ Extend:
- Add 3 new modules (Currencies, ETFs, Macro)
- Add MarketSense AI for all asset classes
- Add Agent Console across all modules
- Add multi-asset portfolio support

---

## Database Schema Expansion (Keep PostgreSQL)

### New Schemas for Asset Classes

**Currencies Schema:**
```sql
CREATE SCHEMA currencies;

CREATE TABLE currencies.pairs (
    pair VARCHAR(10) PRIMARY KEY,  -- EUR/USD, GBP/USD
    base_currency VARCHAR(3),
    quote_currency VARCHAR(3),
    description TEXT
);

CREATE TABLE currencies.eod (
    pair VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    open NUMERIC(12,6),
    high NUMERIC(12,6),
    low NUMERIC(12,6),
    close NUMERIC(12,6),
    PRIMARY KEY (pair, date)
);

CREATE TABLE currencies.intraday (
    pair VARCHAR(10) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    interval VARCHAR(10) NOT NULL,
    open NUMERIC(12,6),
    high NUMERIC(12,6),
    low NUMERIC(12,6),
    close NUMERIC(12,6),
    PRIMARY KEY (pair, timestamp, interval)
);

SELECT create_hypertable('currencies.intraday', 'timestamp');
SELECT add_compression_policy('currencies.intraday', INTERVAL '7 days');
SELECT add_retention_policy('currencies.intraday', INTERVAL '90 days');
```

**ETFs Schema:**
```sql
CREATE SCHEMA etfs;

CREATE TABLE etfs.metadata (
    symbol VARCHAR(10) PRIMARY KEY,
    name TEXT,
    expense_ratio NUMERIC(5,4),
    aum NUMERIC(15,2),
    inception_date DATE
);

CREATE TABLE etfs.eod (
    symbol VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    open NUMERIC(12,4),
    high NUMERIC(12,4),
    low NUMERIC(12,4),
    close NUMERIC(12,4),
    volume BIGINT,
    PRIMARY KEY (symbol, date)
);

CREATE TABLE etfs.holdings (
    symbol VARCHAR(10) NOT NULL,
    holding_ticker VARCHAR(20) NOT NULL,
    weight NUMERIC(8,4),
    shares BIGINT,
    market_value NUMERIC(15,2),
    date DATE NOT NULL,
    PRIMARY KEY (symbol, holding_ticker, date)
);
```

**Macro Schema:**
```sql
CREATE SCHEMA macro;

CREATE TABLE macro.indicators (
    indicator_code VARCHAR(50) NOT NULL,
    country VARCHAR(3) NOT NULL,
    date DATE NOT NULL,
    value NUMERIC(15,4),
    PRIMARY KEY (indicator_code, country, date)
);

CREATE TABLE macro.metadata (
    indicator_code VARCHAR(50) PRIMARY KEY,
    name TEXT,
    description TEXT,
    unit TEXT,
    source TEXT
);
```

---

## Conclusion

**Clear separation of concerns:**
- ✅ **Database**: PostgreSQL + TimescaleDB (production-grade, keep as-is)
- ✅ **Backend**: FastAPI + existing infrastructure (reorganize routers)
- ✅ **Frontend**: Adopt QuantCoderFS-v2 UI/UX patterns (module/tab structure)
- ✅ **AI**: Integrate MarketSense AI framework (from QuantCoderFS-v2)

**We are NOT replacing the database architecture.** We are adopting the **user experience patterns** from QuantCoderFS-v2 while keeping the superior PostgreSQL + TimescaleDB foundation that's already built.

**This gives us the best of both worlds:**
- Professional trading platform UX (from QuantCoderFS-v2)
- Enterprise-grade time-series database (already in place)
- Multi-asset scalability (PostgreSQL can handle it)
- Production-ready infrastructure (no desktop limitations)
