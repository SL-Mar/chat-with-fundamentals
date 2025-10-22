"""
Data Service Layer - Database-First with API Fallback
Implements cache-aside pattern for all financial data endpoints
"""

from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any
import logging
from sqlalchemy.orm import Session

from database.models.base import SessionLocal
from database.queries_improved import DatabaseQueries
from database.models.financial import OHLCV, Fundamental, News, Dividend, InsiderTransaction
from ingestion.ohlcv_ingestion import OHLCVIngestion
from ingestion.fundamentals_ingestion import FundamentalsIngestion
from ingestion.news_ingestion import NewsIngestion
from ingestion.dividends_ingestion import DividendsIngestion
from tools.eodhd_client import EODHDClient
import os

logger = logging.getLogger("data_service")


class DataFreshnessConfig:
    """Configuration for data freshness TTLs"""

    # Historical data freshness
    OHLCV_EOD_TTL_HOURS = 24          # EOD data: refresh daily
    OHLCV_INTRADAY_TTL_MINUTES = 5    # Intraday: refresh every 5 minutes
    OHLCV_LIVE_TTL_SECONDS = 15       # Live prices: refresh every 15 seconds

    # Fundamental data freshness
    FUNDAMENTALS_TTL_DAYS = 1         # Fundamentals: refresh daily

    # News freshness
    NEWS_TTL_HOURS = 1                # News: refresh hourly

    # Corporate actions freshness
    DIVIDENDS_TTL_DAYS = 7            # Dividends: refresh weekly
    INSIDER_TTL_DAYS = 1              # Insider transactions: refresh daily

    # Cache warming thresholds
    MIN_OHLCV_RECORDS = 90            # Need at least 90 days of data
    MIN_NEWS_RECORDS = 10             # Need at least 10 news articles


class DataService:
    """
    Database-first data service with automatic API fallback

    Pattern: Cache-Aside
    1. Check database for data
    2. If fresh data exists, return it
    3. If data missing/stale, fetch from API
    4. Store API response in database
    5. Return data to caller
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize data service

        Args:
            api_key: EODHD API key (defaults to env var)
        """
        self.api_key = api_key or os.getenv("EODHD_API_KEY")
        self.db_queries = DatabaseQueries()
        self.eodhd_client = EODHDClient(api_key=self.api_key)

    def get_eod_data(
        self,
        ticker: str,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        period: str = "d",
        db: Optional[Session] = None
    ) -> List[Dict[str, Any]]:
        """
        Get EOD historical data (database-first)

        Args:
            ticker: Stock symbol (e.g., AAPL.US)
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)
            period: Period (d/w/m)
            db: Optional database session

        Returns:
            List of OHLCV records
        """
        close_db = db is None
        if close_db:
            db = SessionLocal()

        try:
            # Parse dates
            if not to_date:
                to_date_obj = datetime.now().date()
            else:
                to_date_obj = datetime.strptime(to_date, "%Y-%m-%d").date()

            if not from_date:
                from_date_obj = to_date_obj - timedelta(days=90)
            else:
                from_date_obj = datetime.strptime(from_date, "%Y-%m-%d").date()

            # 1. Check database first
            db_records = self.db_queries.get_ohlcv(
                ticker=ticker,
                from_date=from_date_obj,
                to_date=to_date_obj,
                limit=1000,
                db=db
            )

            # 2. Check if data is fresh and sufficient
            is_fresh = self._is_ohlcv_data_fresh(db_records, to_date_obj)
            has_enough_data = len(db_records) >= DataFreshnessConfig.MIN_OHLCV_RECORDS

            if is_fresh and has_enough_data:
                logger.info(f"[DATA_SERVICE] Cache HIT: {ticker} EOD data from database ({len(db_records)} records)")
                return self._serialize_ohlcv(db_records)

            # 3. Data missing or stale - fetch from API
            logger.info(f"[DATA_SERVICE] Cache MISS: {ticker} EOD data (fresh={is_fresh}, count={len(db_records)})")

            api_data = self.eodhd_client.historical.get_eod(
                ticker,
                from_date=from_date,
                to_date=to_date,
                period=period
            )

            # 4. Store in database
            if api_data:
                self._store_ohlcv_data(ticker, api_data, db)
                logger.info(f"[DATA_SERVICE] Stored {len(api_data)} records for {ticker} in database")

            # 5. Return API data
            return api_data

        finally:
            if close_db:
                db.close()

    def get_live_price(
        self,
        ticker: str,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Get live price (database-first with short TTL)

        Args:
            ticker: Stock symbol
            db: Optional database session

        Returns:
            Live price data
        """
        close_db = db is None
        if close_db:
            db = SessionLocal()

        try:
            # Check database for recent price (last 15 seconds)
            recent_threshold = datetime.now() - timedelta(
                seconds=DataFreshnessConfig.OHLCV_LIVE_TTL_SECONDS
            )

            latest_record = self.db_queries.get_latest_ohlcv(ticker, db=db)

            if latest_record and latest_record.updated_at >= recent_threshold:
                logger.info(f"[DATA_SERVICE] Cache HIT: {ticker} live price from database")
                return self._serialize_ohlcv([latest_record])[0]

            # Fetch from API
            logger.info(f"[DATA_SERVICE] Cache MISS: {ticker} live price")
            api_data = self.eodhd_client.historical.get_live_price(ticker)

            # Note: Live price is NOT stored in OHLCV table (incomplete candle)
            # It would be stored when EOD data is updated

            return api_data

        finally:
            if close_db:
                db.close()

    def get_fundamentals(
        self,
        ticker: str,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Get fundamental data (database-first)

        Args:
            ticker: Stock symbol
            db: Optional database session

        Returns:
            Fundamental data
        """
        close_db = db is None
        if close_db:
            db = SessionLocal()

        try:
            # Check database
            db_record = self.db_queries.get_latest_fundamentals(ticker, db=db)

            # Check freshness (1 day TTL)
            if db_record:
                age = datetime.now().date() - db_record.date
                is_fresh = age.days < DataFreshnessConfig.FUNDAMENTALS_TTL_DAYS

                if is_fresh:
                    logger.info(f"[DATA_SERVICE] Cache HIT: {ticker} fundamentals from database")
                    return self._serialize_fundamentals(db_record)

            # Fetch from API
            logger.info(f"[DATA_SERVICE] Cache MISS: {ticker} fundamentals")
            api_data = self.eodhd_client.fundamental.get_fundamentals(ticker)

            # Store in database
            if api_data:
                self._store_fundamentals_data(ticker, api_data, db)

            return api_data

        finally:
            if close_db:
                db.close()

    def get_news(
        self,
        ticker: str,
        limit: int = 10,
        offset: int = 0,
        db: Optional[Session] = None
    ) -> List[Dict[str, Any]]:
        """
        Get news articles (database-first)

        Args:
            ticker: Stock symbol
            limit: Number of articles
            offset: Pagination offset
            db: Optional database session

        Returns:
            List of news articles
        """
        close_db = db is None
        if close_db:
            db = SessionLocal()

        try:
            # Check database
            db_records = self.db_queries.get_news(
                ticker=ticker,
                limit=limit,
                offset=offset,
                db=db
            )

            # Check freshness (1 hour TTL for latest news)
            is_fresh = False
            if db_records:
                latest_news = db_records[0]
                age = datetime.now() - latest_news.published_at
                is_fresh = age.total_seconds() < (DataFreshnessConfig.NEWS_TTL_HOURS * 3600)
                has_enough = len(db_records) >= DataFreshnessConfig.MIN_NEWS_RECORDS

                if is_fresh and has_enough:
                    logger.info(f"[DATA_SERVICE] Cache HIT: {ticker} news from database ({len(db_records)} articles)")
                    return self._serialize_news(db_records)

            # Fetch from API
            logger.info(f"[DATA_SERVICE] Cache MISS: {ticker} news")
            api_data = self.eodhd_client.news.get_news(ticker, limit=limit)

            # Store in database
            if api_data:
                self._store_news_data(ticker, api_data, db)

            return api_data

        finally:
            if close_db:
                db.close()

    def get_dividends(
        self,
        ticker: str,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        db: Optional[Session] = None
    ) -> List[Dict[str, Any]]:
        """
        Get dividend history (database-first)

        Args:
            ticker: Stock symbol
            from_date: Start date
            to_date: End date
            db: Optional database session

        Returns:
            List of dividend records
        """
        close_db = db is None
        if close_db:
            db = SessionLocal()

        try:
            # Check database
            db_records = self.db_queries.get_dividends(ticker, db=db)

            # Check freshness (7 day TTL)
            is_fresh = False
            if db_records:
                # Check when data was last updated
                latest_record = max(db_records, key=lambda x: x.updated_at)
                age = datetime.now() - latest_record.updated_at
                is_fresh = age.days < DataFreshnessConfig.DIVIDENDS_TTL_DAYS

                if is_fresh:
                    logger.info(f"[DATA_SERVICE] Cache HIT: {ticker} dividends from database ({len(db_records)} records)")
                    return self._serialize_dividends(db_records)

            # Fetch from API
            logger.info(f"[DATA_SERVICE] Cache MISS: {ticker} dividends")
            api_data = self.eodhd_client.corporate.get_dividends(ticker)

            # Store in database
            if api_data:
                self._store_dividends_data(ticker, api_data, db)

            return api_data

        finally:
            if close_db:
                db.close()

    def get_insider_transactions(
        self,
        ticker: str,
        limit: int = 50,
        db: Optional[Session] = None
    ) -> List[Dict[str, Any]]:
        """
        Get insider transactions (database-first)

        Args:
            ticker: Stock symbol
            limit: Number of transactions
            db: Optional database session

        Returns:
            List of insider transactions
        """
        close_db = db is None
        if close_db:
            db = SessionLocal()

        try:
            # Check database
            db_records = self.db_queries.get_insider_transactions(ticker, limit=limit, db=db)

            # Check freshness (1 day TTL)
            is_fresh = False
            if db_records:
                latest_record = db_records[0] if db_records else None
                if latest_record:
                    age = datetime.now() - latest_record.updated_at
                    is_fresh = age.days < DataFreshnessConfig.INSIDER_TTL_DAYS

                    if is_fresh:
                        logger.info(f"[DATA_SERVICE] Cache HIT: {ticker} insider transactions from database ({len(db_records)} records)")
                        return self._serialize_insider_transactions(db_records)

            # Fetch from API
            logger.info(f"[DATA_SERVICE] Cache MISS: {ticker} insider transactions")
            api_data = self.eodhd_client.fundamental.get_insider_transactions(ticker)

            # Store in database
            if api_data:
                self._store_insider_transactions_data(ticker, api_data, db)

            return api_data

        finally:
            if close_db:
                db.close()

    # ==================== HELPER METHODS ====================

    def _is_ohlcv_data_fresh(self, records: List[OHLCV], to_date: date) -> bool:
        """Check if OHLCV data is fresh enough"""
        if not records:
            return False

        # Get latest record date
        latest_record = max(records, key=lambda x: x.date)

        # Check if latest record is recent enough
        age = to_date - latest_record.date
        return age.days < DataFreshnessConfig.OHLCV_EOD_TTL_HOURS / 24

    def _serialize_ohlcv(self, records: List[OHLCV]) -> List[Dict[str, Any]]:
        """Convert OHLCV ORM objects to dict"""
        return [
            {
                'date': r.date.strftime('%Y-%m-%d'),
                'open': float(r.open),
                'high': float(r.high),
                'low': float(r.low),
                'close': float(r.close),
                'adjusted_close': float(r.adjusted_close),
                'volume': r.volume
            }
            for r in records
        ]

    def _serialize_fundamentals(self, record: Fundamental) -> Dict[str, Any]:
        """Convert Fundamental ORM object to dict"""
        result = {
            'date': record.date.strftime('%Y-%m-%d'),
            'period_type': record.period_type,
            'market_cap': float(record.market_cap) if record.market_cap else None,
            'pe_ratio': float(record.pe_ratio) if record.pe_ratio else None,
            'eps': float(record.eps) if record.eps else None,
            'revenue': float(record.revenue) if record.revenue else None,
            'net_income': float(record.net_income) if record.net_income else None,
        }

        # Add additional data from JSONB field
        if record.additional_data:
            result.update(record.additional_data)

        return result

    def _serialize_news(self, records: List[News]) -> List[Dict[str, Any]]:
        """Convert News ORM objects to dict"""
        return [
            {
                'date': r.published_at.strftime('%Y-%m-%d %H:%M:%S'),
                'title': r.title,
                'content': r.content,
                'link': r.url,
                'symbols': [r.company.ticker] if r.company else [],
                'sentiment': {
                    'polarity': float(r.sentiment_score) if r.sentiment_score else None,
                    'label': r.sentiment_label
                }
            }
            for r in records
        ]

    def _serialize_dividends(self, records: List[Dividend]) -> List[Dict[str, Any]]:
        """Convert Dividend ORM objects to dict"""
        return [
            {
                'date': r.payment_date.strftime('%Y-%m-%d') if r.payment_date else None,
                'declarationDate': r.declaration_date.strftime('%Y-%m-%d') if r.declaration_date else None,
                'recordDate': r.record_date.strftime('%Y-%m-%d') if r.record_date else None,
                'paymentDate': r.payment_date.strftime('%Y-%m-%d') if r.payment_date else None,
                'value': float(r.amount),
                'unadjustedValue': float(r.unadjusted_amount) if r.unadjusted_amount else float(r.amount),
                'currency': r.currency or 'USD'
            }
            for r in records
        ]

    def _serialize_insider_transactions(self, records: List[InsiderTransaction]) -> List[Dict[str, Any]]:
        """Convert InsiderTransaction ORM objects to dict"""
        return [
            {
                'date': r.transaction_date.strftime('%Y-%m-%d'),
                'ownerName': r.owner_name,
                'transactionType': r.transaction_type,
                'value': float(r.transaction_value) if r.transaction_value else None,
                'amount': int(r.shares) if r.shares else None
            }
            for r in records
        ]

    def _store_ohlcv_data(self, ticker: str, api_data: List[Dict], db: Session):
        """Store OHLCV data in database"""
        try:
            ingestion = OHLCVIngestion(api_key=self.api_key)
            company = self.db_queries.get_company(ticker, db=db)

            if not company:
                logger.warning(f"[DATA_SERVICE] Company {ticker} not found in database, skipping storage")
                return

            ingestion.bulk_insert(db, company.id, api_data, on_conflict='update')
            db.commit()

        except Exception as e:
            logger.error(f"[DATA_SERVICE] Failed to store OHLCV data for {ticker}: {e}")
            db.rollback()

    def _store_fundamentals_data(self, ticker: str, api_data: Dict, db: Session):
        """Store fundamentals data in database"""
        try:
            ingestion = FundamentalsIngestion(api_key=self.api_key)
            company = self.db_queries.get_company(ticker, db=db)

            if not company:
                logger.warning(f"[DATA_SERVICE] Company {ticker} not found in database, skipping storage")
                return

            ingestion.ingest_fundamentals(db, company.id, api_data)
            db.commit()

        except Exception as e:
            logger.error(f"[DATA_SERVICE] Failed to store fundamentals for {ticker}: {e}")
            db.rollback()

    def _store_news_data(self, ticker: str, api_data: List[Dict], db: Session):
        """Store news data in database"""
        try:
            ingestion = NewsIngestion(api_key=self.api_key)
            company = self.db_queries.get_company(ticker, db=db)

            if not company:
                logger.warning(f"[DATA_SERVICE] Company {ticker} not found in database, skipping storage")
                return

            ingestion.bulk_insert(db, company.id, api_data)
            db.commit()

        except Exception as e:
            logger.error(f"[DATA_SERVICE] Failed to store news for {ticker}: {e}")
            db.rollback()

    def _store_dividends_data(self, ticker: str, api_data: List[Dict], db: Session):
        """Store dividends data in database"""
        try:
            ingestion = DividendsIngestion(api_key=self.api_key)
            company = self.db_queries.get_company(ticker, db=db)

            if not company:
                logger.warning(f"[DATA_SERVICE] Company {ticker} not found in database, skipping storage")
                return

            ingestion.bulk_insert(db, company.id, api_data)
            db.commit()

        except Exception as e:
            logger.error(f"[DATA_SERVICE] Failed to store dividends for {ticker}: {e}")
            db.rollback()

    def _store_insider_transactions_data(self, ticker: str, api_data: List[Dict], db: Session):
        """Store insider transactions in database"""
        try:
            # Note: You'll need to create InsiderTransactionsIngestion class
            # For now, log that we would store it
            logger.info(f"[DATA_SERVICE] Would store {len(api_data)} insider transactions for {ticker}")

        except Exception as e:
            logger.error(f"[DATA_SERVICE] Failed to store insider transactions for {ticker}: {e}")
            db.rollback()
