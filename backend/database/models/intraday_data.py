"""
Intraday OHLCV Data Models (Phase 3D)

TimescaleDB hypertable for minute-level intraday price data.
Separate from EOD data due to high volume (millions of rows).
"""

from sqlalchemy import (
    Column, String, DateTime, Numeric, BigInteger,
    Index, UniqueConstraint, CheckConstraint
)
from sqlalchemy.dialects.postgresql import ENUM
from datetime import datetime
from .base import Base


class IntradayOHLCV(Base):
    """
    Intraday OHLCV data at minute-level granularity.

    TimescaleDB hypertable partitioned by timestamp for efficient queries.
    Supports 1m, 5m, 15m, 30m, 1h intervals via aggregation.

    Storage estimates:
    - 1 stock × 1 day × 390 minutes (6.5 hours) = 390 rows
    - 100 stocks × 252 days × 390 minutes = ~10M rows/year
    - With compression: ~70% reduction

    Data retention:
    - 1-minute: 30 days rolling window
    - 5-minute: 90 days rolling window
    - Aggregated to EOD after retention period
    """

    __tablename__ = 'intraday_ohlcv'

    # Composite primary key: ticker + timestamp + interval
    ticker = Column(
        String(20),
        primary_key=True,
        nullable=False,
        comment="Stock ticker with exchange suffix (e.g., AAPL.US)"
    )

    timestamp = Column(
        DateTime(timezone=True),
        primary_key=True,
        nullable=False,
        comment="Timestamp of candle (market time, e.g., 2024-01-15 09:30:00-05:00)"
    )

    interval = Column(
        ENUM('1m', '5m', '15m', '30m', '1h', name='intraday_interval_enum'),
        primary_key=True,
        nullable=False,
        default='1m',
        comment="Candle interval (1m, 5m, 15m, 30m, 1h)"
    )

    # OHLCV data
    open = Column(
        Numeric(12, 4),
        nullable=False,
        comment="Opening price for the interval"
    )

    high = Column(
        Numeric(12, 4),
        nullable=False,
        comment="Highest price during interval"
    )

    low = Column(
        Numeric(12, 4),
        nullable=False,
        comment="Lowest price during interval"
    )

    close = Column(
        Numeric(12, 4),
        nullable=False,
        comment="Closing price for the interval"
    )

    volume = Column(
        BigInteger,
        nullable=False,
        default=0,
        comment="Trading volume during interval"
    )

    # Additional metrics
    trades = Column(
        BigInteger,
        nullable=True,
        comment="Number of trades during interval"
    )

    vwap = Column(
        Numeric(12, 4),
        nullable=True,
        comment="Volume-weighted average price"
    )

    # Metadata
    source = Column(
        String(50),
        nullable=False,
        default='eodhd',
        comment="Data source (eodhd, polygon, alpaca)"
    )

    ingested_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        comment="Timestamp when data was ingested"
    )

    # Constraints
    __table_args__ = (
        # Unique constraint on ticker + timestamp + interval
        UniqueConstraint(
            'ticker', 'timestamp', 'interval',
            name='uq_intraday_ticker_timestamp_interval'
        ),

        # OHLC consistency checks
        CheckConstraint(
            'high >= low',
            name='ck_intraday_high_gte_low'
        ),
        CheckConstraint(
            'high >= open',
            name='ck_intraday_high_gte_open'
        ),
        CheckConstraint(
            'high >= close',
            name='ck_intraday_high_gte_close'
        ),
        CheckConstraint(
            'low <= open',
            name='ck_intraday_low_lte_open'
        ),
        CheckConstraint(
            'low <= close',
            name='ck_intraday_low_lte_close'
        ),
        CheckConstraint(
            'volume >= 0',
            name='ck_intraday_volume_non_negative'
        ),

        # Composite indexes for common queries
        Index(
            'idx_intraday_ticker_timestamp_desc',
            'ticker', 'timestamp',
            postgresql_ops={'timestamp': 'DESC'}
        ),
        Index(
            'idx_intraday_timestamp_ticker',
            'timestamp', 'ticker'
        ),
        Index(
            'idx_intraday_ticker_interval_timestamp',
            'ticker', 'interval', 'timestamp'
        ),

        # Comment
        {'comment': 'Intraday OHLCV data with minute-level granularity (TimescaleDB hypertable)'}
    )

    def __repr__(self):
        return (
            f"<IntradayOHLCV(ticker='{self.ticker}', "
            f"timestamp='{self.timestamp}', "
            f"interval='{self.interval}', "
            f"close={self.close})>"
        )


class IntradayQuote(Base):
    """
    Real-time quote snapshots (tick data).

    For ultra-low latency requirements. Most use cases should use IntradayOHLCV.
    Optional table for advanced users.

    Data retention: 7 days rolling window
    """

    __tablename__ = 'intraday_quotes'

    # Composite primary key: ticker + timestamp
    ticker = Column(
        String(20),
        primary_key=True,
        nullable=False
    )

    timestamp = Column(
        DateTime(timezone=True),
        primary_key=True,
        nullable=False,
        comment="Exact timestamp of quote"
    )

    # Quote data
    bid = Column(
        Numeric(12, 4),
        nullable=True,
        comment="Best bid price"
    )

    ask = Column(
        Numeric(12, 4),
        nullable=True,
        comment="Best ask price"
    )

    bid_size = Column(
        BigInteger,
        nullable=True,
        comment="Bid size (shares)"
    )

    ask_size = Column(
        BigInteger,
        nullable=True,
        comment="Ask size (shares)"
    )

    last_price = Column(
        Numeric(12, 4),
        nullable=True,
        comment="Last trade price"
    )

    last_size = Column(
        BigInteger,
        nullable=True,
        comment="Last trade size"
    )

    # Metadata
    source = Column(
        String(50),
        nullable=False,
        default='eodhd'
    )

    ingested_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow
    )

    __table_args__ = (
        UniqueConstraint(
            'ticker', 'timestamp',
            name='uq_intraday_quotes_ticker_timestamp'
        ),
        Index(
            'idx_quotes_ticker_timestamp_desc',
            'ticker', 'timestamp',
            postgresql_ops={'timestamp': 'DESC'}
        ),
        {'comment': 'Real-time quote snapshots (tick data)'}
    )

    def __repr__(self):
        return (
            f"<IntradayQuote(ticker='{self.ticker}', "
            f"timestamp='{self.timestamp}', "
            f"bid={self.bid}, ask={self.ask})>"
        )
