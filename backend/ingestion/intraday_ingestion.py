"""
Intraday Data Ingestion Pipeline (Phase 3D)

Fetches minute-level OHLCV data from EODHD API and stores in TimescaleDB.
Supports real-time ingestion during market hours.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from database.models.intraday_data import IntradayOHLCV
from database.config import SessionLocal
from tools.eodhd_client import EODHDClient
from core.config import settings

logger = logging.getLogger(__name__)


class IntradayIngestionPipeline:
    """
    Pipeline for ingesting minute-level intraday data.

    Features:
    - Fetch data from EODHD API
    - Store in TimescaleDB with deduplication
    - Support for multiple intervals (1m, 5m, 15m, 1h)
    - Incremental updates during market hours
    - Error handling and retry logic
    """

    def __init__(self):
        self.client = EODHDClient()
        self.supported_intervals = ['1m', '5m', '15m', '30m', '1h']

    async def ingest_intraday_data(
        self,
        ticker: str,
        interval: str = '5m',
        from_timestamp: Optional[int] = None,
        to_timestamp: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Ingest intraday data for a single ticker.

        Args:
            ticker: Stock ticker (e.g., 'AAPL.US')
            interval: Time interval ('1m', '5m', '15m', '30m', '1h')
            from_timestamp: Unix timestamp start (optional)
            to_timestamp: Unix timestamp end (optional)

        Returns:
            Dictionary with ingestion statistics
        """
        if interval not in self.supported_intervals:
            raise ValueError(f"Interval must be one of {self.supported_intervals}")

        # Validate ticker format
        if '.' not in ticker:
            ticker = f"{ticker}.US"

        logger.info(f"[INTRADAY_INGESTION] Starting ingestion for {ticker} ({interval})")

        try:
            # Fetch data from API
            data = await self._fetch_intraday_data(
                ticker, interval, from_timestamp, to_timestamp
            )

            if not data:
                logger.warning(f"[INTRADAY_INGESTION] No data returned for {ticker}")
                return {
                    'ticker': ticker,
                    'interval': interval,
                    'records_fetched': 0,
                    'records_inserted': 0,
                    'records_updated': 0,
                    'status': 'no_data'
                }

            # Store data in database
            stats = await self._store_intraday_data(ticker, interval, data)

            logger.info(
                f"[INTRADAY_INGESTION] Completed {ticker}: "
                f"{stats['records_inserted']} inserted, "
                f"{stats['records_updated']} updated"
            )

            return stats

        except Exception as e:
            logger.error(f"[INTRADAY_INGESTION] Error for {ticker}: {e}")
            return {
                'ticker': ticker,
                'interval': interval,
                'status': 'error',
                'error': str(e)
            }

    async def _fetch_intraday_data(
        self,
        ticker: str,
        interval: str,
        from_timestamp: Optional[int],
        to_timestamp: Optional[int]
    ) -> List[Dict[str, Any]]:
        """
        Fetch intraday data from EODHD API.

        Returns list of candles with structure:
        [
            {
                "datetime": "2024-01-15 09:30:00",
                "timestamp": 1705324200,
                "open": 180.25,
                "high": 180.75,
                "low": 180.10,
                "close": 180.50,
                "volume": 1250000
            },
            ...
        ]
        """
        try:
            # Use EODHD client to fetch intraday data
            response = self.client.historical.get_intraday(
                ticker,
                interval=interval,
                from_timestamp=from_timestamp,
                to_timestamp=to_timestamp
            )

            # Handle different response formats
            if isinstance(response, dict):
                data = response.get('data', response)
            elif isinstance(response, list):
                data = response
            else:
                logger.error(f"Unexpected response type: {type(response)}")
                return []

            if not data:
                return []

            # Normalize data format
            candles = []
            for item in data:
                # Convert to standard format
                candle = {
                    'datetime': item.get('datetime') or item.get('timestamp') or item.get('date'),
                    'open': float(item.get('open', 0)),
                    'high': float(item.get('high', 0)),
                    'low': float(item.get('low', 0)),
                    'close': float(item.get('close', 0)),
                    'volume': int(item.get('volume', 0)),
                }
                candles.append(candle)

            return candles

        except Exception as e:
            logger.error(f"Error fetching intraday data for {ticker}: {e}")
            return []

    async def _store_intraday_data(
        self,
        ticker: str,
        interval: str,
        data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Store intraday data in TimescaleDB with upsert logic.

        Returns:
            Statistics dictionary
        """
        session: Session = SessionLocal()
        records_inserted = 0
        records_updated = 0

        try:
            for candle in data:
                # Parse timestamp
                timestamp_str = candle['datetime']
                try:
                    # Try parsing with timezone
                    if '+' in timestamp_str or 'Z' in timestamp_str:
                        timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                    else:
                        # Assume US Eastern Time for US stocks
                        timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                        # Convert to timezone-aware (ET)
                        from pytz import timezone as pytz_timezone
                        et = pytz_timezone('America/New_York')
                        timestamp = et.localize(timestamp)
                except Exception as e:
                    logger.error(f"Error parsing timestamp '{timestamp_str}': {e}")
                    continue

                # Check if record already exists
                existing = session.execute(
                    select(IntradayOHLCV).where(
                        and_(
                            IntradayOHLCV.ticker == ticker,
                            IntradayOHLCV.timestamp == timestamp,
                            IntradayOHLCV.interval == interval
                        )
                    )
                ).scalar_one_or_none()

                if existing:
                    # Update existing record
                    existing.open = candle['open']
                    existing.high = candle['high']
                    existing.low = candle['low']
                    existing.close = candle['close']
                    existing.volume = candle['volume']
                    existing.ingested_at = datetime.now(timezone.utc)
                    records_updated += 1
                else:
                    # Insert new record
                    new_record = IntradayOHLCV(
                        ticker=ticker,
                        timestamp=timestamp,
                        interval=interval,
                        open=candle['open'],
                        high=candle['high'],
                        low=candle['low'],
                        close=candle['close'],
                        volume=candle['volume'],
                        source='eodhd',
                        ingested_at=datetime.now(timezone.utc)
                    )
                    session.add(new_record)
                    records_inserted += 1

            # Commit all changes
            session.commit()

            return {
                'ticker': ticker,
                'interval': interval,
                'records_fetched': len(data),
                'records_inserted': records_inserted,
                'records_updated': records_updated,
                'status': 'success'
            }

        except Exception as e:
            session.rollback()
            logger.error(f"Error storing intraday data for {ticker}: {e}")
            raise

        finally:
            session.close()

    async def ingest_multiple_tickers(
        self,
        tickers: List[str],
        interval: str = '5m',
        from_timestamp: Optional[int] = None,
        to_timestamp: Optional[int] = None,
        batch_size: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Ingest intraday data for multiple tickers concurrently.

        Args:
            tickers: List of tickers to ingest
            interval: Time interval
            from_timestamp: Unix timestamp start
            to_timestamp: Unix timestamp end
            batch_size: Number of concurrent requests

        Returns:
            List of ingestion statistics for each ticker
        """
        results = []

        # Process in batches to avoid overwhelming the API
        for i in range(0, len(tickers), batch_size):
            batch = tickers[i:i + batch_size]
            logger.info(f"[INTRADAY_INGESTION] Processing batch {i // batch_size + 1}: {batch}")

            # Create tasks for concurrent execution
            tasks = [
                self.ingest_intraday_data(ticker, interval, from_timestamp, to_timestamp)
                for ticker in batch
            ]

            # Execute concurrently
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)

            for result in batch_results:
                if isinstance(result, Exception):
                    logger.error(f"Batch task failed: {result}")
                    results.append({
                        'status': 'error',
                        'error': str(result)
                    })
                else:
                    results.append(result)

            # Rate limiting: wait between batches
            if i + batch_size < len(tickers):
                await asyncio.sleep(1)

        return results

    async def ingest_today_data(
        self,
        tickers: List[str],
        interval: str = '5m'
    ) -> List[Dict[str, Any]]:
        """
        Ingest today's intraday data for given tickers.
        Useful for daily refresh during/after market hours.

        Args:
            tickers: List of tickers
            interval: Time interval

        Returns:
            List of ingestion statistics
        """
        # Get today's date range (market open to now)
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=13, minute=30, second=0, microsecond=0)  # 9:30 AM ET = 13:30 UTC
        today_end = now

        # Convert to Unix timestamps
        from_timestamp = int(today_start.timestamp())
        to_timestamp = int(today_end.timestamp())

        logger.info(
            f"[INTRADAY_INGESTION] Ingesting today's data from "
            f"{today_start} to {today_end}"
        )

        return await self.ingest_multiple_tickers(
            tickers,
            interval,
            from_timestamp,
            to_timestamp
        )


# CLI utility function
async def run_intraday_ingestion_cli():
    """
    Command-line interface for manual ingestion.

    Usage:
        python -m ingestion.intraday_ingestion
    """
    import argparse

    parser = argparse.ArgumentParser(description='Ingest intraday data')
    parser.add_argument('tickers', nargs='+', help='Tickers to ingest (e.g., AAPL MSFT)')
    parser.add_argument('--interval', default='5m', choices=['1m', '5m', '15m', '30m', '1h'])
    parser.add_argument('--from-timestamp', type=int, help='Start Unix timestamp')
    parser.add_argument('--to-timestamp', type=int, help='End Unix timestamp')

    args = parser.parse_args()

    pipeline = IntradayIngestionPipeline()

    results = await pipeline.ingest_multiple_tickers(
        args.tickers,
        args.interval,
        args.from_timestamp,
        args.to_timestamp
    )

    # Print summary
    print("\nIngestion Summary:")
    print("-" * 80)
    for result in results:
        print(f"Ticker: {result.get('ticker', 'N/A')}")
        print(f"  Status: {result.get('status', 'N/A')}")
        print(f"  Inserted: {result.get('records_inserted', 0)}")
        print(f"  Updated: {result.get('records_updated', 0)}")
        if 'error' in result:
            print(f"  Error: {result['error']}")
        print()


if __name__ == '__main__':
    # Enable logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    asyncio.run(run_intraday_ingestion_cli())
