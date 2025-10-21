# File: routers/special.py
# Special data endpoints: logos, analyst ratings, ESG, shareholders, market cap history

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
import logging
from tools.eodhd_client import EODHDClient

router = APIRouter(prefix="/special", tags=["Special Data"])
logger = logging.getLogger("special")


@router.get("/logo")
async def get_company_logo(ticker: str = Query(..., description="Stock symbol (e.g., AAPL.US)")):
    """Get company logo URL.

    Returns the URL to the company's logo image.

    Example: /special/logo?ticker=AAPL.US
    """
    try:
        client = EODHDClient()
        logo_url = client.special.get_logo(ticker)

        logger.info(f"[LOGO] Fetched logo for {ticker}")
        return {"ticker": ticker, "logo_url": logo_url}

    except Exception as e:
        logger.error(f"[LOGO] Failed to fetch logo for {ticker}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch logo: {str(e)}")


@router.get("/analyst-ratings")
async def get_analyst_ratings(ticker: str = Query(..., description="Stock symbol (e.g., AAPL.US)")):
    """Get analyst ratings and price targets.

    Returns:
    - Buy/Hold/Sell ratings count
    - Price targets (low, average, high)
    - Recent upgrades/downgrades

    Example: /special/analyst-ratings?ticker=AAPL.US
    """
    try:
        client = EODHDClient()
        ratings = client.special.get_analyst_ratings(ticker)

        logger.info(f"[ANALYST] Fetched ratings for {ticker}")
        return ratings

    except Exception as e:
        logger.error(f"[ANALYST] Failed to fetch ratings for {ticker}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch analyst ratings: {str(e)}")


@router.get("/esg")
async def get_esg_scores(ticker: str = Query(..., description="Stock symbol (e.g., AAPL.US)")):
    """Get ESG (Environmental, Social, Governance) scores.

    Returns ESG ratings and scores for the company.

    Example: /special/esg?ticker=AAPL.US
    """
    try:
        client = EODHDClient()
        esg = client.special.get_esg_scores(ticker)

        logger.info(f"[ESG] Fetched ESG scores for {ticker}")
        return esg

    except Exception as e:
        logger.error(f"[ESG] Failed to fetch ESG scores for {ticker}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch ESG scores: {str(e)}")


@router.get("/shareholders")
async def get_shareholders(
    ticker: str = Query(..., description="Stock symbol (e.g., AAPL.US)"),
    holder_type: str = Query("institutions", description="Type: 'institutions' or 'funds'")
):
    """Get major shareholders (institutional or fund holders).

    Args:
        ticker: Stock symbol
        holder_type: 'institutions' or 'funds'

    Returns list of major shareholders with holdings data.

    Example: /special/shareholders?ticker=AAPL.US&holder_type=institutions
    """
    try:
        client = EODHDClient()

        if holder_type not in ["institutions", "funds"]:
            raise HTTPException(status_code=400, detail="holder_type must be 'institutions' or 'funds'")

        shareholders = client.special.get_shareholders(ticker, holder_type)

        logger.info(f"[SHAREHOLDERS] Fetched {holder_type} for {ticker}")
        return shareholders

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[SHAREHOLDERS] Failed to fetch {holder_type} for {ticker}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch shareholders: {str(e)}")


@router.get("/market-cap-history")
async def get_market_cap_history(
    ticker: str = Query(..., description="Stock symbol (e.g., AAPL.US)"),
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get historical market capitalization data.

    Returns market cap over time for valuation trend analysis.

    Example: /special/market-cap-history?ticker=AAPL.US&from_date=2020-01-01
    """
    try:
        client = EODHDClient()
        market_cap = client.special.get_market_cap_history(
            ticker,
            from_date=from_date,
            to_date=to_date
        )

        logger.info(f"[MARKET_CAP] Fetched market cap history for {ticker}")
        return market_cap

    except Exception as e:
        logger.error(f"[MARKET_CAP] Failed to fetch market cap history for {ticker}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch market cap history: {str(e)}")


@router.get("/etf-holdings")
async def get_etf_holdings(ticker: str = Query(..., description="ETF symbol (e.g., SPY.US)")):
    """Get ETF holdings breakdown.

    Returns list of holdings with weights for an ETF.

    Example: /special/etf-holdings?ticker=SPY.US
    """
    try:
        client = EODHDClient()
        holdings = client.special.get_etf_holdings(ticker)

        logger.info(f"[ETF] Fetched holdings for {ticker}")
        return holdings

    except Exception as e:
        logger.error(f"[ETF] Failed to fetch holdings for {ticker}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch ETF holdings: {str(e)}")


@router.get("/index-constituents")
async def get_index_constituents(
    index: str = Query(..., description="Index symbol (e.g., GSPC.INDX for S&P 500)")
):
    """Get index constituents (member companies).

    Common indices:
    - GSPC.INDX: S&P 500
    - DJI.INDX: Dow Jones
    - IXIC.INDX: Nasdaq Composite

    Example: /special/index-constituents?index=GSPC.INDX
    """
    try:
        client = EODHDClient()
        constituents = client.special.get_index_constituents(index)

        logger.info(f"[INDEX] Fetched constituents for {index}")
        return constituents

    except Exception as e:
        logger.error(f"[INDEX] Failed to fetch constituents for {index}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch index constituents: {str(e)}")


@router.get("/index-historical-constituents")
async def get_index_historical_constituents(
    index: str = Query(..., description="Index symbol (e.g., GSPC.INDX)"),
    date: str = Query(..., description="Historical date (YYYY-MM-DD)")
):
    """Get historical index constituents for a specific date.

    Useful for tracking which companies were in the index at a past date.

    Example: /special/index-historical-constituents?index=GSPC.INDX&date=2020-01-01
    """
    try:
        client = EODHDClient()
        constituents = client.special.get_index_historical_constituents(index, date)

        logger.info(f"[INDEX_HIST] Fetched historical constituents for {index} on {date}")
        return constituents

    except Exception as e:
        logger.error(f"[INDEX_HIST] Failed to fetch historical constituents for {index}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch historical constituents: {str(e)}")
