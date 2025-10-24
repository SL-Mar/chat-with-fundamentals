"""
Incremental Fundamentals Data Ingestion
Smart refresh for quarterly/annual fundamental data
Only refreshes stale data to minimize API calls
"""

from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
import logging
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database.models.financial import Fundamental
from ingestion.base_ingestion import BaseIngestion
from utils.ticker_utils import format_ticker_for_company

logger = logging.getLogger("incremental_fundamentals")


class IncrementalFundamentalsIngestion(BaseIngestion):
    """
    Incremental fundamentals ingestion pipeline

    Smart refresh strategy:
    - Fundamentals are quarterly/annual data (changes infrequently)
    - Only refresh if:
      1. No data exists
      2. Data is stale (updated_at > TTL threshold)
    - Significantly reduces API calls vs always refreshing
    """

    def __init__(self, api_key: str, freshness_threshold_days: int = 1):
        """
        Initialize incremental fundamentals ingestion

        Args:
            api_key: EODHD API key
            freshness_threshold_days: Days before data considered stale (default: 1)
        """
        super().__init__(api_key)

        # Initialize EODHD client
        from tools.eodhd_client import EODHDClient
        self.client = EODHDClient(api_key=api_key)

        self.freshness_threshold = timedelta(days=freshness_threshold_days)

    def get_latest_fundamental(self, db: Session, company_id: int) -> Optional[Fundamental]:
        """
        Get most recent fundamental record for a company

        Args:
            db: Database session
            company_id: Company ID

        Returns:
            Latest fundamental record, or None if no data
        """
        latest = db.query(Fundamental).filter(
            Fundamental.company_id == company_id
        ).order_by(desc(Fundamental.updated_at)).first()

        return latest

    def is_stale(self, fundamental: Optional[Fundamental]) -> bool:
        """
        Check if fundamental data is stale

        Args:
            fundamental: Fundamental record

        Returns:
            True if stale (needs refresh), False if fresh
        """
        if not fundamental:
            # No data - definitely stale
            return True

        age = datetime.now() - fundamental.updated_at
        is_stale = age > self.freshness_threshold

        if is_stale:
            logger.info(f"[INCREMENTAL] Data is {age.days} days old (threshold: {self.freshness_threshold.days} days) - STALE")
        else:
            logger.info(f"[INCREMENTAL] Data is {age.days} days old - FRESH")

        return is_stale

    def refresh_company_incremental(
        self,
        db: Session,
        company_id: int,
        ticker: str,
        force: bool = False
    ) -> bool:
        """
        Refresh company fundamentals incrementally

        Args:
            db: Database session
            company_id: Company ID
            ticker: Stock symbol (e.g., 'AAPL.US')
            force: Force refresh even if data is fresh

        Returns:
            True if refreshed, False if skipped
        """
        try:
            # Step 1: Check if data is stale
            latest = self.get_latest_fundamental(db, company_id)

            if not force and not self.is_stale(latest):
                logger.info(f"[INCREMENTAL] ⏭️  {ticker} fundamentals are fresh - skipping")
                return False

            # Step 2: Fetch from API
            logger.info(f"[INCREMENTAL] Fetching {ticker} fundamentals from API")
            api_data = self.client.fundamental.get_fundamentals(ticker=ticker)

            if not api_data:
                logger.warning(f"[INCREMENTAL] No fundamentals data for {ticker}")
                return False

            # Step 3: Store using bulk insert with UPSERT
            # Note: bulk_insert expects a list, so wrap single record
            self.bulk_insert(db, company_id, [api_data], on_conflict='update')

            logger.info(f"[INCREMENTAL] ✅ Refreshed fundamentals for {ticker}")
            return True

        except Exception as e:
            logger.error(f"[INCREMENTAL] ❌ Failed to refresh {ticker}: {e}")
            raise

    def refresh_stale_companies(
        self,
        db: Session,
        force: bool = False,
        commit_interval: int = 10
    ) -> Dict[str, Any]:
        """
        Refresh fundamentals for companies with stale data

        Args:
            db: Database session
            force: Force refresh all companies
            commit_interval: Commit every N companies

        Returns:
            Summary statistics
        """
        from database.models.core import Company

        logger.info("=" * 70)
        logger.info("[INCREMENTAL] Starting incremental fundamentals refresh")
        logger.info("=" * 70)

        start_time = datetime.now()

        # Get all companies
        companies = db.query(Company).all()
        total_companies = len(companies)

        stats = {
            'total_companies': total_companies,
            'refreshed': 0,
            'skipped': 0,
            'failed': 0,
            'errors': []
        }

        for i, company in enumerate(companies, 1):
            try:
                # Format ticker with proper exchange suffix
                ticker = format_ticker_for_company(company)

                # Refresh if stale
                was_refreshed = self.refresh_company_incremental(
                    db=db,
                    company_id=company.id,
                    ticker=ticker,
                    force=force
                )

                if was_refreshed:
                    stats['refreshed'] += 1
                else:
                    stats['skipped'] += 1

                # Commit periodically
                if i % commit_interval == 0:
                    db.commit()
                    logger.info(f"[INCREMENTAL] Progress: {i}/{total_companies} companies processed")

            except Exception as e:
                stats['failed'] += 1
                stats['errors'].append({
                    'ticker': company.ticker,
                    'error': str(e)
                })
                logger.error(f"[INCREMENTAL] Failed to refresh {company.ticker}: {e}")

        # Final commit
        db.commit()

        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        stats['duration_seconds'] = duration
        stats['duration_minutes'] = round(duration / 60, 2)

        logger.info("=" * 70)
        logger.info("[INCREMENTAL] ✅ Incremental fundamentals refresh complete!")
        logger.info(f"📊 Statistics:")
        logger.info(f"   - Total companies: {stats['total_companies']}")
        logger.info(f"   - Refreshed: {stats['refreshed']}")
        logger.info(f"   - Skipped (fresh): {stats['skipped']}")
        logger.info(f"   - Failed: {stats['failed']}")
        logger.info(f"   - Duration: {stats['duration_minutes']} minutes")
        logger.info("=" * 70)

        return stats


def main():
    """Test incremental fundamentals ingestion"""
    import os
    from database.models.base import SessionLocal
    from database.queries_improved import DatabaseQueries

    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Get API key
    api_key = os.getenv('EODHD_API_KEY')
    if not api_key:
        raise ValueError("EODHD_API_KEY environment variable not set")

    # Initialize
    ingestion = IncrementalFundamentalsIngestion(
        api_key=api_key,
        freshness_threshold_days=1
    )
    db = SessionLocal()
    queries = DatabaseQueries()

    try:
        # Test 1: Refresh single company (AAPL)
        logger.info("\\n" + "=" * 70)
        logger.info("TEST 1: Incremental refresh for AAPL fundamentals")
        logger.info("=" * 70)

        company = queries.get_company('AAPL', db=db)
        if not company:
            logger.error("AAPL not found in database")
            return

        was_refreshed = ingestion.refresh_company_incremental(
            db=db,
            company_id=company.id,
            ticker='AAPL.US',
            force=False
        )

        db.commit()

        logger.info(f"✅ Refresh result: {'Refreshed' if was_refreshed else 'Skipped (fresh)'}")

        # Test 2: Refresh all stale companies (uncomment to run)
        # logger.info("\\n" + "=" * 70)
        # logger.info("TEST 2: Incremental refresh for all stale companies")
        # logger.info("=" * 70)
        #
        # stats = ingestion.refresh_stale_companies(db, force=False)
        # logger.info(f"\\n📊 Final Statistics: {stats}")

    except Exception as e:
        logger.error(f"Test failed: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
