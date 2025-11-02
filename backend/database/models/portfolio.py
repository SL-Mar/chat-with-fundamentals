"""
Portfolio models for Chat with Fundamentals

Stores user portfolios and their constituent stocks for analysis and optimization.
"""

from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base


class Portfolio(Base):
    """User portfolios for tracking multiple stocks."""
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    stocks = relationship("PortfolioStock", back_populates="portfolio", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Portfolio(id={self.id}, name={self.name}, stocks={len(self.stocks)})>"


class PortfolioStock(Base):
    """Stocks within a portfolio with their weights/shares."""
    __tablename__ = "portfolio_stocks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    ticker = Column(String, nullable=False)
    weight = Column(Float, nullable=True)  # Percentage (0-1), null for equal weight
    shares = Column(Float, nullable=True)  # Optional number of shares
    added_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    portfolio = relationship("Portfolio", back_populates="stocks")

    def __repr__(self):
        return f"<PortfolioStock(portfolio_id={self.portfolio_id}, ticker={self.ticker}, weight={self.weight})>"
