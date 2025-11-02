"""
Base model for intraday database
"""

from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from ..config_multi import get_multi_db_config

# Separate Base for intraday database
Base = declarative_base()

# Get intraday engine
config = get_multi_db_config()
engine = config.get_intraday_engine()

# Session maker for intraday database
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Get intraday database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
