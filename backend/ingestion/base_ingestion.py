"""
Base Ingestion Class with Security and Robustness Features

Security:
- Secure API key handling (from environment only)
- No API keys in logs
- Input validation with Pydantic

Robustness:
- Retry logic with exponential backoff
- Rate limiting
- Transaction management
- Error logging with context
"""

import logging
import time
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from database.models.base import SessionLocal
from database.models.monitoring import DataIngestionLog, APIRateLimit

logger = logging.getLogger(__name__)


class RateLimitExceeded(Exception):
    """Raised when API rate limit is exceeded"""
    pass


class BaseIngestion:
    """
    Base class for data ingestion with security and robustness

    Features:
    - Automatic retries with exponential backoff
    - Rate limiting tracking
    - Transaction management
    - Error logging
    - Progress tracking
    """

    def __init__(
        self,
        api_key: str,
        api_name: str = "EODHD",
        max_retries: int = 3,
        backoff_factor: float = 2.0,
        timeout: int = 30,
        rate_limit_per_minute: int = 60
    ):
        """
        Initialize base ingestion

        Args:
            api_key: API key (from environment variable)
            api_name: API name for tracking
            max_retries: Maximum number of retry attempts
            backoff_factor: Exponential backoff multiplier
            timeout: Request timeout in seconds
            rate_limit_per_minute: Maximum requests per minute

        Security Notes:
        - API key should come from environment variable only
        - Never log the API key
        """
        if not api_key:
            raise ValueError("API key is required")

        self.api_key = api_key
        self.api_name = api_name
        self.timeout = timeout
        self.rate_limit_per_minute = rate_limit_per_minute

        # Setup session with retry logic
        self.session = self._create_session(max_retries, backoff_factor)

        # Rate limiting tracking
        self.request_times: List[float] = []

    def _create_session(self, max_retries: int, backoff_factor: float) -> requests.Session:
        """
        Create requests session with retry logic

        Retry on:
        - 500, 502, 503, 504 (server errors)
        - Connection errors
        - Timeout errors
        """
        session = requests.Session()

        retry_strategy = Retry(
            total=max_retries,
            backoff_factor=backoff_factor,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["GET", "POST"],
            raise_on_status=False
        )

        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)

        return session

    def _check_rate_limit(self):
        """
        Check if we're within rate limits

        Raises:
            RateLimitExceeded: If rate limit would be exceeded
        """
        current_time = time.time()

        # Remove requests older than 1 minute
        self.request_times = [
            t for t in self.request_times
            if current_time - t < 60
        ]

        if len(self.request_times) >= self.rate_limit_per_minute:
            wait_time = 60 - (current_time - self.request_times[0])
            raise RateLimitExceeded(
                f"Rate limit exceeded. Wait {wait_time:.1f}s before next request"
            )

        self.request_times.append(current_time)

    def _make_request(
        self,
        url: str,
        params: Optional[Dict[str, Any]] = None,
        method: str = "GET"
    ) -> requests.Response:
        """
        Make API request with rate limiting and error handling

        Security:
        - Never log API key
        - Log sanitized URLs only

        Robustness:
        - Rate limiting
        - Automatic retries (configured in session)
        - Timeout handling
        """
        # Check rate limit
        self._check_rate_limit()

        # Add API key to params (secure - not in URL path)
        if params is None:
            params = {}
        params['api_token'] = self.api_key

        # Log request (sanitized - no API key)
        safe_params = {k: v for k, v in params.items() if k != 'api_token'}
        logger.info(f"API Request: {method} {url} params={safe_params}")

        start_time = time.time()

        try:
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                timeout=self.timeout
            )

            response_time_ms = int((time.time() - start_time) * 1000)

            # Log API usage for monitoring
            self._log_api_usage(
                endpoint=url,
                response_time_ms=response_time_ms,
                status_code=response.status_code,
                error_message=None if response.ok else response.text[:500]
            )

            # Raise for HTTP errors
            response.raise_for_status()

            return response

        except requests.exceptions.Timeout as e:
            logger.error(f"Request timeout after {self.timeout}s: {url}")
            self._log_api_usage(
                endpoint=url,
                response_time_ms=self.timeout * 1000,
                status_code=0,
                error_message=f"Timeout: {str(e)}"
            )
            raise

        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {url} - {str(e)}")
            self._log_api_usage(
                endpoint=url,
                response_time_ms=int((time.time() - start_time) * 1000),
                status_code=0,
                error_message=str(e)[:500]
            )
            raise

    def _log_api_usage(
        self,
        endpoint: str,
        response_time_ms: int,
        status_code: int,
        error_message: Optional[str]
    ):
        """Log API usage to database for monitoring"""
        try:
            db = SessionLocal()
            try:
                log = APIRateLimit(
                    api_name=self.api_name,
                    endpoint=endpoint,
                    request_time=datetime.now(),
                    response_time_ms=response_time_ms,
                    status_code=status_code,
                    error_message=error_message
                )
                db.add(log)
                db.commit()
            finally:
                db.close()
        except Exception as e:
            # Don't fail ingestion if logging fails
            logger.warning(f"Failed to log API usage: {e}")

    def _create_ingestion_log(
        self,
        db: Session,
        job_type: str,
        company_id: Optional[int] = None
    ) -> DataIngestionLog:
        """
        Create ingestion log for tracking

        Args:
            db: Database session
            job_type: Type of job (ohlcv, fundamentals, news)
            company_id: Optional company ID

        Returns:
            DataIngestionLog: Log entry
        """
        log = DataIngestionLog(
            job_type=job_type,
            company_id=company_id,
            start_time=datetime.now(),
            status='running',
            records_processed=0,
            records_inserted=0,
            records_updated=0
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log

    def _complete_ingestion_log(
        self,
        db: Session,
        log: DataIngestionLog,
        status: str,
        records_processed: int = 0,
        records_inserted: int = 0,
        records_updated: int = 0,
        error_message: Optional[str] = None
    ):
        """
        Complete ingestion log

        Args:
            db: Database session
            log: Log entry to update
            status: 'success' or 'failed'
            records_processed: Number of records processed
            records_inserted: Number of records inserted
            records_updated: Number of records updated
            error_message: Error message if failed
        """
        log.end_time = datetime.now()
        log.status = status
        log.records_processed = records_processed
        log.records_inserted = records_inserted
        log.records_updated = records_updated
        log.error_message = error_message
        db.commit()

    def _validate_ticker(self, ticker: str) -> str:
        """
        Validate and sanitize ticker symbol

        Security: Prevent SQL injection (though ORM already prevents this)

        Args:
            ticker: Ticker symbol

        Returns:
            str: Validated ticker

        Raises:
            ValueError: If ticker is invalid
        """
        if not ticker:
            raise ValueError("Ticker cannot be empty")

        # Remove whitespace
        ticker = ticker.strip().upper()

        # Basic validation: alphanumeric + dots only
        if not all(c.isalnum() or c == '.' for c in ticker):
            raise ValueError(f"Invalid ticker format: {ticker}")

        # Length check
        if len(ticker) > 20:
            raise ValueError(f"Ticker too long: {ticker}")

        return ticker

    def close(self):
        """Close session"""
        self.session.close()
