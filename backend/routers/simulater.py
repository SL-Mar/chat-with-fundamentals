"""
routers/simulater.py
─────────────────────────────────────────────────────────────────────────────
Equity-analytics router (pure daily OHLCV from EODHD).

Prefix  : /equity
Routes   :  /simulate   – Monte-Carlo fan + VaR(95 %)
            /returns    – daily return dist. + CAPM β/α
            /cumret     – cumulative gross return vs. benchmark
            /vol        – EWMA σ spark-line + empirical CVaR(99 %)
            /perf       – Sharpe, Sortino, Max-DD, Calmar snapshot
            /risk       – rolling σ, range vols, hist VaR/CVaR, draw-downs
"""

from __future__ import annotations

import logging
import os
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Tuple

import httpx
import numpy as np
import pandas as pd
from cachetools import TTLCache
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

# ───────────────────── configuration & globals ─────────────────────
_API_BASE = "https://eodhd.com/api/eod"
_API_KEY  = os.getenv("EODHD_API_KEY", "")
logger    = logging.getLogger("equity_router")

_http = httpx.AsyncClient(timeout=20)           # one client per process

_CACHE_TTL_SEC = 60 * 60                        # 1-hour cache
_cache: TTLCache[Tuple, object] = TTLCache(maxsize=10_000, ttl=_CACHE_TTL_SEC)

router = APIRouter(prefix="/equity", tags=["Equity Analysis"])

# ───────────────────────── helper functions ────────────────────────
def _today() -> datetime:
    return datetime.now(timezone.utc)


async def _fetch_close_series(ticker: str, days: int) -> pd.Series:
    """
    Return a split-adjusted close Series for the last *days* calendar days.
    """
    if not _API_KEY:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR,
                            "EODHD_API_KEY not configured")

    end_d, start_d = _today().date(), _today().date() - timedelta(days=days)
    key = (ticker.upper(), start_d, end_d, "close")

    if key in _cache:
        return _cache[key]                        # type: ignore[return-value]

    url    = f"{_API_BASE}/{ticker.upper()}"
    params = {
        "from": start_d, "to": end_d,
        "period": "d", "fmt": "json", "order": "a",
        "adjusted": "1",                          # ask for adjusted series
    }
    headers = {"Authorization": f"Bearer {_API_KEY}"}

    try:
        r = await _http.get(url, params=params, headers=headers)  # type: ignore[arg-type]
        r.raise_for_status()
    except httpx.RequestError as exc:
        logger.error("Network error fetching %s – %s", ticker, exc)
        raise HTTPException(status.HTTP_424_FAILED_DEPENDENCY,
                            "Data provider unavailable") from exc

    data = r.json()
    if not data:
        raise HTTPException(status.HTTP_404_NOT_FOUND,
                            f"No price data for {ticker}")

    df = pd.DataFrame(data)
    col_map = {c.lower(): c for c in df.columns}
    close_col = col_map.get("adjusted_close", col_map.get("adj_close", "close"))

    series = (
        df.assign(date=lambda d: pd.to_datetime(d["date"]))
          .set_index("date")[close_col]
          .astype("float64")
          .sort_index()
    )

    _cache[key] = series
    return series


async def _fetch_ohlcv_frame(ticker: str, days: int) -> pd.DataFrame:
    """
    Return an OHLCV DataFrame (adjusted Close) for the last *days* calendar days.
    """
    end_d, start_d = _today().date(), _today().date() - timedelta(days=days)
    key = (ticker.upper(), start_d, end_d, "frame")

    if key in _cache:
        return _cache[key]                        # type: ignore[return-value]

    url    = f"{_API_BASE}/{ticker.upper()}"
    params = {
        "from": start_d, "to": end_d,
        "period": "d", "fmt": "json", "order": "a",
        "adjusted": "1",
    }
    headers = {"Authorization": f"Bearer {_API_KEY}"}

    try:
        r = await _http.get(url, params=params, headers=headers)  # type: ignore[arg-type]
        r.raise_for_status()
    except httpx.RequestError as exc:
        logger.error("Network error fetching frame %s – %s", ticker, exc)
        raise HTTPException(status.HTTP_424_FAILED_DEPENDENCY,
                            "Data provider unavailable") from exc

    df = (pd.DataFrame(r.json())
            .assign(date=lambda d: pd.to_datetime(d["date"]))
            .set_index("date")
            .rename(columns=str.lower)            # lower-case columns
          )

    _cache[key] = df
    return df

# ──────────────────────── Pydantic models ──────────────────────────
class EquityCurvePoint(BaseModel):
    date: date
    close: float = Field(..., ge=0)

class MonteCarloResult(BaseModel):
    paths: List[List[float]]
    percentiles: Dict[str, List[float]]

class SimulateResponse(BaseModel):
    ticker: str
    var_95: float
    equity_curve: List[EquityCurvePoint]
    monte_carlo: MonteCarloResult

# ─────────────────────────── Endpoints ────────────────────────────
# 1) Monte-Carlo fan
@router.get("/simulate", response_model=SimulateResponse)
async def simulate_equity(
    ticker: str = Query(..., description="US ticker symbol, e.g. TSLA"),
    horizon: int = Query(20, ge=5, le=60,
                         description="Trading-day horizon (5–60)"),
    seed: int | None = Query(None, description="Optional RNG seed"),
):
    closes = await _fetch_close_series(ticker, 120)
    if len(closes) < 60:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR,
                            "Insufficient history (<60 trading days)")

    rets  = closes.pct_change().dropna()
    mu, sd = rets.mean(), rets.std()
    last   = closes.iloc[-1]

    rng    = np.random.default_rng(seed)
    shocks = rng.normal(mu, sd, size=(1_000, horizon))
    paths  = last * np.cumprod(1 + shocks, axis=1)

    pct = lambda p: [round(x, 4) for x in np.percentile(paths, p, axis=0)]

    curve = [EquityCurvePoint(date=d.date(), close=round(v, 2))
             for d, v in closes.items()]

    return {
        "ticker": ticker.upper(),
        "var_95": round(float(np.percentile(rets, 5)), 4),
        "equity_curve": curve,
        "monte_carlo": {
            "paths": [[round(x, 2) for x in row] for row in paths],
            "percentiles": {"p5": pct(5), "p50": pct(50), "p95": pct(95)},
        },
    }

# 2) Return dist + CAPM β
@router.get("/returns")
async def returns_analysis(
    ticker: str = Query(..., description="US ticker, e.g. TSLA"),
    years:  int = Query(3, ge=1, le=10),
    benchmark: str = Query("SPY"),
):
    days = int(years * 365.25) + 30
    s1   = await _fetch_close_series(ticker,    days)
    s2   = await _fetch_close_series(benchmark, days)

    r1, r2 = s1.pct_change().dropna(), s2.pct_change().dropna()
    df     = pd.concat([r1, r2], axis=1, join="inner").dropna()
    if df.empty:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR,
                            "No overlapping history")

    y, x   = df.iloc[:, 0].values, df.iloc[:, 1].values
    beta, alpha = np.polyfit(x, y, 1)
    r2_val      = np.corrcoef(x, y)[0, 1] ** 2

    return {
        "ticker":    ticker.upper(),
        "benchmark": benchmark.upper(),
        "years":     years,
        "returns":   {"list": y.tolist(), "mean": y.mean(), "std": y.std()},
        "scatter":   {
            "x": x.tolist(), "y": y.tolist(),
            "beta":  round(beta, 4),
            "alpha": round(alpha, 4),
            "r2":    round(r2_val, 4),
        },
    }

# 3) Cumulative gross return vs benchmark
@router.get("/cumret")
async def cumulative_returns(
    ticker: str = Query(...),
    years:  int = Query(3, ge=1, le=10),
    benchmark: str = Query("SPY"),
):
    days = int(years * 365.25) + 30
    s1   = await _fetch_close_series(ticker,    days)
    s2   = await _fetch_close_series(benchmark, days)

    df = pd.concat({"tic": s1, "bmk": s2}, axis=1).dropna()
    if df.empty:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR,
                            "No overlapping history")

    cum = df.pct_change().add(1).cumprod().fillna(1.0)
    return {
        "ticker":    ticker.upper(),
        "benchmark": benchmark.upper(),
        "years":     years,
        "cumret": [
            {"date": d.strftime("%Y-%m-%d"),
             "tic":  round(r.tic, 4),
             "bmk":  round(r.bmk, 4)}
            for d, r in cum.iterrows()
        ],
    }

# 4) EWMA σ + empirical CVaR(99 %)
@router.get("/vol")
async def vol_forecast(
    ticker: str = Query(..., description="US ticker, e.g. TSLA"),
    lookback: int = Query(250, ge=30, le=500,
                          description="Trading days for EWMA window"),
):
    closes = await _fetch_close_series(ticker, lookback * 2)
    rets   = closes.pct_change().dropna()

    if len(rets) < lookback:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            "Not enough history for volatility")

    lam  = 0.94
    ewma = (
        rets.tail(lookback)
            .ewm(alpha=1 - lam, adjust=False)
            .std(bias=False)
            .fillna(0)
            .round(6)
    )
    sigma_t1    = float(ewma.iloc[-1])
    ewma_series = ewma.tolist()

    var_99  = np.percentile(rets, 1)
    cvar_99 = float(-(rets[rets <= var_99].mean() or 0))

    return {
        "ticker":      ticker.upper(),
        "sigma_t1":    round(sigma_t1, 6),
        "ewma_vol":    ewma_series,
        "evt_cvar_99": round(cvar_99, 6),
    }

# 5) Performance ratios snapshot
@router.get("/perf")
async def perf_ratios(
    ticker: str = Query(..., description="US ticker, e.g. TSLA"),
    years:  int = Query(3, ge=1, le=10),
):
    days   = int(years * 365.25) + 30
    closes = await _fetch_close_series(ticker, days)
    rets   = closes.pct_change().dropna()
    if len(rets) < 60:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            "Not enough history for perf ratios")

    ann    = np.sqrt(252)
    sigma  = rets.std()
    sharpe = rets.mean() / sigma * ann if sigma else 0.0

    downside = rets.where(rets < 0, 0)
    d_sigma  = np.sqrt((downside ** 2).mean())
    sortino  = rets.mean() / d_sigma * ann if d_sigma else 0.0

    cum    = (1 + rets).cumprod()
    draw   = cum / cum.cummax() - 1
    max_dd = float(draw.min())
    calmar = (cum.iloc[-1] - 1) / abs(max_dd) if max_dd else 0.0

    return {
        "ticker":  ticker.upper(),
        "years":   years,
        "sharpe":  round(sharpe, 3),
        "sortino": round(sortino, 3),
        "max_dd":  round(max_dd, 3),
        "calmar":  round(calmar, 3),
    }

# 6) Dispersion & Risk snapshot
@router.get("/risk")
async def risk_metrics(
    ticker: str = Query(..., description="US ticker, e.g. TSLA"),
    lookback: int = Query(252, ge=90, le=1000,
                          description="Calendar days to analyse (~252=y)"),
):
    df = await _fetch_ohlcv_frame(ticker, lookback)
    if {"high", "low", "close"} - set(df.columns):
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR,
                            "Provider did not return OHLC columns")

    closes = df["close"].astype("float64").sort_index()
    rets   = closes.pct_change().dropna()

    # rolling σ (annualised)
    roll_std = lambda w: float(rets.rolling(w).std(ddof=0).iloc[-1] * np.sqrt(252))
    sigma_30, sigma_60, sigma_90 = map(roll_std, (30, 60, 90))

    # Parkinson & Garman-Klass range vols
    hl = np.log(df["high"] / df["low"])
    parkinson = np.sqrt(1 / (4 * len(hl) * np.log(2)) * np.sum(hl**2)) * np.sqrt(252)

    ln_oc = np.log(df["close"] / df["open"]) if "open" in df.columns else 0
    gk = np.sqrt(0.5 * np.mean(hl**2) -
                 (2 * np.log(2) - 1) * np.mean(ln_oc**2)) * np.sqrt(252)

    # hist VaR / CVaR
    var95, var99 = np.percentile(rets, [5, 1])
    cvar95 = float(rets[rets <= var95].mean())
    cvar99 = float(rets[rets <= var99].mean())

    # draw-down stats
    cum  = (1 + rets).cumprod()
    draw = cum / cum.cummax() - 1
    max_dd = float(draw.min())

    dd_lengths = (draw < 0).astype(int)
    groups = (dd_lengths.diff() == 1).cumsum()
    avg_len = int(dd_lengths.groupby(groups).sum().mean() or 0)

    return {
        "ticker":   ticker.upper(),
        "lookback": lookback,
        "rolling_sigma": {
            "30d": round(sigma_30, 4),
            "60d": round(sigma_60, 4),
            "90d": round(sigma_90, 4),
        },
        "range_vol": {
            "parkinson":    round(float(parkinson), 4),
            "garman_klass": round(float(gk), 4),
        },
        "hist_var":  {"p95": round(float(var95), 4),
                      "p99": round(float(var99), 4)},
        "hist_cvar": {"p95": round(float(cvar95), 4),
                      "p99": round(float(cvar99), 4)},
        "max_dd":     round(max_dd, 4),
        "avg_dd_len": avg_len,
    }

# 7) Momentum & trend snapshot
@router.get("/momentum")
async def momentum_signals(
    ticker: str = Query(..., description="US ticker, e.g. TSLA"),
    lookback: int = Query(300, ge=250, le=1200,
                          description="Calendar days to fetch (≥ SMA-200)"),
):
    df = await _fetch_ohlcv_frame(ticker, lookback)
    if "close" not in df.columns:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR,
                            "Provider did not return close prices")

    close = df["close"].astype("float64").sort_index()

    # Simple-moving averages & crossover flag
    sma50  = close.rolling(50).mean().iloc[-1]
    sma200 = close.rolling(200).mean().iloc[-1]
    crossover = "golden" if sma50 > sma200 else "death" if sma50 < sma200 else "none"

    # EMA slope (pct change between last two points)
    ema21  = close.ewm(span=21, adjust=False).mean()
    ema55  = close.ewm(span=55, adjust=False).mean()
    slope21 = float((ema21.iloc[-1] - ema21.iloc[-2]) / ema21.iloc[-2])
    slope55 = float((ema55.iloc[-1] - ema55.iloc[-2]) / ema55.iloc[-2])

    # RSI-14
    delta = close.diff()
    up, down = delta.clip(lower=0), -delta.clip(upper=0)
    roll_up = up.rolling(14).mean()
    roll_down = down.rolling(14).mean()
    rs  = roll_up / roll_down
    rsi = 100 - 100 / (1 + rs.iloc[-1])

    # MACD (12/26 EMA + signal 9)
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    signal = macd_line.ewm(span=9, adjust=False).mean()
    hist   = macd_line.iloc[-1] - signal.iloc[-1]

    return {
        "ticker": ticker.upper(),
        "sma": {"50": round(float(sma50),2),
                "200": round(float(sma200),2),
                "crossover": crossover},
        "ema_slope": {"21": round(slope21,4),
                      "55": round(slope55,4)},
        "rsi14": round(float(rsi),2),
        "macd": {"macd": round(float(macd_line.iloc[-1]),2),
                 "signal": round(float(signal.iloc[-1]),2),
                 "hist": round(float(hist),2)}
    }

# 8) Seasonality snapshot
@router.get("/seasonality")
async def seasonality_stats(
    ticker: str = Query(..., description="US ticker, e.g. TSLA"),
    years: int = Query(10, ge=2, le=20, description="Years of history to analyse"),
):
    """
    Month-of-year and day-of-week mean return heat-map.
    """
    days = int(years * 365.25) + 30
    closes = await _fetch_close_series(ticker, days)
    rets = closes.pct_change().dropna()

    if rets.empty:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not enough data")

    by_month = (
        rets.groupby(rets.index.month)
            .mean()
            .reindex(range(1, 13), fill_value=np.nan)
            .round(4)
            .tolist()
    )

    # Monday=0 … Friday=4
    by_dow = (
        rets.groupby(rets.index.dayofweek)
            .mean()
            .reindex(range(5), fill_value=np.nan)
            .round(4)
            .tolist()
    )

    return {
        "ticker": ticker.upper(),
        "years":  years,
        "month_mean": by_month,   # Jan..Dec
        "dow_mean":   by_dow      # Mon..Fri
    }

# 9) 1-year rolling β, α, R² + info ratio
@router.get("/rolling_beta")
async def rolling_beta(
    ticker: str = Query(..., description="US ticker, e.g. TSLA"),
    benchmark: str = Query("SPY"),
    window: int = Query(252, ge=60, le=504,
                        description="Rolling window (trading days)"),
    years: int = Query(5, ge=2, le=20,
                       description="Total lookback in years"),
):
    days = int(years * 365.25) + 30
    s1   = await _fetch_close_series(ticker,    days)
    s2   = await _fetch_close_series(benchmark, days)

    df = pd.concat({"y": s1.pct_change(), "x": s2.pct_change()}, axis=1).dropna()
    if len(df) < window + 10:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            "Not enough overlapping history")

    betas, alphas, r2s, dates = [], [], [], []
    for i in range(window, len(df)):
        y = df["y"].iloc[i - window:i].values
        x = df["x"].iloc[i - window:i].values
        beta, alpha = np.polyfit(x, y, 1)
        alpha_ann   = alpha * 252 
        r2 = np.corrcoef(x, y)[0, 1] ** 2
        dates.append(df.index[i].date())
        betas.append(round(beta, 3))
        alphas.append(round(alpha_ann, 3))
        r2s.append(round(r2, 3))

    # info ratio (mean excess ÷ tracking-error) over full period
    excess = df["y"] - beta * df["x"] if (beta := np.polyfit(df["x"], df["y"],1)[0]) else df["y"]
    info_ratio = float(excess.mean() / excess.std() * np.sqrt(252)) if excess.std() else 0.0

    return {
        "ticker": ticker.upper(),
        "benchmark": benchmark.upper(),
        "window": window,
        "dates": [d.isoformat() for d in dates],
        "beta":  betas,
        "alpha": alphas,
        "r2":    r2s,
        "info_ratio": round(info_ratio, 3),
    }

# 10) Volume & liquidity snapshot
@router.get("/liquidity")
async def liquidity_metrics(
    ticker: str = Query(..., description="US ticker, e.g. TSLA"),
    lookback: int = Query(260, ge=120, le=1500,
                          description="Calendar days for OBV spark-line"),
):
    """
    • avg turnover 30 d / 60 d
    • turnover trend %
    • On-Balance Volume (OBV) spark-line
    • Volume RSI (positive-volume ratio)
    • Money-Flow Index (14-day, based on typical price × volume)
    """
    df = await _fetch_ohlcv_frame(ticker, lookback + 60)  # ensure ≥60d
    if {"close", "volume"} - set(df.columns):
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR,
                            "Provider did not return close/volume")

    vol   = df["volume"].astype("float64")
    price = df["close"].astype("float64")
    dollar_turnover = vol * price

    avg30 = dollar_turnover.rolling(30).mean().iloc[-1]
    avg60 = dollar_turnover.rolling(60).mean().iloc[-1]
    trend = (avg30 / avg60 - 1) if avg60 else 0.0

    # OBV
    direction = price.diff().fillna(0).apply(lambda x: 1 if x > 0 else -1 if x < 0 else 0)
    obv = (vol * direction).cumsum().iloc[-lookback:]
    obv_norm = (obv - obv.min()) / (obv.max() - obv.min())  # 0-1 scale for spark-line

    # Volume RSI (positive-vol / total)
    pos_vol = vol.where(price.diff() > 0, 0)
    neg_vol = vol.where(price.diff() < 0, 0)
    v_rsi = (pos_vol.rolling(14).sum() /
             (pos_vol.rolling(14).sum() + neg_vol.rolling(14).sum())).iloc[-1]

    # Money-Flow Index (14-day)
    tp   = (df["high"] + df["low"] + price) / 3
    mf   = tp * vol
    pos_mf = mf.where(tp.diff() > 0, 0)
    neg_mf = mf.where(tp.diff() < 0, 0)
    mfi = 100 - 100 / (1 + (pos_mf.rolling(14).sum() /
                            neg_mf.rolling(14).sum())).iloc[-1]

    return {
        "ticker": ticker.upper(),
        "avg_turnover_30d": round(float(avg30), 2),
        "avg_turnover_60d": round(float(avg60), 2),
        "turnover_trend_pct": round(float(trend), 4),
        "obv": obv_norm.round(3).tolist(),
        "volume_rsi": round(float(v_rsi), 3),
        "mfi14": round(float(mfi), 1),
    }

# 11) Volatility structure – ATR% + Keltner & Donchian channel widths

@router.get("/vol_bands")
async def vol_band_metrics(
    ticker: str = Query(...),
    lookback: int = Query(260, ge=60, le=1000),
):
    """ATR-14 %, Keltner width %, Donchian width % (all decimals)."""
    df = await _fetch_ohlcv_frame(ticker, lookback * 2)   # <-- helper we added
    if len(df) < lookback:
        raise HTTPException(400, "Not enough history for vol bands")

    # True-range & ATR-14
    tr = pd.concat(
        {
            "hi_lo":  df["high"] - df["low"],
            "hi_pc":  (df["high"] - df["close"].shift(1)).abs(),
            "lo_pc":  (df["low"]  - df["close"].shift(1)).abs(),
        },
        axis=1,
    ).max(axis=1)

    atr = tr.rolling(14, min_periods=14).mean()

    close = df["close"]
    ema20 = close.ewm(span=20, adjust=False).mean()

    # — ratios (values in decimals, e.g. 0.025 = 2.5 %)
    atr_pct   = (atr / close).iloc[-lookback:]
    kelt_pct  = ((ema20 + 2*atr) - (ema20 - 2*atr)) / close
    kelt_pct  = kelt_pct.iloc[-lookback:]
    donch_pct = (df["high"].rolling(20).max() - df["low"].rolling(20).min()) / close
    donch_pct = donch_pct.iloc[-lookback:]

    # Replace NaN/inf that appear in first 13–19 rows
    def _clean(s: pd.Series) -> list[float]:
        s = s.iloc[1:]              # ← drop the first index (warm-up artefact)
        return np.nan_to_num(s, nan=0.0, posinf=0.0, neginf=0.0).round(6).tolist()


    return {
        "ticker": ticker.upper(),
        "atr_pct":   _clean(atr_pct),
        "kelt_pct":  _clean(kelt_pct),
        "donch_pct": _clean(donch_pct),
    }
