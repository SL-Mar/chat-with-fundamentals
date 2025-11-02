"""
API endpoints for intraday data
Supports multiple timeframes with database-first, API-fallback strategy
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import logging

from database.config_multi import get_intraday_db
from services.intraday_data_service import IntradayDataService, VALID_TIMEFRAMES

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/intraday", tags=["intraday"])


@router.get("/{ticker}/status")
async def get_data_status(
    ticker: str,
    db: Session = Depends(get_intraday_db)
):
    """
    Get data availability status for all timeframes

    Returns:
        Dictionary with status for each timeframe
    """
    try:
        service = IntradayDataService(db)

        status = {}
        for timeframe in VALID_TIMEFRAMES:
            tf_status = service.get_data_status(ticker, timeframe)
            status[timeframe] = tf_status if tf_status else {
                "available": False,
                "message": "No data available"
            }

        return {
            "ticker": ticker.upper(),
            "timeframes": status
        }

    except Exception as e:
        logger.error(f"Error getting status for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{ticker}/available-timeframes")
async def get_available_timeframes(
    ticker: str,
    db: Session = Depends(get_intraday_db)
):
    """
    Get list of timeframes with available data

    Returns:
        List of timeframes with data
    """
    try:
        service = IntradayDataService(db)
        timeframes = service.get_available_timeframes(ticker)

        return {
            "ticker": ticker.upper(),
            "available_timeframes": timeframes,
            "all_timeframes": VALID_TIMEFRAMES
        }

    except Exception as e:
        logger.error(f"Error getting available timeframes for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{ticker}/{timeframe}")
async def get_intraday_data(
    ticker: str,
    timeframe: str,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)"),
    days_back: Optional[int] = Query(7, description="Days back from now if dates not specified"),
    force_refresh: bool = Query(False, description="Force API fetch even if data exists"),
    db: Session = Depends(get_intraday_db)
):
    """
    Get intraday OHLCV data for a ticker

    Strategy:
    1. Checks database first
    2. If data missing or insufficient, fetches from API
    3. Stores API data for future use

    Args:
        ticker: Stock ticker symbol (e.g., AAPL)
        timeframe: '1m', '5m', '15m', '1h'
        start_date: Optional start date
        end_date: Optional end date
        days_back: Days back from now (default 7)
        force_refresh: Force API fetch

    Returns:
        List of OHLCV data points
    """
    try:
        # Validate timeframe
        if timeframe not in VALID_TIMEFRAMES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid timeframe. Must be one of {VALID_TIMEFRAMES}"
            )

        # Parse dates
        end_dt = None
        start_dt = None

        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format")
        else:
            end_dt = datetime.now()

        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format")
        else:
            start_dt = end_dt - timedelta(days=days_back)

        # Get data via service
        service = IntradayDataService(db)
        data = service.get_intraday_data(
            ticker=ticker,
            timeframe=timeframe,
            start_date=start_dt,
            end_date=end_dt,
            force_refresh=force_refresh
        )

        return {
            "ticker": ticker.upper(),
            "timeframe": timeframe,
            "start_date": start_dt.isoformat(),
            "end_date": end_dt.isoformat(),
            "count": len(data),
            "data": data
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching intraday data for {ticker} {timeframe}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{ticker}/{timeframe}/refresh")
async def refresh_data(
    ticker: str,
    timeframe: str,
    days_back: int = Query(7, description="Days back to fetch"),
    db: Session = Depends(get_intraday_db)
):
    """
    Force refresh data from API

    Args:
        ticker: Stock ticker
        timeframe: '1m', '5m', '15m', '1h'
        days_back: Days back to fetch

    Returns:
        Confirmation with record count
    """
    try:
        if timeframe not in VALID_TIMEFRAMES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid timeframe. Must be one of {VALID_TIMEFRAMES}"
            )

        end_dt = datetime.now()
        start_dt = end_dt - timedelta(days=days_back)

        service = IntradayDataService(db)
        data = service.get_intraday_data(
            ticker=ticker,
            timeframe=timeframe,
            start_date=start_dt,
            end_date=end_dt,
            force_refresh=True
        )

        return {
            "ticker": ticker.upper(),
            "timeframe": timeframe,
            "refreshed": True,
            "records_fetched": len(data),
            "start_date": start_dt.isoformat(),
            "end_date": end_dt.isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing {ticker} {timeframe}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
