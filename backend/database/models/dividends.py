"""
Dividend Payment History model
"""

from sqlalchemy import Column, Integer, String, Numeric, Date, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class Dividend(Base):
    """Dividend Payment History"""
    __tablename__ = 'dividends'

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    ex_date = Column(Date, nullable=False, index=True)  # Ex-dividend date
    payment_date = Column(Date, index=True)
    record_date = Column(Date)
    declaration_date = Column(Date)
    amount = Column(Numeric(10, 6), nullable=False)  # Dividend amount per share
    currency = Column(String(10), default='USD')
    dividend_type = Column(String(50))  # 'Regular', 'Special', 'Stock', etc.
    frequency = Column(String(20))  # 'Quarterly', 'Monthly', 'Annual', etc.
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    company = relationship('Company', back_populates='dividends')

    def __repr__(self):
        return f"<Dividend(company_id={self.company_id}, ex_date='{self.ex_date}', amount={self.amount})>"
