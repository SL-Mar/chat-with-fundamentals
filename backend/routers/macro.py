# File: routers/macro.py
# Macroeconomic data endpoints: indicators, economic calendar

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging
from tools.eodhd_client import EODHDClient

router = APIRouter(prefix="/macro", tags=["Macroeconomic Data"])
logger = logging.getLogger("macro")


@router.get("/indicator")
async def get_macro_indicator(
    country: str = Query(..., description="Country code (USA, UK, DE, FR, IT, JP, CN, EUR, USD, GBP)"),
    indicator: str = Query(..., description="Indicator type"),
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get macroeconomic indicator data using EODHD's EOD API.

    Available indicators:
    - government_bond_10y: 10-year government bond yields (USA, UK, DE, FR, IT, JP, CN)
    - euribor_3m: 3-month EURIBOR rate (EUR)
    - euribor_6m: 6-month EURIBOR rate (EUR)
    - euribor_12m: 12-month EURIBOR rate (EUR)
    - libor_usd_3m: 3-month USD LIBOR (USD)
    - libor_eur_3m: 3-month EUR LIBOR (EUR)
    - libor_gbp_3m: 3-month GBP LIBOR (GBP)

    Example: /macro/indicator?country=USA&indicator=government_bond_10y&from_date=2020-01-01
    """
    try:
        client = EODHDClient()
        data = client.macro.get_macro_indicator(
            country=country,
            indicator=indicator,
            from_date=from_date,
            to_date=to_date
        )

        logger.info(f"[MACRO] Fetched {indicator} for {country}")
        return {
            "country": country,
            "indicator": indicator,
            "data": data
        }

    except Exception as e:
        logger.error(f"[MACRO] Failed to fetch {indicator} for {country}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch macro indicator: {str(e)}")


@router.get("/economic-events")
async def get_economic_events(
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    country: Optional[str] = Query(None, description="Country filter (US, GB, JP, etc.)"),
    comparison: Optional[str] = Query(None, description="Comparison filter"),
    offset: int = Query(0, description="Pagination offset"),
    limit: int = Query(50, description="Number of results (max 1000)")
):
    """Get economic calendar events.

    Returns upcoming economic events like:
    - FOMC meetings
    - CPI releases
    - Jobs reports
    - GDP announcements
    - And more...

    Each event includes actual, forecast, and previous values.

    Example: /macro/economic-events?from_date=2024-01-01&country=US
    """
    try:
        client = EODHDClient()
        events = client.macro.get_economic_events(
            from_date=from_date,
            to_date=to_date,
            country=country,
            comparison=comparison,
            offset=offset,
            limit=limit
        )

        logger.info(f"[MACRO] Fetched economic events ({len(events)} results)")
        return {
            "count": len(events),
            "events": events
        }

    except Exception as e:
        logger.error(f"[MACRO] Failed to fetch economic events: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch economic events: {str(e)}")


@router.get("/indicators-bulk")
async def get_indicators_bulk(
    country: str = Query("USA", description="Country code (USA, UK, DE, FR, IT, JP, CN)"),
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get government bond 10Y yield data (proxy for interest rates).

    NOTE: EODHD only provides government bond yields via EOD API.
    Other macro indicators (GDP, inflation, unemployment) are not available.

    Returns:
    - government_bond_10y: 10-year government bond yield

    Example: /macro/indicators-bulk?country=USA
    """
    try:
        client = EODHDClient()

        logger.info(f"[MACRO_BULK] Fetching government bond 10Y for {country}")

        try:
            bond_data = client.macro.get_macro_indicator(
                country=country,
                indicator="government_bond_10y",
                from_date=from_date,
                to_date=to_date
            )
            results = {"government_bond_10y": bond_data}
            logger.info(f"[MACRO_BULK] Successfully fetched bond data for {country}, {len(bond_data)} records")
        except Exception as e:
            logger.error(f"[MACRO_BULK] Failed to fetch bond data for {country}: {e}")
            results = {"government_bond_10y": None}

        return {
            "country": country,
            "indicators": results
        }

    except Exception as e:
        logger.error(f"[MACRO_BULK] Failed to fetch bulk indicators: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch bulk indicators: {str(e)}")
