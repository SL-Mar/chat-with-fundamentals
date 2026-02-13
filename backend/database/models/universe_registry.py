"""Registry database models — tracks all universes and app settings."""

import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, String, Integer, DateTime, Date, ForeignKey, Text, Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import relationship, DeclarativeBase
import enum


class Base(DeclarativeBase):
    pass


class SourceType(str, enum.Enum):
    SECTOR = "sector"
    ETF = "etf"


class UniverseStatus(str, enum.Enum):
    CREATING = "creating"
    READY = "ready"
    REFRESHING = "refreshing"
    ERROR = "error"


class TickerStatus(str, enum.Enum):
    PENDING = "pending"
    INGESTING = "ingesting"
    READY = "ready"
    ERROR = "error"


class Universe(Base):
    __tablename__ = "universes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    source_type = Column(
        String(10),
        nullable=False,
        default="sector",
        server_default="sector",
    )
    sector = Column(String(100), nullable=True)
    etf_symbol = Column(String(20), nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    granularities = Column(ARRAY(String), nullable=False, default=["d"])
    db_name = Column(String(100), nullable=False, unique=True)
    status = Column(
        SAEnum(UniverseStatus, name="universe_status"),
        nullable=False,
        default=UniverseStatus.CREATING,
    )
    total_tickers = Column(Integer, default=0)
    tickers_completed = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tickers = relationship("UniverseTicker", back_populates="universe", cascade="all, delete-orphan")


class UniverseTicker(Base):
    __tablename__ = "universe_tickers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    universe_id = Column(UUID(as_uuid=True), ForeignKey("universes.id", ondelete="CASCADE"), nullable=False)
    ticker = Column(String(20), nullable=False)
    company_name = Column(String(200), nullable=True)
    ohlcv_status = Column(
        SAEnum(TickerStatus, name="ticker_status"),
        nullable=False,
        default=TickerStatus.PENDING,
    )
    fundamentals_status = Column(
        SAEnum(TickerStatus, name="ticker_status", create_type=False),
        nullable=False,
        default=TickerStatus.PENDING,
    )

    universe = relationship("Universe", back_populates="tickers")


class AppSettings(Base):
    __tablename__ = "app_settings"

    key = Column(String(100), primary_key=True)
    value = Column(JSONB, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
