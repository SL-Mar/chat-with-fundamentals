"""
Company, Exchange, Sector, Industry models
"""

from sqlalchemy import Column, Integer, String, Boolean, Date, Text, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class Exchange(Base):
    """Stock Exchange"""
    __tablename__ = 'exchanges'

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    country = Column(String(100))
    timezone = Column(String(50))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    companies = relationship('Company', back_populates='exchange')

    def __repr__(self):
        return f"<Exchange(code='{self.code}', name='{self.name}')>"


class Sector(Base):
    """Industry Sector"""
    __tablename__ = 'sectors'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    industries = relationship('Industry', back_populates='sector')
    companies = relationship('Company', back_populates='sector')

    def __repr__(self):
        return f"<Sector(name='{self.name}')>"


class Industry(Base):
    """Industry Sub-classification"""
    __tablename__ = 'industries'

    id = Column(Integer, primary_key=True, index=True)
    sector_id = Column(Integer, ForeignKey('sectors.id', ondelete='SET NULL'), index=True)
    name = Column(String(150), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    sector = relationship('Sector', back_populates='industries')
    companies = relationship('Company', back_populates='industry')

    def __repr__(self):
        return f"<Industry(name='{self.name}')>"


class Company(Base):
    """Company/Ticker Master Data"""
    __tablename__ = 'companies'

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    exchange_id = Column(Integer, ForeignKey('exchanges.id', ondelete='SET NULL'), index=True)
    sector_id = Column(Integer, ForeignKey('sectors.id', ondelete='SET NULL'), index=True)
    industry_id = Column(Integer, ForeignKey('industries.id', ondelete='SET NULL'), index=True)
    currency = Column(String(10), default='USD')
    isin = Column(String(12))
    cusip = Column(String(9))
    description = Column(Text)
    website = Column(String(255))
    is_active = Column(Boolean, default=True, index=True)
    ipo_date = Column(Date)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    exchange = relationship('Exchange', back_populates='companies')
    sector = relationship('Sector', back_populates='companies')
    industry = relationship('Industry', back_populates='companies')
    ohlcv = relationship('OHLCV', back_populates='company', cascade='all, delete-orphan')
    fundamentals = relationship('Fundamental', back_populates='company', cascade='all, delete-orphan')
    news = relationship('News', back_populates='company')
    analyst_ratings = relationship('AnalystRating', back_populates='company', cascade='all, delete-orphan')
    insider_transactions = relationship('InsiderTransaction', back_populates='company', cascade='all, delete-orphan')
    dividends = relationship('Dividend', back_populates='company', cascade='all, delete-orphan')
    technical_indicators = relationship('TechnicalIndicator', back_populates='company', cascade='all, delete-orphan')

    def __repr__(self):
        return f"<Company(ticker='{self.ticker}', name='{self.name}')>"
