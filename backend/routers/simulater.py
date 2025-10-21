"""
routers/simulater.py  –  original code + 2 new endpoints
--------------------------------------------------------
Existing routes stay exactly the same:
    • GET /equity/simulate
    • GET /equity/returns
    • GET /equity/cumret
New lightweight routes (no new deps):
    • GET /equity/vol     – EWMA σ spark-line + empirical 99 % CVaR
    • GET /equity/perf    – Sharpe, Sortino, Max-DD, Calmar
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import httpx
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from core.config import settings
from core.logger_config import setup_logger

logger = setup_logger().getChild("equity_sim")
router = APIRouter(prefix="/equity", tags=["Equity Analysis"])

_API_BASE = "https://eodhd.com/api/eod"

# NOTE: we no longer build the token into the URL!
_http = httpx.AsyncClient(timeout=20)


def _today() -> datetime:
    return datetime.now(timezone.utc)


async def _fetch_close_series(ticker: str, days: int) -> pd.Series:
    """Return a pandas Series of adjusted closes for the last *days* calendar days."""
    end   = _today()
    start = end - timedelta(days=days)

    # Add .US suffix only if ticker doesn't already have an exchange
    ticker_with_exchange = ticker if "." in ticker else f"{ticker}.US"
    url = f"{_API_BASE}/{ticker_with_exchange}"
    params = {
        "from":  start.date(),
        "to":    end.date(),
        "period":"d",
        "fmt":   "json",
        "order": "a",
        "api_token": settings.eodhd_api_key,  # Use query parameter instead of Bearer auth
    }

    try:
        r = await _http.get(url, params=params)
        r.raise_for_status()
    except Exception as exc:
        logger.error("EODHD fetch failed for %s (%s)", ticker, exc.__class__.__name__)
        raise HTTPException(502, "Data provider error")

    df = pd.DataFrame(r.json())
    if df.empty or "close" not in df.columns:
        raise HTTPException(500, f"No price data for {ticker}")

    return (
        df.assign(date=lambda d: pd.to_datetime(d["date"]))
          .set_index("date")["close"]
          .astype("float64")
          .sort_index()
    )

# ──────────────────────── (1) Monte-Carlo fan ─────────────────────────────
@router.get("/simulate")
async def simulate_equity(
    ticker: str = Query(..., description="US ticker symbol, e.g. TSLA"),
    horizon: int = Query(20, ge=5, le=60, description="Trading-day horizon (5-60)"),
):
    """Return last 90 trading-days closes + 1 000 Monte-Carlo paths."""
    closes = await _fetch_close_series(ticker.upper(), 120)   # ~90 trading days
    if len(closes) < 60:
        raise HTTPException(500, "Insufficient history (<60 trading days)")

    rets   = closes.pct_change().dropna()
    mu, sd = rets.mean(), rets.std()
    last   = closes.iloc[-1]

    rng    = np.random.default_rng()
    shocks = rng.normal(mu, sd, size=(1_000, horizon))
    paths  = last * np.cumprod(1 + shocks, axis=1)

    pct = lambda p: [round(x, 4) for x in np.percentile(paths, p, axis=0)]

    return {
        "ticker": ticker.upper(),
        "var_95": round(float(np.percentile(rets, 5)), 4),
        "equity_curve": [
            {"date": d.strftime("%Y-%m-%d"), "close": round(v, 2)} for d, v in closes.items()
        ],
        "monte_carlo": {
            "paths": [[round(x, 2) for x in row] for row in paths],
            "percentiles": {"p5": pct(5), "p50": pct(50), "p95": pct(95)},
        },
    }

# ─────────────────────── (2) Return dist + β scatter ──────────────────────
@router.get("/returns")
async def returns_analysis(
    ticker: str = Query(..., description="US ticker, e.g. TSLA"),
    years: int = Query(3, ge=1, le=10),
    benchmark: str = Query("SPY"),
):
    days   = int(years * 365.25) + 30
    s1     = await _fetch_close_series(ticker.upper(),    days)
    s2     = await _fetch_close_series(benchmark.upper(), days)

    r1, r2 = s1.pct_change().dropna(), s2.pct_change().dropna()
    df     = pd.concat([r1, r2], axis=1, join="inner").dropna()
    if df.empty:
        raise HTTPException(500, "No overlapping return history")

    y, x   = df.iloc[:, 0].values, df.iloc[:, 1].values
    beta, alpha = np.polyfit(x, y, 1)
    r2_val      = np.corrcoef(x, y)[0, 1] ** 2

    return {
        "ticker": ticker.upper(),
        "benchmark": benchmark.upper(),
        "years": years,
        "returns": {"list": y.tolist(), "mean": y.mean(), "std": y.std()},
        "scatter": {
            "x": x.tolist(), "y": y.tolist(),
            "beta":  round(beta, 4),
            "alpha": round(alpha, 4),
            "r2":    round(r2_val, 4),
        },
    }

# ──────────────────── (3) Cumulative curve vs benchmark ───────────────────
@router.get("/cumret")
async def cumulative_returns(
    ticker: str = Query(...),
    years: int  = Query(3, ge=1, le=10),
    benchmark: str = Query("SPY"),
):
    days  = int(years * 365.25) + 30
    s1    = await _fetch_close_series(ticker.upper(),    days)
    s2    = await _fetch_close_series(benchmark.upper(), days)
    df    = pd.concat({"tic": s1, "bmk": s2}, axis=1).dropna()
    if df.empty:
        raise HTTPException(500, "No overlapping history")
    cum   = df.pct_change().add(1).cumprod().fillna(1.0)

    return {
        "ticker": ticker.upper(),
        "benchmark": benchmark.upper(),
        "years": years,
        "cumret": [
            {"date": d.strftime("%Y-%m-%d"), "tic": round(r.tic, 4), "bmk": round(r.bmk, 4)}
            for d, r in cum.iterrows()
        ],
    }

# ───────────────────────── (4) NEW  •  Vol snapshot ───────────────────────
@router.get("/vol")
async def vol_forecast(
    ticker: str = Query(..., description="US ticker, e.g. TSLA"),
    lookback: int = Query(250, ge=30, le=500, description="Trading days for EWMA"),
):
    """
    • sigma_t1   : latest EWMA volatility of daily returns
    • ewma_vol   : full EWMA series for the spark-line
    • evt_cvar_99: empirical 99 % CVaR (Expected Shortfall)
    """
    closes = await _fetch_close_series(ticker.upper(), lookback * 2)
    rets   = closes.pct_change().dropna()

    if len(rets) < lookback:
        raise HTTPException(400, "Not enough history for volatility")

    # Compute the EWMA‐std, then replace any NaNs with 0
    lam = 0.94
    ewma = (
        rets
        .tail(lookback)
        .ewm(alpha=1 - lam, adjust=False)
        .std(bias=False)
        .fillna(0)         # ← this line kills all NaNs
        .round(6)
    )

    ewma_series = ewma.tolist()
    sigma_t1    = ewma_series[-1]

    # Empirical CVaR 99%
    var_99  = np.percentile(rets, 1)
    cvar_99 = float(-(rets[rets <= var_99].mean() or 0))

    return {
        "ticker":      ticker.upper(),
        "sigma_t1":    round(sigma_t1, 6),
        "ewma_vol":    ewma_series,
        "evt_cvar_99": round(cvar_99, 6),
    }


# ───────────────────────── (5) NEW  •  Perf ratios ────────────────────────
@router.get("/perf")
async def perf_ratios(
    ticker: str = Query(..., description="US ticker, e.g. TSLA"),
    years:  int = Query(3, ge=1, le=10),
):
    """
    • sharpe   : annualised Sharpe ratio
    • sortino  : annualised Sortino ratio
    • max_dd   : maximum draw-down (negative)
    • calmar   : total return ÷ |max_dd|
    """
    days   = int(years * 365.25) + 30
    closes = await _fetch_close_series(ticker.upper(), days)
    rets   = closes.pct_change().dropna()
    if len(rets) < 60:
        raise HTTPException(400, "Not enough history for perf ratios")

    ann = np.sqrt(252)
    sigma = rets.std()
    sharpe = rets.mean() / sigma * ann if sigma else 0.0

    downside = rets.where(rets < 0, 0)
    d_sigma  = np.sqrt((downside ** 2).mean())
    sortino  = rets.mean() / d_sigma * ann if d_sigma else 0.0

    cum   = (1 + rets).cumprod()
    draw  = (cum / cum.cummax() - 1)
    max_dd = float(draw.min())               # negative
    calmar = (cum.iloc[-1] - 1) / abs(max_dd) if max_dd else 0.0

    return {
        "ticker":  ticker.upper(),
        "years":   years,
        "sharpe":  round(sharpe, 3),
        "sortino": round(sortino, 3),
        "max_dd":  round(max_dd, 3),
        "calmar":  round(calmar, 3),
    }
