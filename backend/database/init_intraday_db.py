"""
Initialize intraday database with TimescaleDB hypertables
Run this after creating the intraday database container
"""

import logging
from sqlalchemy import text
from .config_multi import get_multi_db_config
from .models.intraday_base import Base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_intraday_database():
    """
    Initialize intraday database:
    1. Create tables
    2. Enable TimescaleDB extension
    3. Create hypertables for time-series optimization
    4. Create indexes
    """
    config = get_multi_db_config()
    engine = config.get_intraday_engine()

    try:
        # Import models to ensure they're registered with Base
        from .models.intraday_models import IntradayOHLCV, IntradayDataStatus

        # 1. Create all tables
        logger.info("Creating intraday database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Tables created successfully")

        # 2. Enable TimescaleDB extension
        with engine.connect() as conn:
            logger.info("Enabling TimescaleDB extension...")
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"))
            conn.commit()
            logger.info("✅ TimescaleDB extension enabled")

            # 3. Convert intraday_ohlcv to hypertable
            logger.info("Creating hypertable for intraday_ohlcv...")
            try:
                conn.execute(text("""
                    SELECT create_hypertable(
                        'intraday_ohlcv',
                        'timestamp',
                        if_not_exists => TRUE,
                        chunk_time_interval => INTERVAL '7 days'
                    );
                """))
                conn.commit()
                logger.info("✅ Hypertable created successfully")
            except Exception as e:
                if "already a hypertable" in str(e):
                    logger.info("⚠️  Hypertable already exists, skipping")
                else:
                    raise

            # 4. Create additional indexes for performance
            logger.info("Creating performance indexes...")

            # Composite index for ticker + timeframe queries
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_intraday_ticker_timeframe_ts
                ON intraday_ohlcv (ticker, timeframe, timestamp DESC);
            """))

            # Index for timeframe-specific queries
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_intraday_timeframe_ts
                ON intraday_ohlcv (timeframe, timestamp DESC);
            """))

            conn.commit()
            logger.info("✅ Performance indexes created")

            # 5. Enable compression for older data (optional, saves disk space)
            logger.info("Enabling compression for older chunks...")
            try:
                conn.execute(text("""
                    ALTER TABLE intraday_ohlcv SET (
                        timescaledb.compress,
                        timescaledb.compress_segmentby = 'ticker,timeframe'
                    );
                """))

                # Compress chunks older than 30 days
                conn.execute(text("""
                    SELECT add_compression_policy(
                        'intraday_ohlcv',
                        INTERVAL '30 days',
                        if_not_exists => TRUE
                    );
                """))

                conn.commit()
                logger.info("✅ Compression enabled for data older than 30 days")
            except Exception as e:
                logger.warning(f"⚠️  Compression setup failed (optional): {e}")

        logger.info("✅ Intraday database initialization complete!")

    except Exception as e:
        logger.error(f"❌ Failed to initialize intraday database: {e}")
        raise


def test_intraday_connection():
    """Test connection to intraday database"""
    config = get_multi_db_config()
    engine = config.get_intraday_engine()

    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            logger.info("✅ Intraday database connection successful")
            return True
    except Exception as e:
        logger.error(f"❌ Intraday database connection failed: {e}")
        return False


if __name__ == "__main__":
    logger.info("🚀 Starting intraday database initialization...")

    # Test connection first
    if test_intraday_connection():
        # Initialize database
        init_intraday_database()
    else:
        logger.error("❌ Cannot initialize database - connection failed")
        logger.error("Make sure the intraday PostgreSQL container is running:")
        logger.error("  docker-compose -f docker-compose.db.yml up -d postgres-intraday")
