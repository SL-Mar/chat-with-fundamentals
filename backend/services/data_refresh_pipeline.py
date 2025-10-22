"""
Data Refresh Pipeline Service
Orchestrates incremental data refresh for all companies
Runs daily to keep database fresh with minimal API calls
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from database.models.base import SessionLocal
from database.queries_improved import DatabaseQueries
from ingestion.incremental_ohlcv_ingestion import IncrementalOHLCVIngestion
from ingestion.incremental_fundamentals_ingestion import IncrementalFundamentalsIngestion
from ingestion.incremental_news_ingestion import IncrementalNewsIngestion
from ingestion.dividends_ingestion import DividendsIngestion

logger = logging.getLogger("data_refresh_pipeline")


class DataRefreshPipeline:
    """
    Background service for incremental data refresh

    Keeps database fresh with minimal API calls:
    - OHLCV: Daily incremental (only new days)
    - Fundamentals: Daily smart refresh (only stale data)
    - News: Daily incremental (last 7 days)
    - Dividends: Weekly refresh (Mondays)

    Performance:
    - Without: 36,500 API calls/day (wasteful full refresh)
    - With: ~100 API calls/day (incremental updates)
    - Savings: 99.7% reduction in API calls
    """

    def __init__(self):
        """Initialize data refresh pipeline"""
        self.scheduler = BackgroundScheduler()
        self.db_queries = DatabaseQueries()
        self.is_running = False

        # Get API key
        self.api_key = os.getenv('EODHD_API_KEY')
        if not self.api_key:
            logger.warning("[REFRESH] EODHD_API_KEY not set - refresh pipeline disabled")
            return

        # Initialize ingestion services
        self.ohlcv_ingestion = IncrementalOHLCVIngestion(api_key=self.api_key)
        self.fundamentals_ingestion = IncrementalFundamentalsIngestion(
            api_key=self.api_key,
            freshness_threshold_days=1
        )
        self.news_ingestion = IncrementalNewsIngestion(
            api_key=self.api_key,
            lookback_days=7
        )
        self.dividends_ingestion = DividendsIngestion(api_key=self.api_key)

        # Track last refresh times
        self.last_refresh = {
            'ohlcv': None,
            'fundamentals': None,
            'news': None,
            'dividends': None
        }

    def refresh_ohlcv(self):
        """
        Refresh OHLCV data for all companies (incremental)

        Only fetches new days since last database update.
        Expected: ~100 API calls (1 per company)
        """
        logger.info("=" * 70)
        logger.info("[REFRESH] Starting incremental OHLCV refresh")
        logger.info("=" * 70)

        db = SessionLocal()
        start_time = datetime.now()

        try:
            stats = self.ohlcv_ingestion.refresh_all_companies(
                db=db,
                max_lookback_days=365,
                commit_interval=10
            )

            self.last_refresh['ohlcv'] = datetime.now()

            logger.info("=" * 70)
            logger.info("[REFRESH] ✅ OHLCV refresh complete!")
            logger.info(f"📊 Stats: {stats['successful']} updated, {stats['skipped']} skipped, {stats['failed']} failed")
            logger.info(f"📈 Total records added: {stats['total_records_added']}")
            logger.info(f"⏱️  Duration: {stats['duration_minutes']} minutes")
            logger.info("=" * 70)

            return stats

        except Exception as e:
            logger.error(f"[REFRESH] ❌ OHLCV refresh failed: {e}")
            db.rollback()
            raise
        finally:
            db.close()

    def refresh_fundamentals(self):
        """
        Refresh fundamentals for companies with stale data

        Only refreshes if data is > 1 day old.
        Expected: ~10-20 API calls (only stale companies)
        """
        logger.info("=" * 70)
        logger.info("[REFRESH] Starting incremental fundamentals refresh")
        logger.info("=" * 70)

        db = SessionLocal()
        start_time = datetime.now()

        try:
            stats = self.fundamentals_ingestion.refresh_stale_companies(
                db=db,
                force=False,
                commit_interval=10
            )

            self.last_refresh['fundamentals'] = datetime.now()

            logger.info("=" * 70)
            logger.info("[REFRESH] ✅ Fundamentals refresh complete!")
            logger.info(f"📊 Stats: {stats['refreshed']} updated, {stats['skipped']} skipped, {stats['failed']} failed")
            logger.info(f"⏱️  Duration: {stats['duration_minutes']} minutes")
            logger.info("=" * 70)

            return stats

        except Exception as e:
            logger.error(f"[REFRESH] ❌ Fundamentals refresh failed: {e}")
            db.rollback()
            raise
        finally:
            db.close()

    def refresh_news(self):
        """
        Refresh news for all companies (last 7 days)

        Fetches recent news and deduplicates.
        Expected: ~100 API calls (1 per company)
        """
        logger.info("=" * 70)
        logger.info("[REFRESH] Starting incremental news refresh")
        logger.info("=" * 70)

        db = SessionLocal()
        start_time = datetime.now()

        try:
            stats = self.news_ingestion.refresh_all_companies(
                db=db,
                limit_per_company=50,
                commit_interval=10
            )

            self.last_refresh['news'] = datetime.now()

            logger.info("=" * 70)
            logger.info("[REFRESH] ✅ News refresh complete!")
            logger.info(f"📊 Stats: {stats['successful']} updated, {stats['skipped']} skipped, {stats['failed']} failed")
            logger.info(f"📰 Total articles added: {stats['total_articles_added']}")
            logger.info(f"⏱️  Duration: {stats['duration_minutes']} minutes")
            logger.info("=" * 70)

            return stats

        except Exception as e:
            logger.error(f"[REFRESH] ❌ News refresh failed: {e}")
            db.rollback()
            raise
        finally:
            db.close()

    def refresh_dividends(self):
        """
        Refresh dividends for all companies (weekly)

        Fetches dividend history.
        Expected: ~100 API calls (1 per company)
        """
        logger.info("=" * 70)
        logger.info("[REFRESH] Starting dividends refresh (weekly)")
        logger.info("=" * 70)

        db = SessionLocal()
        start_time = datetime.now()

        try:
            from database.models.core import Company

            companies = db.query(Company).all()
            total_companies = len(companies)

            stats = {
                'total_companies': total_companies,
                'successful': 0,
                'failed': 0,
                'errors': []
            }

            for i, company in enumerate(companies, 1):
                try:
                    ticker = f"{company.ticker}.US"

                    # Fetch dividends
                    dividends_data = self.dividends_ingestion.client.corporate_actions.get_dividends(ticker=ticker)

                    if dividends_data:
                        self.dividends_ingestion.bulk_insert(
                            db=db,
                            company_id=company.id,
                            records=[dividends_data] if isinstance(dividends_data, dict) else dividends_data,
                            on_conflict='update'
                        )
                        stats['successful'] += 1
                    else:
                        stats['successful'] += 1  # No dividends is OK

                    # Commit periodically
                    if i % 10 == 0:
                        db.commit()
                        logger.info(f"[REFRESH] Progress: {i}/{total_companies} companies processed")

                except Exception as e:
                    stats['failed'] += 1
                    stats['errors'].append({
                        'ticker': company.ticker,
                        'error': str(e)
                    })
                    logger.error(f"[REFRESH] Failed to refresh dividends for {company.ticker}: {e}")

            # Final commit
            db.commit()

            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()

            stats['duration_seconds'] = duration
            stats['duration_minutes'] = round(duration / 60, 2)

            self.last_refresh['dividends'] = datetime.now()

            logger.info("=" * 70)
            logger.info("[REFRESH] ✅ Dividends refresh complete!")
            logger.info(f"📊 Stats: {stats['successful']} updated, {stats['failed']} failed")
            logger.info(f"⏱️  Duration: {stats['duration_minutes']} minutes")
            logger.info("=" * 70)

            return stats

        except Exception as e:
            logger.error(f"[REFRESH] ❌ Dividends refresh failed: {e}")
            db.rollback()
            raise
        finally:
            db.close()

    def run_daily_refresh(self):
        """
        Run daily data refresh pipeline

        Executes:
        1. OHLCV refresh (incremental)
        2. Fundamentals refresh (stale only)
        3. News refresh (last 7 days)
        """
        logger.info("\\n" + "=" * 70)
        logger.info("🔄 STARTING DAILY DATA REFRESH PIPELINE")
        logger.info("=" * 70)

        start_time = datetime.now()
        summary = {}

        try:
            # 1. Refresh OHLCV (incremental)
            logger.info("\\n[1/3] OHLCV Refresh")
            summary['ohlcv'] = self.refresh_ohlcv()

            # 2. Refresh fundamentals (stale only)
            logger.info("\\n[2/3] Fundamentals Refresh")
            summary['fundamentals'] = self.refresh_fundamentals()

            # 3. Refresh news (last 7 days)
            logger.info("\\n[3/3] News Refresh")
            summary['news'] = self.refresh_news()

            # Calculate total time
            end_time = datetime.now()
            total_duration = (end_time - start_time).total_seconds()

            logger.info("\\n" + "=" * 70)
            logger.info("✅ DAILY DATA REFRESH PIPELINE COMPLETE!")
            logger.info(f"⏱️  Total time: {total_duration/60:.2f} minutes")
            logger.info("=" * 70)
            logger.info("📊 Summary:")
            logger.info(f"   - OHLCV: {summary['ohlcv']['total_records_added']} records added")
            logger.info(f"   - Fundamentals: {summary['fundamentals']['refreshed']} companies updated")
            logger.info(f"   - News: {summary['news']['total_articles_added']} articles added")
            logger.info("=" * 70)

            return summary

        except Exception as e:
            logger.error(f"[REFRESH] ❌ Daily refresh pipeline failed: {e}")
            raise

    def run_weekly_refresh(self):
        """
        Run weekly data refresh (Mondays)

        Executes:
        1. Dividends refresh
        """
        logger.info("\\n" + "=" * 70)
        logger.info("🔄 STARTING WEEKLY DATA REFRESH PIPELINE")
        logger.info("=" * 70)

        try:
            # Refresh dividends
            stats = self.refresh_dividends()

            logger.info("\\n" + "=" * 70)
            logger.info("✅ WEEKLY DATA REFRESH PIPELINE COMPLETE!")
            logger.info("=" * 70)

            return stats

        except Exception as e:
            logger.error(f"[REFRESH] ❌ Weekly refresh pipeline failed: {e}")
            raise

    def start(self):
        """Start data refresh pipeline with scheduled jobs"""
        if not self.api_key:
            logger.error("[REFRESH] Cannot start - EODHD_API_KEY not set")
            return

        if self.is_running:
            logger.warning("[REFRESH] Service already running")
            return

        logger.info("=" * 70)
        logger.info("🚀 STARTING DATA REFRESH PIPELINE SERVICE")
        logger.info("=" * 70)

        # Job 1: Daily refresh at 6:30 PM EST (after market close + cache warming)
        self.scheduler.add_job(
            func=self.run_daily_refresh,
            trigger=CronTrigger(hour=18, minute=30),  # 6:30 PM daily
            id='refresh_daily',
            name='Daily Data Refresh Pipeline',
            replace_existing=True
        )
        logger.info("📅 Scheduled: Daily refresh (6:30 PM)")

        # Job 2: Weekly refresh on Monday at 9 PM EST
        self.scheduler.add_job(
            func=self.run_weekly_refresh,
            trigger=CronTrigger(day_of_week='mon', hour=21, minute=0),  # Monday 9 PM
            id='refresh_weekly',
            name='Weekly Data Refresh Pipeline',
            replace_existing=True
        )
        logger.info("📅 Scheduled: Weekly refresh (Monday 9 PM)")

        # Start scheduler
        self.scheduler.start()
        self.is_running = True

        logger.info("=" * 70)
        logger.info("✅ DATA REFRESH PIPELINE SERVICE STARTED")
        logger.info("=" * 70)

        # Show scheduled jobs
        jobs = self.scheduler.get_jobs()
        logger.info(f"\\n📋 Active Jobs: {len(jobs)}")
        for job in jobs:
            logger.info(f"   - {job.name} (next run: {job.next_run_time})")

        logger.info("=" * 70)

    def stop(self):
        """Stop data refresh pipeline"""
        if not self.is_running:
            logger.warning("[REFRESH] Service not running")
            return

        logger.info("⏹️  Stopping data refresh pipeline...")
        self.scheduler.shutdown()
        self.is_running = False
        logger.info("✅ Data refresh pipeline stopped")

    def get_status(self) -> Dict[str, Any]:
        """Get pipeline status"""
        if not self.is_running:
            return {
                'status': 'stopped',
                'jobs': [],
                'last_refresh': self.last_refresh
            }

        jobs = self.scheduler.get_jobs()
        return {
            'status': 'running',
            'jobs': [
                {
                    'id': job.id,
                    'name': job.name,
                    'next_run': job.next_run_time.isoformat() if job.next_run_time else None
                }
                for job in jobs
            ],
            'last_refresh': {
                k: v.isoformat() if v else None
                for k, v in self.last_refresh.items()
            }
        }


# Global service instance
_data_refresh_pipeline: Optional[DataRefreshPipeline] = None


def get_data_refresh_pipeline() -> DataRefreshPipeline:
    """Get or create data refresh pipeline singleton"""
    global _data_refresh_pipeline

    if _data_refresh_pipeline is None:
        _data_refresh_pipeline = DataRefreshPipeline()

    return _data_refresh_pipeline


def start_data_refresh_pipeline():
    """Start data refresh pipeline (called at app startup)"""
    pipeline = get_data_refresh_pipeline()
    pipeline.start()


def stop_data_refresh_pipeline():
    """Stop data refresh pipeline (called at app shutdown)"""
    pipeline = get_data_refresh_pipeline()
    pipeline.stop()


def main():
    """Test data refresh pipeline"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    pipeline = DataRefreshPipeline()

    # Option 1: Run daily refresh once
    logger.info("Running daily refresh (one-time)...")
    summary = pipeline.run_daily_refresh()
    logger.info(f"\\n📊 Final Summary: {summary}")

    # Option 2: Start scheduled service
    # logger.info("Starting scheduled data refresh pipeline...")
    # pipeline.start()
    # input("Press Enter to stop...")
    # pipeline.stop()


if __name__ == "__main__":
    main()
