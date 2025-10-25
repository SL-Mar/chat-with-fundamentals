# File: routers/historical.py
# Historical price data endpoints: intraday, live prices, EOD
# NOW WITH DATABASE-FIRST APPROACH (Phase 2B)

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
import logging
from tools.eodhd_client import EODHDClient
from services.data_service import DataService
from utils.ticker_utils import validate_and_format_ticker, format_ticker_for_eodhd

router = APIRouter(prefix="/historical", tags=["Historical Data"])
logger = logging.getLogger("historical")

# Initialize data service (database-first)
data_service = DataService()


@router.get("/intraday")
async def get_intraday_prices(
    ticker: str = Query(..., description="Stock symbol (e.g., AAPL.US)"),
    interval: str = Query("5m", description="Time interval: 1m, 5m, 15m, 30m, 1h"),
    from_timestamp: Optional[int] = Query(None, description="Unix timestamp start"),
    to_timestamp: Optional[int] = Query(None, description="Unix timestamp end")
):
    """Get intraday price data at specified intervals.

    Intervals:
    - 1m: 1-minute candles
    - 5m: 5-minute candles
    - 15m: 15-minute candles
    - 30m: 30-minute candles
    - 1h: 1-hour candles

    Returns OHLCV data for intraday trading analysis.

    **NEW: Database-First Approach (Phase 3D)**
    - Checks database first for cached intraday data (5 minute TTL)
    - Falls back to EODHD API if data missing/stale
    - Automatically stores API response in database for future queries
    - Uses TimescaleDB hypertables with compression and retention policies

    Example: /historical/intraday?ticker=AAPL.US&interval=5m
    """
    try:
        # Validate and format ticker
        ticker = validate_and_format_ticker(ticker)

        # Add exchange suffix if not present
        ticker = format_ticker_for_eodhd(ticker)

        # Validate interval
        valid_intervals = ["1m", "5m", "15m", "30m", "1h"]
        if interval not in valid_intervals:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid interval. Must be one of: {', '.join(valid_intervals)}"
            )

        # DATABASE-FIRST: Check DB with 5 minute TTL, fallback to API
        intraday_data = data_service.get_intraday_data(
            ticker=ticker,
            interval=interval,
            from_timestamp=from_timestamp,
            to_timestamp=to_timestamp
        )

        logger.info(f"[INTRADAY] Fetched {interval} data for {ticker} ({len(intraday_data)} records)")
        return intraday_data

    except HTTPException:
        raise
    except Exception as e:
        # Intraday data may not be available in all subscriptions or from certain IPs
        # Return empty result instead of error to allow page to load gracefully
        logger.warning(f"[INTRADAY] Intraday endpoint not available for {ticker}: {e}")
        return {"ticker": ticker, "data": [], "note": "Intraday data not available in current API subscription or from this location"}


@router.get("/live-price")
async def get_live_price(
    ticker: str = Query(..., description="Stock symbol (e.g., AAPL.US)")
):
    """Get current real-time price for a single stock.

    Returns:
    - Current price
    - Open, high, low
    - Volume
    - Previous close
    - Change and change percentage

    **NEW: Database-First Approach (Phase 2B)**
    - Checks database for recent price (15 second cache)
    - Falls back to EODHD API if stale

    Example: /historical/live-price?ticker=AAPL.US
    """
    try:
        # Validate and format ticker
        ticker = validate_and_format_ticker(ticker)

        # Add exchange suffix if not present
        ticker = format_ticker_for_eodhd(ticker)

        # DATABASE-FIRST: Check DB with 15s TTL, fallback to API
        live_price = data_service.get_live_price(ticker)

        logger.info(f"[LIVE] Fetched live price for {ticker}")
        return live_price

    except Exception as e:
        logger.error(f"[LIVE] Failed to fetch live price for {ticker}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch live price: {str(e)}")


@router.get("/live-prices-bulk")
async def get_live_prices_bulk(
    symbols: List[str] = Query(..., description="List of stock symbols (e.g., AAPL,TSLA,MSFT)")
):
    """Get real-time prices for multiple stocks at once.

    More efficient than calling /live-price multiple times.

    Example: /historical/live-prices-bulk?symbols=AAPL,TSLA,MSFT
    """
    try:
        client = EODHDClient()

        # Convert comma-separated string to list if needed
        if isinstance(symbols, str):
            symbol_list = symbols.split(',')
        else:
            symbol_list = symbols

        live_prices = client.historical.get_live_prices_bulk(symbol_list)

        logger.info(f"[LIVE_BULK] Fetched live prices for {len(symbol_list)} symbols")
        return live_prices

    except Exception as e:
        logger.error(f"[LIVE_BULK] Failed to fetch bulk live prices: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch bulk live prices: {str(e)}")


@router.get("/eod-extended")
async def get_eod_extended(
    ticker: str = Query(..., description="Stock symbol (e.g., AAPL.US)"),
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    period: str = Query("d", description="Period: d (daily), w (weekly), m (monthly)")
):
    """Get historical end-of-day price data with period selection.

    Periods:
    - d: Daily
    - w: Weekly
    - m: Monthly

    Returns OHLCV data with adjusted close prices.

    **NEW: Database-First Approach (Phase 2B)**
    - Checks database first for cached data
    - Falls back to EODHD API if data missing/stale
    - Automatically stores API response in database for future queries

    Example: /historical/eod-extended?ticker=AAPL.US&period=d&from_date=2024-01-01
    """
    try:
        # Validate and format ticker
        ticker = validate_and_format_ticker(ticker)

        # Add exchange suffix if not present
        ticker = format_ticker_for_eodhd(ticker)

        # Validate period
        valid_periods = ["d", "w", "m"]
        if period not in valid_periods:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid period. Must be one of: {', '.join(valid_periods)}"
            )

        # DATABASE-FIRST: Check DB, fallback to API, auto-store
        eod_data = data_service.get_eod_data(
            ticker=ticker,
            from_date=from_date,
            to_date=to_date,
            period=period
        )

        logger.info(f"[EOD] Fetched {period} data for {ticker} ({len(eod_data)} records)")
        return eod_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[EOD] Failed to fetch EOD data for {ticker}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch EOD data: {str(e)}")
