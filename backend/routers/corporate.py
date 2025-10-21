# File: routers/corporate.py
# Corporate actions endpoints: dividends, splits, insider transactions

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging
from tools.eodhd_client import EODHDClient

router = APIRouter(prefix="/corporate", tags=["Corporate Actions"])
logger = logging.getLogger("corporate")


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

    Example: /corporate/dividends?ticker=AAPL.US&from_date=2020-01-01
    """
    try:
        client = EODHDClient()
        dividends = client.corporate.get_dividends(
            ticker,
            from_date=from_date,
            to_date=to_date
        )

        logger.info(f"[DIVIDENDS] Fetched dividend history for {ticker}")
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

    Example: /corporate/insider-transactions?ticker=AAPL.US&limit=50
    """
    try:
        client = EODHDClient()
        transactions = client.fundamental.get_insider_transactions(ticker, limit=limit)

        logger.info(f"[INSIDER] Fetched {limit} insider transactions for {ticker}")
        return transactions

    except Exception as e:
        logger.error(f"[INSIDER] Failed to fetch insider transactions for {ticker}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch insider transactions: {str(e)}")
