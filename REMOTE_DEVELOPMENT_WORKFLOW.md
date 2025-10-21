# Remote Development Workflow - chat-with-fundamentals

## Project Overview

**chat-with-fundamentals** is evolving into a full backtesting platform for algorithmic trading strategies, complementing quantcoderfs-v2 (equities & strategies research).

## Development Timeline

**Next 2 Months**: Development exclusively on remote repositories (GitHub)
**After 2 Months**: Code review and local repository synchronization

---

## Architecture

### Backend (FastAPI + Python)
- **Port**: 8000
- **Framework**: FastAPI
- **Key Features**:
  - EODHD API integration for financial data
  - Technical indicators (RSI, SMA, MACD, Bollinger Bands, etc.)
  - Earnings calendar, IPO calendar, stock splits
  - Stock screener
  - AI-powered fundamental analysis (CrewAI agents)

### Frontend (Next.js + TypeScript)
- **Port**: 3003
- **Framework**: Next.js (Pages Router)
- **Key Features**:
  - Chat interface for fundamental analysis
  - QuantAnalyze page with candlestick charts
  - Technical indicator toggles (SMA 20/50/200, Bollinger Bands)
  - Earnings calendar integration
  - Stock screener interface

---

## Recent Changes (October 2025)

### UX Redesign
Per user requirements:
1. **Stock Screener**: Integrated into chat interface (natural language queries)
2. **Earnings Calendar**: Contextual panel on stock detail pages
3. **Technical Indicators**: Toggle buttons on candlestick charts

### Technical Fixes
1. **Backend**:
   - Fixed `/technical/indicator` endpoint return type (was returning `Dict`, now returns `List[Dict]`)
   - Disabled auto-reload in `main.py` to prevent infinite reload loops

2. **Frontend**:
   - Created `EarningsCalendar.tsx` component
   - Integrated calendar into `quantanalyze.tsx`
   - Added technical indicator toggle buttons to `ComboChartResponsive.tsx`

---

## Directory Structure

```
chat-with-fundamentals/
├── backend/
│   ├── main.py                 # FastAPI entry point
│   ├── routers/
│   │   ├── analyzer.py         # AI-powered analysis
│   │   ├── quantanalyzer.py    # Technical analysis
│   │   ├── technical.py        # Technical indicators & screener
│   │   ├── calendar.py         # Earnings, IPOs, splits
│   │   └── simulater.py        # Monte Carlo simulation
│   ├── agents/
│   │   └── analyze_agents.py   # CrewAI agents
│   ├── tools/
│   │   ├── EODHDTool.py        # Fundamental data
│   │   ├── EODTool.py          # OHLCV data
│   │   └── EODHDNewsTool.py    # News data
│   ├── core/
│   │   ├── config.py           # Settings
│   │   ├── llm_provider.py     # LLM configuration
│   │   └── logger_config.py    # Logging
│   └── venv/                   # Virtual environment
│
└── frontend/
    ├── pages/
    │   ├── chat.tsx            # Fundamental analysis chat
    │   ├── quantanalyze.tsx    # Technical analysis page
    │   ├── screener.tsx        # Stock screener
    │   └── calendar.tsx        # Earnings calendar
    ├── components/
    │   ├── ComboChartResponsive.tsx    # Candlestick charts
    │   └── EarningsCalendar.tsx        # Earnings panel
    └── lib/
        └── api.ts              # API client
```

---

## Development Workflow

### 1. Remote Development (GitHub)
All development happens on GitHub for the next 2 months:

1. **Clone/Pull Latest**:
   ```bash
   git pull origin master  # or dev
   ```

2. **Create Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Develop & Commit**:
   ```bash
   git add .
   git commit -m "Feature: your feature description"
   ```

4. **Push to Remote**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request** on GitHub

### 2. Code Review Phase (After 2 Months)
- Review all remote changes
- Test locally
- Sync local repositories

---

## Environment Variables

### Backend (.env)
```env
EODHD_API_KEY=your_api_key_here
OPENAI_API_KEY=your_openai_key
MODEL_NAME=gpt-4-turbo-preview
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## API Endpoints

### Technical Indicators
- `GET /technical/indicator?ticker=AAPL&function=rsi&period=14`
- Supported indicators: sma, ema, rsi, macd, bbands, stochastic, adx, atr, williams

### Calendar
- `GET /calendar/earnings?from_date=2025-01-01&to_date=2025-12-31&symbols=AAPL`
- `GET /calendar/ipos?from_date=2025-01-01&to_date=2025-12-31`
- `GET /calendar/splits?from_date=2025-01-01&to_date=2025-12-31`

### Screener
- `GET /technical/screener?filters=[...]&signals=50d_new_hi&sort=market_capitalization.desc`

### Fundamental Analysis
- `POST /analyze` - AI-powered analysis with CrewAI agents

---

## Known Issues & TODO

### Current Issues
1. Backend crashes on startup due to agent LLM initialization
   - **Workaround**: Ensure correct venv is activated
   - **Fix needed**: Review agent initialization in `analyze_agents.py`

2. Auto-reload causes infinite loop
   - **Fixed**: Set `reload=False` in `main.py`

### Roadmap for Backtesting Platform

#### Phase 1: Data Infrastructure (Months 1-2)
- [ ] Implement data caching layer
- [ ] Add more technical indicators
- [ ] Historical data storage (SQLite or PostgreSQL)
- [ ] Data quality checks and cleanup

#### Phase 2: Backtesting Engine (Months 3-4)
- [ ] Strategy definition framework
- [ ] Event-driven backtesting engine
- [ ] Position sizing and risk management
- [ ] Slippage and commission modeling

#### Phase 3: Performance Analytics (Months 5-6)
- [ ] Equity curve visualization
- [ ] Sharpe ratio, Sortino ratio, max drawdown
- [ ] Monte Carlo simulation for risk analysis
- [ ] Strategy comparison tools

#### Phase 4: Optimization (Months 7-8)
- [ ] Parameter optimization grid search
- [ ] Walk-forward analysis
- [ ] Overfitting detection
- [ ] Sensitivity analysis

---

## Integration with quantcoderfs-v2

**Separation of Concerns**:
- **quantcoderfs-v2**: Strategy research, idea generation, live trading
- **chat-with-fundamentals**: Backtesting, historical analysis, performance validation

**Data Sharing**:
- Export strategies from quantcoderfs-v2
- Import and backtest in chat-with-fundamentals
- Share EODHD API key and credentials

---

## Testing

### Backend
```bash
cd backend
source venv/bin/activate
pytest
```

### Frontend
```bash
cd frontend
npm test
```

---

## Deployment

### Local Development
```bash
# Backend
cd backend
source venv/bin/activate
export EODHD_API_KEY="your_key"
python main.py

# Frontend
cd frontend
PORT=3003 npm run dev
```

### Production (Future)
- Docker containerization
- CI/CD pipeline with GitHub Actions
- Cloud deployment (AWS/GCP/Azure)

---

## Contributing

1. Follow remote development workflow
2. Commit messages: Use conventional commits format
3. Code style:
   - Backend: PEP8 (Python)
   - Frontend: ESLint + Prettier (TypeScript)
4. All changes reviewed before local sync

---

## Contact

**Developer**: Sebastien M. Laignel
**Email**: smr.laignel@gmail.com
**Development Period**: October 2025 - December 2025 (Remote)

---

## License

Copyright 2024 SL MAR - Sebastien M. LAIGNEL
Licensed under the Apache License, Version 2.0
