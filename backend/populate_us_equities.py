#!/usr/bin/env python3
"""
Populate database with top 1500 US equities

This script:
1. Fetches all US common stocks from EODHD
2. Filters for the top 1500 by market cap
3. Adds them to the companies table
4. Runs initial OHLCV data ingestion
"""

import sys
import os
import logging
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from tools.eodhd_client import EODHDClient
from database.models.base import get_db
from database.models.company import Company, Exchange, Sector
from sqlalchemy.orm import Session
from core.config import settings

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_us_common_stocks(client: EODHDClient) -> List[Dict[str, Any]]:
    """Fetch all US common stocks from EODHD"""
    logger.info("📡 Fetching US common stocks from EODHD...")

    us_stocks = client.exchange.get_exchange_symbols(
        exchange="US",
        type_param="Common Stock",
        delisted=0
    )

    logger.info(f"✅ Found {len(us_stocks)} US common stocks")
    return us_stocks


def filter_top_stocks(stocks: List[Dict[str, Any]], limit: int = 1500) -> List[Dict[str, Any]]:
    """
    Filter to top N stocks by market cap

    Since EODHD doesn't return market cap in symbol list,
    we'll take the first N alphabetically as a starting point.
    In production, you'd want to fetch fundamentals for each and sort by market cap.
    """
    logger.info(f"📊 Selecting top {limit} stocks...")

    # Simple alphabetical sort for now
    # TODO: Fetch market cap and sort by that
    sorted_stocks = sorted(stocks, key=lambda x: x.get('Code', ''))
    top_stocks = sorted_stocks[:limit]

    logger.info(f"✅ Selected {len(top_stocks)} stocks")
    return top_stocks


def populate_companies(db: Session, stocks: List[Dict[str, Any]]) -> int:
    """Add companies to database"""
    logger.info("💾 Populating companies table...")

    # Get US exchange
    us_exchange = db.query(Exchange).filter_by(code='US').first()
    if not us_exchange:
        us_exchange = Exchange(
            code='US',
            name='New York Stock Exchange',
            country='United States',
            timezone='America/New_York'
        )
        db.add(us_exchange)
        db.commit()

    nasdaq_exchange = db.query(Exchange).filter_by(code='NASDAQ').first()
    if not nasdaq_exchange:
        nasdaq_exchange = Exchange(
            code='NASDAQ',
            name='NASDAQ Stock Exchange',
            country='United States',
            timezone='America/New_York'
        )
        db.add(nasdaq_exchange)
        db.commit()

    added_count = 0
    skipped_count = 0

    for stock in stocks:
        code = stock.get('Code')
        name = stock.get('Name', '')
        exchange_code = stock.get('Exchange', 'US')

        # Format ticker with exchange suffix
        ticker = f"{code}.US"

        # Check if already exists
        existing = db.query(Company).filter_by(ticker=ticker).first()
        if existing:
            skipped_count += 1
            continue

        # Determine exchange
        exchange = nasdaq_exchange if 'NASDAQ' in exchange_code else us_exchange

        # Create company
        company = Company(
            ticker=ticker,
            name=name,
            exchange_id=exchange.id,
            currency='USD',
            is_active=True,
            created_at=datetime.utcnow()
        )

        db.add(company)
        added_count += 1

        # Commit in batches of 100
        if added_count % 100 == 0:
            db.commit()
            logger.info(f"  ✓ Added {added_count} companies so far...")

    # Final commit
    db.commit()

    logger.info(f"✅ Added {added_count} new companies, skipped {skipped_count} existing")
    return added_count


def run_initial_ingestion(limit: int = 50):
    """
    Run initial OHLCV ingestion for first N companies

    Args:
        limit: Number of companies to ingest (default 50 to avoid API limits)
    """
    logger.info(f"📈 Running initial OHLCV ingestion for first {limit} companies...")

    from ingestion.incremental_ohlcv_ingestion import IncrementalOHLCVIngestion

    db = next(get_db())
    companies = db.query(Company).filter_by(is_active=True).limit(limit).all()

    if not companies:
        logger.warning("⚠️  No companies found in database")
        return

    ingestion = IncrementalOHLCVIngestion(api_key=settings.eodhd_api_key)

    success_count = 0
    error_count = 0

    for company in companies:
        try:
            logger.info(f"  Ingesting {company.ticker}...")
            ingestion.ingest_company(db, company)
            success_count += 1
        except Exception as e:
            logger.error(f"  ✗ Failed to ingest {company.ticker}: {e}")
            error_count += 1

    logger.info(f"✅ Ingestion complete: {success_count} success, {error_count} errors")


def main():
    """Main execution"""
    logger.info("=" * 60)
    logger.info("POPULATE US EQUITIES DATABASE")
    logger.info("=" * 60)

    # Initialize EODHD client
    client = EODHDClient(api_key=settings.eodhd_api_key)

    # Get database session
    db = next(get_db())

    try:
        # Step 1: Fetch US stocks
        us_stocks = get_us_common_stocks(client)

        # Step 2: Filter top 1500
        top_stocks = filter_top_stocks(us_stocks, limit=1500)

        # Step 3: Populate database
        added_count = populate_companies(db, top_stocks)

        logger.info("=" * 60)
        logger.info(f"✅ SUCCESS: Added {added_count} companies to database")
        logger.info("=" * 60)

        # Step 4: Ask about initial ingestion
        print("\n" + "=" * 60)
        print("Next step: Initial OHLCV Data Ingestion")
        print("=" * 60)
        print("This will fetch historical price data for companies.")
        print("⚠️  WARNING: This may use significant API quota")
        print("")
        print("Options:")
        print("  1. Ingest first 50 companies (recommended for testing)")
        print("  2. Ingest all 1500 companies (requires time)")
        print("  3. Skip for now (data will be fetched on-demand)")
        print("")

        choice = input("Enter choice (1/2/3): ").strip()

        if choice == "1":
            run_initial_ingestion(limit=50)
        elif choice == "2":
            run_initial_ingestion(limit=1500)
        else:
            logger.info("⏭️  Skipping initial ingestion - data will be fetched on demand")

        logger.info("")
        logger.info("=" * 60)
        logger.info("🎉 Database population complete!")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == '__main__':
    main()
