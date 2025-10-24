"""
Cache Warming Service
Pre-fetches popular stocks to warm database cache
Uses APScheduler for background task scheduling
"""

import os
import logging
from datetime import datetime, time
from typing import List, Optional
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from database.models.base import SessionLocal
from database.queries_improved import DatabaseQueries
from services.data_service import DataService, DataFreshnessConfig

logger = logging.getLogger("cache_warming")


class CacheWarmingService:
    """
    Background service for cache warming

    Periodically fetches data for popular stocks to ensure cache is warm.
    Reduces first-request latency for users.
    """

    def __init__(self):
        """Initialize cache warming service"""
        self.scheduler = BackgroundScheduler()
        self.data_service = DataService()
        self.db_queries = DatabaseQueries()
        self.is_running = False

    def get_popular_tickers(self, limit: int = 50) -> List[str]:
        """
        Get list of popular tickers to warm cache

        Args:
            limit: Number of tickers to return

        Returns:
            List of ticker symbols
        """
        db = SessionLocal()

        try:
            # Get top companies from database (ordered by ID - first inserted are usually most popular)
            companies = self.db_queries.get_companies_bulk(limit=limit, db=db)

            tickers = [comp.ticker for comp in companies]

            logger.info(f"[CACHE_WARM] Selected {len(tickers)} popular tickers for cache warming")
            return tickers

        except Exception as e:
            logger.error(f"[CACHE_WARM] Failed to get popular tickers: {e}")
            # Fallback to hardcoded popular stocks
            return [
                'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META',
                'TSLA', 'NVDA', 'JPM', 'V', 'WMT',
                'JNJ', 'PG', 'UNH', 'MA', 'HD',
                'DIS', 'BAC', 'XOM', 'CVX', 'PFE'
            ]
        finally:
            db.close()

    def warm_eod_data(self):
        """Warm cache for EOD historical data"""
        logger.info("=" * 70)
        logger.info("[CACHE_WARM] Starting EOD data cache warming...")
        logger.info("=" * 70)

        tickers = self.get_popular_tickers(limit=50)
        success_count = 0
        error_count = 0

        for i, ticker in enumerate(tickers, 1):
            try:
                # Fetch EOD data (will cache in database)
                self.data_service.get_eod_data(
                    ticker=f"{ticker}.US",
                    from_date=None,  # Defaults to 90 days
                    to_date=None,
                    period='d'
                )

                success_count += 1
                logger.info(f"[CACHE_WARM] ({i}/{len(tickers)}) Warmed EOD cache for {ticker}")

            except Exception as e:
                error_count += 1
                logger.warning(f"[CACHE_WARM] ({i}/{len(tickers)}) Failed to warm {ticker}: {e}")

        logger.info("=" * 70)
        logger.info(f"[CACHE_WARM] EOD warming complete: {success_count} success, {error_count} errors")
        logger.info("=" * 70)

    def warm_fundamentals(self):
        """Warm cache for fundamental data"""
        logger.info("=" * 70)
        logger.info("[CACHE_WARM] Starting fundamentals cache warming...")
        logger.info("=" * 70)

        tickers = self.get_popular_tickers(limit=30)
        success_count = 0
        error_count = 0

        for i, ticker in enumerate(tickers, 1):
            try:
                # Fetch fundamentals (will cache in database)
                self.data_service.get_fundamentals(ticker=f"{ticker}.US")

                success_count += 1
                logger.info(f"[CACHE_WARM] ({i}/{len(tickers)}) Warmed fundamentals cache for {ticker}")

            except Exception as e:
                error_count += 1
                logger.warning(f"[CACHE_WARM] ({i}/{len(tickers)}) Failed to warm {ticker}: {e}")

        logger.info("=" * 70)
        logger.info(f"[CACHE_WARM] Fundamentals warming complete: {success_count} success, {error_count} errors")
        logger.info("=" * 70)

    def warm_news(self):
        """Warm cache for news data"""
        logger.info("=" * 70)
        logger.info("[CACHE_WARM] Starting news cache warming...")
        logger.info("=" * 70)

        tickers = self.get_popular_tickers(limit=20)
        success_count = 0
        error_count = 0

        for i, ticker in enumerate(tickers, 1):
            try:
                # Fetch news (will cache in database)
                self.data_service.get_news(ticker=ticker, limit=10)

                success_count += 1
                logger.info(f"[CACHE_WARM] ({i}/{len(tickers)}) Warmed news cache for {ticker}")

            except Exception as e:
                error_count += 1
                logger.warning(f"[CACHE_WARM] ({i}/{len(tickers)}) Failed to warm {ticker}: {e}")

        logger.info("=" * 70)
        logger.info(f"[CACHE_WARM] News warming complete: {success_count} success, {error_count} errors")
        logger.info("=" * 70)

    def warm_dividends(self):
        """Warm cache for dividend data"""
        logger.info("=" * 70)
        logger.info("[CACHE_WARM] Starting dividends cache warming...")
        logger.info("=" * 70)

        tickers = self.get_popular_tickers(limit=30)
        success_count = 0
        error_count = 0

        for i, ticker in enumerate(tickers, 1):
            try:
                # Fetch dividends (will cache in database)
                self.data_service.get_dividends(ticker=f"{ticker}.US")

                success_count += 1
                logger.info(f"[CACHE_WARM] ({i}/{len(tickers)}) Warmed dividends cache for {ticker}")

            except Exception as e:
                error_count += 1
                logger.warning(f"[CACHE_WARM] ({i}/{len(tickers)}) Failed to warm {ticker}: {e}")

        logger.info("=" * 70)
        logger.info(f"[CACHE_WARM] Dividends warming complete: {success_count} success, {error_count} errors")
        logger.info("=" * 70)

    def warm_all_caches(self):
        """Warm all caches (runs on startup or manual trigger)"""
        logger.info("\n" + "=" * 70)
        logger.info("🔥 STARTING FULL CACHE WARMING")
        logger.info("=" * 70)

        start_time = datetime.now()

        try:
            # Warm each data type
            self.warm_eod_data()
            self.warm_fundamentals()
            self.warm_news()
            self.warm_dividends()

            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()

            logger.info("\n" + "=" * 70)
            logger.info("✅ FULL CACHE WARMING COMPLETE!")
            logger.info(f"⏱️  Total time: {duration:.2f} seconds ({duration/60:.2f} minutes)")
            logger.info("=" * 70)

        except Exception as e:
            logger.error(f"[CACHE_WARM] Full cache warming failed: {e}")

    def start(self):
        """Start cache warming service with scheduled jobs"""
        if self.is_running:
            logger.warning("[CACHE_WARM] Service already running")
            return

        logger.info("=" * 70)
        logger.info("🚀 STARTING CACHE WARMING SERVICE")
        logger.info("=" * 70)

        # Job 1: Warm EOD data (daily at 6 PM EST - after market close)
        self.scheduler.add_job(
            func=self.warm_eod_data,
            trigger=CronTrigger(hour=18, minute=0),  # 6 PM daily
            id='warm_eod_daily',
            name='Warm EOD Data (Daily)',
            replace_existing=True
        )
        logger.info("📅 Scheduled: EOD data warming (daily at 6 PM)")

        # Job 2: Warm fundamentals (daily at 7 PM EST)
        self.scheduler.add_job(
            func=self.warm_fundamentals,
            trigger=CronTrigger(hour=19, minute=0),  # 7 PM daily
            id='warm_fundamentals_daily',
            name='Warm Fundamentals (Daily)',
            replace_existing=True
        )
        logger.info("📅 Scheduled: Fundamentals warming (daily at 7 PM)")

        # Job 3: Warm news (every 2 hours during market hours)
        self.scheduler.add_job(
            func=self.warm_news,
            trigger=CronTrigger(hour='9-16/2', minute=30),  # 9:30, 11:30, 13:30, 15:30
            id='warm_news_hourly',
            name='Warm News (Every 2 hours)',
            replace_existing=True
        )
        logger.info("📅 Scheduled: News warming (every 2 hours, 9:30-16:30)")

        # Job 4: Warm dividends (weekly on Monday at 8 PM)
        self.scheduler.add_job(
            func=self.warm_dividends,
            trigger=CronTrigger(day_of_week='mon', hour=20, minute=0),
            id='warm_dividends_weekly',
            name='Warm Dividends (Weekly)',
            replace_existing=True
        )
        logger.info("📅 Scheduled: Dividends warming (weekly on Monday at 8 PM)")

        # Start scheduler
        self.scheduler.start()
        self.is_running = True

        logger.info("=" * 70)
        logger.info("✅ CACHE WARMING SERVICE STARTED")
        logger.info("=" * 70)

        # Show scheduled jobs
        jobs = self.scheduler.get_jobs()
        logger.info(f"\n📋 Active Jobs: {len(jobs)}")
        for job in jobs:
            logger.info(f"   - {job.name} (next run: {job.next_run_time})")

        logger.info("=" * 70)

    def stop(self):
        """Stop cache warming service"""
        if not self.is_running:
            logger.warning("[CACHE_WARM] Service not running")
            return

        logger.info("⏹️  Stopping cache warming service...")
        self.scheduler.shutdown()
        self.is_running = False
        logger.info("✅ Cache warming service stopped")

    def get_status(self) -> dict:
        """Get service status"""
        if not self.is_running:
            return {
                'status': 'stopped',
                'jobs': []
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
            ]
        }


# Global service instance
_cache_warming_service: Optional[CacheWarmingService] = None


def get_cache_warming_service() -> CacheWarmingService:
    """Get or create cache warming service singleton"""
    global _cache_warming_service

    if _cache_warming_service is None:
        _cache_warming_service = CacheWarmingService()

    return _cache_warming_service


def start_cache_warming():
    """Start cache warming service (called at app startup)"""
    service = get_cache_warming_service()
    service.start()


def stop_cache_warming():
    """Stop cache warming service (called at app shutdown)"""
    service = get_cache_warming_service()
    service.stop()


def main():
    """Test cache warming service"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    service = CacheWarmingService()

    # Option 1: Run full cache warming once
    logger.info("Running full cache warming (one-time)...")
    service.warm_all_caches()

    # Option 2: Start scheduled service
    # logger.info("Starting scheduled cache warming service...")
    # service.start()
    # input("Press Enter to stop...")
    # service.stop()


if __name__ == "__main__":
    main()
