"""
Insider Transactions Data Ingestion
Fetches and stores insider trading data in database
"""

from datetime import datetime, date
from typing import List, Dict, Any, Optional
import logging
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from pydantic import BaseModel, validator, ValidationError

from database.models.financial import InsiderTransaction
from ingestion.base_ingestion import BaseIngestion

logger = logging.getLogger("insider_ingestion")


class InsiderTransactionRecord(BaseModel):
    """Validated insider transaction record"""

    transaction_date: date
    owner_name: str
    transaction_type: str
    shares: Optional[int] = None
    price_per_share: Optional[float] = None
    transaction_value: Optional[float] = None
    shares_owned_after: Optional[int] = None

    @validator('transaction_date', pre=True)
    def parse_date(cls, v):
        """Parse date string to date object"""
        if isinstance(v, str):
            # Try multiple date formats
            for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%Y%m%d']:
                try:
                    return datetime.strptime(v, fmt).date()
                except ValueError:
                    continue
            raise ValueError(f"Invalid date format: {v}")
        return v

    @validator('transaction_type')
    def validate_transaction_type(cls, v):
        """Validate transaction type"""
        valid_types = ['Buy', 'Sell', 'Option Exercise', 'Gift', 'Award', 'Other']
        if v not in valid_types:
            # Try to map common variations
            v_lower = v.lower()
            if 'buy' in v_lower or 'purchase' in v_lower:
                return 'Buy'
            elif 'sell' in v_lower or 'sale' in v_lower:
                return 'Sell'
            elif 'option' in v_lower or 'exercise' in v_lower:
                return 'Option Exercise'
            elif 'gift' in v_lower:
                return 'Gift'
            elif 'award' in v_lower or 'grant' in v_lower:
                return 'Award'
            else:
                return 'Other'
        return v

    @validator('shares', 'shares_owned_after')
    def validate_shares(cls, v):
        """Ensure shares are non-negative"""
        if v is not None and v < 0:
            raise ValueError("Shares cannot be negative")
        return v

    @validator('price_per_share', 'transaction_value')
    def validate_amounts(cls, v):
        """Ensure amounts are non-negative"""
        if v is not None and v < 0:
            raise ValueError("Financial amounts cannot be negative")
        return v


class InsiderTransactionsIngestion(BaseIngestion):
    """
    Insider transactions data ingestion pipeline

    Fetches insider trading data from EODHD API and stores in database.
    """

    def __init__(self, api_key: str):
        """
        Initialize insider transactions ingestion

        Args:
            api_key: EODHD API key
        """
        super().__init__(api_key)

    def _validate_record(self, record: Dict[str, Any]) -> Optional[InsiderTransactionRecord]:
        """
        Validate insider transaction record

        Args:
            record: Raw API record

        Returns:
            Validated InsiderTransactionRecord or None if invalid
        """
        try:
            # Map API fields to model fields
            validated = InsiderTransactionRecord(
                transaction_date=record.get('date') or record.get('transactionDate'),
                owner_name=record.get('ownerName') or record.get('name'),
                transaction_type=record.get('transactionType') or record.get('type'),
                shares=record.get('amount') or record.get('shares'),
                price_per_share=record.get('pricePerShare') or record.get('price'),
                transaction_value=record.get('value') or record.get('transactionValue'),
                shares_owned_after=record.get('sharesOwnedFollowingTransaction')
            )
            return validated

        except ValidationError as e:
            logger.warning(f"Invalid insider transaction record: {e}")
            return None

    def fetch_insider_transactions(
        self,
        ticker: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Fetch insider transactions from EODHD API

        Args:
            ticker: Stock symbol (e.g., 'AAPL.US')
            limit: Maximum number of transactions

        Returns:
            List of insider transaction records
        """
        try:
            # Use EODHD client to fetch insider transactions
            from tools.eodhd_client import EODHDClient
            client = EODHDClient(api_key=self.api_key)

            transactions = client.fundamental.get_insider_transactions(ticker, limit=limit)

            logger.info(f"[INSIDER] Fetched {len(transactions)} transactions for {ticker}")
            return transactions

        except Exception as e:
            logger.error(f"[INSIDER] Failed to fetch transactions for {ticker}: {e}")
            raise

    def bulk_insert(
        self,
        db: Session,
        company_id: int,
        records: List[Dict[str, Any]],
        on_conflict: str = 'update'
    ):
        """
        Bulk insert insider transactions with UPSERT

        Args:
            db: Database session
            company_id: Company ID
            records: List of insider transaction records
            on_conflict: 'update' or 'ignore' on conflict
        """
        if not records:
            logger.info(f"[INSIDER] No records to insert for company_id={company_id}")
            return

        # Validate all records
        validated_records = []
        for record in records:
            validated = self._validate_record(record)
            if validated:
                validated_records.append(validated)

        if not validated_records:
            logger.warning(f"[INSIDER] No valid records after validation for company_id={company_id}")
            return

        logger.info(f"[INSIDER] Inserting {len(validated_records)} validated records for company_id={company_id}")

        # Prepare values for bulk insert
        values = []
        for record in validated_records:
            values.append({
                'company_id': company_id,
                'transaction_date': record.transaction_date,
                'owner_name': record.owner_name,
                'transaction_type': record.transaction_type,
                'shares': record.shares,
                'price_per_share': record.price_per_share,
                'transaction_value': record.transaction_value,
                'shares_owned_after': record.shares_owned_after,
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            })

        # Process in batches
        for i in range(0, len(values), self.batch_size):
            batch = values[i:i + self.batch_size]

            # PostgreSQL UPSERT
            stmt = insert(InsiderTransaction).values(batch)

            if on_conflict == 'update':
                # Update on conflict (based on company_id + transaction_date + owner_name)
                stmt = stmt.on_conflict_do_update(
                    index_elements=['company_id', 'transaction_date', 'owner_name'],
                    set_={
                        'transaction_type': stmt.excluded.transaction_type,
                        'shares': stmt.excluded.shares,
                        'price_per_share': stmt.excluded.price_per_share,
                        'transaction_value': stmt.excluded.transaction_value,
                        'shares_owned_after': stmt.excluded.shares_owned_after,
                        'updated_at': stmt.excluded.updated_at
                    }
                )
            else:
                # Ignore on conflict
                stmt = stmt.on_conflict_do_nothing(
                    index_elements=['company_id', 'transaction_date', 'owner_name']
                )

            db.execute(stmt)

        logger.info(f"[INSIDER] Successfully inserted {len(values)} insider transactions for company_id={company_id}")

    def ingest_insider_transactions(
        self,
        db: Session,
        company_id: int,
        ticker: str,
        limit: int = 100
    ):
        """
        Complete ingestion pipeline for insider transactions

        Args:
            db: Database session
            company_id: Company ID
            ticker: Stock symbol
            limit: Maximum number of transactions
        """
        try:
            # Step 1: Fetch from API
            records = self.fetch_insider_transactions(ticker, limit=limit)

            if not records:
                logger.info(f"[INSIDER] No insider transactions found for {ticker}")
                return

            # Step 2: Bulk insert with UPSERT
            self.bulk_insert(db, company_id, records, on_conflict='update')

            # Step 3: Log success
            logger.info(f"[INSIDER] Successfully ingested insider transactions for {ticker}")

        except Exception as e:
            logger.error(f"[INSIDER] Ingestion failed for {ticker}: {e}")
            raise


def main():
    """Test ingestion"""
    import os
    from database.models.base import SessionLocal
    from database.queries_improved import ImprovedDatabaseQueries

    # Get API key
    api_key = os.getenv('EODHD_API_KEY')
    if not api_key:
        raise ValueError("EODHD_API_KEY environment variable not set")

    # Initialize
    ingestion = InsiderTransactionsIngestion(api_key)
    db = SessionLocal()
    queries = ImprovedDatabaseQueries()

    try:
        # Test with AAPL
        ticker = 'AAPL.US'
        company = queries.get_company('AAPL', db=db)

        if not company:
            logger.error(f"Company AAPL not found in database")
            return

        logger.info(f"Testing insider transactions ingestion for {ticker}")

        # Ingest
        ingestion.ingest_insider_transactions(db, company.id, ticker, limit=50)

        # Commit
        db.commit()

        # Verify
        transactions = queries.get_insider_transactions('AAPL', limit=10, db=db)
        logger.info(f"Stored {len(transactions)} insider transactions")

        for txn in transactions[:5]:
            logger.info(f"  {txn.transaction_date} - {txn.owner_name}: {txn.transaction_type} {txn.shares} shares")

    except Exception as e:
        logger.error(f"Test failed: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
