"""
Database inventory endpoints.

Provides lists of tickers available for each dataset type.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
import logging
from sqlalchemy import text
import os

from database.config import get_config

logger = logging.getLogger(__name__)
router = APIRouter()


def classify_asset_type(ticker: str, name: str) -> str:
    """
    Classify asset type based on ticker and company name.

    Returns: 'etf', 'stock', or 'forex'
    """
    name_lower = name.lower() if name else ""
    ticker_upper = ticker.upper()

    # Forex detection - check for .FOREX suffix first
    if '.FOREX' in ticker_upper or '.FX' in ticker_upper:
        return "forex"

    # Forex detection - common forex pair patterns
    # Forex pairs are typically 6 characters: XXXYYY (e.g., EURUSD, GBPJPY)
    # Common currency codes: USD, EUR, GBP, JPY, AUD, CAD, CHF, NZD, etc.
    forex_currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'CNY', 'HKD', 'SGD', 'SEK', 'NOK', 'DKK']

    # Check if ticker (before any dot) matches forex pattern
    ticker_base = ticker_upper.split('.')[0]
    if len(ticker_base) == 6:
        first_currency = ticker_base[:3]
        second_currency = ticker_base[3:6]
        if first_currency in forex_currencies and second_currency in forex_currencies:
            return "forex"

    # Also check for forex in name or ticker contains '/'
    if "/" in ticker or "forex" in name_lower or "currency" in name_lower:
        return "forex"

    # ETF detection
    if "etf" in name_lower or "fund" in name_lower:
        return "etf"

    # Default to stock
    return "stock"


@router.get("/api/v2/database/inventory/main")
async def get_main_database_inventory() -> Dict[str, Any]:
    """
    Get inventory of tickers for main database datasets.

    Returns:
        Dict with ticker lists for:
        - fundamentals: list of {ticker, type} objects
        - daily_prices: list of {ticker, type} objects
        - news: list of {ticker, type} objects
    """
    try:
        config = get_config()
        engine = config.get_engine()

        inventory = {}

        with engine.connect() as conn:
            # Get tickers with fundamentals
            result = conn.execute(text("""
                SELECT DISTINCT c.ticker, c.name
                FROM companies c
                INNER JOIN fundamentals f ON c.id = f.company_id
                ORDER BY c.ticker
            """))
            inventory["fundamentals"] = [
                {"ticker": row[0], "type": classify_asset_type(row[0], row[1])}
                for row in result
            ]

            # Get tickers with daily prices
            result = conn.execute(text("""
                SELECT DISTINCT c.ticker, c.name
                FROM companies c
                INNER JOIN ohlcv o ON c.id = o.company_id
                ORDER BY c.ticker
            """))
            inventory["daily_prices"] = [
                {"ticker": row[0], "type": classify_asset_type(row[0], row[1])}
                for row in result
            ]

            # Get tickers with news
            result = conn.execute(text("""
                SELECT DISTINCT c.ticker, c.name
                FROM companies c
                INNER JOIN news n ON c.id = n.company_id
                ORDER BY c.ticker
            """))
            inventory["news"] = [
                {"ticker": row[0], "type": classify_asset_type(row[0], row[1])}
                for row in result
            ]

        return inventory

    except Exception as e:
        logger.error(f"Failed to get main database inventory: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/v2/database/inventory/intraday")
async def get_intraday_database_inventory() -> Dict[str, Any]:
    """
    Get inventory of tickers for intraday database.

    Returns:
        Dict with ticker lists by timeframe:
        - 1m, 5m, 15m, 1h
        Each ticker is an object with {ticker, type}
    """
    try:
        from sqlalchemy import create_engine

        intraday_url = os.getenv(
            'INTRADAY_DATABASE_URL',
            'postgresql://postgres:postgres@localhost:5433/chat_fundamentals_intraday'
        )
        intraday_engine = create_engine(intraday_url)

        # Get main database connection to fetch company names for classification
        config = get_config()
        main_engine = config.get_engine()

        # First, get ticker-to-name mapping from main database
        ticker_names = {}
        with main_engine.connect() as conn:
            result = conn.execute(text("""
                SELECT ticker, name
                FROM companies
            """))
            ticker_names = {row[0]: row[1] for row in result}

        inventory = {}

        with intraday_engine.connect() as conn:
            # Check if table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'intraday_ohlcv'
                )
            """))
            table_exists = result.scalar()

            if not table_exists:
                return {"1m": [], "5m": [], "15m": [], "1h": []}

            # Get tickers by timeframe
            result = conn.execute(text("""
                SELECT timeframe, ticker
                FROM intraday_ohlcv
                GROUP BY timeframe, ticker
                ORDER BY timeframe, ticker
            """))

            # Organize by timeframe with asset type classification
            for row in result:
                timeframe = row[0]
                ticker = row[1]
                if timeframe not in inventory:
                    inventory[timeframe] = []

                # Get company name from mapping, classify asset type
                company_name = ticker_names.get(ticker, "")
                asset_type = classify_asset_type(ticker, company_name)

                inventory[timeframe].append({
                    "ticker": ticker,
                    "type": asset_type
                })

        return inventory

    except Exception as e:
        logger.error(f"Failed to get intraday database inventory: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
