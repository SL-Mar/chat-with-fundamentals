[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

# Chat with Fundamentals v2

> **This project is no longer actively developed.** Chat with Fundamentals has been superseded by [**QuantMar**](https://slmar.co/solutions.html), which unifies factor analysis, strategy SDK, backtesting, and live deployment into a single framework. See the [Solutions page](https://slmar.co/solutions.html) for details.
>
> The previous version (v1) is preserved on the [`legacy/v1`](../../tree/legacy/v1) branch.

Universe-based factor analysis platform. Create scoped datasets ("universes") from ETF holdings or sector screens, ingest OHLCV + fundamentals via EODHD, and analyze data through a chat-driven code agent that writes and executes Python in a sandboxed environment.

---

## Architecture

```
Frontend (Next.js 14 + Tailwind)         Port 3006
  Pages: Home | Create Universe | Workspace | Settings
  Charts: lightweight-charts v5 (candlestick, line)
                     │
                     │ REST + WebSocket
                     ▼
Backend (FastAPI)                         Port 8001
  4 routers: universes | chat | settings | health
  LLM: qwen2.5-coder:14b (Ollama) + Claude (Anthropic fallback)
  Sandbox: Docker container for code execution
                     │
                     ▼
Data Layer
  TimescaleDB 15 (port 5435) — one DB per universe + registry
  Redis 7 (port 6381) — caching
```

## Key Features

- **Universe creation** from ETF holdings (SPY, QQQ, XLK, ...) or EODHD sector screens
- **Multi-granularity OHLCV** ingestion (daily, 1h, 5m) with TimescaleDB hypertables
- **Fundamentals ingestion** — 50+ fields per ticker (valuation, profitability, balance sheet, cash flow)
- **Code agent chat** — ask questions in natural language, LLM generates Python, executes in Docker sandbox
- **Three agent types**: fundamentals query, factor library (Piotroski F-Score, momentum, value), ML training
- **Output formatting** — LLM-formatted markdown tables with color-coded cells, raw output toggle
- **Collapsible syntax-highlighted code blocks** in chat
- **Zustand state management** — 4 stores (universe, chat, workspace, settings)

## Universe Sources

| Source | Method | Example |
|--------|--------|---------|
| ETF Holdings | EODHD `ETF_Data::Holdings` | SPY → 50 tickers (NVDA, AAPL, MSFT, ...) |
| Sector Screen | EODHD Screener API | Healthcare → up to 1000 tickers |

## Quick Start

```bash
# 1. Infrastructure
docker compose up -d   # TimescaleDB + Redis

# 2. Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Set EODHD_API_KEY, ANTHROPIC_API_KEY
uvicorn main:app --port 8001 --reload

# 3. Sandbox image (for code execution)
cd backend/sandbox && docker build -t cwf-sandbox .

# 4. Frontend
cd frontend
npm install
npx next dev -p 3006
```

Or use the launch script:
```bash
./launch.sh start   # starts everything
./launch.sh status  # check health
./launch.sh stop    # tear down
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, Tailwind CSS, Zustand, lightweight-charts v5, prism-react-renderer |
| Backend | FastAPI, SQLAlchemy 2.0 (async), Pydantic v2 |
| Database | TimescaleDB 15 (PostgreSQL), Redis 7 |
| LLM | Ollama (qwen2.5-coder:14b) + Anthropic Claude (fallback) |
| Sandbox | Docker (Python 3.12 + pandas/numpy/scikit-learn/matplotlib) |
| Data | EODHD API (screener, OHLCV, fundamentals, ETF holdings) |

## Project Structure

```
backend/
  main.py                    # FastAPI app (4 routers)
  agents/                    # LLM pipeline, prompts, validation, retry
  database/                  # Universe registry + per-universe DB manager
  ingestion/                 # EODHD data populator (sector + ETF)
  routers/                   # universes, chat, settings, health
  sandbox/                   # Docker-based code execution
  services/                  # Universe + chat agent services

frontend/
  pages/                     # index, universe/new, universe/[id], settings
  components/                # charts, workspace tabs, universe cards
  stores/                    # Zustand (universe, chat, workspace, settings)
  types/                     # TypeScript interfaces
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/universes` | Create universe (ETF or sector) |
| GET | `/api/universes` | List all universes |
| GET | `/api/universes/{id}` | Universe detail + tickers |
| DELETE | `/api/universes/{id}` | Delete universe + drop DB |
| POST | `/api/universes/{id}/refresh` | Re-ingest data |
| GET | `/api/universes/{id}/progress` | Ingestion progress |
| GET | `/api/universes/{id}/data/ohlcv` | Query OHLCV |
| GET | `/api/universes/{id}/data/fundamentals` | Query fundamentals |
| POST | `/api/universes/{id}/chat` | Code agent chat |
| GET | `/api/health` | System health |

## License

Apache 2.0 — see [LICENSE](LICENSE).
