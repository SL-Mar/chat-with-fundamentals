"""
Configuration for database queries and operations

Centralizes magic numbers for easy tuning and testing.
"""

import os


class QueryConfig:
    """Query-related configuration"""

    # Default limits
    DEFAULT_LIMIT = 100
    MAX_LIMIT = 1000
    OHLCV_DEFAULT_DAYS = 90
    NEWS_DEFAULT_DAYS = 30
    ANALYST_RATINGS_DEFAULT_DAYS = 90
    DIVIDEND_DEFAULT_YEARS = 5

    # Pagination
    DEFAULT_PAGE_SIZE = 50
    MAX_PAGE_SIZE = 500


class IngestionConfig:
    """Data ingestion configuration"""

    # Batch sizes
    BATCH_SIZE = 500
    MAX_BATCH_SIZE = 1000
    MIN_BATCH_SIZE = 100

    # Rate limiting
    RATE_LIMIT_PER_MINUTE = 60
    REQUEST_TIMEOUT_SECONDS = 30

    # Retries
    MAX_RETRIES = 3
    BACKOFF_FACTOR = 2.0

    @classmethod
    def from_env(cls):
        """Load configuration from environment variables"""
        cls.BATCH_SIZE = int(os.getenv('INGESTION_BATCH_SIZE', cls.BATCH_SIZE))
        cls.RATE_LIMIT_PER_MINUTE = int(
            os.getenv('RATE_LIMIT_PER_MINUTE', cls.RATE_LIMIT_PER_MINUTE)
        )
        cls.MAX_RETRIES = int(os.getenv('MAX_RETRIES', cls.MAX_RETRIES))


class DatabaseConfig:
    """Database connection configuration"""

    # Connection pool (environment-configurable)
    POOL_SIZE = int(os.getenv('DB_POOL_SIZE', 20))  # Increased from 10
    MAX_OVERFLOW = int(os.getenv('DB_MAX_OVERFLOW', 40))  # Increased from 20
    POOL_TIMEOUT = int(os.getenv('DB_POOL_TIMEOUT', 60))  # Increased from 30
    POOL_RECYCLE = int(os.getenv('DB_POOL_RECYCLE', 3600))

    # Query timeout (30 seconds default)
    STATEMENT_TIMEOUT_MS = int(os.getenv('DB_STATEMENT_TIMEOUT', 30000))

    @classmethod
    def validate(cls):
        """Validate configuration and warn about issues"""
        import logging
        logger = logging.getLogger(__name__)

        total_connections = cls.POOL_SIZE + cls.MAX_OVERFLOW

        if cls.POOL_SIZE < 10:
            logger.warning(
                f"Pool size {cls.POOL_SIZE} is low, recommend >= 20 for production"
            )

        if total_connections < 50:
            logger.warning(
                f"Total connections ({total_connections}) < 50, "
                "may not handle high load (100+ concurrent users)"
            )

        if cls.POOL_TIMEOUT < 30:
            logger.warning(
                f"Pool timeout {cls.POOL_TIMEOUT}s is low, recommend >= 60s"
            )

        logger.info(
            f"Database connection pool: {cls.POOL_SIZE} + {cls.MAX_OVERFLOW} overflow "
            f"= {total_connections} total connections"
        )


# Initialize from environment on import
IngestionConfig.from_env()
DatabaseConfig.validate()
