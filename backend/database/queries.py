"""
Database Query Utilities with Caching

Security:
- Parameterized queries (SQLAlchemy ORM)
- Input validation
- No raw SQL injection risk

Robustness:
- Redis caching with fallback
- Error handling
- Optimized queries with indexes
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_

from database.models.company import Company, Exchange, Sector
from database.models.market_data import OHLCV, Fundamental, TechnicalIndicator
from database.models.news import News, AnalystRating, InsiderTransaction
from database.models.dividends import Dividend
from database.models.base import SessionLocal
from cache.redis_cache import RedisCache, cached, CacheConfig

logger = logging.getLogger(__name__)


class DatabaseQueries:
    """
    Database query utilities with caching

    All methods use:
    - SQLAlchemy ORM (prevents SQL injection)
    - Redis caching (when available)
    - Error handling
    """

    def __init__(self, use_cache: bool = True):
        """
        Initialize query utilities

        Args:
            use_cache: Enable Redis caching
        """
        self.cache = RedisCache(enabled=use_cache)

    # =========================================================================
    # COMPANY QUERIES
    # =========================================================================

    @cached(ttl=CacheConfig.FUNDAMENTALS_TTL, key_prefix='company')
    def get_company(
        self,
        ticker: str,
        db: Optional[Session] = None
    ) -> Optional[Company]:
        """
        Get company by ticker

        Args:
            ticker: Ticker symbol (e.g., 'AAPL.US')
            db: Optional database session

        Returns:
            Company or None
        """
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        try:
            return db.query(Company).filter(
                Company.ticker == ticker.upper()
            ).first()
        finally:
            if close_db:
                db.close()

    def get_companies_by_sector(
        self,
        sector_name: str,
        active_only: bool = True,
        db: Optional[Session] = None
    ) -> List[Company]:
        """
        Get all companies in a sector

        Args:
            sector_name: Sector name (e.g., 'Technology')
            active_only: Only active companies
            db: Optional database session

        Returns:
            List of companies
        """
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        try:
            query = db.query(Company).join(Sector).filter(
                Sector.name == sector_name
            )

            if active_only:
                query = query.filter(Company.is_active == True)

            return query.all()
        finally:
            if close_db:
                db.close()

    # =========================================================================
    # OHLCV QUERIES
    # =========================================================================

    @cached(ttl=CacheConfig.OHLCV_HISTORICAL_TTL, key_prefix='ohlcv')
    def get_ohlcv(
        self,
        ticker: str,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        limit: int = 100,
        db: Optional[Session] = None
    ) -> List[OHLCV]:
        """
        Get OHLCV data for ticker

        Args:
            ticker: Ticker symbol
            from_date: Start date (default: 100 days ago)
            to_date: End date (default: today)
            limit: Maximum records to return
            db: Optional database session

        Returns:
            List of OHLCV records (newest first)

        Performance:
        - Uses TimescaleDB hypertable
        - Indexed on (company_id, date)
        - Fast range queries
        """
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        try:
            # Get company
            company = self.get_company(ticker, db)
            if not company:
                return []

            # Default date range
            if to_date is None:
                to_date = date.today()
            if from_date is None:
                from_date = to_date - timedelta(days=100)

            # Query with date range
            return db.query(OHLCV).filter(
                and_(
                    OHLCV.company_id == company.id,
                    OHLCV.date >= from_date,
                    OHLCV.date <= to_date
                )
            ).order_by(desc(OHLCV.date)).limit(limit).all()

        finally:
            if close_db:
                db.close()

    def get_latest_price(
        self,
        ticker: str,
        db: Optional[Session] = None
    ) -> Optional[float]:
        """
        Get latest closing price

        Args:
            ticker: Ticker symbol
            db: Optional database session

        Returns:
            Latest close price or None
        """
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        try:
            company = self.get_company(ticker, db)
            if not company:
                return None

            latest = db.query(OHLCV).filter(
                OHLCV.company_id == company.id
            ).order_by(desc(OHLCV.date)).first()

            return float(latest.close) if latest else None

        finally:
            if close_db:
                db.close()

    # =========================================================================
    # FUNDAMENTAL QUERIES
    # =========================================================================

    @cached(ttl=CacheConfig.FUNDAMENTALS_TTL, key_prefix='fundamentals')
    def get_latest_fundamentals(
        self,
        ticker: str,
        period_type: str = 'quarterly',
        db: Optional[Session] = None
    ) -> Optional[Fundamental]:
        """
        Get latest fundamental data

        Args:
            ticker: Ticker symbol
            period_type: 'quarterly' or 'annual'
            db: Optional database session

        Returns:
            Latest fundamental record or None
        """
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        try:
            company = self.get_company(ticker, db)
            if not company:
                return None

            return db.query(Fundamental).filter(
                and_(
                    Fundamental.company_id == company.id,
                    Fundamental.period_type == period_type
                )
            ).order_by(desc(Fundamental.date)).first()

        finally:
            if close_db:
                db.close()

    def get_fundamental_history(
        self,
        ticker: str,
        period_type: str = 'quarterly',
        limit: int = 20,
        db: Optional[Session] = None
    ) -> List[Fundamental]:
        """
        Get historical fundamental data

        Args:
            ticker: Ticker symbol
            period_type: 'quarterly' or 'annual'
            limit: Maximum records to return
            db: Optional database session

        Returns:
            List of fundamental records (newest first)
        """
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        try:
            company = self.get_company(ticker, db)
            if not company:
                return []

            return db.query(Fundamental).filter(
                and_(
                    Fundamental.company_id == company.id,
                    Fundamental.period_type == period_type
                )
            ).order_by(desc(Fundamental.date)).limit(limit).all()

        finally:
            if close_db:
                db.close()

    # =========================================================================
    # NEWS QUERIES
    # =========================================================================

    @cached(ttl=CacheConfig.NEWS_TTL, key_prefix='news')
    def get_recent_news(
        self,
        ticker: str,
        days: int = 30,
        min_sentiment: Optional[float] = None,
        limit: int = 50,
        db: Optional[Session] = None
    ) -> List[News]:
        """
        Get recent news for ticker

        Args:
            ticker: Ticker symbol
            days: Number of days to look back
            min_sentiment: Minimum sentiment score (-1 to 1)
            limit: Maximum records to return
            db: Optional database session

        Returns:
            List of news articles
        """
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        try:
            company = self.get_company(ticker, db)
            if not company:
                return []

            cutoff_date = datetime.now() - timedelta(days=days)

            query = db.query(News).filter(
                and_(
                    News.company_id == company.id,
                    News.published_at >= cutoff_date
                )
            )

            if min_sentiment is not None:
                query = query.filter(News.sentiment_score >= min_sentiment)

            return query.order_by(
                desc(News.published_at)
            ).limit(limit).all()

        finally:
            if close_db:
                db.close()

    # =========================================================================
    # ANALYST RATING QUERIES
    # =========================================================================

    def get_analyst_ratings(
        self,
        ticker: str,
        days: int = 90,
        db: Optional[Session] = None
    ) -> List[AnalystRating]:
        """
        Get recent analyst ratings

        Args:
            ticker: Ticker symbol
            days: Number of days to look back
            db: Optional database session

        Returns:
            List of analyst ratings
        """
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        try:
            company = self.get_company(ticker, db)
            if not company:
                return []

            cutoff_date = date.today() - timedelta(days=days)

            return db.query(AnalystRating).filter(
                and_(
                    AnalystRating.company_id == company.id,
                    AnalystRating.date >= cutoff_date
                )
            ).order_by(desc(AnalystRating.date)).all()

        finally:
            if close_db:
                db.close()

    # =========================================================================
    # DIVIDEND QUERIES
    # =========================================================================

    def get_dividend_history(
        self,
        ticker: str,
        years: int = 5,
        db: Optional[Session] = None
    ) -> List[Dividend]:
        """
        Get dividend payment history

        Args:
            ticker: Ticker symbol
            years: Number of years to look back
            db: Optional database session

        Returns:
            List of dividend payments
        """
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        try:
            company = self.get_company(ticker, db)
            if not company:
                return []

            cutoff_date = date.today() - timedelta(days=years * 365)

            return db.query(Dividend).filter(
                and_(
                    Dividend.company_id == company.id,
                    Dividend.ex_date >= cutoff_date
                )
            ).order_by(desc(Dividend.ex_date)).all()

        finally:
            if close_db:
                db.close()

    # =========================================================================
    # AGGREGATION QUERIES
    # =========================================================================

    def get_market_summary(
        self,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Get market summary statistics

        Returns:
            Dict with market statistics
        """
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        try:
            total_companies = db.query(func.count(Company.id)).scalar()
            active_companies = db.query(func.count(Company.id)).filter(
                Company.is_active == True
            ).scalar()

            sectors = db.query(
                Sector.name,
                func.count(Company.id).label('count')
            ).join(Company).group_by(Sector.name).all()

            return {
                'total_companies': total_companies,
                'active_companies': active_companies,
                'sectors': [
                    {'name': s.name, 'count': s.count}
                    for s in sectors
                ]
            }

        finally:
            if close_db:
                db.close()
