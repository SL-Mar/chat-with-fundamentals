"""Per-universe database models — OHLCV hypertable + fundamentals."""

from datetime import datetime, date
from sqlalchemy import (
    Column, String, Integer, Float, DateTime, Date, Text, BigInteger,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase


class UniverseBase(DeclarativeBase):
    pass


class UniverseOHLCV(UniverseBase):
    __tablename__ = "ohlcv"

    ticker = Column(String(20), primary_key=True)
    granularity = Column(String(10), primary_key=True)  # '5m', '1h', 'd'
    timestamp = Column(DateTime, primary_key=True)
    open = Column(Float, nullable=True)
    high = Column(Float, nullable=True)
    low = Column(Float, nullable=True)
    close = Column(Float, nullable=False)
    volume = Column(BigInteger, nullable=True)
    adjusted_close = Column(Float, nullable=True)


class UniverseFundamental(UniverseBase):
    __tablename__ = "fundamentals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String(20), nullable=False)
    date = Column(Date, nullable=False)
    period_type = Column(String(20), nullable=False)  # 'quarterly', 'annual'

    # Valuation
    market_cap = Column(Float, nullable=True)
    enterprise_value = Column(Float, nullable=True)
    pe_ratio = Column(Float, nullable=True)
    pb_ratio = Column(Float, nullable=True)
    ps_ratio = Column(Float, nullable=True)
    peg_ratio = Column(Float, nullable=True)
    ev_ebitda = Column(Float, nullable=True)
    ev_revenue = Column(Float, nullable=True)

    # Profitability
    gross_margin = Column(Float, nullable=True)
    operating_margin = Column(Float, nullable=True)
    net_margin = Column(Float, nullable=True)
    roe = Column(Float, nullable=True)
    roa = Column(Float, nullable=True)
    roic = Column(Float, nullable=True)

    # Growth
    revenue_growth_yoy = Column(Float, nullable=True)
    earnings_growth_yoy = Column(Float, nullable=True)
    revenue_growth_qoq = Column(Float, nullable=True)

    # Income statement
    revenue = Column(Float, nullable=True)
    gross_profit = Column(Float, nullable=True)
    operating_income = Column(Float, nullable=True)
    net_income = Column(Float, nullable=True)
    ebitda = Column(Float, nullable=True)
    eps = Column(Float, nullable=True)
    eps_diluted = Column(Float, nullable=True)

    # Balance sheet
    total_assets = Column(Float, nullable=True)
    total_liabilities = Column(Float, nullable=True)
    total_equity = Column(Float, nullable=True)
    total_debt = Column(Float, nullable=True)
    cash_and_equivalents = Column(Float, nullable=True)
    current_ratio = Column(Float, nullable=True)
    debt_to_equity = Column(Float, nullable=True)

    # Cash flow
    operating_cash_flow = Column(Float, nullable=True)
    capex = Column(Float, nullable=True)
    free_cash_flow = Column(Float, nullable=True)
    fcf_per_share = Column(Float, nullable=True)

    # Dividends
    dividend_per_share = Column(Float, nullable=True)
    dividend_yield = Column(Float, nullable=True)
    payout_ratio = Column(Float, nullable=True)

    # Shares
    shares_outstanding = Column(BigInteger, nullable=True)
    shares_float = Column(BigInteger, nullable=True)

    # Raw data
    raw_data = Column(JSONB, nullable=True)

    __table_args__ = (
        UniqueConstraint("ticker", "date", "period_type", name="uq_fundamentals_ticker_date_period"),
    )
