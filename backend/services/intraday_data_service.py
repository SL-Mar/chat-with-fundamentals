"""
Intraday data service with database-first, API-fallback strategy
Supports multiple timeframes: 1m, 5m, 15m, 1h
"""

import os
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import logging
import requests
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_

from database.models.intraday_models import IntradayOHLCV, IntradayDataStatus
from database.config_multi import get_multi_db_config

logger = logging.getLogger(__name__)

# Supported timeframes
VALID_TIMEFRAMES = ['1m', '5m', '15m', '1h']

# API configuration
EODHD_API_KEY = os.getenv('EODHD_API_KEY', '67545463280a10.78461538')
EODHD_INTRADAY_URL = 'https://eodhd.com/api/intraday/{ticker_with_exchange}'

def get_ticker_with_exchange(ticker: str) -> str:
    """Add appropriate exchange suffix to ticker if needed."""
    if '.' in ticker:
        return ticker

    # Detect currency pairs (6 chars, all uppercase)
    if len(ticker) == 6 and ticker.isupper():
        return f"{ticker}.FOREX"

    return f"{ticker}.US"


class IntradayDataService:
    """
    Service for managing intraday data with smart caching

    Strategy:
    1. Check database first
    2. If data missing or stale, fetch from API
    3. Store in database for future use
    """

    def __init__(self, db: Session):
        self.db = db

    def get_intraday_data(
        self,
        ticker: str,
        timeframe: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        force_refresh: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get intraday data for a ticker

        Args:
            ticker: Stock ticker symbol
            timeframe: '1m', '5m', '15m', '1h'
            start_date: Start date (default: 7 days ago)
            end_date: End date (default: now)
            force_refresh: Force API fetch even if data exists

        Returns:
            List of OHLCV dictionaries
        """
        # Validate timeframe
        if timeframe not in VALID_TIMEFRAMES:
            raise ValueError(f"Invalid timeframe. Must be one of {VALID_TIMEFRAMES}")

        ticker = ticker.upper()

        # Default date range
        if not end_date:
            end_date = datetime.now()
        if not start_date:
            start_date = end_date - timedelta(days=7)

        # Strategy: Database first, API fallback
        if not force_refresh:
            db_data = self._fetch_from_database(ticker, timeframe, start_date, end_date)

            # Check if we have sufficient data
            if self._is_data_sufficient(db_data, start_date, end_date):
                logger.info(f"Retrieved {len(db_data)} {timeframe} records for {ticker} from database")
                return [record.to_dict() for record in db_data]

            logger.info(f"Database data insufficient for {ticker} {timeframe}, fetching from API")

        # Fetch from API
        api_data = self._fetch_from_api(ticker, timeframe, start_date, end_date)

        if api_data:
            # Store in database
            self._store_in_database(ticker, timeframe, api_data)
            logger.info(f"Stored {len(api_data)} {timeframe} records for {ticker} in database")
            return api_data

        # Fallback: return whatever we have from database
        db_data = self._fetch_from_database(ticker, timeframe, start_date, end_date)
        logger.warning(f"API fetch failed, returning {len(db_data)} database records for {ticker} {timeframe}")
        return [record.to_dict() for record in db_data]

    def _fetch_from_database(
        self,
        ticker: str,
        timeframe: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[IntradayOHLCV]:
        """Fetch data from database"""
        try:
            query = self.db.query(IntradayOHLCV).filter(
                and_(
                    IntradayOHLCV.ticker == ticker,
                    IntradayOHLCV.timeframe == timeframe,
                    IntradayOHLCV.timestamp >= start_date,
                    IntradayOHLCV.timestamp <= end_date
                )
            ).order_by(IntradayOHLCV.timestamp)

            return query.all()
        except Exception as e:
            logger.error(f"Database query failed for {ticker} {timeframe}: {e}")
            return []

    def _is_data_sufficient(
        self,
        data: List[IntradayOHLCV],
        start_date: datetime,
        end_date: datetime
    ) -> bool:
        """
        Check if database data is sufficient

        Criteria:
        - Has data
        - Covers the requested time range (within 1 hour tolerance)
        """
        if not data:
            return False

        # Check date coverage
        first_timestamp = data[0].timestamp
        last_timestamp = data[-1].timestamp

        tolerance = timedelta(hours=1)

        start_covered = abs(first_timestamp - start_date) <= tolerance
        end_covered = abs(last_timestamp - end_date) <= tolerance

        return start_covered and end_covered

    def _fetch_from_api(
        self,
        ticker: str,
        timeframe: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Fetch data from EODHD API"""
        try:
            # Map timeframe to API interval
            interval_map = {
                '1m': '1m',
                '5m': '5m',
                '15m': '15m',
                '1h': '1h'
            }
            interval = interval_map[timeframe]

            # Build API request with proper exchange suffix
            ticker_with_exchange = get_ticker_with_exchange(ticker)
            url = EODHD_INTRADAY_URL.format(ticker_with_exchange=ticker_with_exchange)
            params = {
                'api_token': EODHD_API_KEY,
                'interval': interval,
                'from': int(start_date.timestamp()),
                'to': int(end_date.timestamp()),
                'fmt': 'json'
            }

            logger.info(f"Fetching {ticker} {timeframe} from API: {start_date} to {end_date}")
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()

            api_data = response.json()

            # Check if API returned an error or empty response
            if not api_data or not isinstance(api_data, list):
                logger.warning(f"API returned empty or invalid data for {ticker} {timeframe}")
                return []

            # Transform to standard format
            result = []
            for item in api_data:
                # Skip items with missing critical fields
                if not item.get('timestamp') or not item.get('close'):
                    continue

                try:
                    # Handle volume (may be None for currency pairs)
                    volume_raw = item.get('volume')
                    volume = int(volume_raw) if volume_raw is not None else 0

                    result.append({
                        'ticker': ticker,
                        'timeframe': timeframe,
                        'timestamp': datetime.fromtimestamp(item['timestamp']),
                        'open': float(item.get('open', 0)),
                        'high': float(item.get('high', 0)),
                        'low': float(item.get('low', 0)),
                        'close': float(item['close']),
                        'volume': volume,
                    })
                except (ValueError, TypeError) as e:
                    logger.warning(f"Skipping invalid record for {ticker}: {e}")
                    continue

            logger.info(f"Processed {len(result)} valid records from API for {ticker} {timeframe}")
            return result

        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed for {ticker} {timeframe}: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error fetching {ticker} {timeframe} from API: {e}")
            return []

    def _store_in_database(
        self,
        ticker: str,
        timeframe: str,
        data: List[Dict[str, Any]]
    ):
        """Store API data in database"""
        if not data:
            return

        try:
            # Insert records (upsert logic: delete existing, insert new)
            timestamps = [item['timestamp'] for item in data]
            start_ts = min(timestamps)
            end_ts = max(timestamps)

            # Delete overlapping records
            self.db.query(IntradayOHLCV).filter(
                and_(
                    IntradayOHLCV.ticker == ticker,
                    IntradayOHLCV.timeframe == timeframe,
                    IntradayOHLCV.timestamp >= start_ts,
                    IntradayOHLCV.timestamp <= end_ts
                )
            ).delete()

            # Insert new records
            records = [IntradayOHLCV(**item) for item in data]
            self.db.bulk_save_objects(records)

            # Update status tracking
            self._update_data_status(ticker, timeframe)

            self.db.commit()
            logger.info(f"Stored {len(records)} {timeframe} records for {ticker}")

        except Exception as e:
            logger.error(f"Failed to store {ticker} {timeframe} in database: {e}")
            self.db.rollback()

    def _update_data_status(self, ticker: str, timeframe: str):
        """Update data status tracking"""
        try:
            # Calculate stats
            stats = self.db.query(
                IntradayOHLCV.ticker,
                IntradayOHLCV.timeframe,
            ).filter(
                and_(
                    IntradayOHLCV.ticker == ticker,
                    IntradayOHLCV.timeframe == timeframe
                )
            ).first()

            if not stats:
                return

            # Get first and last timestamps
            first_record = self.db.query(IntradayOHLCV).filter(
                and_(
                    IntradayOHLCV.ticker == ticker,
                    IntradayOHLCV.timeframe == timeframe
                )
            ).order_by(IntradayOHLCV.timestamp).first()

            last_record = self.db.query(IntradayOHLCV).filter(
                and_(
                    IntradayOHLCV.ticker == ticker,
                    IntradayOHLCV.timeframe == timeframe
                )
            ).order_by(desc(IntradayOHLCV.timestamp)).first()

            # Count total records
            total = self.db.query(IntradayOHLCV).filter(
                and_(
                    IntradayOHLCV.ticker == ticker,
                    IntradayOHLCV.timeframe == timeframe
                )
            ).count()

            # Upsert status
            status = self.db.query(IntradayDataStatus).filter(
                and_(
                    IntradayDataStatus.ticker == ticker,
                    IntradayDataStatus.timeframe == timeframe
                )
            ).first()

            if status:
                status.first_timestamp = first_record.timestamp if first_record else None
                status.last_timestamp = last_record.timestamp if last_record else None
                status.total_records = total
                status.last_fetched_at = datetime.now()
            else:
                status = IntradayDataStatus(
                    ticker=ticker,
                    timeframe=timeframe,
                    first_timestamp=first_record.timestamp if first_record else None,
                    last_timestamp=last_record.timestamp if last_record else None,
                    total_records=total,
                    last_fetched_at=datetime.now()
                )
                self.db.add(status)

            self.db.commit()

        except Exception as e:
            logger.error(f"Failed to update status for {ticker} {timeframe}: {e}")
            self.db.rollback()

    def get_data_status(self, ticker: str, timeframe: str) -> Optional[Dict[str, Any]]:
        """Get status of available data for a ticker/timeframe"""
        ticker = ticker.upper()

        if timeframe not in VALID_TIMEFRAMES:
            raise ValueError(f"Invalid timeframe. Must be one of {VALID_TIMEFRAMES}")

        try:
            status = self.db.query(IntradayDataStatus).filter(
                and_(
                    IntradayDataStatus.ticker == ticker,
                    IntradayDataStatus.timeframe == timeframe
                )
            ).first()

            return status.to_dict() if status else None

        except Exception as e:
            logger.error(f"Failed to get status for {ticker} {timeframe}: {e}")
            return None

    def get_available_timeframes(self, ticker: str) -> List[str]:
        """Get list of timeframes with available data for a ticker"""
        ticker = ticker.upper()

        try:
            statuses = self.db.query(IntradayDataStatus).filter(
                IntradayDataStatus.ticker == ticker
            ).all()

            return [status.timeframe for status in statuses]

        except Exception as e:
            logger.error(f"Failed to get available timeframes for {ticker}: {e}")
            return []
