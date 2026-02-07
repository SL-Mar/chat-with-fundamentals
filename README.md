[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

# Chat with Fundamentals

AI-powered fundamental analysis platform for stocks and currencies. Combines autonomous CrewAI agents with TimescaleDB time-series storage, portfolio optimization, pair trading analysis, SEC filings research, and deep web research.

> **Development status**: Active research project. Not a SaaS product. Local-first, BYOK (bring your own keys).

---

## Core Features

### Agentic Trading Signals (MarketSense AI)

Multi-agent stock analysis powered by CrewAI. Five specialized agents generate BUY/HOLD/SELL recommendations:

- **Fundamentals Agent** (30% weight) - Financial statements, ratios, valuation
- **News Agent** (25%) - Recent news sentiment and impact analysis
- **Price Dynamics Agent** (25%) - Technical patterns, momentum, volume
- **Macro Agent** (20%) - Economic indicators, sector trends
- **Signal Orchestrator** - Aggregates agent outputs into actionable signals

### SEC Filings Analysis

RAG-based SEC filings research system:

- 10-K and 10-Q filing retrieval and parsing
- PDF extraction and vector embedding
- Semantic search across filing content
- Interactive PDF viewer with page references

### Deep Research

Autonomous research using Tavily API and GPT-Researcher:

- Multi-source web research on any financial topic
- Structured research reports with citations
- Integration with stock analysis workflows

### Portfolio Management

Share-based portfolio tracking with 5 optimization strategies:

- **Actual Portfolio** - Track real holdings
- **Equal Weight** - Baseline comparison
- **Mean-Variance Optimization (MVO)** - Maximize Sharpe ratio
- **Minimum Variance** - Minimize volatility
- **Black-Litterman** - Bayesian approach with investor views

Risk metrics: Monte Carlo simulation (1000+ paths), VaR/CVaR, rolling Sharpe ratios, max drawdown.

### Pair Trading

Cointegration-based pair trading analysis:

- Engle-Granger cointegration testing
- Z-score monitoring and signal generation
- Hedge ratio and half-life estimation
- Spread visualization

### Stock & Currency Research

- Single-ticker and comparative multi-ticker analysis
- 50+ EODHD API endpoints (historical, fundamentals, technical, news, macro)
- Multi-granularity intraday data (1m, 5m, 15m, 1h) via dedicated TimescaleDB instance
- Technical indicators and stock screener
- Macro indicators with country comparison
- Currency pair analysis

### Database Management

- ETF constituent and index member population
- OHLCV data ingestion with freshness tracking
- Database statistics and monitoring dashboard
- Ticker inventory management

---

## Architecture

```
chat-with-fundamentals/
├── backend/
│   ├── main.py                  # FastAPI entry point
│   ├── routers/                 # 22 API routers
│   │   ├── ai_analysis.py      # MarketSense AI trading signals
│   │   ├── sec_filings.py      # SEC filings RAG
│   │   ├── pair_trading.py     # Pair trading analysis
│   │   ├── portfolios.py       # Portfolio CRUD & optimization
│   │   ├── historical.py       # EOD data
│   │   ├── intraday.py         # Multi-granularity intraday
│   │   ├── news.py             # News & sentiment
│   │   ├── technical.py        # Technical indicators & screener
│   │   ├── macro.py            # Macroeconomic data
│   │   ├── database_stats.py   # Database monitoring
│   │   └── ...                 # Calendar, corporate, special, admin
│   ├── services/               # Business logic layer
│   │   ├── marketsense/        # CrewAI agent framework
│   │   ├── gpt_researcher_service.py
│   │   ├── sec_rag_service.py
│   │   └── pair_trading_service.py
│   ├── database/               # SQLAlchemy models & schemas
│   ├── tools/                  # EODHD API client (50+ endpoints)
│   ├── agents/                 # CrewAI agent definitions
│   └── core/                   # Config, auth, logging
│
├── frontend/
│   ├── pages/                   # 40+ Next.js pages
│   │   ├── stock-ai-analysis   # MarketSense AI signals UI
│   │   ├── sec-filings         # SEC filings viewer
│   │   ├── pair-trading        # Pair trading dashboard
│   │   ├── portfolios/         # Portfolio management
│   │   ├── stocks/             # Stock research
│   │   ├── currencies/         # Currency analysis
│   │   ├── database-manager    # Database admin UI
│   │   └── ...
│   ├── components/              # React components
│   └── lib/                     # API client, stores
│
├── docker-compose.db.yml        # TimescaleDB + Redis stack
└── launch.sh                    # Start backend + frontend
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | FastAPI, Python 3.12 |
| **Frontend** | Next.js 15, React 18, TypeScript, Tailwind CSS |
| **Database** | TimescaleDB (PostgreSQL 15) - dual instances (EOD + intraday) |
| **Cache** | Redis 7 |
| **AI Agents** | CrewAI, LangChain |
| **LLM** | OpenAI GPT-4o (configurable) |
| **Deep Research** | Tavily API, GPT-Researcher |
| **Market Data** | EODHD API (50+ endpoints) |
| **Portfolio** | PyPortfolioOpt (MVO, Black-Litterman) |
| **Charts** | Recharts, Chart.js, Lightweight Charts (TradingView) |

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- Docker & Docker Compose

### 1. Start database services

```bash
docker compose -f docker-compose.db.yml up -d
```

This starts:
- **TimescaleDB** (port 5432) - EOD and fundamental data
- **TimescaleDB** (port 5433) - Intraday data
- **Redis** (port 6379) - Caching
- **pgAdmin** (port 5050) - Database management UI
- **Redis Commander** (port 8081) - Cache visualization

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys
```

Required keys:
```env
OPENAI_API_KEY=your-openai-key
EODHD_API_KEY=your-eodhd-key

# Optional
TAVILY_API_KEY=your-tavily-key    # For deep research
MODEL_NAME=gpt-4o                 # LLM model
```

### 3. Launch the app

```bash
bash launch.sh
```

Or manually:
```bash
# Backend
cd backend && source venv/bin/activate && python main.py

# Frontend (separate terminal)
cd frontend && PORT=3004 npm run dev
```

### Access Points

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3004 |
| **Backend API** | http://localhost:8000 |
| **API Docs** | http://localhost:8000/docs |
| **pgAdmin** | http://localhost:5050 |
| **Redis Commander** | http://localhost:8081 |

---

## API Overview

| Category | Endpoints | Description |
|----------|-----------|-------------|
| `/analyzer` | Stock analysis chat | AI-powered fundamental analysis |
| `/ai-analysis` | MarketSense signals | Multi-agent trading recommendations |
| `/sec-filings` | SEC RAG | Filing search, upload, Q&A |
| `/pair-trading` | Pair analysis | Cointegration, z-scores, signals |
| `/api/portfolios` | Portfolio CRUD | Create, analyze, optimize portfolios |
| `/equity` | Quantitative | Monte Carlo, VaR, returns, beta |
| `/historical` | Price data | EOD and intraday OHLCV |
| `/technical` | Indicators | 30+ technical indicators, screener |
| `/news` | News & sentiment | Financial news, social mentions |
| `/macro` | Macro data | Economic indicators, calendar |
| `/corporate` | Corporate actions | Dividends, splits, insider trades |
| `/special` | Special data | ETF holdings, ESG, analyst ratings |
| `/admin` | Database management | Population, ingestion, stats |

Full interactive documentation at `/docs` (Swagger UI).

---

## License

Apache License 2.0 - see [LICENSE](LICENSE.md).

This project is for research and personal development. Commercial use of market data must comply with EODHD and OpenAI licensing terms.

---

## Disclaimer

This application is provided for informational and educational purposes only. Nothing in this repository constitutes financial advice. Users are solely responsible for their own investment decisions. Past performance is not indicative of future results.

---

## Author

**S.M. Laignel** - [GitHub](https://github.com/SL-Mar) | [Substack](https://quantcoderfs.substack.com)
