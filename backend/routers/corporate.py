# File: routers/corporate.py
# Corporate actions endpoints: dividends, splits, insider transactions
# NOW WITH DATABASE-FIRST APPROACH (Phase 2B)

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging
from tools.eodhd_client import EODHDClient
from services.data_service import DataService
from utils.ticker_utils import validate_and_format_ticker, format_ticker_for_eodhd

router = APIRouter(prefix="/corporate", tags=["Corporate Actions"])
logger = logging.getLogger("corporate")

# Initialize data service (database-first)
data_service = DataService()


@router.get("/dividends")
async def get_dividend_history(
    ticker: str = Query(..., description="Stock symbol (e.g., AAPL.US)"),
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get dividend payment history.

    Returns:
    - Payment dates
    - Dividend amounts
    - Ex-dividend dates
    - Record dates

    **NEW: Database-First Approach (Phase 2B)**
    - Checks database first (7 day cache)
    - Falls back to EODHD API if stale
    - Automatically stores API response for future queries

    Example: /corporate/dividends?ticker=AAPL.US&from_date=2020-01-01
    """
    try:
        # Validate and format ticker
        ticker = validate_and_format_ticker(ticker)
        ticker = format_ticker_for_eodhd(ticker)

        # DATABASE-FIRST: Check DB, fallback to API, auto-store
        dividends = data_service.get_dividends(
            ticker=ticker,
            from_date=from_date,
            to_date=to_date
        )

        logger.info(f"[DIVIDENDS] Fetched dividend history for {ticker} ({len(dividends)} records)")
        return {"ticker": ticker, "dividends": dividends}

    except Exception as e:
        logger.error(f"[DIVIDENDS] Failed to fetch dividends for {ticker}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch dividends: {str(e)}")


@router.get("/splits")
async def get_split_history(
    ticker: str = Query(..., description="Stock symbol (e.g., TSLA.US)"),
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get stock split history.

    Returns:
    - Split dates
    - Split ratios (e.g., 2-for-1, 5-for-1)

    Example: /corporate/splits?ticker=TSLA.US&from_date=2020-01-01
    """
    try:
        # Validate and format ticker
        ticker = validate_and_format_ticker(ticker)
        ticker = format_ticker_for_eodhd(ticker)

        client = EODHDClient()
        splits = client.corporate.get_splits(
            ticker,
            from_date=from_date,
            to_date=to_date
        )

        logger.info(f"[SPLITS] Fetched split history for {ticker}")
        return {"ticker": ticker, "splits": splits}

    except Exception as e:
        logger.error(f"[SPLITS] Failed to fetch splits for {ticker}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch splits: {str(e)}")


@router.get("/insider-transactions")
async def get_insider_transactions(
    ticker: str = Query(..., description="Stock symbol (e.g., AAPL.US)"),
    limit: int = Query(50, ge=1, le=100, description="Number of transactions to return")
):
    """Get insider transaction history.

    Returns recent insider buying and selling activity:
    - Transaction type (buy/sell)
    - Insider name and title
    - Number of shares
    - Transaction value
    - Filing date

    **NEW: Database-First Approach (Phase 2B)**
    - Checks database first (1 day cache)
    - Falls back to EODHD API if stale
    - Automatically stores API response for future queries

    Example: /corporate/insider-transactions?ticker=AAPL.US&limit=50
    """
    try:
        # Validate and format ticker
        ticker = validate_and_format_ticker(ticker)
        ticker = format_ticker_for_eodhd(ticker)

        # DATABASE-FIRST: Check DB, fallback to API, auto-store
        transactions = data_service.get_insider_transactions(ticker=ticker, limit=limit)

        logger.info(f"[INSIDER] Fetched {limit} insider transactions for {ticker}")
        return transactions

    except Exception as e:
        # Insider transactions may not be available for all stocks or from certain IPs
        # Return empty result instead of error to allow page to load gracefully
        logger.warning(f"[INSIDER] Insider transactions not available for {ticker}: {e}")
        return {"ticker": ticker, "data": [], "note": "Insider transactions not available for this stock or current API subscription"}
