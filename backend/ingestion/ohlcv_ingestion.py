"""
OHLCV Data Ingestion Pipeline

Security:
- Input validation with Pydantic
- Secure API communication
- No credentials in logs

Robustness:
- Bulk insert optimization (100x faster)
- Duplicate detection (UPSERT)
- Transaction rollback on errors
- Data validation before insertion
- Progress tracking
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, date
from pydantic import BaseModel, Field, validator
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from database.models.base import SessionLocal
from database.models.company import Company
from database.models.market_data import OHLCV
from .base_ingestion import BaseIngestion

logger = logging.getLogger(__name__)


class OHLCVRecord(BaseModel):
    """
    Validated OHLCV record

    Security: Type validation prevents injection
    Robustness: Data validation prevents bad data
    """
    date: date
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: float  # Close is required
    volume: Optional[int] = None
    adjusted_close: Optional[float] = None

    @validator('open', 'high', 'low', 'close', 'adjusted_close')
    def validate_price(cls, v):
        """Validate price values"""
        if v is not None and v < 0:
            raise ValueError("Price cannot be negative")
        return v

    @validator('volume')
    def validate_volume(cls, v):
        """Validate volume"""
        if v is not None and v < 0:
            raise ValueError("Volume cannot be negative")
        return v

    class Config:
        # Allow date objects
        arbitrary_types_allowed = True


class OHLCVIngestion(BaseIngestion):
    """
    OHLCV data ingestion pipeline

    Features:
    - Bulk insert optimization (100-1000 records at once)
    - UPSERT (insert or update on conflict)
    - Data validation
    - Progress tracking
    - Transaction management
    """

    def __init__(self, api_key: str, batch_size: int = 500):
        """
        Initialize OHLCV ingestion

        Args:
            api_key: EODHD API key
            batch_size: Number of records to insert per batch
        """
        super().__init__(api_key=api_key, api_name="EODHD")
        self.batch_size = batch_size
        self.base_url = "https://eodhistoricaldata.com/api"

    def fetch_historical_data(
        self,
        ticker: str,
        from_date: str,
        to_date: str
    ) -> List[Dict[str, Any]]:
        """
        Fetch historical OHLCV data from API

        Args:
            ticker: Ticker symbol (e.g., 'AAPL.US')
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)

        Returns:
            List of OHLCV records

        Raises:
            ValueError: If dates are invalid
            RateLimitExceeded: If rate limit exceeded
            RequestException: If API request fails
        """
        # Validate ticker
        ticker = self._validate_ticker(ticker)

        # Validate dates
        try:
            from_date_obj = datetime.strptime(from_date, '%Y-%m-%d')
            to_date_obj = datetime.strptime(to_date, '%Y-%m-%d')

            if from_date_obj > to_date_obj:
                raise ValueError("from_date must be before to_date")

        except ValueError as e:
            raise ValueError(f"Invalid date format (expected YYYY-MM-DD): {e}")

        # Build URL
        url = f"{self.base_url}/eod/{ticker}"
        params = {
            'from': from_date,
            'to': to_date,
            'period': 'd',  # Daily data
            'fmt': 'json'
        }

        logger.info(f"Fetching OHLCV: {ticker} from {from_date} to {to_date}")

        # Make request
        response = self._make_request(url, params)
        data = response.json()

        if not isinstance(data, list):
            raise ValueError(f"Unexpected API response format: {type(data)}")

        logger.info(f"Fetched {len(data)} OHLCV records for {ticker}")
        return data

    def validate_records(
        self,
        raw_data: List[Dict[str, Any]]
    ) -> List[OHLCVRecord]:
        """
        Validate and clean OHLCV records

        Args:
            raw_data: Raw API data

        Returns:
            List of validated OHLCVRecord objects

        Robustness:
        - Skip invalid records instead of failing entire batch
        - Log validation errors
        """
        validated = []
        errors = []

        for i, record in enumerate(raw_data):
            try:
                # Parse date
                date_str = record.get('date')
                if not date_str:
                    raise ValueError("Missing date field")

                date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()

                # Create validated record
                validated_record = OHLCVRecord(
                    date=date_obj,
                    open=record.get('open'),
                    high=record.get('high'),
                    low=record.get('low'),
                    close=record.get('close'),
                    volume=record.get('volume'),
                    adjusted_close=record.get('adjusted_close')
                )
                validated.append(validated_record)

            except Exception as e:
                errors.append((i, str(e)))
                logger.warning(f"Skipping invalid record {i}: {e}")

        if errors:
            logger.warning(
                f"Skipped {len(errors)}/{len(raw_data)} invalid records"
            )

        logger.info(f"Validated {len(validated)}/{len(raw_data)} records")
        return validated

    def bulk_insert(
        self,
        db: Session,
        company_id: int,
        records: List[OHLCVRecord],
        on_conflict: str = 'update'
    ) -> Dict[str, int]:
        """
        Bulk insert OHLCV records with UPSERT

        Args:
            db: Database session
            company_id: Company ID
            records: Validated OHLCV records
            on_conflict: 'update' or 'skip' on duplicate

        Returns:
            Dict with 'inserted' and 'updated' counts

        Performance:
        - Batch inserts (100-1000x faster than individual inserts)
        - UPSERT prevents duplicate errors

        Security:
        - Uses SQLAlchemy ORM (prevents SQL injection)
        - Parameterized queries
        """
        if not records:
            return {'inserted': 0, 'updated': 0}

        inserted = 0
        updated = 0

        # Process in batches
        for i in range(0, len(records), self.batch_size):
            batch = records[i:i + self.batch_size]

            # Prepare bulk insert data
            values = [
                {
                    'company_id': company_id,
                    'date': record.date,
                    'open': record.open,
                    'high': record.high,
                    'low': record.low,
                    'close': record.close,
                    'volume': record.volume,
                    'adjusted_close': record.adjusted_close
                }
                for record in batch
            ]

            # PostgreSQL UPSERT (INSERT ... ON CONFLICT DO UPDATE)
            stmt = insert(OHLCV).values(values)

            if on_conflict == 'update':
                # Update all fields on conflict
                stmt = stmt.on_conflict_do_update(
                    index_elements=['company_id', 'date'],
                    set_={
                        'open': stmt.excluded.open,
                        'high': stmt.excluded.high,
                        'low': stmt.excluded.low,
                        'close': stmt.excluded.close,
                        'volume': stmt.excluded.volume,
                        'adjusted_close': stmt.excluded.adjusted_close
                    }
                )
                updated += len(batch)
            else:
                # Skip on conflict
                stmt = stmt.on_conflict_do_nothing(
                    index_elements=['company_id', 'date']
                )
                inserted += len(batch)

            db.execute(stmt)
            db.commit()

            logger.info(
                f"Batch {i // self.batch_size + 1}: "
                f"Processed {len(batch)} records"
            )

        return {'inserted': inserted, 'updated': updated}

    def ingest_ticker(
        self,
        ticker: str,
        from_date: str,
        to_date: str,
        on_conflict: str = 'update'
    ) -> Dict[str, Any]:
        """
        Complete ingestion pipeline for one ticker

        Args:
            ticker: Ticker symbol (e.g., 'AAPL.US')
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)
            on_conflict: 'update' or 'skip' on duplicate

        Returns:
            Dict with ingestion statistics

        Robustness:
        - Transaction rollback on errors
        - Progress logging
        - Detailed error messages
        """
        db = SessionLocal()
        ingestion_log = None

        try:
            # Validate ticker
            ticker = self._validate_ticker(ticker)

            # Get company from database
            company = db.query(Company).filter(
                Company.ticker == ticker
            ).first()

            if not company:
                raise ValueError(f"Company not found: {ticker}")

            # Create ingestion log
            ingestion_log = self._create_ingestion_log(
                db=db,
                job_type='ohlcv',
                company_id=company.id
            )

            logger.info(f"Starting OHLCV ingestion: {ticker}")

            # Fetch data from API
            raw_data = self.fetch_historical_data(ticker, from_date, to_date)

            # Validate records
            validated_records = self.validate_records(raw_data)

            if not validated_records:
                raise ValueError("No valid records to insert")

            # Bulk insert
            result = self.bulk_insert(
                db=db,
                company_id=company.id,
                records=validated_records,
                on_conflict=on_conflict
            )

            # Complete log
            self._complete_ingestion_log(
                db=db,
                log=ingestion_log,
                status='success',
                records_processed=len(raw_data),
                records_inserted=result['inserted'],
                records_updated=result['updated']
            )

            logger.info(
                f"✅ OHLCV ingestion complete: {ticker} - "
                f"{result['inserted']} inserted, {result['updated']} updated"
            )

            return {
                'ticker': ticker,
                'status': 'success',
                'records_fetched': len(raw_data),
                'records_validated': len(validated_records),
                'records_inserted': result['inserted'],
                'records_updated': result['updated']
            }

        except Exception as e:
            logger.error(f"❌ OHLCV ingestion failed: {ticker} - {str(e)}")

            # Rollback transaction
            db.rollback()

            # Complete log with error
            if ingestion_log:
                self._complete_ingestion_log(
                    db=db,
                    log=ingestion_log,
                    status='failed',
                    error_message=str(e)[:1000]
                )

            return {
                'ticker': ticker,
                'status': 'failed',
                'error': str(e)
            }

        finally:
            db.close()

    def ingest_multiple_tickers(
        self,
        tickers: List[str],
        from_date: str,
        to_date: str,
        on_conflict: str = 'update',
        fail_fast: bool = False
    ) -> Dict[str, Any]:
        """
        Ingest multiple tickers

        Args:
            tickers: List of ticker symbols
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)
            on_conflict: 'update' or 'skip' on duplicate
            fail_fast: Stop on first failure if True

        Returns:
            Dict with overall statistics

        Robustness:
        - Continue on individual ticker failures (if fail_fast=False)
        - Aggregate statistics
        - Detailed error reporting
        """
        results = []
        success_count = 0
        failure_count = 0

        logger.info(f"Starting bulk OHLCV ingestion: {len(tickers)} tickers")

        for i, ticker in enumerate(tickers, 1):
            logger.info(f"Processing ticker {i}/{len(tickers)}: {ticker}")

            result = self.ingest_ticker(ticker, from_date, to_date, on_conflict)
            results.append(result)

            if result['status'] == 'success':
                success_count += 1
            else:
                failure_count += 1
                if fail_fast:
                    logger.error("Stopping due to failure (fail_fast=True)")
                    break

        logger.info(
            f"✅ Bulk ingestion complete: "
            f"{success_count} succeeded, {failure_count} failed"
        )

        return {
            'total': len(tickers),
            'success': success_count,
            'failed': failure_count,
            'results': results
        }
