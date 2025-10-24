"""
News, Analyst Ratings, and Insider Transaction models
"""

from sqlalchemy import Column, Integer, String, Numeric, BigInteger, Date, Boolean, ForeignKey, TIMESTAMP, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from .base import Base


class News(Base):
    """Financial News Articles"""
    __tablename__ = 'news'

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey('companies.id', ondelete='SET NULL'), index=True)
    published_at = Column(TIMESTAMP(timezone=True), nullable=False, index=True)
    title = Column(Text, nullable=False)
    content = Column(Text)
    summary = Column(Text)
    url = Column(String(500))
    source = Column(String(100), index=True)  # e.g., 'Reuters', 'Bloomberg'
    author = Column(String(255))

    # Sentiment analysis
    sentiment_score = Column(Numeric(5, 4))  # -1.0 to 1.0
    sentiment_label = Column(String(20))  # 'positive', 'negative', 'neutral'
    sentiment_confidence = Column(Numeric(5, 4))  # 0.0 to 1.0

    # Metadata
    tags = Column(ARRAY(Text))  # Keywords/tags
    raw_data = Column(JSONB)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    company = relationship('Company', back_populates='news')

    def __repr__(self):
        return f"<News(id={self.id}, title='{self.title[:50]}...', published='{self.published_at}')>"


class AnalystRating(Base):
    """Analyst Recommendations and Price Targets"""
    __tablename__ = 'analyst_ratings'

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    firm = Column(String(255), nullable=False)  # Analyst firm name
    analyst_name = Column(String(255))

    # Rating
    rating = Column(String(50), index=True)  # 'Buy', 'Hold', 'Sell', etc.
    rating_numeric = Column(Integer)  # 1-5 scale (5=Strong Buy)
    previous_rating = Column(String(50))

    # Price targets
    price_target = Column(Numeric(10, 2))
    price_target_low = Column(Numeric(10, 2))
    price_target_high = Column(Numeric(10, 2))
    previous_price_target = Column(Numeric(10, 2))

    # Metadata
    action = Column(String(50))  # 'initiated', 'upgraded', 'downgraded', 'reiterated'
    url = Column(String(500))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    company = relationship('Company', back_populates='analyst_ratings')

    def __repr__(self):
        return f"<AnalystRating(company_id={self.company_id}, firm='{self.firm}', rating='{self.rating}')>"


class InsiderTransaction(Base):
    """Insider Buying/Selling Activity"""
    __tablename__ = 'insider_transactions'

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    filing_date = Column(Date, nullable=False, index=True)
    transaction_date = Column(Date, nullable=False, index=True)

    # Insider information
    insider_name = Column(String(255), nullable=False, index=True)
    insider_title = Column(String(255))
    is_director = Column(Boolean, default=False)
    is_officer = Column(Boolean, default=False)
    is_ten_percent_owner = Column(Boolean, default=False)

    # Transaction details
    transaction_type = Column(String(50), index=True)  # 'Purchase', 'Sale', 'Gift', 'Award', etc.
    transaction_code = Column(String(10))  # SEC form 4 transaction code
    shares = Column(BigInteger, nullable=False)
    price_per_share = Column(Numeric(10, 4))
    total_value = Column(Numeric(20, 2))
    shares_owned_after = Column(BigInteger)

    # Metadata
    sec_link = Column(String(500))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    company = relationship('Company', back_populates='insider_transactions')

    def __repr__(self):
        return f"<InsiderTransaction(company_id={self.company_id}, insider='{self.insider_name}', type='{self.transaction_type}')>"
