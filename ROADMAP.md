# Chat with Fundamentals - Development Roadmap

**Version:** Phase 2D → Phase 3+
**Last Updated:** 2025-10-24
**Active Branch:** `claude/code-review-011CULXMkGpoFpPQ3FQGco1T`

---

## Git Workflow & Branch Management

### Active Branches

**Current Development:**
- ✅ **`claude/code-review-011CULXMkGpoFpPQ3FQGco1T`** - Most advanced, all Phase 2D work complete
  - Continue working here for Phase 3
  - All commits from today's session (CVX fixes, documentation)
  - Ready for Phase 3 development

**Stable Branches:**
- ✅ **`dev`** - Merge feature branch here when Phase 3 complete and tested
- ✅ **`master`** - Production/release branch (merge from dev when stable)

**Deleted:**
- ❌ `claude/investigate-typo-011CURVZy781EuJJwfpGT6i5` - Removed (all commits now in current branch)

### Workflow for Phase Completion

**When Phase 3 Complete:**
```bash
# Merge to dev
git checkout dev
git merge claude/code-review-011CULXMkGpoFpPQ3FQGco1T
git push origin dev

# Delete feature branch (optional)
git branch -d claude/code-review-011CULXMkGpoFpPQ3FQGco1T
git push origin --delete claude/code-review-011CULXMkGpoFpPQ3FQGco1T
```

**When Ready for Production:**
```bash
# Merge dev to master
git checkout master
git merge dev
git push origin master

# Tag release
git tag -a v2.0 -m "Phase 2D + Phase 3 complete"
git push origin v2.0
```

---

## Vision

Build a comprehensive **quantitative equity research platform** combining:
- Multi-decade historical EOD and fundamental data for 1,500+ US stocks
- ML-driven alpha extraction using factor mining, graph learning, and reinforcement learning
- Intraday breakout detection for small-cap day trading
- Backtesting engine with transaction costs and slippage
- Portfolio-level analysis (not just individual stocks)
- Academic documentation of all methodologies

**End Goal:** A production-ready system for systematic alpha generation following the **Mega-Alpha** approach: dynamic factor discovery, ensemble learning, and adaptive weighting across market regimes.

---

## Phase Structure

### Phase 1: Foundation (✅ Complete)
- FastAPI + PostgreSQL + Next.js architecture
- EODHD API integration
- Basic chat interface
- OpenAI GPT integration

### Phase 2: Database-First Infrastructure (🔄 In Progress)
- **2A:** Database schema and models ✅
- **2B:** ETF-based population ✅
- **2C:** Cache warming and monitoring ✅
- **2D:** Incremental data refresh ⚠️ (code complete, testing ongoing)

### Phase 3: Data Integrity & Display (🎯 Next)
- **3A:** Fix frontend components (charts, panels)
- **3B:** Configurable dashboards (no AI required)
- **3C:** Complete endpoint testing
- **3D:** Intraday data pipeline (new database schema)

### Phase 4: Alpha Extraction Framework (📋 Planned)
- **4A:** Feature engineering pipeline
- **4B:** Factor mining (value, momentum, quality, growth)
- **4C:** ML models (LSTM, Transformers, GAT)
- **4D:** Ensemble combination and dynamic weighting

### Phase 5: Advanced ML & Trading (📋 Planned)
- **5A:** Intraday breakout detection (small caps)
- **5B:** Reinforcement learning for portfolio optimization
- **5C:** Graph machine learning (stock similarity networks)
- **5D:** Quantamental hybrid frameworks

### Phase 6: Backtesting & Production (📋 Planned)
- **6A:** Backtesting engine (transaction costs, slippage)
- **6B:** Portfolio-level analysis (replicating QuantCoderFS-v2 approach)
- **6C:** Walk-forward optimization
- **6D:** Live trading integration (paper trading first)

### Phase 7: Documentation & Publication (📋 Planned)
- **7A:** Academic monograph (quantitative methods)
- **7B:** Code documentation and API reference
- **7C:** Research paper submissions
- **7D:** User guides and tutorials

---

## Phase 3: Data Integrity & Display (Current Focus)

### 3A: Fix Frontend Components

**Priority:** 🔴 Critical

**Issues:**
1. **CandlestickChart displays only ~2 years**
   - Backend returns all data correctly (e.g., 7,544 CVX records)
   - Frontend component limits candles artificially
   - **File:** `/frontend/components/TradingViewChart.tsx`
   - **Action:** Remove candle limits, test with full 30-year history

2. **AI-generated panels poor quality**
   - Formatting issues
   - Not leveraging full database capabilities
   - **Action:** Improve panel generation prompts and templates

**Deliverables:**
- [ ] CandlestickChart shows full historical data (from IPO)
- [ ] All panel types render correctly (tables, financials, charts)
- [ ] Responsive design works on different screen sizes
- [ ] Performance optimization for large datasets

**Timeline:** 1-2 weeks

---

### 3B: Configurable Dashboards

**Priority:** 🟡 High

**Rationale:**
- Current system relies on AI to generate panels (inconsistent quality)
- Users need predictable, configurable layouts
- Allow dashboard creation without AI intervention

**Features:**
1. **Dashboard Templates**
   - Pre-built layouts (Technical Analysis, Fundamentals, News, Multi-Stock)
   - Save/load custom configurations
   - Share dashboards via URL

2. **Drag-and-Drop Interface**
   - Add/remove panels dynamically
   - Resize and reposition panels
   - Lock layouts to prevent accidental changes

3. **Panel Library**
   - CandlestickChart (EOD, full history)
   - IntradayChart (minute-level, when available)
   - FinancialsTable (balance sheet, income statement, cash flow)
   - NewsPanel (sentiment analysis)
   - TechnicalIndicators (RSI, MACD, Bollinger Bands)
   - ScreenerResults (multi-stock comparison)

**Tech Stack:**
- `react-grid-layout` for drag-and-drop
- LocalStorage/PostgreSQL for dashboard persistence
- WebSocket for live updates (Phase 5)

**Deliverables:**
- [ ] Dashboard editor UI
- [ ] Save/load dashboard configurations
- [ ] Pre-built templates (5-10 common layouts)
- [ ] Panel library documentation

**Timeline:** 2-3 weeks

---

### 3C: Complete Endpoint Testing

**Priority:** 🟡 High

**Untested Endpoints:**
- `/technical/*` - Technical indicators (RSI, MACD, Bollinger, etc.)
- `/historical/*` - Intraday data (not yet implemented)
- `/news/*` - News articles and sentiment
- `/corporate/*` - Dividends, splits, insider transactions
- `/calendar/*` - Earnings dates, IPOs, splits

**Testing Methodology:**
1. **Unit Tests:** Test each endpoint with valid/invalid inputs
2. **Integration Tests:** Test database queries and API responses
3. **Load Tests:** Verify performance under concurrent requests
4. **Frontend Tests:** Verify panels display data correctly

**Deliverables:**
- [ ] Test suite for all endpoints (pytest)
- [ ] API documentation with examples
- [ ] Performance benchmarks
- [ ] Error handling verification

**Timeline:** 1 week

---

### 3D: Intraday Data Pipeline

**Priority:** 🟢 Medium (Foundation for Phase 5)

**Scope:**
- Minute-level OHLCV data for intraday analysis
- Separate database schema (high volume)
- Focus on small caps (higher volatility, breakout opportunities)

**Database Schema:**
```sql
CREATE TABLE ohlcv_intraday (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    open NUMERIC(12, 4) NOT NULL,
    high NUMERIC(12, 4) NOT NULL,
    low NUMERIC(12, 4) NOT NULL,
    close NUMERIC(12, 4) NOT NULL,
    volume BIGINT NOT NULL,
    UNIQUE(company_id, timestamp)
);

CREATE INDEX idx_intraday_company_timestamp
    ON ohlcv_intraday(company_id, timestamp DESC);
```

**Data Source:**
- EODHD Intraday API (1-minute resolution)
- Store last 30 days rolling window per stock
- Focus on Russell 2000 stocks (small caps)

**Ingestion Strategy:**
- Real-time ingestion during market hours (9:30 AM - 4:00 PM ET)
- Batch updates every 5 minutes (rate limit friendly)
- Purge data older than 30 days (storage optimization)

**Deliverables:**
- [ ] Intraday database schema
- [ ] Ingestion pipeline (real-time)
- [ ] API endpoint `/historical/intraday`
- [ ] Frontend intraday chart component

**Timeline:** 2-3 weeks

---

## Phase 4: Alpha Extraction Framework

### 4A: Feature Engineering Pipeline

**Priority:** 🟢 Medium

**Objective:** Transform raw EOD and fundamental data into predictive features

**Feature Categories:**

1. **Valuation Factors**
   - P/E ratio (trailing, forward)
   - P/B ratio
   - EV/EBITDA
   - Free cash flow yield
   - Dividend yield

2. **Momentum Factors**
   - Price momentum (1m, 3m, 6m, 12m)
   - Earnings momentum
   - Analyst revision momentum
   - Volume-adjusted price trends

3. **Quality Factors**
   - ROE, ROA, ROIC
   - Profit margin trends
   - Earnings stability
   - Debt/equity ratio
   - Interest coverage

4. **Growth Factors**
   - Revenue growth (YoY, QoQ)
   - Earnings growth
   - Book value growth
   - Operating cash flow growth

5. **Technical Indicators**
   - RSI (14-day)
   - MACD
   - Bollinger Bands position
   - Volume ratios

**Normalization:**
- Rolling z-scores (cross-sectional)
- Rank normalization within sectors
- Winsorization (1st/99th percentile)
- PCA for dimensionality reduction

**Deliverables:**
- [ ] Feature calculation engine
- [ ] Cross-sectional normalization pipeline
- [ ] Feature storage (PostgreSQL + Redis cache)
- [ ] API endpoint `/features/{ticker}`

**Timeline:** 3-4 weeks

---

### 4B: Factor Mining

**Priority:** 🟢 Medium

**Objective:** Discover predictive factors dynamically using ML

**Methodology (Following Mega-Alpha Approach):**

1. **Factor Generation**
   - Combine raw features via mathematical operations (+, -, *, /, log, sqrt)
   - Generate 1,000+ candidate factors
   - Use genetic programming for automatic factor discovery

2. **Factor Evaluation**
   - Compute Sharpe ratio for each factor
   - Calculate Information Coefficient (IC) vs. future returns
   - Purged cross-validation (avoid lookahead bias)
   - Walk-forward optimization

3. **Factor Selection**
   - Select top 50-100 factors
   - Remove highly correlated factors (PCA, hierarchical clustering)
   - Re-weight monthly based on recent performance

**Deliverables:**
- [ ] Factor generation engine
- [ ] Factor evaluation framework
- [ ] Dynamic factor selection pipeline
- [ ] Factor performance monitoring dashboard

**Timeline:** 4-6 weeks

---

### 4C: ML Models for Alpha Prediction

**Priority:** 🟢 Medium

**Models:**

1. **LSTM (Long Short-Term Memory)**
   - Capture temporal dependencies in price/fundamentals
   - Input: 60-day rolling window of features
   - Output: Predicted 1-month forward return

2. **Gradient Boosting (XGBoost/LightGBM)**
   - Non-linear feature interactions
   - Input: Current features + engineered factors
   - Output: Probability of outperformance

3. **Transformers**
   - Attention mechanism for cross-stock relationships
   - Input: Multi-stock feature sequences
   - Output: Stock-level alpha predictions

4. **Graph Attention Networks (GAT)**
   - Model stock similarity networks
   - Nodes: Stocks
   - Edges: Similarity (industry, fundamentals, analyst coverage)
   - Output: Alpha propagation across graph

**Training Strategy:**
- **Target:** Forward 1-month returns (rank-based)
- **Loss Function:** Ranking loss (pairwise)
- **Validation:** Rolling out-of-sample (walk-forward)
- **Hyperparameter Tuning:** Bayesian optimization

**Deliverables:**
- [ ] LSTM model implementation
- [ ] Gradient Boosting model
- [ ] Transformer model
- [ ] GAT model
- [ ] Model ensemble framework
- [ ] Performance comparison dashboard

**Timeline:** 6-8 weeks

---

### 4D: Ensemble Combination & Dynamic Weighting

**Priority:** 🟢 Medium

**Objective:** Combine ML model outputs into robust alpha signals

**Approach:**

1. **Static Ensemble**
   - Equal weighting of top models
   - Weighted by validation Sharpe ratio

2. **Dynamic Ensemble**
   - Monthly re-weighting based on recent performance
   - Regime-dependent weighting (bull/bear/sideways)
   - Reinforcement learning for optimal combination

3. **Hierarchical Risk Parity (HRP)**
   - Allocate across alpha signals using correlation structure
   - Reduce concentration risk

**Deliverables:**
- [ ] Ensemble combination engine
- [ ] Dynamic weighting framework
- [ ] Regime detection module
- [ ] Alpha signal performance tracking

**Timeline:** 3-4 weeks

---

## Phase 5: Advanced ML & Trading

### 5A: Intraday Breakout Detection

**Priority:** 🟡 High (Day Trading Focus)

**Objective:** Detect small-cap intraday breakouts for day trading

**Methodology:**

1. **Breakout Patterns**
   - Volume spike (3x+ average)
   - Price breaks resistance (52-week high, pivot points)
   - Bollinger Band squeeze → expansion
   - VWAP cross with momentum

2. **ML Model**
   - Input: Last 30 minutes of tick data
   - Features: Price momentum, volume ratios, microstructure signals
   - Output: Probability of continuation (next 15-60 minutes)

3. **Small-Cap Focus**
   - Russell 2000 stocks (market cap $300M - $2B)
   - Higher volatility = larger intraday moves
   - Less institutional trading = more predictable patterns

**Data Requirements:**
- Minute-level OHLCV (from Phase 3D)
- Tick-level volume (optional, for microstructure)
- News catalyst detection (pre-market announcements)

**Deliverables:**
- [ ] Breakout pattern recognition engine
- [ ] ML model for breakout continuation
- [ ] Real-time alerting system
- [ ] Backtesting framework (intraday)

**Timeline:** 6-8 weeks

---

### 5B: Reinforcement Learning for Portfolio Optimization

**Priority:** 🟢 Medium

**Objective:** Learn optimal portfolio weights dynamically

**Approach:**

1. **RL Environment**
   - **State:** Current portfolio weights, factor exposures, market regime
   - **Action:** New portfolio weights (long/short)
   - **Reward:** Sharpe ratio, alpha vs. benchmark, drawdown penalty

2. **RL Algorithms**
   - PPO (Proximal Policy Optimization)
   - SAC (Soft Actor-Critic)
   - DQN (Deep Q-Network) for discrete actions

3. **Constraints**
   - Long-only or long-short
   - Position limits (max 5% per stock)
   - Turnover limits (reduce transaction costs)

**Deliverables:**
- [ ] RL environment implementation
- [ ] PPO/SAC agent training pipeline
- [ ] Backtesting with transaction costs
- [ ] Performance comparison vs. mean-variance

**Timeline:** 6-8 weeks

---

### 5C: Graph Machine Learning

**Priority:** 🟢 Medium

**Objective:** Model stock similarity networks for alpha spillover

**Approach:**

1. **Graph Construction**
   - Nodes: Stocks
   - Edges: Similarity metrics
     - Industry/sector overlap
     - Fundamental similarity (P/E, ROE correlation)
     - Analyst coverage overlap
     - Supply chain relationships

2. **Graph Neural Networks**
   - **GAT (Graph Attention Networks):** Learn attention weights for neighbors
   - **GraphSAGE:** Aggregate neighbor features
   - **Message Passing:** Propagate alpha signals across graph

3. **Alpha Spillover**
   - Positive earnings surprise in AAPL → predict impact on suppliers (TSMC, etc.)
   - Sector rotation detection via graph clustering

**Deliverables:**
- [ ] Stock similarity graph construction
- [ ] GAT model implementation
- [ ] Alpha spillover backtesting
- [ ] Graph visualization dashboard

**Timeline:** 6-8 weeks

---

### 5D: Quantamental Hybrid Framework

**Priority:** 🟢 Medium

**Objective:** Blend ML predictions with fundamental filters

**Approach:**

1. **ML Alpha Layer**
   - Generate alpha predictions from LSTM/Transformer/GAT

2. **Fundamental Filter Layer**
   - Profitability: ROE > 15%
   - Earnings quality: Positive operating cash flow
   - Leverage: Debt/Equity < 2.0
   - Valuation: P/E < sector median

3. **Combination**
   - Only invest in stocks passing fundamental filters
   - Weight by ML alpha prediction
   - Ensures interpretability and economic reasoning

**Deliverables:**
- [ ] Fundamental filter engine
- [ ] Quantamental scoring system
- [ ] Backtesting with/without filters
- [ ] Performance attribution (ML vs. fundamentals)

**Timeline:** 3-4 weeks

---

## Phase 6: Backtesting & Production

### 6A: Backtesting Engine

**Priority:** 🟡 High

**Features:**

1. **Realistic Simulation**
   - Transaction costs (bps per trade)
   - Slippage (market impact model)
   - Fill simulation (limit orders, partial fills)
   - Short borrowing costs

2. **Walk-Forward Optimization**
   - Train on rolling 2-year window
   - Test on next 1-month
   - Re-optimize monthly
   - Avoid lookahead bias

3. **Risk Management**
   - Position limits (max % per stock)
   - Sector exposure limits
   - Drawdown stop-loss
   - Volatility targeting

**Deliverables:**
- [ ] Backtesting engine (event-driven)
- [ ] Transaction cost models
- [ ] Performance analytics (Sharpe, alpha, max DD)
- [ ] Factor attribution

**Timeline:** 6-8 weeks

---

### 6B: Portfolio-Level Analysis

**Priority:** 🟡 High

**Objective:** Replicate QuantCoderFS-v2 approach (portfolio models, not just stocks)

**Features:**

1. **Portfolio Construction**
   - Factor portfolios (long top decile, short bottom decile)
   - Risk parity weighting
   - Hierarchical risk parity (HRP)
   - Mean-variance optimization with regularization

2. **Multi-Strategy Portfolios**
   - Combine multiple alpha strategies
   - Diversify across factors (value, momentum, quality)
   - Rebalance monthly/quarterly

3. **Portfolio Analytics**
   - Holdings breakdown
   - Sector/industry exposure
   - Factor exposures (beta, size, value, momentum)
   - Risk decomposition (systematic vs. idiosyncratic)

**Deliverables:**
- [ ] Portfolio model database schema
- [ ] Portfolio construction engine
- [ ] Portfolio analytics dashboard
- [ ] Multi-strategy backtesting

**Timeline:** 4-6 weeks

---

### 6C: Walk-Forward Optimization

**Priority:** 🟢 Medium

**Objective:** Prevent overfitting via continuous re-optimization

**Methodology:**

1. **Rolling Training Windows**
   - Train model on last 2 years
   - Test on next 1 month
   - Roll forward 1 month, repeat

2. **Hyperparameter Re-tuning**
   - Re-optimize ML hyperparameters monthly
   - Track parameter drift over time
   - Detect regime changes (requires re-training)

3. **Factor Decay Monitoring**
   - Track IC (Information Coefficient) decay
   - Re-train if IC < threshold
   - Add new factors dynamically

**Deliverables:**
- [ ] Walk-forward optimization framework
- [ ] Hyperparameter tracking dashboard
- [ ] Factor decay alerts
- [ ] Regime change detection

**Timeline:** 3-4 weeks

---

### 6D: Live Trading Integration

**Priority:** 🟢 Low (After Backtesting Validated)

**Approach:**

1. **Paper Trading First**
   - Connect to broker paper trading API
   - Simulate real orders without real money
   - Validate execution logic

2. **Broker Integration**
   - Interactive Brokers (via IBPy)
   - Alpaca (commission-free)
   - TD Ameritrade

3. **Risk Controls**
   - Pre-trade risk checks (position limits, margin)
   - Real-time P&L monitoring
   - Emergency stop-loss (circuit breaker)

**Deliverables:**
- [ ] Broker API integration
- [ ] Order management system
- [ ] Real-time risk monitoring
- [ ] Live trading dashboard

**Timeline:** 6-8 weeks

---

## Phase 7: Documentation & Publication

### 7A: Academic Monograph

**Priority:** 🟢 Medium

**Objective:** Document all quantitative methods used in the platform

**Structure:**

1. **Introduction**
   - Motivation for systematic alpha extraction
   - Overview of approach (Mega-Alpha, ML, graph learning)

2. **Data & Feature Engineering**
   - Data sources (EODHD, fundamentals)
   - Feature normalization and transformation
   - Cross-sectional analysis

3. **Factor Mining**
   - Genetic programming for factor discovery
   - Factor evaluation (IC, Sharpe)
   - Dynamic factor selection

4. **Machine Learning Models**
   - LSTM, Transformers, GAT architectures
   - Training methodology (walk-forward)
   - Ensemble combination

5. **Portfolio Construction**
   - Risk parity, mean-variance, HRP
   - Transaction costs and slippage
   - Backtesting results

6. **Results & Performance**
   - Sharpe ratio, alpha vs. benchmarks
   - Factor attribution
   - Robustness tests

7. **Conclusion & Future Work**
   - Intraday breakouts, RL optimization
   - Graph learning extensions

**Deliverables:**
- [ ] LaTeX manuscript (100-150 pages)
- [ ] Academic paper submissions (3-5 papers)
- [ ] Code repository with examples
- [ ] Supplementary materials (datasets, notebooks)

**Timeline:** 12-16 weeks (parallel to development)

---

### 7B: Code Documentation & API Reference

**Priority:** 🟡 High

**Deliverables:**
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Code comments and docstrings (Google style)
- [ ] Architecture diagrams (database, services, ML pipeline)
- [ ] Developer setup guide

**Timeline:** Ongoing (parallel to development)

---

### 7C: Research Paper Submissions

**Priority:** 🟢 Low

**Target Journals:**
- Journal of Financial Data Science
- Journal of Portfolio Management
- Quantitative Finance
- Journal of Machine Learning Research (if novel ML contributions)

**Potential Papers:**
1. **"Dynamic Alpha Mining with Graph Neural Networks"**
2. **"Reinforcement Learning for Multi-Factor Portfolio Optimization"**
3. **"Intraday Breakout Detection in Small-Cap Equities"**

**Timeline:** 6-12 months after Phase 5 completion

---

### 7D: User Guides & Tutorials

**Priority:** 🟡 High

**Deliverables:**
- [ ] Quickstart guide (setup, first analysis)
- [ ] Video tutorials (YouTube, 5-10 minutes each)
- [ ] Example workflows (Jupyter notebooks)
- [ ] FAQ and troubleshooting

**Timeline:** 4-6 weeks

---

## Use Cases (Once Stable)

### Use Case 1: Factor-Based Long-Short Portfolio

**User Goal:** Generate alpha via multi-factor long-short strategy

**Workflow:**
1. User loads VTI top 1500 stocks (via Admin UI)
2. System calculates features daily (valuation, momentum, quality)
3. ML models predict 1-month forward returns
4. Construct portfolio:
   - Long top decile (150 stocks)
   - Short bottom decile (150 stocks)
   - Risk parity weighting
5. Backtest with transaction costs
6. Monitor live performance (paper trading)

**Expected Outcome:**
- Sharpe ratio: 1.5-2.0
- Alpha vs. SPY: 5-10% annualized
- Max drawdown: < 15%

---

### Use Case 2: Small-Cap Intraday Breakout Trading

**User Goal:** Day trade small-cap breakouts

**Workflow:**
1. User selects Russell 2000 small caps (via Admin UI)
2. System ingests real-time minute-level data (during market hours)
3. ML model detects breakout patterns (volume spike + price breakout)
4. Alert user via dashboard/email
5. User reviews candidate (chart, news, technicals)
6. Execute trade manually or via automated order

**Expected Outcome:**
- 3-5 trades per day
- Win rate: 55-60%
- Average gain per trade: 1-3%

---

### Use Case 3: Quantamental Screening

**User Goal:** Find undervalued stocks with strong fundamentals and positive ML alpha

**Workflow:**
1. User creates custom dashboard with filters:
   - ROE > 15%
   - P/E < sector median
   - Positive earnings growth (YoY)
   - ML alpha score > 0.5
2. System screens 1,500 stocks
3. Returns 20-30 candidates
4. User reviews fundamentals, charts, news
5. Adds to watchlist or portfolio

**Expected Outcome:**
- 20-30 candidates per month
- Sharpe ratio: 1.2-1.8 (long-only)
- Alpha vs. benchmark: 3-7% annualized

---

### Use Case 4: Multi-Strategy Portfolio

**User Goal:** Combine multiple alpha strategies for diversification

**Workflow:**
1. User creates 3 portfolios:
   - **Portfolio A:** Value (low P/E, high dividend yield)
   - **Portfolio B:** Momentum (12-month price momentum)
   - **Portfolio C:** Quality (high ROE, low debt)
2. System allocates 33% to each strategy
3. Rebalances monthly
4. Uses HRP for optimal allocation

**Expected Outcome:**
- Sharpe ratio: 1.8-2.2 (diversification benefit)
- Lower volatility than individual strategies
- Reduced drawdowns during market stress

---

### Use Case 5: Graph-Based Sector Rotation

**User Goal:** Detect sector rotation via stock similarity networks

**Workflow:**
1. System constructs stock similarity graph (industry, fundamentals)
2. GAT model propagates alpha signals across graph
3. Detects sector momentum (e.g., Tech → Energy rotation)
4. User reviews rotation signals in dashboard
5. Adjusts portfolio sector weights accordingly

**Expected Outcome:**
- Early detection of sector shifts (1-2 weeks ahead)
- Improved risk-adjusted returns
- Better portfolio positioning during regime changes

---

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 3 (Current) | 4-6 weeks | Fix charts, dashboards, intraday pipeline |
| Phase 4 | 12-16 weeks | Feature engineering, factor mining, ML models |
| Phase 5 | 16-20 weeks | Breakout detection, RL, graph learning |
| Phase 6 | 12-16 weeks | Backtesting, portfolio analysis, live trading |
| Phase 7 | Ongoing | Documentation, papers, monograph |

**Total Estimated Time:** 12-18 months (full-time equivalent)

---

## Success Metrics

### Technical Metrics
- [ ] 99%+ database uptime
- [ ] < 200ms API response time (95th percentile)
- [ ] 1,500+ stocks with full historical data (IPO to present)
- [ ] Daily incremental refresh (99.7% API call reduction)

### Alpha Generation Metrics
- [ ] Sharpe ratio > 1.5 (long-short strategies)
- [ ] Alpha vs. SPY > 5% annualized
- [ ] Max drawdown < 20%
- [ ] Information ratio > 1.0

### ML Model Metrics
- [ ] Out-of-sample IC > 0.05 (Information Coefficient)
- [ ] Factor decay half-life > 6 months
- [ ] Model ensemble Sharpe > individual models

### User Experience Metrics
- [ ] Dashboard load time < 2 seconds
- [ ] Chart rendering < 1 second (10,000+ candles)
- [ ] Zero AI-generated panel errors

---

## Risk Management

### Technical Risks
- **Database corruption:** Daily backups, replication
- **API rate limits:** Caching, incremental updates
- **Model overfitting:** Walk-forward validation, purged CV

### Financial Risks
- **Transaction costs:** Model in backtesting
- **Slippage:** Market impact models
- **Black swan events:** Circuit breakers, stop-loss

### Operational Risks
- **Code bugs:** Automated testing, CI/CD
- **Data quality:** Validation checks, outlier detection
- **Model drift:** Continuous monitoring, re-training

---

## Conclusion

This roadmap transforms **Chat with Fundamentals** from a database-first research platform into a **production-ready systematic alpha generation system**.

**Core Principles:**
1. **Database-first:** All data permanently stored, incremental updates
2. **ML-driven:** Dynamic factor discovery, ensemble learning
3. **Quantamental:** Blend statistical precision with economic reasoning
4. **Robust:** Walk-forward validation, transaction costs, risk controls
5. **Documented:** Academic rigor, reproducible research

**End State:** A platform that extracts sustainable alpha from 1,500 US stocks using multi-decade EOD/fundamental data, intraday breakout detection, and advanced ML techniques — all while maintaining academic-grade documentation and reproducibility.
