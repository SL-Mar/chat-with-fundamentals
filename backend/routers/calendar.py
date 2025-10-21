# routers/calendar.py

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any
from datetime import date, timedelta
from core.logger_config import setup_logger
from core.config import settings
import httpx

router = APIRouter(
    prefix="/calendar",
    tags=["Financial Calendar"]
)

logger = setup_logger().getChild("calendar")

@router.get("/earnings")
async def get_earnings_calendar(
    from_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    symbols: Optional[str] = Query(None, description="Comma-separated ticker symbols"),
) -> Dict[str, Any]:
    """
    Get upcoming and past earnings calendar

    Returns earnings data with:
    - report_date: Date of earnings report
    - before_after_market: Timing (bmo/amc)
    - currency: Currency code
    - actual, estimate, difference: EPS values
    """
    url = "https://eodhd.com/api/calendar/earnings"

    # Default to next 30 days if no dates provided
    if not from_date:
        from_date = date.today().strftime("%Y-%m-%d")
    if not to_date:
        to_date = (date.today() + timedelta(days=30)).strftime("%Y-%m-%d")

    params = {
        "api_token": settings.eodhd_api_key,
        "fmt": "json",
        "from": from_date,
        "to": to_date
    }

    if symbols:
        params["symbols"] = symbols

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.error("EODHD earnings calendar failed (%s)", e.__class__.__name__)
        raise HTTPException(502, "Data provider error")

    # Count results
    count = len(data.get('earnings', [])) if isinstance(data, dict) else len(data)
    logger.info("[CALENDAR] earnings fetched %d events from %s to %s", count, from_date, to_date)
    return data


@router.get("/ipos")
async def get_ipos_calendar(
    from_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
) -> Dict[str, Any]:
    """
    Get upcoming IPO calendar

    Returns IPO data with:
    - code: Ticker symbol
    - name: Company name
    - exchange: Exchange code
    - start_date: IPO date
    - price_from, price_to: Expected price range
    - currency: Currency code
    """
    url = "https://eodhd.com/api/calendar/ipos"

    # Default to next 90 days if no dates provided
    if not from_date:
        from_date = date.today().strftime("%Y-%m-%d")
    if not to_date:
        to_date = (date.today() + timedelta(days=90)).strftime("%Y-%m-%d")

    params = {
        "api_token": settings.eodhd_api_key,
        "fmt": "json",
        "from": from_date,
        "to": to_date
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.error("EODHD IPO calendar failed (%s)", e.__class__.__name__)
        raise HTTPException(502, "Data provider error")

    count = len(data.get('ipos', [])) if isinstance(data, dict) else len(data)
    logger.info("[CALENDAR] IPOs fetched %d events from %s to %s", count, from_date, to_date)
    return data


@router.get("/splits")
async def get_splits_calendar(
    from_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
) -> Dict[str, Any]:
    """
    Get upcoming stock splits calendar

    Returns split data with:
    - code: Ticker symbol
    - exchange: Exchange code
    - date: Split date
    - split: Split ratio (e.g., "2/1" for 2-for-1 split)
    """
    url = "https://eodhd.com/api/calendar/splits"

    # Default to next 60 days if no dates provided
    if not from_date:
        from_date = date.today().strftime("%Y-%m-%d")
    if not to_date:
        to_date = (date.today() + timedelta(days=60)).strftime("%Y-%m-%d")

    params = {
        "api_token": settings.eodhd_api_key,
        "fmt": "json",
        "from": from_date,
        "to": to_date
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.error("EODHD splits calendar failed (%s)", e.__class__.__name__)
        raise HTTPException(502, "Data provider error")

    count = len(data.get('splits', [])) if isinstance(data, dict) else len(data)
    logger.info("[CALENDAR] splits fetched %d events from %s to %s", count, from_date, to_date)
    return data
