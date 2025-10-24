"""
Market Data models: OHLCV, Fundamentals, Technical Indicators
"""

from sqlalchemy import Column, Integer, String, Numeric, BigInteger, Date, ForeignKey, TIMESTAMP, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from .base import Base


class OHLCV(Base):
    """Time-series OHLCV data (TimescaleDB hypertable)"""
    __tablename__ = 'ohlcv'

    company_id = Column(Integer, ForeignKey('companies.id', ondelete='CASCADE'), primary_key=True)
    date = Column(TIMESTAMP(timezone=True), primary_key=True, index=True)
    open = Column(Numeric(12, 4))
    high = Column(Numeric(12, 4))
    low = Column(Numeric(12, 4))
    close = Column(Numeric(12, 4), nullable=False)
    volume = Column(BigInteger)
    adjusted_close = Column(Numeric(12, 4))

    # Relationships
    company = relationship('Company', back_populates='ohlcv')

    def __repr__(self):
        return f"<OHLCV(company_id={self.company_id}, date='{self.date}', close={self.close})>"


class Fundamental(Base):
    """Company Fundamental Metrics"""
    __tablename__ = 'fundamentals'

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    period_type = Column(String(10), nullable=False, index=True)  # 'quarterly' or 'annual'
    fiscal_year = Column(Integer)
    fiscal_quarter = Column(Integer)  # 1, 2, 3, 4 (NULL for annual)

    # Valuation metrics
    market_cap = Column(Numeric(20, 2))
    enterprise_value = Column(Numeric(20, 2))
    pe_ratio = Column(Numeric(10, 4))
    peg_ratio = Column(Numeric(10, 4))
    price_to_book = Column(Numeric(10, 4))
    price_to_sales = Column(Numeric(10, 4))
    ev_to_revenue = Column(Numeric(10, 4))
    ev_to_ebitda = Column(Numeric(10, 4))

    # Profitability metrics
    revenue = Column(Numeric(20, 2))
    gross_profit = Column(Numeric(20, 2))
    operating_income = Column(Numeric(20, 2))
    net_income = Column(Numeric(20, 2))
    ebitda = Column(Numeric(20, 2))
    eps = Column(Numeric(10, 4))  # Earnings per share
    eps_diluted = Column(Numeric(10, 4))
    gross_margin = Column(Numeric(10, 4))  # Percentage
    operating_margin = Column(Numeric(10, 4))
    profit_margin = Column(Numeric(10, 4))
    roe = Column(Numeric(10, 4))  # Return on equity
    roa = Column(Numeric(10, 4))  # Return on assets
    roic = Column(Numeric(10, 4))  # Return on invested capital

    # Growth metrics
    revenue_growth = Column(Numeric(10, 4))  # YoY growth %
    earnings_growth = Column(Numeric(10, 4))

    # Balance sheet metrics
    total_assets = Column(Numeric(20, 2))
    total_liabilities = Column(Numeric(20, 2))
    total_equity = Column(Numeric(20, 2))
    total_debt = Column(Numeric(20, 2))
    cash_and_equivalents = Column(Numeric(20, 2))
    book_value_per_share = Column(Numeric(10, 4))

    # Debt metrics
    debt_to_equity = Column(Numeric(10, 4))
    current_ratio = Column(Numeric(10, 4))
    quick_ratio = Column(Numeric(10, 4))

    # Dividend metrics
    dividend_per_share = Column(Numeric(10, 4))
    dividend_yield = Column(Numeric(10, 6))  # Percentage
    payout_ratio = Column(Numeric(10, 4))

    # Cash flow metrics
    operating_cash_flow = Column(Numeric(20, 2))
    free_cash_flow = Column(Numeric(20, 2))
    capex = Column(Numeric(20, 2))

    # Share metrics
    shares_outstanding = Column(BigInteger)
    float_shares = Column(BigInteger)

    # Metadata
    data_source = Column(String(50), default='EODHD')
    raw_data = Column(JSONB)  # Store full API response
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    company = relationship('Company', back_populates='fundamentals')

    def __repr__(self):
        return f"<Fundamental(company_id={self.company_id}, date='{self.date}', period='{self.period_type}')>"


class TechnicalIndicator(Base):
    """Pre-calculated Technical Indicators"""
    __tablename__ = 'technical_indicators'

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)

    # Moving averages
    sma_20 = Column(Numeric(12, 4))  # 20-day simple moving average
    sma_50 = Column(Numeric(12, 4))
    sma_200 = Column(Numeric(12, 4))
    ema_12 = Column(Numeric(12, 4))  # 12-day exponential moving average
    ema_26 = Column(Numeric(12, 4))

    # MACD
    macd = Column(Numeric(12, 4))
    macd_signal = Column(Numeric(12, 4))
    macd_histogram = Column(Numeric(12, 4))

    # RSI
    rsi_14 = Column(Numeric(10, 4))  # 14-day RSI

    # Bollinger Bands
    bb_upper = Column(Numeric(12, 4))
    bb_middle = Column(Numeric(12, 4))
    bb_lower = Column(Numeric(12, 4))
    bb_bandwidth = Column(Numeric(10, 4))

    # Volume indicators
    volume_sma_20 = Column(BigInteger)
    obv = Column(BigInteger)  # On-balance volume

    # Volatility
    atr_14 = Column(Numeric(12, 4))  # Average true range (14-day)
    historical_volatility_30 = Column(Numeric(10, 4))

    # Metadata
    calculated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    company = relationship('Company', back_populates='technical_indicators')

    def __repr__(self):
        return f"<TechnicalIndicator(company_id={self.company_id}, date='{self.date}')>"
