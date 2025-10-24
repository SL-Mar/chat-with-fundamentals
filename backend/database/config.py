"""
Database configuration and utilities
"""

import os
from typing import Optional
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from sqlalchemy.pool import QueuePool
import redis
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)


class DatabaseConfig:
    """Database configuration"""

    def __init__(self):
        self.database_url = os.getenv(
            'DATABASE_URL',
            'postgresql://postgres:postgres@localhost:5432/chat_fundamentals'
        )
        self.redis_host = os.getenv('REDIS_HOST', 'localhost')
        self.redis_port = int(os.getenv('REDIS_PORT', 6379))
        self.redis_db = int(os.getenv('REDIS_DB', 0))

    def get_engine(self, echo: bool = False):
        """Get SQLAlchemy engine with connection pooling"""
        return create_engine(
            self.database_url,
            poolclass=QueuePool,
            pool_size=10,
            max_overflow=20,
            pool_timeout=30,
            pool_recycle=3600,
            echo=echo,
        )

    def get_redis_client(self) -> redis.Redis:
        """Get Redis client"""
        return redis.Redis(
            host=self.redis_host,
            port=self.redis_port,
            db=self.redis_db,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
        )


@lru_cache()
def get_config() -> DatabaseConfig:
    """Get cached database configuration"""
    return DatabaseConfig()


def test_database_connection() -> bool:
    """Test database connection"""
    try:
        config = get_config()
        engine = config.get_engine()
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            logger.info("✅ Database connection successful")
            return True
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False


def test_timescaledb_extension() -> bool:
    """Test if TimescaleDB extension is installed"""
    try:
        config = get_config()
        engine = config.get_engine()
        with engine.connect() as conn:
            result = conn.execute(text("SELECT extname FROM pg_extension WHERE extname = 'timescaledb'"))
            if result.fetchone():
                logger.info("✅ TimescaleDB extension is installed")
                return True
            else:
                logger.warning("⚠️  TimescaleDB extension not found")
                return False
    except Exception as e:
        logger.error(f"❌ TimescaleDB check failed: {e}")
        return False


def test_redis_connection() -> bool:
    """Test Redis connection"""
    try:
        config = get_config()
        redis_client = config.get_redis_client()
        redis_client.ping()
        logger.info("✅ Redis connection successful")
        return True
    except Exception as e:
        logger.error(f"❌ Redis connection failed: {e}")
        return False


def initialize_database():
    """Initialize database with schema"""
    try:
        from .models.base import engine, Base
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        return False


def check_database_health() -> dict:
    """Check database and Redis health"""
    return {
        'database': test_database_connection(),
        'timescaledb': test_timescaledb_extension(),
        'redis': test_redis_connection(),
    }
