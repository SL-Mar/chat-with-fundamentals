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
    country: str = Query(..., description="Country code (e.g., USA, GBR, JPN)"),
    indicator: str = Query(..., description="Indicator code (gdp_current_usd, inflation_consumer_prices_annual, unemployment_total, etc.)"),
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get macroeconomic indicator data for a country.

    Available indicators:
    - gdp_current_usd: GDP in current US dollars
    - gdp_per_capita_usd: GDP per capita
    - inflation_consumer_prices_annual: Annual inflation rate
    - unemployment_total: Total unemployment rate
    - population_total: Total population
    - real_interest_rate: Real interest rate
    - And many more...

    Example: /macro/indicator?country=USA&indicator=gdp_current_usd
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
    country: str = Query("USA", description="Country code"),
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get multiple key economic indicators at once for convenience.

    Returns:
    - GDP (current USD)
    - Inflation rate
    - Unemployment rate
    - Real interest rate

    Example: /macro/indicators-bulk?country=USA
    """
    try:
        client = EODHDClient()

        indicators = {
            "gdp": "gdp_current_usd",
            "inflation": "inflation_consumer_prices_annual",
            "unemployment": "unemployment_total",
            "interest_rate": "real_interest_rate"
        }

        results = {}
        for key, indicator_code in indicators.items():
            try:
                data = client.macro.get_macro_indicator(
                    country=country,
                    indicator=indicator_code,
                    from_date=from_date,
                    to_date=to_date
                )
                results[key] = data
            except Exception as e:
                logger.warning(f"[MACRO] Failed to fetch {indicator_code}: {e}")
                results[key] = None

        logger.info(f"[MACRO] Fetched bulk indicators for {country}")
        return {
            "country": country,
            "indicators": results
        }

    except Exception as e:
        logger.error(f"[MACRO] Failed to fetch bulk indicators: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch bulk indicators: {str(e)}")
