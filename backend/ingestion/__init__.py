"""
Data Ingestion Pipeline for Chat with Fundamentals

Security features:
- Secure API key handling
- Input validation with Pydantic
- SQL injection prevention (SQLAlchemy ORM)
- Rate limiting respect

Robustness features:
- Retry logic with exponential backoff
- Transaction management
- Duplicate detection
- Error logging
"""

from .ohlcv_ingestion import OHLCVIngestion
from .fundamental_ingestion import FundamentalIngestion
from .news_ingestion import NewsIngestion
from .base_ingestion import BaseIngestion

__all__ = [
    'BaseIngestion',
    'OHLCVIngestion',
    'FundamentalIngestion',
    'NewsIngestion',
]
