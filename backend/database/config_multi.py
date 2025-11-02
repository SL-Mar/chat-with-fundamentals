"""
Multi-database configuration for granularity-based data separation

Databases:
- chat_fundamentals (port 5432): Daily/EOD data, portfolios, reference data
- chat_fundamentals_intraday (port 5433): Intraday data (1m, 5m, 15m, 1h)
"""

import os
from typing import Dict
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import QueuePool
import logging

logger = logging.getLogger(__name__)


class MultiDatabaseConfig:
    """Configuration for multiple databases based on granularity"""

    def __init__(self):
        # Daily/EOD Database (existing)
        self.daily_url = os.getenv(
            'DATABASE_URL',
            'postgresql://postgres:postgres@localhost:5432/chat_fundamentals'
        )

        # Intraday Database (new)
        self.intraday_url = os.getenv(
            'DATABASE_INTRADAY_URL',
            'postgresql://postgres:postgres@localhost:5433/chat_fundamentals_intraday'
        )

        # Redis config (shared across all databases)
        self.redis_host = os.getenv('REDIS_HOST', 'localhost')
        self.redis_port = int(os.getenv('REDIS_PORT', 6379))
        self.redis_db = int(os.getenv('REDIS_DB', 0))
        self.redis_password = os.getenv('REDIS_PASSWORD', None)

        # Engines
        self._daily_engine = None
        self._intraday_engine = None

        # Session makers
        self._daily_session_maker = None
        self._intraday_session_maker = None

    def get_daily_engine(self, echo: bool = False):
        """Get engine for daily/EOD database"""
        if not self._daily_engine:
            self._daily_engine = create_engine(
                self.daily_url,
                poolclass=QueuePool,
                pool_size=10,
                max_overflow=20,
                pool_timeout=30,
                pool_recycle=3600,
                echo=echo,
            )
        return self._daily_engine

    def get_intraday_engine(self, echo: bool = False):
        """Get engine for intraday database"""
        if not self._intraday_engine:
            self._intraday_engine = create_engine(
                self.intraday_url,
                poolclass=QueuePool,
                pool_size=15,  # Higher pool size for high-frequency data
                max_overflow=30,
                pool_timeout=30,
                pool_recycle=1800,  # Shorter recycle for intraday
                echo=echo,
            )
        return self._intraday_engine

    def get_daily_session_maker(self):
        """Get session maker for daily database"""
        if not self._daily_session_maker:
            self._daily_session_maker = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self.get_daily_engine()
            )
        return self._daily_session_maker

    def get_intraday_session_maker(self):
        """Get session maker for intraday database"""
        if not self._intraday_session_maker:
            self._intraday_session_maker = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self.get_intraday_engine()
            )
        return self._intraday_session_maker

    def get_all_engines(self) -> Dict[str, any]:
        """Get all database engines"""
        return {
            'daily': self.get_daily_engine(),
            'intraday': self.get_intraday_engine(),
        }


# Global instance
_multi_db_config = None


def get_multi_db_config() -> MultiDatabaseConfig:
    """Get singleton multi-database configuration"""
    global _multi_db_config
    if _multi_db_config is None:
        _multi_db_config = MultiDatabaseConfig()
    return _multi_db_config


# Session dependency for FastAPI
def get_daily_db():
    """FastAPI dependency for daily database session"""
    config = get_multi_db_config()
    SessionLocal = config.get_daily_session_maker()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_intraday_db():
    """FastAPI dependency for intraday database session"""
    config = get_multi_db_config()
    SessionLocal = config.get_intraday_session_maker()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_all_connections() -> Dict[str, bool]:
    """Test all database connections"""
    config = get_multi_db_config()
    results = {}

    # Test daily database
    try:
        engine = config.get_daily_engine()
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        results['daily'] = True
        logger.info("✅ Daily database connection successful")
    except Exception as e:
        results['daily'] = False
        logger.error(f"❌ Daily database connection failed: {e}")

    # Test intraday database
    try:
        engine = config.get_intraday_engine()
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        results['intraday'] = True
        logger.info("✅ Intraday database connection successful")
    except Exception as e:
        results['intraday'] = False
        logger.error(f"❌ Intraday database connection failed: {e}")

    return results


def initialize_all_databases():
    """Initialize all database schemas"""
    config = get_multi_db_config()

    # Import models
    from .models.base import Base as DailyBase
    from .models.intraday_base import Base as IntradayBase

    try:
        # Create daily database tables
        daily_engine = config.get_daily_engine()
        DailyBase.metadata.create_all(bind=daily_engine)
        logger.info("✅ Daily database tables created")

        # Create intraday database tables
        intraday_engine = config.get_intraday_engine()
        IntradayBase.metadata.create_all(bind=intraday_engine)
        logger.info("✅ Intraday database tables created")

        return True
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        return False
