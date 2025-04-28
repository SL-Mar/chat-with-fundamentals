"""simulater.py
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List

import httpx
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from core.config import settings
from core.logger_config import setup_logger

logger = setup_logger().getChild("equity_sim")
router = APIRouter(prefix="/equity", tags=["Equity Analysis"])

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

_API_BASE = "https://eodhd.com/api/eod"
_http = httpx.AsyncClient(timeout=20)


def _today() -> datetime:
    return datetime.now(timezone.utc)


async def _fetch_close_series(ticker: str, days: int) -> pd.Series:
    """Fetch *days* calendar days of daily closes ending today (UTC)."""
    end = _today()
    start = end - timedelta(days=days)

    url = (
        f"{_API_BASE}/{ticker}.US"
        f"?api_token={settings.eodhd_api_key}"
        f"&from={start.date()}&to={end.date()}&period=d&fmt=json&order=a"
    )

    try:
       r = await _http.get(url)
       r.raise_for_status()
    except Exception as exc:          # ← catches httpx.HTTPStatusError & timeouts
        # never log the full URL (would expose the api_token)
        logger.error("EODHD fetch failed for %s (%s)", ticker, exc.__class__.__name__)
        raise HTTPException(502, "Data provider error")

    df = pd.DataFrame(r.json())
    if df.empty or "close" not in df.columns:
        raise HTTPException(500, f"No price data for {ticker}")

    series = (
        df.assign(date=lambda d: pd.to_datetime(d["date"]))
        .set_index("date")["close"]
        .sort_index()
    )

    return series


# ---------------------------------------------------------------------------
# 1) Monte‑Carlo simulation over 20 trading‑days
# ---------------------------------------------------------------------------

@router.get("/simulate")
async def simulate_equity(
    ticker: str = Query(..., description="US ticker symbol, e.g. TSLA"),
    horizon: int = Query(20, ge=5, le=60, description="Trading‑day horizon (5‑60)"),
):
    """Return last 90 trading‑days closes + 1 000 Monte‑Carlo paths."""
    hist_days = 120  # ~90 trading days
    closes = await _fetch_close_series(ticker.upper(), hist_days)
    if len(closes) < 60:
        raise HTTPException(500, "Insufficient history (<60 trading days)")

    daily_rets = closes.pct_change().dropna()
    mu, sigma = daily_rets.mean(), daily_rets.std()
    var_95 = float(np.percentile(daily_rets, 5))

    last_px = closes.iloc[-1]
    paths = 1_000
    rng = np.random.default_rng()
    steps = rng.normal(mu, sigma, size=(paths, horizon))
    paths_mat = last_px * np.cumprod(1 + steps, axis=1)

    pct = lambda p: [round(x, 4) for x in np.percentile(paths_mat, p, axis=0)]

    payload = {
        "ticker": ticker.upper(),
        "var_95": round(var_95, 4),
        "equity_curve": [
            {"date": d.strftime("%Y-%m-%d"), "close": round(v, 2)} for d, v in closes.items()
        ],
        "monte_carlo": {
            "paths": [[round(x, 2) for x in row] for row in paths_mat],
            "percentiles": {"p5": pct(5), "p50": pct(50), "p95": pct(95)},
        },
    }
    return payload

# ---------------------------------------------------------------------------
# 2) Return distribution + beta scatter
# ---------------------------------------------------------------------------

@router.get("/returns")
async def returns_analysis(
    ticker: str = Query(..., description="US ticker, e.g. TSLA"),
    years: int = Query(3, ge=1, le=10, description="Years of history to load"),
    benchmark: str = Query("SPY", description="Benchmark ticker for beta"),
):
    """Histogram of daily returns (ticker) + scatter vs benchmark."""
    days = int(years * 365.25) + 30  # safety margin

    ser_tic = await _fetch_close_series(ticker.upper(), days)
    ser_bmk = await _fetch_close_series(benchmark.upper(), days)

    ret_tic = ser_tic.pct_change().dropna()
    ret_bmk = ser_bmk.pct_change().dropna()

    cmb = pd.concat([ret_tic, ret_bmk], axis=1, join="inner").dropna()
    if cmb.empty:
        raise HTTPException(500, "No overlapping return history")

    y = cmb.iloc[:, 0].to_numpy()
    x = cmb.iloc[:, 1].to_numpy()

    # OLS beta & alpha
    beta, alpha = np.polyfit(x, y, 1)
    r2 = float(np.corrcoef(x, y)[0, 1] ** 2)

    return {
        "ticker": ticker.upper(),
        "benchmark": benchmark.upper(),
        "years": years,
        "returns": {
            "list": y.tolist(),
            "mean": float(y.mean()),
            "std": float(y.std()),
        },
        "scatter": {
            "x": x.tolist(),
            "y": y.tolist(),
            "beta": round(float(beta), 4),
            "alpha": round(float(alpha), 4),
            "r2": round(r2, 4),
        },
    }

# ---------------------------------------------------------------------------
# 3) Cumulative-return vs benchmark
# ---------------------------------------------------------------------------

@router.get("/cumret")
async def cumulative_returns(
    ticker: str = Query(..., description="US ticker, e.g. TSLA"),
    years:  int = Query(3,  ge=1, le=10),
    benchmark: str = Query("SPY", description="Benchmark ticker"),
):
    """Total-return of ticker vs benchmark (rebased to 1.0)."""
    days = int(years * 365.25) + 30
    s_tic = await _fetch_close_series(ticker.upper(),    days)
    s_bmk = await _fetch_close_series(benchmark.upper(), days)

    df = pd.concat({"tic": s_tic, "bmk": s_bmk}, axis=1).dropna()
    if df.empty:
        raise HTTPException(500, "No overlapping history")

    cum = df.pct_change().add(1).cumprod()
    # fill initial NaNs so JSON serialization won’t choke
    cum = cum.fillna(1.0)

    logger.info("[CUMRET] ✅ %s vs %s (%dy)", ticker, benchmark, years)

    return {
        "ticker":    ticker.upper(),
        "benchmark": benchmark.upper(),
        "years":     years,
        "cumret": [
            {"date": d.strftime("%Y-%m-%d"), "tic": round(r.tic, 4), "bmk": round(r.bmk, 4)}
            for d, r in cum.iterrows()
        ],
    }
