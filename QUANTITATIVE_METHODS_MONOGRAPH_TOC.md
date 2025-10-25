# Quantitative Methods in Chat with Fundamentals
## A Comprehensive Technical Monograph

---

## Table of Contents

### Preface
- About This Monograph
- Notation and Conventions
- Software Architecture Overview
- Data Infrastructure

---

## Part I: Foundational Concepts

### Chapter 1: Time Series Analysis
1.1. Return Calculation Methods
   - Simple Returns
   - Log Returns
   - Adjusted Returns (Corporate Actions)

1.2. Statistical Properties of Returns
   - Mean and Variance
   - Autocorrelation
   - Stationarity Testing

1.3. Historical Data Processing
   - Database Architecture (PostgreSQL + TimescaleDB)
   - 30+ Year Historical Coverage
   - Data Cleaning and Outlier Detection

---

## Part II: Risk Metrics & Performance Analysis

### Chapter 2: Volatility Modeling
2.1. Historical Volatility
   - Standard Deviation Estimator
   - Annualization Methods (√252 scaling)

2.2. Exponentially Weighted Moving Average (EWMA)
   - RiskMetrics Approach (λ = 0.94)
   - Adaptive Volatility Forecasting
   - Implementation: `/equity/vol` endpoint

2.3. Extreme Value Theory
   - Value at Risk (VaR) at 95th percentile
   - Conditional Value at Risk (CVaR/Expected Shortfall)
   - Empirical 99% CVaR calculation

### Chapter 3: Risk-Adjusted Performance Metrics
3.1. Sharpe Ratio
   - Definition and Calculation
   - Annualization
   - Interpretation and Limitations

3.2. Sortino Ratio
   - Downside Deviation
   - Distinguishing Upside vs Downside Volatility
   - Implementation Details

3.3. Maximum Drawdown
   - Peak-to-Trough Calculation
   - Recovery Period Analysis
   - Rolling Drawdown Series

3.4. Calmar Ratio
   - Total Return / |Max Drawdown|
   - Long-term Performance Evaluation

3.5. Implementation: `/equity/perf` endpoint
   - Multi-year Analysis (1-10 years)
   - Database-first Architecture

### Chapter 4: Factor Models & Regression Analysis
4.1. Capital Asset Pricing Model (CAPM)
   - Beta Estimation via OLS
   - Alpha Calculation
   - R² and Goodness of Fit

4.2. Multi-Factor Models
   - Fama-French Three-Factor Model
   - Carhart Four-Factor Model
   - Custom Factor Construction

4.3. Return Attribution Analysis
   - Scatter Plot: Stock vs Benchmark
   - Implementation: `/equity/returns` endpoint

---

## Part III: Simulation & Forecasting

### Chapter 5: Monte Carlo Methods
5.1. Geometric Brownian Motion (GBM)
   - Stochastic Differential Equations
   - Discretization Scheme
   - Parameter Estimation (μ, σ)

5.2. Path Generation
   - 1,000-path Simulation
   - Random Number Generation (NumPy RNG)
   - Vectorized Implementation

5.3. Confidence Intervals
   - Percentile-based Forecasts (5th, 50th, 95th)
   - Forecast Horizon: 5-60 trading days
   - Implementation: `/equity/simulate` endpoint

5.4. Limitations and Assumptions
   - Constant Volatility Assumption
   - Independence of Returns
   - Normal Distribution Assumption

### Chapter 6: Cumulative Return Analysis
6.1. Cumulative Product Method
   - (1 + r₁) × (1 + r₂) × ... × (1 + rₙ)
   - Handling Missing Data

6.2. Benchmark Comparison
   - Relative Performance Tracking
   - Outperformance Periods
   - Implementation: `/equity/cumret` endpoint

---

## Part IV: Technical Analysis

### Chapter 7: Trend Indicators
7.1. Moving Averages
   - Simple Moving Average (SMA)
   - Exponential Moving Average (EMA)
   - Weighted Moving Average (WMA)

7.2. MACD (Moving Average Convergence Divergence)
   - Fast Period, Slow Period, Signal Line
   - Histogram Interpretation
   - Crossover Signals

7.3. Average Directional Index (ADX)
   - Trend Strength Measurement
   - +DI and -DI Indicators

### Chapter 8: Momentum Oscillators
8.1. Relative Strength Index (RSI)
   - 14-day RSI Calculation
   - Overbought/Oversold Levels (70/30)
   - Divergence Analysis

8.2. Stochastic Oscillator
   - %K and %D Lines
   - Fast vs Slow Stochastic

8.3. Williams %R
   - Overbought/Oversold Indicator
   - Momentum Confirmation

### Chapter 9: Volatility Indicators
9.1. Bollinger Bands
   - 20-period SMA ± 2σ
   - Band Width and Squeeze Patterns
   - Price Position within Bands

9.2. Average True Range (ATR)
   - Volatility Measurement
   - Position Sizing Applications
   - Stop-Loss Placement

### Chapter 10: Technical Screening
10.1. Breakout Detection
   - 50-day New High/Low
   - 200-day New High/Low

10.2. Multi-Criteria Filtering
   - Market Cap, P/E Ratio, Dividend Yield
   - Sector and Exchange Filters
   - Implementation: `/technical/screener` endpoint

---

## Part V: Feature Engineering & Factor Models

### Chapter 11: Fundamental Factors
11.1. Valuation Factors
   - P/E Ratio (Trailing, Forward)
   - P/B Ratio
   - EV/EBITDA
   - Free Cash Flow Yield
   - Dividend Yield

11.2. Quality Factors
   - Return on Equity (ROE)
   - Return on Assets (ROA)
   - Return on Invested Capital (ROIC)
   - Profit Margin Trends
   - Debt/Equity Ratio

11.3. Growth Factors
   - Revenue Growth (YoY, QoQ)
   - Earnings Growth
   - Book Value Growth
   - Operating Cash Flow Growth

### Chapter 12: Momentum & Trend Factors
12.1. Price Momentum
   - 1-month, 3-month, 6-month, 12-month Returns
   - Cross-sectional Ranking

12.2. Earnings Momentum
   - Earnings Surprise
   - Earnings Revision Trends

12.3. Volume-Adjusted Price Trends
   - Volume-Weighted Average Price (VWAP)
   - Relative Volume Analysis

### Chapter 13: Cross-Sectional Normalization
13.1. Z-Score Standardization
   - Rolling Window Z-Scores
   - Sector-Neutral Normalization

13.2. Rank Normalization
   - Percentile Ranks
   - Robust to Outliers

13.3. Winsorization
   - 1st/99th Percentile Trimming
   - Reducing Extreme Value Impact

13.4. Principal Component Analysis (PCA)
   - Dimensionality Reduction
   - Explained Variance Ratio
   - Factor Rotation

---

## Part VI: Machine Learning for Alpha Generation

### Chapter 14: Factor Mining
14.1. Genetic Programming Approach
   - Automatic Factor Discovery
   - Mathematical Operations (+, -, ×, ÷, log, √)
   - 1,000+ Candidate Factors

14.2. Factor Evaluation Metrics
   - Information Coefficient (IC)
   - IC Mean and IC Stability
   - Turnover Analysis

14.3. Walk-Forward Optimization
   - Purged Cross-Validation
   - Avoiding Lookahead Bias
   - Rolling Window Backtesting

### Chapter 15: Predictive Models
15.1. LSTM (Long Short-Term Memory)
   - Sequential Feature Processing
   - 60-day Rolling Window
   - Forward Return Prediction

15.2. Gradient Boosting (XGBoost/LightGBM)
   - Tree-based Ensembles
   - Feature Importance Analysis
   - Probability of Outperformance

15.3. Transformer Architecture
   - Multi-Head Attention
   - Cross-Stock Relationships
   - Positional Encoding for Time Series

15.4. Graph Attention Networks (GAT)
   - Stock Similarity Networks
   - Message Passing
   - Alpha Propagation

### Chapter 16: Ensemble Methods
16.1. Static Ensemble
   - Equal Weighting
   - Sharpe Ratio Weighting
   - Variance-based Weighting

16.2. Dynamic Ensemble
   - Monthly Re-weighting
   - Regime-Dependent Weighting
   - Reinforcement Learning for Combination

16.3. Model Performance Tracking
   - Rolling Sharpe Ratio
   - Information Ratio
   - Hit Rate Analysis

---

## Part VII: Portfolio Optimization

### Chapter 17: Modern Portfolio Theory (MPT)
17.1. Mean-Variance Optimization
   - Efficient Frontier Construction
   - Risk-Return Trade-off
   - Quadratic Programming

17.2. Constraint Handling
   - Long-only Constraints
   - Position Limits
   - Sector Exposure Constraints

17.3. Transaction Cost Modeling
   - Bid-Ask Spread
   - Market Impact
   - Commission Structure

### Chapter 18: Alternative Portfolio Construction
18.1. Hierarchical Risk Parity (HRP)
   - Hierarchical Clustering
   - Recursive Bisection
   - Correlation-based Diversification

18.2. Risk Parity
   - Equal Risk Contribution
   - Leverage and Deleveraging

18.3. Black-Litterman Model
   - Combining Market Equilibrium with Views
   - Posterior Return Estimates
   - Confidence-weighted Adjustments

### Chapter 19: Portfolio Rebalancing
19.1. Rebalancing Strategies
   - Calendar-based Rebalancing
   - Threshold-based Rebalancing
   - Volatility-triggered Rebalancing

19.2. Tax-Loss Harvesting
   - Capital Gains Management
   - Wash Sale Rule Compliance

---

## Part VIII: Backtesting & Validation

### Chapter 20: Backtesting Framework
20.1. Historical Simulation
   - Database-driven Backtesting
   - Point-in-time Data
   - Survivorship Bias Mitigation

20.2. Execution Modeling
   - Fill Price Estimation
   - Slippage Modeling
   - Partial Fill Scenarios

20.3. Performance Metrics
   - Cumulative Return
   - Sharpe, Sortino, Calmar Ratios
   - Maximum Drawdown
   - Win Rate and Profit Factor

### Chapter 21: Cross-Validation Techniques
21.1. Time Series Cross-Validation
   - Expanding Window
   - Rolling Window
   - Purging and Embargo

21.2. Combinatorial Purged Cross-Validation (CPCV)
   - Avoiding Information Leakage
   - Backtesting Overfitting Detection

### Chapter 22: Regime Analysis
22.1. Regime Detection
   - Hidden Markov Models
   - Regime-switching Models
   - Bull/Bear/Sideways Classification

22.2. Regime-Dependent Performance
   - Strategy Performance by Regime
   - Adaptive Parameter Tuning

---

## Part IX: Real-Time Systems & Deployment

### Chapter 23: Intraday Data Processing
23.1. Minute-Level OHLCV Schema
   - TimescaleDB Hypertables
   - Compression Policies
   - Retention Policies

23.2. Real-Time Ingestion Pipeline
   - WebSocket Data Feeds
   - Data Validation
   - Latency Optimization

### Chapter 24: Live Trading Considerations
24.1. Order Execution Algorithms
   - TWAP (Time-Weighted Average Price)
   - VWAP (Volume-Weighted Average Price)
   - Implementation Shortfall

24.2. Risk Management
   - Position Limits
   - Stop-Loss Orders
   - Circuit Breakers

---

## Part X: Advanced Topics

### Chapter 25: Alternative Data Integration
25.1. News Sentiment Analysis
   - Natural Language Processing
   - Sentiment Scoring
   - Event-driven Signals

25.2. Earnings Transcripts & Conference Calls
   - Transcript Parsing
   - Management Tone Analysis

25.3. Social Media Signals
   - Twitter Mentions
   - Reddit WallStreetBets Sentiment

### Chapter 26: ESG Integration
26.1. ESG Scoring Frameworks
   - Environmental Scores
   - Social Scores
   - Governance Scores

26.2. ESG Factor Construction
   - ESG Momentum
   - Controversy Scoring

### Chapter 27: Optimization Algorithms
27.1. Convex Optimization
   - CVXPY Framework
   - Quadratic Programming (QP)
   - Second-order Cone Programming (SOCP)

27.2. Bayesian Optimization
   - Hyperparameter Tuning
   - Gaussian Process Priors
   - Expected Improvement Acquisition

---

## Appendices

### Appendix A: Mathematical Foundations
A.1. Linear Algebra Review
A.2. Probability and Statistics
A.3. Stochastic Calculus Basics
A.4. Optimization Theory

### Appendix B: Implementation Details
B.1. Database Schema Reference
B.2. API Endpoint Catalog
B.3. Python Libraries Used
   - NumPy, Pandas, SciPy
   - Scikit-learn, XGBoost, PyTorch
   - FastAPI, SQLAlchemy, Redis

### Appendix C: Performance Benchmarks
C.1. Query Performance Metrics
C.2. Model Training Times
C.3. Inference Latency

### Appendix D: Glossary of Terms

### Appendix E: References & Further Reading
E.1. Academic Papers
E.2. Industry White Papers
E.3. Recommended Books

---

## Index

---

**Document Status:**
- ✅ Chapters 2-6: Implemented in `/equity` endpoints
- ✅ Chapters 7-10: Implemented in `/technical` endpoints
- 🚧 Chapters 11-19: Partially planned in ROADMAP (Phase 4-5)
- 📋 Chapters 20-27: Future development

**Total Estimated Length:** 200-250 pages
**Target Audience:** Quantitative analysts, data scientists, portfolio managers
**Prerequisites:** Undergraduate statistics, programming experience (Python)
