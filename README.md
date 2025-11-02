[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

<p align="center">
  <img src="frontend/logocwf.png" alt="Chat with Fundamentals Logo" width="100"/>
</p>

# Chat with Fundamentals — AI-powered Fundamental Analysis and Portfolio Management

**Chat with Fundamentals** is a full-stack financial research and portfolio management platform that combines AI-powered fundamental analysis with advanced quantitative portfolio optimization.

Built with **CrewAI**, **LangChain**, **FastAPI**, **Next.js**, **PostgreSQL**, **Redis**, and **EODHD APIs** market data.

<p align="center">
  <img src="Documentation/CWF_demo8.png" alt="Application Overview" width="400"/>
</p>

---

## Project Philosophy

Chat with Fundamentals is not intended to be a SaaS platform.
It is a **research engine** designed to explore how autonomous agents and AI can automate and enhance financial analysis and portfolio management.

Built to be **local-first** and **tailored to user needs** through the refinement and upgrade of AI and quantitative workflows.
All LLM interactions are logged and saved for reproducibility.

<p align="center">
  <img src="Documentation/CWF_demoi1.png" alt="Demo view" width="400"/>
</p>

**Key principles:**

- **Modularity**: Workflows, agents, and portfolio tools are designed independently
- **Reproducibility**: All steps (query, fetch, summarize, optimize) are transparent and testable
- **Minimal Overhead**: Lightweight backend with PostgreSQL + Redis
- **User Ownership**: Users bring their own API keys (OpenAI, EODHD)
- **Shares-Based Portfolio Management**: Real-world portfolio tracking with integer share quantities

---

## 🆕 What's New

### Portfolio Management System (Current Branch: `feat-portfolio`)
- **Share-based portfolio tracking** - Manage portfolios with actual share quantities
- **Multiple optimization strategies**:
  - Actual Portfolio (your current holdings)
  - Equal Weight allocation
  - Mean-Variance Optimization (MVO)
  - Minimum Variance
  - Black-Litterman model
- **Advanced risk metrics**:
  - Rolling Sharpe ratios (20-day, 60-day lookback periods)
  - Value at Risk (VaR) and Conditional VaR (CVaR)
  - Maximum drawdown
  - Monte Carlo simulation (1000+ paths)
- **Portfolio rebalancing recommendations** based on comparative analysis
- **Equity curve visualization** - All strategies normalized to $10,000 baseline for fair comparison
- **Rolling Sharpe ratio evolution charts** - Track risk-adjusted performance over time

### Data Layer Enhancements
- **PostgreSQL database** with SQLAlchemy ORM for persistent storage
- **Redis caching** for high-performance data retrieval
- **Background data ingestion** workers for OHLCV, fundamentals, news
- **Automated cache warming** for popular tickers

---

## Project Structure

```
chat-with-fundamentals/
├── backend/
│   ├── agents/              # CrewAI agents (fundamental interpreter, portfolio analyst)
│   ├── core/                # Configuration, logging, LLM settings
│   ├── database/            # SQLAlchemy models, schemas, PostgreSQL connection
│   ├── models/              # Pydantic models for finance data
│   ├── routers/             # API routes
│   │   ├── portfolios.py    # 🆕 Portfolio CRUD, analysis, optimization
│   │   ├── analyzer.py      # AI-powered stock analysis
│   │   ├── simulater.py     # Monte Carlo simulation
│   │   └── quantanalyzer.py # Quantitative analytics
│   ├── services/            # Business logic
│   │   ├── data_service.py  # Data fetching and caching
│   │   ├── redis_cache.py   # Redis cache management
│   │   └── ingestion/       # Background workers
│   ├── tools/               # EODHD API tools
│   │   ├── eodhd_client/    # Comprehensive EODHD API client (50+ endpoints)
│   │   ├── EODHDTool.py     # Legacy tool (backward compatible)
│   │   └── EODHDNewsTool.py
│   ├── utils/               # Helper functions
│   ├── workflows/           # CrewAI-based orchestration
│   ├── venv/                # Virtual environment
│   ├── .env                 # Environment variables
│   └── main.py              # FastAPI entry point
│
├── frontend/
│   ├── pages/
│   │   ├── portfolios/      # 🆕 Portfolio management UI
│   │   │   ├── index.tsx    # Portfolio list
│   │   │   └── [id].tsx     # Portfolio detail with analysis
│   │   ├── stocks/          # Stock research UI
│   │   └── index.tsx        # Home page
│   ├── components/          # React components
│   ├── lib/                 # API client, utilities
│   └── styles/              # Tailwind CSS
│
├── docker-compose.yml       # PostgreSQL + Redis + pgAdmin + Redis Commander
├── deploy.sh / deploy.bat   # Deployment scripts
├── launch.sh / launch.bat   # Launch scripts
└── README.md
```

---

## 🆕 Comprehensive EODHD API Integration

Chat with Fundamentals features a **complete EODHD API client** with access to **50+ endpoints** across **9 categories**:

- 📈 **Historical Data** — EOD, Intraday (1m/5m/1h), Live prices, Tick data, Options
- 📊 **Fundamental Data** — Company fundamentals, Earnings/IPO calendars, Insider transactions, Bonds, Crypto
- 🏦 **Exchange Data** — 60+ global exchanges, Symbol search, Trading hours
- 💰 **Corporate Actions** — Dividends, Splits, Bulk data downloads
- 📉 **Technical Analysis** — 30+ indicators (RSI, MACD, SMA, Bollinger Bands), Stock screener
- 📰 **News & Sentiment** — Financial news, Sentiment analysis, Social media mentions
- 🌟 **Special Data** — ETF holdings, ESG scores, Analyst ratings, Company logos
- 🌍 **Macro Data** — Economic indicators (GDP, inflation), Economic calendar
- 👤 **Account API** — Usage tracking, API limits

### Quick Start with EODHD Client

```python
from backend.tools.eodhd_client import EODHDClient

client = EODHDClient()  # Uses EODHD_API_KEY env var

# Get historical data
eod = client.historical.get_eod("AAPL.US", from_date="2024-01-01")

# Get live price
live = client.historical.get_live_price("TSLA.US")

# Get fundamentals
fundamentals = client.fundamental.get_fundamentals("AAPL.US")

# Get news
news = client.news.get_news("AAPL", limit=10)

# Technical indicators
rsi = client.technical.get_technical_indicator("AAPL.US", "rsi", period=14)

# Screen stocks
stocks = client.technical.screen_stocks(
    filters=["market_capitalization>10000000000", "pe_ratio<30"],
    limit=20
)
```

📖 **Full Documentation:** See [`backend/tools/eodhd_client/README.md`](backend/tools/eodhd_client/README.md)

---

## Deployment

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **Docker & Docker Compose** (for PostgreSQL + Redis)

### 🔹 Linux/macOS

```bash
# 1. Deploy dependencies
bash deploy.sh

# 2. Start database services
docker-compose up -d

# 3. Configure environment
cp .env.model .env
# Edit .env with your API keys
```

### 🔹 Windows

```bat
REM 1. Deploy dependencies
deploy.bat

REM 2. Start database services
docker-compose up -d

REM 3. Configure environment
copy .env.model .env
REM Edit .env with your API keys
```

### Environment Variables (.env)

```env
# API Keys
OPENAI_API_KEY=your-openai-key
EODHD_API_KEY=your-eodhd-key

# LLM Configuration
MODEL_NAME=gpt-4o

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chatfundamentals

# Redis
REDIS_URL=redis://localhost:6379/0

# Application
APP_API_KEY=optional-api-key-for-auth
```

---

## Launch

Once installed, launch the full application stack with a single command.

### 🔹 Linux/macOS

```bash
bash launch.sh
```

### 🔹 Windows

```bat
launch.bat
```

These launch scripts will:

- Open the project in VS Code
- Start the frontend (Next.js) at http://localhost:3000
- Start the backend (FastAPI) at http://localhost:8000
- Open both interfaces in your default web browser

**Access Points:**
- **Frontend**: http://localhost:3000
- **Backend API Docs**: http://localhost:8000/docs
- **pgAdmin**: http://localhost:5050 (admin@admin.com / admin)
- **Redis Commander**: http://localhost:8081

---

## Core Features

### 📊 Stock Research & Analysis

#### Single-Ticker Research

- **Example Query**: `"Is TSLA a good buy?"`
- **Workflow**:
  - Parses the query and identifies TSLA as the target ticker
  - Fetches latest OHLCV data, fundamental metrics, and recent news
  - Generates an LLM-written executive summary
  - Saves raw data in structured JSON and PostgreSQL
  - Provides extended analytics:
    - TradingView-style financial chart
    - Monte Carlo simulation of future stock paths
    - Value at Risk (VaR) estimation
    - Daily returns distribution analysis
    - Correlation and beta scatter plot versus benchmark
    - 3-year cumulative returns comparison

<p align="center">
  <img src="Documentation/CWF_demoi1.png" alt="Single Ticker Analysis" width="400"/>
</p>

#### Comparative Research

- **Example Query**: `"Compare TSLA and AMZN"`
- **Workflow**:
  - Parses multiple tickers (TSLA, AMZN)
  - Fetches fundamentals, OHLCV data, and news for both
  - Constructs comparative executive summary:
    - Relative financial performance
    - Recent price action comparison
    - News sentiment comparison
  - Provides side-by-side analytics

<p align="center">
  <img src="Documentation/CWF_demo9.png" alt="Comparative Analysis" width="400"/>
</p>

---

### 💼 Portfolio Management

#### Portfolio Operations

- **Create portfolios** with custom names and descriptions
- **Add stocks** by ticker with share quantities
- **Update share quantities** dynamically
- **Remove stocks** from portfolio
- **View all portfolios** with summary statistics

#### Portfolio Analysis Methods

1. **Actual Portfolio**
   - Track performance based on your actual share quantities
   - Normalized to $10,000 baseline for comparison
   - Historical equity curve evolution
   - Rolling Sharpe ratios (20-day, 60-day)

2. **Equal Weight**
   - Equal dollar allocation across all holdings
   - Baseline comparison strategy

3. **Mean-Variance Optimization (MVO)**
   - Maximize Sharpe ratio
   - Optimal allocation based on historical returns and covariance

4. **Minimum Variance**
   - Minimize portfolio volatility
   - Conservative risk management

5. **Black-Litterman**
   - Combine market equilibrium with investor views
   - Sophisticated Bayesian approach

#### Performance Metrics

- **Total Return** - Percentage gain/loss over period
- **Annualized Return** - Expected yearly return (252 trading days)
- **Volatility** - Annualized standard deviation
- **Sharpe Ratio** - Risk-adjusted return (assuming 0% risk-free rate)
- **Max Drawdown** - Largest peak-to-trough decline
- **Rolling Sharpe (20d, 60d)** - Time-varying risk-adjusted performance

#### Risk Analysis

- **Monte Carlo Simulation**
  - 1000+ simulated price paths
  - User-defined time horizon (default: 252 days)
  - 5th and 95th percentile bounds
  - Visual confidence intervals

- **Value at Risk (VaR)**
  - 95% confidence level
  - Historical VaR (empirical distribution)
  - Parametric VaR (normal distribution assumption)
  - Conditional VaR (expected shortfall)

#### Rebalancing Recommendations

- AI-generated insights comparing actual vs optimized allocations
- Identifies opportunities to improve risk-adjusted returns
- Considers transaction costs and investment goals
- Clear actionable advice (Hold, Rebalance for Sharpe, Reduce Risk)

---

## Built-in Quantitative Analytics

- **Monte Carlo Simulation**: Future stock path modeling over user-defined horizons
- **Value at Risk (VaR) and Expected Shortfall (ES)**: Quantitative risk estimates
- **Return Distribution Histograms**: Visualizing daily return variability
- **Beta and R² Scatter Plots**: Correlation analysis against benchmarks
- **3-Year Cumulative Return Comparison**: Ticker vs benchmark over multiple years
- **Rolling Sharpe Ratios**: Time-varying risk-adjusted performance (20-day, 60-day windows)

<p align="center">
  <img src="Documentation/CWF_demo3.png" alt="Quant Analysis" width="400"/>
</p>

### Planned Enhancements

- Volatility bands and regime-change indicators
- Calendar heatmaps of returns
- Autocorrelation (ACF/PACF) plots
- Volatility cones
- Drawdown and underwater curve visualizations
- Efficient frontier visualization
- Factor analysis and attribution

---

## API Endpoints

### Stock Analysis

- `GET /equity/simulate?ticker=TSLA&horizon=20` — Monte Carlo simulation
- `GET /equity/returns?ticker=AAPL&years=3&benchmark=SPY` — Daily returns & beta
- `GET /equity/cumret?ticker=GOOG&years=5&benchmark=SPY` — Cumulative returns

### Portfolio Management

- `POST /api/portfolios` — Create new portfolio
- `GET /api/portfolios` — List all portfolios
- `GET /api/portfolios/{id}` — Get portfolio details
- `PUT /api/portfolios/{id}` — Update portfolio
- `DELETE /api/portfolios/{id}` — Delete portfolio

#### Portfolio Operations

- `POST /api/portfolios/{id}/stocks` — Add stock to portfolio
- `DELETE /api/portfolios/{id}/stocks/{stock_id}` — Remove stock
- `PUT /api/portfolios/{id}/shares` — Update share quantities

#### Portfolio Analysis

- `GET /api/portfolios/{id}/analysis/actual` — Actual portfolio performance
- `GET /api/portfolios/{id}/analysis/equal-weight` — Equal weight allocation
- `GET /api/portfolios/{id}/analysis/optimized?method=mvo` — Optimized allocation
  - Methods: `mvo`, `min_variance`, `black_litterman`

#### Portfolio Risk

- `GET /api/portfolios/{id}/monte-carlo` — Monte Carlo simulation
- `GET /api/portfolios/{id}/var` — Value at Risk analysis

#### Portfolio Utilities

- `POST /api/portfolios/weights-to-shares` — Convert weights to share quantities

---

## Technology Stack

### Backend

- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for PostgreSQL
- **Redis** - Caching layer
- **CrewAI** - Agent orchestration
- **LangChain** - LLM integration
- **PyPortfolioOpt** - Portfolio optimization
- **NumPy/Pandas** - Numerical computing
- **Pydantic** - Data validation

### Frontend

- **Next.js 13+** - React framework
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Data visualization
- **Font Awesome** - Icons

### Data & Infrastructure

- **PostgreSQL** - Relational database
- **Redis** - In-memory cache
- **Docker Compose** - Container orchestration
- **EODHD APIs** - Market data provider

---

## Example Programmatic Usage

### Stock Analysis

```python
from backend.workflows.analyze import FundamentalFlow

flow = FundamentalFlow()
result = flow.invoke(inputs={
    "user_query": "Analyze AAPL and TSLA fundamentals and forecast returns"
})
print(result.model_dump_json(indent=2))
```

### Portfolio Management

```python
from backend.database.session import SessionLocal
from backend.routers.portfolios import create_portfolio, add_stock_to_portfolio

db = SessionLocal()

# Create portfolio
portfolio = create_portfolio(db, name="Tech Growth", description="High-growth tech stocks")

# Add stocks
add_stock_to_portfolio(db, portfolio.id, ticker="AAPL", shares=10)
add_stock_to_portfolio(db, portfolio.id, ticker="MSFT", shares=15)
add_stock_to_portfolio(db, portfolio.id, ticker="GOOGL", shares=5)
```

---

## Database Schema

### Core Tables

- **companies** - Company metadata (ticker, name, sector, market cap)
- **ohlcv** - Historical price data (open, high, low, close, volume)
- **fundamentals** - Financial metrics (P/E, EPS, revenue, etc.)
- **news** - Company news articles with sentiment
- **portfolios** - User portfolios
- **portfolio_stocks** - Portfolio holdings (ticker, shares, weights)

---

## Development

### Running Backend Only

```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python main.py
```

### Running Frontend Only

```bash
cd frontend
npm run dev
```

### Database Migrations (Alembic)

```bash
cd backend
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

### Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

---

## Changelog

### November 2025 (feat-portfolio branch)
- 🚀 **Portfolio Management System**
  - Share-based portfolio tracking with integer quantities
  - 5 portfolio optimization methods (Actual, Equal Weight, MVO, Min Variance, Black-Litterman)
  - Rolling Sharpe ratio curves (20-day, 60-day)
  - Monte Carlo simulation with 1000+ paths
  - VaR and CVaR risk metrics
  - Equity curve comparison with $10,000 baseline normalization
  - Rebalancing recommendations
  - Portfolio CRUD operations
  - Shares-to-weights conversion
- 📊 **Data Layer Enhancements**
  - PostgreSQL database with SQLAlchemy ORM
  - Redis caching with automated warming
  - Background data ingestion workers
  - Optimized query performance

### October 2025
- 🚀 **Major Update**: Comprehensive EODHD API client with 50+ endpoints
- Added 9 endpoint categories: Historical, Fundamental, Exchange, Corporate, Technical, News, Special, Macro, User
- Complete documentation and testing guides
- 30+ technical indicators available
- Stock screener functionality
- Full backward compatibility maintained

### May 2025
- Added volatility and performance ratios
- Began refactoring backend with SmolAgents architecture
- Moving to local-first model with Hugging Face

---

## Roadmap

### Short-term
- [ ] Merge `feat-portfolio` branch to `main`
- [ ] Add efficient frontier visualization
- [ ] Implement factor analysis (Fama-French)
- [ ] Portfolio rebalancing automation
- [ ] Tax-loss harvesting optimization

### Medium-term
- [ ] Multi-asset class support (bonds, commodities, crypto)
- [ ] Options portfolio management
- [ ] Backtesting framework
- [ ] Strategy templates and presets
- [ ] Export to CSV/Excel

### Long-term
- [ ] Mobile app (React Native)
- [ ] Real-time portfolio tracking
- [ ] Social features (share portfolios, strategies)
- [ ] Machine learning price predictions
- [ ] Sentiment analysis integration

---

## Contributing

Contributions are welcome! This project is primarily for research and personal development.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

This project is intended for research and personal development use. Commercial deployments must comply with **OpenAI** and **EODHD** licensing terms.

---

## Disclaimer

This application and its associated research outputs are provided solely for informational and educational purposes. Nothing contained within this repository, its documentation, or its outputs should be construed as financial advice, or as an offer, recommendation, or solicitation to buy or sell any security, product, or service.

Users are solely responsible for their own investment and trading decisions.
The author(s) make no representations or warranties as to the accuracy, completeness, or suitability of the content for any purpose.
By using this application, you acknowledge that you must exercise independent judgment, conduct your own due diligence, and refer to the Terms of Use and Disclaimer pages provided within the application.

**Past performance is not indicative of future results. All investments carry risk, including the potential loss of principal.**

---

## Author

<p align="center">
  <b>S.M. Laignel</b><br>
  Founder of <b>SL MAR</b> consultancy<br>
  Quant Developer — modular automation for research workflows in quantitative finance.<br><br>
  🌐 <a href="https://quantcoderfs.substack.com">Substack — QuantCoderFS R&D</a><br>
  💻 <a href="https://github.com/sl-mar/chat-with-fundamentals">GitHub Repository</a>
</p>

---

## Acknowledgments

- **EODHD** for comprehensive financial data APIs
- **OpenAI** for GPT-4 and language models
- **CrewAI** for agent orchestration framework
- **PyPortfolioOpt** for portfolio optimization algorithms
- The open-source community for invaluable tools and libraries

---

## Support

For questions, issues, or feature requests:

- 📧 Email: contact@quantcoderfs.com
- 🐛 Issues: [GitHub Issues](https://github.com/sl-mar/chat-with-fundamentals/issues)
- 📖 Documentation: See individual component READMEs
- 💬 Discussions: [GitHub Discussions](https://github.com/sl-mar/chat-with-fundamentals/discussions)

---

**⭐ If you find this project useful, please consider starring the repository!**
