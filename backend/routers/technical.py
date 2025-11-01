# routers/technical.py

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any, List
from core.logger_config import setup_logger
from core.config import settings
from utils.ticker_utils import validate_and_format_ticker, format_ticker_for_eodhd
import httpx

router = APIRouter(
    prefix="/technical",
    tags=["Technical Analysis"]
)

logger = setup_logger().getChild("technical")

@router.get("/indicator")
async def get_technical_indicator(
    ticker: str = Query(..., description="Ticker symbol, e.g., AAPL"),
    function: str = Query(..., description="Indicator function: sma, ema, rsi, macd, bbands, etc."),
    period: int = Query(50, description="Period for indicator calculation"),
    from_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    # MACD parameters
    fastperiod: Optional[int] = Query(None, description="MACD fast period"),
    slowperiod: Optional[int] = Query(None, description="MACD slow period"),
    signalperiod: Optional[int] = Query(None, description="MACD signal period"),
) -> List[Dict[str, Any]]:
    """
    Get technical indicator data for a stock

    Available indicators:
    - sma: Simple Moving Average
    - ema: Exponential Moving Average
    - rsi: Relative Strength Index
    - macd: Moving Average Convergence Divergence
    - bbands: Bollinger Bands
    - stochastic: Stochastic Oscillator
    - adx: Average Directional Index
    - atr: Average True Range
    - williams: Williams %R
    - and more...
    """
    # Validate and format ticker
    ticker = validate_and_format_ticker(ticker)

    # Add exchange suffix if not present
    ticker_with_exchange = format_ticker_for_eodhd(ticker)

    # EODHD requires lowercase function names
    function_lower = function.lower()

    url = f"https://eodhd.com/api/technical/{ticker_with_exchange}"
    params = {
        "function": function_lower,
        "period": period,
        "order": "a",
        "api_token": settings.eodhd_api_key,
        "fmt": "json"
    }

    if from_date:
        params["from"] = from_date
    if to_date:
        params["to"] = to_date

    # Add MACD-specific parameters
    if fastperiod:
        params["fastperiod"] = fastperiod
    if slowperiod:
        params["slowperiod"] = slowperiod
    if signalperiod:
        params["signalperiod"] = signalperiod

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=20)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as e:
        logger.error("EODHD technical fetch failed for %s (%s): HTTP %s - %s", ticker, function_lower, e.response.status_code, e.response.text[:200])
        if e.response.status_code == 422:
            raise HTTPException(502, f"Technical indicator '{function}' not available or parameters invalid")
        raise HTTPException(502, f"Data provider error (HTTP {e.response.status_code})")
    except Exception as e:
        logger.error("EODHD technical fetch failed for %s (%s): %s", ticker, e.__class__.__name__, str(e))
        raise HTTPException(502, "Data provider error")

    logger.info("[TECHNICAL] fetched %s for %s", function, ticker)
    return data


@router.get("/screener")
async def screen_stocks(
    filters: Optional[str] = Query(None, description="Filter conditions (JSON array as string)"),
    signals: Optional[str] = Query(None, description="Technical signals: 50d_new_hi, 200d_new_lo, etc."),
    sort: Optional[str] = Query(None, description="Sort field.order, e.g., market_capitalization.desc"),
    limit: int = Query(50, ge=1, le=100, description="Number of results (max 100)"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
) -> Dict[str, Any]:
    """
    Screen stocks based on filters and technical signals

    Filter examples:
    - market_capitalization>1000000000 (market cap > $1B)
    - pe_ratio<20
    - dividend_yield>0.03
    - code=US
    - exchange=NYSE
    - sector=Technology

    Signal examples:
    - 50d_new_hi: 50-day new high
    - 200d_new_lo: 200-day new low
    """
    url = "https://eodhd.com/api/screener"
    params = {
        "api_token": settings.eodhd_api_key,
        "fmt": "json",
        "limit": limit,
        "offset": offset
    }

    if filters:
        # EODHD expects filters as JSON array: [["field","op",value],...]
        # Log the filters being sent for debugging
        logger.info(f"[SCREENER] Filters received: {filters}")
        params["filters"] = filters
    if signals:
        params["signals"] = signals
    if sort:
        params["sort"] = sort

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.error(f"[SCREENER] EODHD screener failed: {e}")
        logger.error(f"[SCREENER] URL: {url}, Params: {params}")
        raise HTTPException(502, f"Data provider error: {str(e)}")

    logger.info("[SCREENER] fetched %d results", len(data.get('data', [])))
    return data
