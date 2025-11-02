"""
Intraday data models for multiple timeframes (1m, 5m, 15m, 1h)
Stored in separate intraday database with TimescaleDB optimization
"""

from sqlalchemy import Column, String, Float, BigInteger, DateTime, Index
from sqlalchemy.sql import func
from .intraday_base import Base


class IntradayOHLCV(Base):
    """
    Intraday OHLCV data supporting multiple timeframes
    TimescaleDB hypertable for efficient time-series queries

    Note: Composite primary key (ticker, timeframe, timestamp) required for TimescaleDB
    """
    __tablename__ = 'intraday_ohlcv'

    # Identification (composite primary key for TimescaleDB)
    ticker = Column(String(20), primary_key=True)
    timeframe = Column(String(10), primary_key=True)  # '1m', '5m', '15m', '1h'
    timestamp = Column(DateTime, primary_key=True)

    # OHLCV data
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(BigInteger, nullable=False)

    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Composite indexes for efficient queries
    __table_args__ = (
        Index('idx_ticker_timeframe_timestamp', 'ticker', 'timeframe', 'timestamp'),
        Index('idx_timeframe_timestamp', 'timeframe', 'timestamp'),
        Index('idx_timestamp', 'timestamp'),
    )

    def __repr__(self):
        return f"<IntradayOHLCV(ticker={self.ticker}, timeframe={self.timeframe}, timestamp={self.timestamp}, close={self.close})>"

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'ticker': self.ticker,
            'timeframe': self.timeframe,
            'timestamp': self.timestamp.isoformat(),
            'open': self.open,
            'high': self.high,
            'low': self.low,
            'close': self.close,
            'volume': self.volume,
        }


class IntradayDataStatus(Base):
    """
    Track data availability and last update times for each ticker/timeframe
    Used to determine when to fetch from API vs database
    """
    __tablename__ = 'intraday_data_status'

    # Primary key
    id = Column(BigInteger, primary_key=True, autoincrement=True)

    # Identification
    ticker = Column(String(20), nullable=False)
    timeframe = Column(String(10), nullable=False)

    # Status tracking
    first_timestamp = Column(DateTime, nullable=True)  # First data point available
    last_timestamp = Column(DateTime, nullable=True)   # Most recent data point
    total_records = Column(BigInteger, default=0)

    # Metadata
    last_fetched_at = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('idx_ticker_timeframe', 'ticker', 'timeframe', unique=True),
    )

    def __repr__(self):
        return f"<IntradayDataStatus(ticker={self.ticker}, timeframe={self.timeframe}, last={self.last_timestamp})>"

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'ticker': self.ticker,
            'timeframe': self.timeframe,
            'first_timestamp': self.first_timestamp.isoformat() if self.first_timestamp else None,
            'last_timestamp': self.last_timestamp.isoformat() if self.last_timestamp else None,
            'total_records': self.total_records,
            'last_fetched_at': self.last_fetched_at.isoformat() if self.last_fetched_at else None,
        }
