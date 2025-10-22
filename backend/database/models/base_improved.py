"""
SQLAlchemy Base and session management - IMPROVED VERSION

Fixes:
1. ✅ Configurable connection pool from environment
2. ✅ Query timeout configuration
3. ✅ Connection pool validation
4. ✅ Better error handling
"""

from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from typing import Generator
import os
import logging

logger = logging.getLogger(__name__)

# Import configuration
from database.query_config import DatabaseConfig

# Database URL from environment
DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://postgres:postgres@localhost:5432/chat_fundamentals'
)

# Create engine with IMPROVED connection pooling
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=DatabaseConfig.POOL_SIZE,          # Configurable (default: 20)
    max_overflow=DatabaseConfig.MAX_OVERFLOW,    # Configurable (default: 40)
    pool_timeout=DatabaseConfig.POOL_TIMEOUT,    # Configurable (default: 60)
    pool_recycle=DatabaseConfig.POOL_RECYCLE,    # Recycle after 1 hour
    echo=False,                                   # Set to True for SQL logging
    connect_args={
        # Set statement timeout (30 seconds default)
        'options': f'-c statement_timeout={DatabaseConfig.STATEMENT_TIMEOUT_MS}'
    }
)

# Log connection pool configuration
logger.info(
    f"Database connection pool configured: "
    f"pool_size={DatabaseConfig.POOL_SIZE}, "
    f"max_overflow={DatabaseConfig.MAX_OVERFLOW}, "
    f"timeout={DatabaseConfig.POOL_TIMEOUT}s, "
    f"statement_timeout={DatabaseConfig.STATEMENT_TIMEOUT_MS}ms"
)

# Add connection pool event listeners for monitoring
@event.listens_for(engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Log new database connections"""
    logger.debug("New database connection established")

@event.listens_for(engine, "checkout")
def receive_checkout(dbapi_conn, connection_record, connection_proxy):
    """Log connection checkout from pool"""
    logger.debug("Connection checked out from pool")

@event.listens_for(engine, "checkin")
def receive_checkin(dbapi_conn, connection_record):
    """Log connection returned to pool"""
    logger.debug("Connection returned to pool")


# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base for models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Database session dependency for FastAPI

    Usage:
        @app.get("/")
        def read_items(db: Session = Depends(get_db)):
            return db.query(Company).all()
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def init_db():
    """
    Initialize database tables (create all tables)

    Usage:
        from database.models.base_improved import init_db
        init_db()
    """
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created successfully")
    except Exception as e:
        logger.error(f"❌ Failed to create database tables: {e}")
        raise


def drop_db():
    """
    Drop all database tables (use with caution!)

    Usage:
        from database.models.base_improved import drop_db
        drop_db()
    """
    try:
        Base.metadata.drop_all(bind=engine)
        logger.warning("⚠️  All database tables dropped")
    except Exception as e:
        logger.error(f"❌ Failed to drop database tables: {e}")
        raise


def get_pool_status() -> dict:
    """
    Get current connection pool status

    Returns:
        Dict with pool statistics
    """
    pool = engine.pool
    return {
        'size': pool.size(),
        'checked_in': pool.checkedin(),
        'checked_out': pool.checkedout(),
        'overflow': pool.overflow(),
        'total': pool.size() + pool.overflow(),
        'max_total': DatabaseConfig.POOL_SIZE + DatabaseConfig.MAX_OVERFLOW
    }
