"""
Database statistics and monitoring endpoints.

Provides detailed statistics about all databases:
- TimescaleDB main: fundamentals, prices, news, etc.
- TimescaleDB intraday: minute-level OHLCV data
- SQLite portfolios: user portfolios and holdings
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
import logging
from sqlalchemy import text, create_engine
import sqlite3
import os

from database.config import get_config

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/api/v2/database/stats")
async def get_database_statistics() -> Dict[str, Any]:
    """
    Get comprehensive statistics for all databases.

    Returns:
        Dict with statistics for:
        - main_db: TimescaleDB main database
        - intraday_db: TimescaleDB intraday database
        - portfolios_db: SQLite portfolios database
    """
    try:
        stats = {
            "main_db": await get_main_db_stats(),
            "intraday_db": await get_intraday_db_stats(),
            "portfolios_db": get_portfolios_db_stats(),
            "timestamp": None  # Will be set by frontend
        }

        return stats

    except Exception as e:
        logger.error(f"Failed to get database statistics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


async def get_main_db_stats() -> Dict[str, Any]:
    """Get statistics for main TimescaleDB database."""
    try:
        config = get_config()
        engine = config.get_engine()

        stats = {}

        with engine.connect() as conn:
            # Companies
            result = conn.execute(text("SELECT COUNT(*) FROM companies"))
            stats["companies_count"] = result.scalar()

            # Fundamentals
            result = conn.execute(text("""
                SELECT
                    COUNT(DISTINCT company_id) as company_count,
                    COUNT(*) as total_records,
                    MIN(date) as earliest_date,
                    MAX(date) as latest_date
                FROM fundamentals
            """))
            row = result.fetchone()
            stats["fundamentals"] = {
                "tickers_with_data": row[0],
                "total_records": row[1],
                "date_range": {
                    "earliest": str(row[2]) if row[2] else None,
                    "latest": str(row[3]) if row[3] else None
                }
            }

            # OHLCV (daily prices)
            result = conn.execute(text("""
                SELECT
                    COUNT(DISTINCT company_id) as company_count,
                    COUNT(*) as total_records,
                    MIN(date) as earliest_date,
                    MAX(date) as latest_date
                FROM ohlcv
            """))
            row = result.fetchone()
            stats["daily_prices"] = {
                "tickers_with_data": row[0],
                "total_records": row[1],
                "date_range": {
                    "earliest": str(row[2]) if row[2] else None,
                    "latest": str(row[3]) if row[3] else None
                }
            }

            # News
            result = conn.execute(text("""
                SELECT
                    COUNT(DISTINCT company_id) as company_count,
                    COUNT(*) as total_articles,
                    MIN(published_at) as earliest_date,
                    MAX(published_at) as latest_date
                FROM news
            """))
            row = result.fetchone()
            stats["news"] = {
                "tickers_with_news": row[0],
                "total_articles": row[1],
                "date_range": {
                    "earliest": str(row[2]) if row[2] else None,
                    "latest": str(row[3]) if row[3] else None
                }
            }

            # Dividends
            result = conn.execute(text("SELECT COUNT(*) FROM dividends"))
            stats["dividends_count"] = result.scalar()

            # Analyst Ratings
            result = conn.execute(text("SELECT COUNT(*) FROM analyst_ratings"))
            stats["analyst_ratings_count"] = result.scalar()

            # Insider Transactions
            result = conn.execute(text("SELECT COUNT(*) FROM insider_transactions"))
            stats["insider_transactions_count"] = result.scalar()

            # Exchanges
            result = conn.execute(text("SELECT COUNT(*) FROM exchanges"))
            stats["exchanges_count"] = result.scalar()

            # Sectors
            result = conn.execute(text("SELECT COUNT(*) FROM sectors"))
            stats["sectors_count"] = result.scalar()

            # Industries
            result = conn.execute(text("SELECT COUNT(*) FROM industries"))
            stats["industries_count"] = result.scalar()

            # Database size
            result = conn.execute(text("""
                SELECT pg_size_pretty(pg_database_size('chat_fundamentals')) as size
            """))
            stats["database_size"] = result.scalar()

        return stats

    except Exception as e:
        logger.error(f"Failed to get main DB stats: {e}", exc_info=True)
        raise


async def get_intraday_db_stats() -> Dict[str, Any]:
    """Get statistics for intraday TimescaleDB database."""
    try:
        # Connect to intraday database
        intraday_url = os.getenv(
            'INTRADAY_DATABASE_URL',
            'postgresql://postgres:postgres@localhost:5433/chat_fundamentals_intraday'
        )
        engine = create_engine(intraday_url)

        stats = {}

        with engine.connect() as conn:
            # Check if intraday_ohlcv table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'intraday_ohlcv'
                )
            """))
            table_exists = result.scalar()

            if not table_exists:
                return {
                    "by_granularity": [],
                    "overall": {"unique_tickers": 0, "total_records": 0},
                    "recent_updates": [],
                    "database_size": "N/A",
                    "status": "not_configured"
                }

            # Intraday OHLCV by timeframe
            result = conn.execute(text("""
                SELECT
                    timeframe,
                    COUNT(DISTINCT ticker) as ticker_count,
                    COUNT(*) as total_records,
                    MIN(timestamp) as earliest_timestamp,
                    MAX(timestamp) as latest_timestamp
                FROM intraday_ohlcv
                GROUP BY timeframe
                ORDER BY timeframe
            """))

            granularity_stats = []
            for row in result:
                granularity_stats.append({
                    "interval": row[0],
                    "tickers_with_data": row[1],
                    "total_records": row[2],
                    "date_range": {
                        "earliest": str(row[3]) if row[3] else None,
                        "latest": str(row[4]) if row[4] else None
                    }
                })

            stats["by_granularity"] = granularity_stats

            # Overall stats
            result = conn.execute(text("""
                SELECT
                    COUNT(DISTINCT ticker) as unique_tickers,
                    COUNT(*) as total_records
                FROM intraday_ohlcv
            """))
            row = result.fetchone()
            stats["overall"] = {
                "unique_tickers": row[0],
                "total_records": row[1]
            }

            # Data status
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'intraday_data_status'
                )
            """))
            status_table_exists = result.scalar()

            if status_table_exists:
                result = conn.execute(text("""
                    SELECT
                        ticker,
                        timeframe,
                        last_fetched_at,
                        total_records
                    FROM intraday_data_status
                    ORDER BY updated_at DESC
                    LIMIT 10
                """))

                recent_updates = []
                for row in result:
                    recent_updates.append({
                        "ticker": row[0],
                        "interval": row[1],
                        "last_updated": str(row[2]) if row[2] else None,
                        "total_records": row[3]
                    })

                stats["recent_updates"] = recent_updates
            else:
                stats["recent_updates"] = []

            # Database size
            result = conn.execute(text("""
                SELECT pg_size_pretty(pg_database_size('chat_fundamentals_intraday')) as size
            """))
            stats["database_size"] = result.scalar()

        return stats

    except Exception as e:
        logger.error(f"Failed to get intraday DB stats: {e}", exc_info=True)
        # Return empty stats on error
        return {
            "by_granularity": [],
            "overall": {"unique_tickers": 0, "total_records": 0},
            "recent_updates": [],
            "database_size": "N/A",
            "status": "error"
        }


# Remove the old unreachable code below
async def _old_get_intraday_db_stats() -> Dict[str, Any]:
    """DEPRECATED - This code is never reached"""
    try:

        # Connect to intraday database
        intraday_url = os.getenv(
            'INTRADAY_DATABASE_URL',
            'postgresql://postgres:postgres@localhost:5433/chat_fundamentals_intraday'
        )
        engine = create_engine(intraday_url)

        stats = {}

        with engine.connect() as conn:
            # Check if intraday_ohlcv table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'intraday_ohlcv'
                )
            """))
            table_exists = result.scalar()

            if not table_exists:
                # Return empty stats if table doesn't exist yet
                return {
                    "by_granularity": [],
                    "overall": {"unique_tickers": 0, "total_records": 0},
                    "recent_updates": [],
                    "database_size": "N/A"
                }

            # Intraday OHLCV by granularity
            result = conn.execute(text("""
                SELECT
                    granularity,
                    COUNT(DISTINCT company_id) as company_count,
                    COUNT(*) as total_records,
                    MIN(timestamp) as earliest_timestamp,
                    MAX(timestamp) as latest_timestamp
                FROM intraday_ohlcv
                GROUP BY granularity
                ORDER BY granularity
            """))

            granularity_stats = []
            for row in result:
                granularity_stats.append({
                    "interval": row[0],
                    "tickers_with_data": row[1],
                    "total_records": row[2],
                    "date_range": {
                        "earliest": str(row[3]) if row[3] else None,
                        "latest": str(row[4]) if row[4] else None
                    }
                })

            stats["by_granularity"] = granularity_stats

            # Overall stats
            result = conn.execute(text("""
                SELECT
                    COUNT(DISTINCT company_id) as unique_companies,
                    COUNT(*) as total_records
                FROM intraday_ohlcv
            """))
            row = result.fetchone()
            stats["overall"] = {
                "unique_tickers": row[0],
                "total_records": row[1]
            }

            # Data status (skip if table doesn't exist)
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'intraday_data_status'
                )
            """))
            status_table_exists = result.scalar()

            if status_table_exists:
                result = conn.execute(text("""
                    SELECT
                        company_id,
                        granularity,
                        last_updated,
                        status
                    FROM intraday_data_status
                    ORDER BY last_updated DESC
                    LIMIT 10
                """))

                recent_updates = []
                for row in result:
                    recent_updates.append({
                        "company_id": row[0],
                        "interval": row[1],
                        "last_updated": str(row[2]) if row[2] else None,
                        "status": row[3]
                    })

                stats["recent_updates"] = recent_updates
            else:
                stats["recent_updates"] = []

            # Database size
            result = conn.execute(text("""
                SELECT pg_size_pretty(pg_database_size('chat_fundamentals_intraday')) as size
            """))
            stats["database_size"] = result.scalar()

        return stats

    except Exception as e:
        logger.error(f"Failed to get intraday DB stats: {e}", exc_info=True)
        raise


def get_portfolios_db_stats() -> Dict[str, Any]:
    """Get statistics for portfolios PostgreSQL database."""
    try:
        # Use main database connection (portfolios are in PostgreSQL now)
        config = get_config()
        engine = config.get_engine()

        stats = {}

        with engine.connect() as conn:
            # Portfolios count
            result = conn.execute(text("SELECT COUNT(*) FROM portfolios"))
            stats["portfolios_count"] = result.scalar()

            # Holdings count (using portfolio_stocks table)
            result = conn.execute(text("SELECT COUNT(*) FROM portfolio_stocks"))
            stats["total_holdings"] = result.scalar()

            # Unique symbols in portfolios
            result = conn.execute(text("SELECT COUNT(DISTINCT ticker) FROM portfolio_stocks"))
            stats["unique_tickers"] = result.scalar()

            # Portfolio details
            result = conn.execute(text("""
                SELECT
                    p.id,
                    p.name,
                    COUNT(ps.id) as holdings_count,
                    SUM(ps.shares * ps.weight) as total_value
                FROM portfolios p
                LEFT JOIN portfolio_stocks ps ON p.id = ps.portfolio_id
                GROUP BY p.id, p.name
                ORDER BY total_value DESC NULLS LAST
            """))

            portfolio_details = []
            for row in result:
                portfolio_details.append({
                    "id": row[0],
                    "name": row[1],
                    "holdings_count": row[2],
                    "total_value": float(row[3]) if row[3] else 0.0
                })

            stats["portfolio_details"] = portfolio_details

            # Database size (estimated from pg_total_relation_size)
            result = conn.execute(text("""
                SELECT
                    ROUND(
                        (pg_total_relation_size('portfolios') +
                         pg_total_relation_size('portfolio_stocks')) / 1024.0, 2
                    ) as size_kb
            """))
            size_kb = result.scalar()
            stats["database_size"] = f"{size_kb:.2f} KB"

        return stats

    except Exception as e:
        logger.error(f"Failed to get portfolios DB stats: {e}", exc_info=True)
        raise
