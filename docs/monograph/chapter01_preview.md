# Chapter 1: Time Series Analysis

**Quantitative Methods in Chat with Fundamentals - A Comprehensive Technical Monograph**

---

## Abstract

This chapter establishes the foundational concepts of financial time series analysis that underpin all quantitative methods in the Chat with Fundamentals platform. We examine return calculation methodologies, statistical properties of asset returns, and the database architecture that enables efficient analysis of 30+ years of historical market data. The techniques presented here form the basis for risk modeling, performance analysis, and predictive algorithms discussed in subsequent chapters.

---

## 1.1 Introduction

Financial time series analysis is the cornerstone of quantitative finance. Unlike traditional statistical time series, financial data exhibits unique properties: fat-tailed distributions, volatility clustering, non-stationarity, and complex dependencies across assets and time horizons. The Chat with Fundamentals platform processes over 30 years of daily price data for thousands of securities, requiring robust methods for data ingestion, storage, retrieval, and analysis.

This chapter introduces three fundamental components:

1. **Return Calculation Methods** – Converting price series into stationary return series suitable for statistical modeling
2. **Statistical Properties** – Characterizing the distributional and temporal properties of financial returns
3. **Data Infrastructure** – The PostgreSQL + TimescaleDB architecture that enables high-performance queries on decades of historical data

---

## 1.2 Return Calculation Methods

### 1.2.1 Price Series Representation

Let P_t denote the adjusted closing price of a security at time t, where t ∈ {0, 1, 2, ..., T} represents discrete trading days. The *adjusted* price accounts for corporate actions:

- **Dividends:** Ex-dividend adjustments ensure price continuity
- **Stock Splits:** Forward and reverse splits (e.g., 2-for-1, 1-for-10)
- **Rights Offerings:** Dilution effects from new share issuance

### 1.2.2 Simple Returns

The *simple return* (also called *arithmetic return*) between time t-1 and t is defined as:

```
R_t = (P_t - P_{t-1}) / P_{t-1} = P_t / P_{t-1} - 1
```

**Properties:**
- **Additivity across assets:** Portfolio return is the weighted average of constituent returns
- **Non-additivity over time:** Multi-period returns require geometric compounding
- **Bounded below:** R_t ≥ -1 (cannot lose more than 100%)
- **Unbounded above:** R_t ∈ [-1, ∞)

**Implementation (Python):**

```python
import pandas as pd

# Fetch price series from database
closes = pd.Series([100.0, 102.5, 101.0, 105.2, 103.8])

# Calculate simple returns
returns = closes.pct_change().dropna()
# Result: [0.025, -0.0146, 0.0416, -0.0133]
```

### 1.2.3 Log Returns

The *log return* (also called *continuously compounded return*) is:

```
r_t = ln(P_t / P_{t-1}) = ln(1 + R_t)
```

**Properties:**
- **Time-additivity:** Multi-period returns sum: r_{t,t+k} = Σ r_{t+i}
- **Non-additivity across assets:** Portfolio returns are not simple weighted averages
- **Unbounded:** r_t ∈ (-∞, ∞)
- **Approximately equal to simple returns:** For small |R_t| < 0.15, r_t ≈ R_t

**Relationship between simple and log returns:**

```
R_t = e^{r_t} - 1
r_t = ln(1 + R_t)
```

**When to use each:**
- **Simple returns:** Performance reporting, portfolio attribution, client communication
- **Log returns:** Statistical modeling, option pricing, time series econometrics

### 1.2.4 Multi-Period Returns

**Simple returns** over k periods require geometric compounding:

```
R_{t,t+k} = ∏(1 + R_{t+i}) - 1
```

**Log returns** are additive:

```
r_{t,t+k} = Σ r_{t+i}
```

**Example:** Three-day returns
```
Day 1: R_1 = 2%,   r_1 = 1.980%
Day 2: R_2 = -1%,  r_2 = -1.005%
Day 3: R_3 = 3%,   r_3 = 2.956%
────────────────────────────────
3-day simple: R_{1,3} = (1.02)(0.99)(1.03) - 1 = 4.01%
3-day log:    r_{1,3} = 1.980 - 1.005 + 2.956 = 3.93%
```

---

## 1.3 Statistical Properties of Returns

### 1.3.1 Mean and Variance

For a return series {R_1, R_2, ..., R_T}:

**Sample mean:**
```
R̄ = (1/T) Σ R_t
```

**Sample variance:**
```
σ² = (1/(T-1)) Σ (R_t - R̄)²
```

**Annualization:** Assuming 252 trading days per year:
```
Annualized Mean = 252 × R̄
Annualized Volatility = √252 × σ
```

The √252 scaling assumes returns are i.i.d. (independent and identically distributed), which is approximately valid for liquid equities at daily frequency.

### 1.3.2 Stylized Facts of Financial Returns

Empirical studies reveal consistent patterns across asset classes:

1. **Non-normality:** Returns exhibit fat tails (leptokurtosis) and negative skewness
   - Kurtosis = E[(R - μ)⁴] / σ⁴ > 3 (Normal distribution: 3)

2. **Volatility clustering:** Large moves tend to cluster (Mandelbrot, 1963; Engle, 1982)
   - Autocorrelation(|R_t|) > 0 (up to 100+ lags)

3. **Leverage effect:** Negative returns increase future volatility more than positive returns

4. **Long memory:** Autocorrelation in squared returns decays slowly

5. **Weak autocorrelation:** Daily returns themselves show minimal autocorrelation
   - Autocorrelation(R_t) ≈ 0 (for lag > 1)

**Implementation:**

```python
import numpy as np
from scipy.stats import kurtosis, skew

# Sample return series
returns = np.array([0.01, -0.02, 0.015, -0.008, 0.022, ...])

# Compute statistics
mean = returns.mean()
std = returns.std()
kurt = kurtosis(returns)  # Excess kurtosis
skewness = skew(returns)

# Annualized metrics
annual_return = 252 * mean
annual_volatility = np.sqrt(252) * std

print(f"Daily Mean: {mean:.6f}")
print(f"Daily Volatility: {std:.6f}")
print(f"Annualized Return: {annual_return:.2%}")
print(f"Annualized Volatility: {annual_volatility:.2%}")
print(f"Excess Kurtosis: {kurt:.2f}")
print(f"Skewness: {skewness:.2f}")
```

### 1.3.3 Autocorrelation Structure

The *autocorrelation function* (ACF) measures linear dependence at lag k:

```
ρ_k = Cov(R_t, R_{t-k}) / Var(R_t)
```

**Ljung-Box test** for joint significance of autocorrelations:

```
Q(m) = T(T+2) Σ(ρ_k² / (T-k)) ~ χ²(m)
```

where m is the number of lags tested. Rejecting H₀ indicates returns are not white noise.

### 1.3.4 Stationarity Testing

A time series is *weakly stationary* if:
1. Constant mean: E[R_t] = μ for all t
2. Constant variance: Var(R_t) = σ² for all t
3. Covariance depends only on lag: Cov(R_t, R_{t-k}) = γ_k for all t

**Augmented Dickey-Fuller (ADF) test:**

```
ΔR_t = α + βt + γR_{t-1} + Σ δ_i ΔR_{t-i} + ε_t
```

Test H₀: γ = 0 (unit root, non-stationary) vs. H₁: γ < 0 (stationary).

**Key insight:** Returns are typically stationary, while price levels are non-stationary (random walk). This justifies modeling returns rather than prices.

---

## 1.4 Historical Data Processing

### 1.4.1 Database Architecture

The platform employs a hybrid PostgreSQL + TimescaleDB architecture optimized for time-series queries:

```
Data Flow:
EODHD API
    ↓
Ingestion Pipeline
    ↓
PostgreSQL (metadata) + TimescaleDB (OHLCV)
    ↓
FastAPI Backend
    ↓
Next.js Frontend
```

**TimescaleDB hypertables:** Automatic partitioning by time for efficient range queries:

```sql
-- Create hypertable (automatic time-based chunking)
SELECT create_hypertable('ohlcv', 'date',
                         chunk_time_interval => INTERVAL '1 month');

-- Create composite index for ticker + time queries
CREATE INDEX idx_ohlcv_ticker_date
    ON ohlcv (ticker, date DESC);
```

**Query performance:** Retrieving 30 years of daily data for a single ticker:
- Standard PostgreSQL: ~500ms
- TimescaleDB with indexing: ~15ms (33× faster)

### 1.4.2 Data Cleaning and Outlier Detection

Financial data requires careful validation:

**1. Missing data handling:**
- Trading holidays: Expected gaps (no imputation needed)
- Data errors: Forward fill or backward fill for isolated missing values
- Delistings: Handle survivorship bias by retaining delisted securities

**2. Outlier detection using z-scores:**

```
z_t = (R_t - R̄) / σ
```

Flag returns with |z_t| > 5 for manual review (Flash Crash, halts, data errors).

**3. Price spike detection:**

```
Flag if |((P_t - P_{t-1}) / P_{t-1})| > 0.5  (50% single-day move)
```

**Implementation:**

```python
def validate_price_series(df: pd.DataFrame) -> pd.DataFrame:
    """
    Validate and clean OHLCV data

    Args:
        df: DataFrame with columns [date, open, high, low, close, volume]

    Returns:
        Cleaned DataFrame with validation flags
    """
    df = df.copy()

    # 1. Check for null values
    df['has_nulls'] = df[['open', 'high', 'low', 'close']].isnull().any(axis=1)

    # 2. Validate OHLC consistency (high >= low, etc.)
    df['invalid_ohlc'] = (df['high'] < df['low']) | \
                         (df['close'] > df['high']) | \
                         (df['close'] < df['low'])

    # 3. Detect large price jumps (>50% single day)
    df['return'] = df['close'].pct_change()
    df['price_spike'] = df['return'].abs() > 0.5

    # 4. Flag zero volume (potential data error)
    df['zero_volume'] = df['volume'] == 0

    # 5. Calculate z-score for outlier detection
    mean_ret = df['return'].mean()
    std_ret = df['return'].std()
    df['zscore'] = (df['return'] - mean_ret) / std_ret
    df['outlier'] = df['zscore'].abs() > 5

    # Log validation summary
    logger.info(f"Null values: {df['has_nulls'].sum()}")
    logger.info(f"Invalid OHLC: {df['invalid_ohlc'].sum()}")
    logger.info(f"Price spikes: {df['price_spike'].sum()}")
    logger.info(f"Outliers (|z|>5): {df['outlier'].sum()}")

    return df
```

### 1.4.3 Efficient Data Retrieval

The `/historical/eod-extended` endpoint retrieves historical data with caching:

```python
from services.data_service import DataService

# Initialize database-first service
data_service = DataService()

# Fetch 5 years of daily OHLCV data
ticker = "AAPL.US"
from_date = "2019-01-01"
to_date = "2024-01-01"
period = "d"  # daily

# Query returns list of OHLCV dictionaries
data = data_service.get_eod_data(
    ticker=ticker,
    from_date=from_date,
    to_date=to_date,
    period=period
)

# Result: [{"date": "2019-01-02", "open": 154.89, ...}, ...]
print(f"Retrieved {len(data)} trading days")
# Output: Retrieved 1,258 trading days
```

**Cache-aside pattern:**
1. Check database for requested date range
2. If data exists and fresh (TTL-based), return from database
3. Otherwise, fetch from EODHD API
4. Store API response in database for future queries

This approach ensures sub-50ms query latency for frequently accessed tickers.

---

## 1.5 Practical Applications

The time series methods presented in this chapter enable:

1. **Return distribution analysis** (Chapter 3)
   - Histogram visualization
   - Empirical quantiles (VaR estimation)
   - Goodness-of-fit tests (Jarque-Bera, Kolmogorov-Smirnov)

2. **Volatility modeling** (Chapter 2)
   - EWMA volatility forecasting
   - GARCH model estimation
   - Realized volatility from intraday data

3. **Backtesting frameworks** (Chapter 20)
   - Point-in-time data queries
   - Rolling window analysis
   - Walk-forward optimization

4. **Machine learning features** (Chapter 11)
   - Momentum factors (1m, 3m, 6m, 12m returns)
   - Volatility regimes
   - Autocorrelation-based signals

---

## 1.6 Summary

This chapter established the foundational time series concepts for quantitative finance:

- **Return calculations:** Simple vs. log returns, multi-period compounding, corporate action adjustments
- **Statistical properties:** Non-normality, volatility clustering, weak autocorrelation
- **Stationarity:** ADF test, implications for modeling
- **Data infrastructure:** TimescaleDB for 30+ years of historical data with millisecond query latency
- **Data validation:** Outlier detection, OHLC consistency checks, survivorship bias handling

These techniques form the bedrock for all subsequent quantitative methods. Chapter 2 builds on return series analysis to develop sophisticated volatility models including EWMA and extreme value theory.

---

## References

1. Tsay, R.S. (2010). *Analysis of Financial Time Series*, 3rd Edition. Wiley.
2. Campbell, J.Y., Lo, A.W., and MacKinlay, A.C. (1997). *The Econometrics of Financial Markets*. Princeton University Press.
3. Cont, R. (2001). Empirical properties of asset returns: stylized facts and statistical issues. *Quantitative Finance*, 1(2):223-236.
4. Mandelbrot, B. (1963). The variation of certain speculative prices. *Journal of Business*, 36:394-419.
5. Engle, R.F. (1982). Autoregressive conditional heteroscedasticity with estimates of the variance of United Kingdom inflation. *Econometrica*, 50(4):987-1007.
6. Dickey, D.A. and Fuller, W.A. (1979). Distribution of the estimators for autoregressive time series with a unit root. *Journal of the American Statistical Association*, 74(366):427-431.
7. Ljung, G.M. and Box, G.E.P. (1978). On a measure of lack of fit in time series models. *Biometrika*, 65(2):297-303.
8. TimescaleDB Documentation (2024). *Hypertables and Chunking*. https://docs.timescale.com/

---

**End of Chapter 1**

*Next: Chapter 2 - Volatility Modeling (EWMA, CVaR, Extreme Value Theory)*
