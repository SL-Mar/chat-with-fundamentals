"""
Monitoring models: Data Ingestion Logs, API Rate Limits
"""

from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from .base import Base


class DataIngestionLog(Base):
    """Track Data Ingestion Jobs for Monitoring"""
    __tablename__ = 'data_ingestion_logs'

    id = Column(Integer, primary_key=True, index=True)
    job_type = Column(String(50), nullable=False, index=True)  # 'ohlcv', 'fundamentals', 'news', etc.
    company_id = Column(Integer, ForeignKey('companies.id', ondelete='SET NULL'), index=True)
    start_time = Column(TIMESTAMP(timezone=True), nullable=False, index=True)
    end_time = Column(TIMESTAMP(timezone=True))
    status = Column(String(20), nullable=False, index=True)  # 'running', 'success', 'failed'
    records_processed = Column(Integer, default=0)
    records_inserted = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    error_message = Column(Text)
    metadata = Column(JSONB)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<DataIngestionLog(job_type='{self.job_type}', status='{self.status}', start='{self.start_time}')>"


class APIRateLimit(Base):
    """Track API Usage for Rate Limiting"""
    __tablename__ = 'api_rate_limits'

    id = Column(Integer, primary_key=True, index=True)
    api_name = Column(String(50), nullable=False, index=True)  # 'EODHD', 'OpenAI', etc.
    endpoint = Column(String(255))
    request_time = Column(TIMESTAMP(timezone=True), nullable=False, index=True)
    response_time_ms = Column(Integer)
    status_code = Column(Integer)
    error_message = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<APIRateLimit(api='{self.api_name}', endpoint='{self.endpoint}', status={self.status_code})>"
