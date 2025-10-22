"""
SQLAlchemy Base and session management
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from typing import Generator
import os

# Database URL from environment
DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://postgres:postgres@localhost:5432/chat_fundamentals'
)

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,               # Number of connections to maintain
    max_overflow=20,            # Additional connections if pool is full
    pool_timeout=30,            # Timeout for getting connection from pool
    pool_recycle=3600,          # Recycle connections after 1 hour
    echo=False,                 # Set to True for SQL query logging
)

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
    finally:
        db.close()


def init_db():
    """
    Initialize database tables (create all tables)

    Usage:
        from database.models.base import init_db
        init_db()
    """
    Base.metadata.create_all(bind=engine)


def drop_db():
    """
    Drop all database tables (use with caution!)

    Usage:
        from database.models.base import drop_db
        drop_db()
    """
    Base.metadata.drop_all(bind=engine)
