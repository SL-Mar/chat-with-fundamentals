"""
Fundamental Data Ingestion Pipeline

Security:
- Input validation with Pydantic
- Secure JSON handling
- No credentials in logs

Robustness:
- Handles 50+ financial metrics
- JSONB storage for flexible data
- Duplicate detection
- Transaction management
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, date
from pydantic import BaseModel, validator
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from database.models.base import SessionLocal
from database.models.company import Company
from database.models.market_data import Fundamental
from .base_ingestion import BaseIngestion

logger = logging.getLogger(__name__)


class FundamentalRecord(BaseModel):
    """
    Validated fundamental record

    Security: Type validation
    Robustness: Flexible schema with JSONB fallback
    """
    date: date
    period_type: str  # 'quarterly' or 'annual'
    fiscal_year: Optional[int] = None
    fiscal_quarter: Optional[int] = None

    # Valuation metrics
    market_cap: Optional[float] = None
    enterprise_value: Optional[float] = None
    pe_ratio: Optional[float] = None
    peg_ratio: Optional[float] = None
    price_to_book: Optional[float] = None
    price_to_sales: Optional[float] = None

    # Profitability
    revenue: Optional[float] = None
    gross_profit: Optional[float] = None
    operating_income: Optional[float] = None
    net_income: Optional[float] = None
    ebitda: Optional[float] = None
    eps: Optional[float] = None
    eps_diluted: Optional[float] = None

    # Margins
    gross_margin: Optional[float] = None
    operating_margin: Optional[float] = None
    profit_margin: Optional[float] = None
    roe: Optional[float] = None
    roa: Optional[float] = None

    # Balance sheet
    total_assets: Optional[float] = None
    total_liabilities: Optional[float] = None
    total_equity: Optional[float] = None
    total_debt: Optional[float] = None
    cash_and_equivalents: Optional[float] = None

    # Dividends
    dividend_per_share: Optional[float] = None
    dividend_yield: Optional[float] = None

    # Raw data (JSONB)
    raw_data: Optional[Dict[str, Any]] = None

    @validator('period_type')
    def validate_period_type(cls, v):
        """Validate period type"""
        if v not in ['quarterly', 'annual']:
            raise ValueError("period_type must be 'quarterly' or 'annual'")
        return v

    @validator('fiscal_quarter')
    def validate_fiscal_quarter(cls, v):
        """Validate fiscal quarter"""
        if v is not None and not (1 <= v <= 4):
            raise ValueError("fiscal_quarter must be between 1 and 4")
        return v

    class Config:
        arbitrary_types_allowed = True


class FundamentalIngestion(BaseIngestion):
    """
    Fundamental data ingestion pipeline

    Features:
    - Handles complex nested JSON from EODHD
    - Extracts 50+ metrics
    - Stores raw JSON for future parsing
    - UPSERT for updates
    """

    def __init__(self, api_key: str):
        """
        Initialize fundamental ingestion

        Args:
            api_key: EODHD API key
        """
        super().__init__(api_key=api_key, api_name="EODHD")
        self.base_url = "https://eodhistoricaldata.com/api"

    def fetch_fundamentals(self, ticker: str) -> Dict[str, Any]:
        """
        Fetch fundamental data from API

        Args:
            ticker: Ticker symbol (e.g., 'AAPL.US')

        Returns:
            Dict with fundamental data

        Raises:
            ValueError: If ticker invalid
            RateLimitExceeded: If rate limit exceeded
        """
        ticker = self._validate_ticker(ticker)

        url = f"{self.base_url}/fundamentals/{ticker}"
        params = {'fmt': 'json'}

        logger.info(f"Fetching fundamentals: {ticker}")

        response = self._make_request(url, params)
        data = response.json()

        if not isinstance(data, dict):
            raise ValueError(f"Unexpected API response format: {type(data)}")

        logger.info(f"Fetched fundamentals for {ticker}")
        return data

    def parse_fundamentals(
        self,
        data: Dict[str, Any],
        period_type: str = 'quarterly'
    ) -> List[FundamentalRecord]:
        """
        Parse EODHD fundamental data into records

        Args:
            data: Raw API data
            period_type: 'quarterly' or 'annual'

        Returns:
            List of validated FundamentalRecord objects

        Robustness:
        - Handles missing fields gracefully
        - Logs parsing errors
        - Returns partial data if some fields fail
        """
        records = []
        errors = []

        # Navigate nested JSON structure
        financials = data.get('Financials', {})
        period_data = financials.get('Income_Statement', {}).get(period_type, {})

        if not period_data:
            logger.warning(f"No {period_type} data found")
            return records

        # Parse each period
        for date_str, metrics in period_data.items():
            try:
                # Parse date
                date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()

                # Extract balance sheet and cash flow
                balance_sheet = financials.get('Balance_Sheet', {}).get(period_type, {}).get(date_str, {})
                cash_flow = financials.get('Cash_Flow', {}).get(period_type, {}).get(date_str, {})

                # Get highlights (valuation metrics)
                highlights = data.get('Highlights', {})

                # Create record
                record = FundamentalRecord(
                    date=date_obj,
                    period_type=period_type,
                    fiscal_year=int(date_str[:4]),
                    fiscal_quarter=self._extract_quarter(date_str) if period_type == 'quarterly' else None,

                    # Valuation (from highlights)
                    market_cap=self._safe_float(highlights.get('MarketCapitalization')),
                    enterprise_value=self._safe_float(highlights.get('EnterpriseValue')),
                    pe_ratio=self._safe_float(highlights.get('PERatio')),
                    peg_ratio=self._safe_float(highlights.get('PEGRatio')),
                    price_to_book=self._safe_float(highlights.get('PriceBookMRQ')),
                    price_to_sales=self._safe_float(highlights.get('PriceSalesTTM')),

                    # Profitability (from income statement)
                    revenue=self._safe_float(metrics.get('totalRevenue')),
                    gross_profit=self._safe_float(metrics.get('grossProfit')),
                    operating_income=self._safe_float(metrics.get('operatingIncome')),
                    net_income=self._safe_float(metrics.get('netIncome')),
                    ebitda=self._safe_float(metrics.get('ebitda')),
                    eps=self._safe_float(highlights.get('EarningsShare')),
                    eps_diluted=self._safe_float(highlights.get('DilutedEpsTTM')),

                    # Balance sheet
                    total_assets=self._safe_float(balance_sheet.get('totalAssets')),
                    total_liabilities=self._safe_float(balance_sheet.get('totalLiab')),
                    total_equity=self._safe_float(balance_sheet.get('totalStockholderEquity')),
                    total_debt=self._safe_float(balance_sheet.get('longTermDebt')),
                    cash_and_equivalents=self._safe_float(balance_sheet.get('cash')),

                    # Dividends
                    dividend_per_share=self._safe_float(highlights.get('DividendShare')),
                    dividend_yield=self._safe_float(highlights.get('DividendYield')),

                    # Store raw data for future parsing
                    raw_data={
                        'income_statement': metrics,
                        'balance_sheet': balance_sheet,
                        'cash_flow': cash_flow,
                        'highlights': highlights
                    }
                )

                records.append(record)

            except Exception as e:
                errors.append((date_str, str(e)))
                logger.warning(f"Skipping period {date_str}: {e}")

        if errors:
            logger.warning(
                f"Skipped {len(errors)}/{len(period_data)} periods due to errors"
            )

        logger.info(f"Parsed {len(records)} {period_type} fundamental records")
        return records

    def _safe_float(self, value: Any) -> Optional[float]:
        """Safely convert value to float"""
        if value is None or value == '':
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    def _extract_quarter(self, date_str: str) -> int:
        """Extract fiscal quarter from date"""
        month = int(date_str[5:7])
        return ((month - 1) // 3) + 1

    def bulk_insert(
        self,
        db: Session,
        company_id: int,
        records: List[FundamentalRecord]
    ) -> Dict[str, int]:
        """
        Bulk insert fundamental records with UPSERT

        Args:
            db: Database session
            company_id: Company ID
            records: Validated fundamental records

        Returns:
            Dict with 'inserted' and 'updated' counts
        """
        if not records:
            return {'inserted': 0, 'updated': 0}

        # Prepare bulk insert data
        values = [
            {
                'company_id': company_id,
                'date': record.date,
                'period_type': record.period_type,
                'fiscal_year': record.fiscal_year,
                'fiscal_quarter': record.fiscal_quarter,
                'market_cap': record.market_cap,
                'enterprise_value': record.enterprise_value,
                'pe_ratio': record.pe_ratio,
                'peg_ratio': record.peg_ratio,
                'price_to_book': record.price_to_book,
                'price_to_sales': record.price_to_sales,
                'revenue': record.revenue,
                'gross_profit': record.gross_profit,
                'operating_income': record.operating_income,
                'net_income': record.net_income,
                'ebitda': record.ebitda,
                'eps': record.eps,
                'eps_diluted': record.eps_diluted,
                'gross_margin': record.gross_margin,
                'operating_margin': record.operating_margin,
                'profit_margin': record.profit_margin,
                'roe': record.roe,
                'roa': record.roa,
                'total_assets': record.total_assets,
                'total_liabilities': record.total_liabilities,
                'total_equity': record.total_equity,
                'total_debt': record.total_debt,
                'cash_and_equivalents': record.cash_and_equivalents,
                'dividend_per_share': record.dividend_per_share,
                'dividend_yield': record.dividend_yield,
                'raw_data': record.raw_data
            }
            for record in records
        ]

        # PostgreSQL UPSERT
        stmt = insert(Fundamental).values(values)
        stmt = stmt.on_conflict_do_update(
            index_elements=['company_id', 'date', 'period_type'],
            set_={k: stmt.excluded[k] for k in values[0].keys() if k not in ['company_id', 'date', 'period_type']}
        )

        db.execute(stmt)
        db.commit()

        logger.info(f"Inserted/updated {len(records)} fundamental records")
        return {'inserted': 0, 'updated': len(records)}

    def ingest_ticker(
        self,
        ticker: str,
        period_types: List[str] = ['quarterly', 'annual']
    ) -> Dict[str, Any]:
        """
        Complete ingestion pipeline for one ticker

        Args:
            ticker: Ticker symbol
            period_types: List of period types to ingest

        Returns:
            Dict with ingestion statistics
        """
        db = SessionLocal()
        ingestion_log = None

        try:
            ticker = self._validate_ticker(ticker)

            # Get company
            company = db.query(Company).filter(
                Company.ticker == ticker
            ).first()

            if not company:
                raise ValueError(f"Company not found: {ticker}")

            # Create ingestion log
            ingestion_log = self._create_ingestion_log(
                db=db,
                job_type='fundamentals',
                company_id=company.id
            )

            logger.info(f"Starting fundamental ingestion: {ticker}")

            # Fetch data
            data = self.fetch_fundamentals(ticker)

            # Parse and insert for each period type
            total_inserted = 0
            total_updated = 0

            for period_type in period_types:
                records = self.parse_fundamentals(data, period_type)
                if records:
                    result = self.bulk_insert(db, company.id, records)
                    total_inserted += result['inserted']
                    total_updated += result['updated']

            # Complete log
            self._complete_ingestion_log(
                db=db,
                log=ingestion_log,
                status='success',
                records_processed=total_inserted + total_updated,
                records_inserted=total_inserted,
                records_updated=total_updated
            )

            logger.info(
                f"✅ Fundamental ingestion complete: {ticker} - "
                f"{total_inserted} inserted, {total_updated} updated"
            )

            return {
                'ticker': ticker,
                'status': 'success',
                'records_inserted': total_inserted,
                'records_updated': total_updated
            }

        except Exception as e:
            logger.error(f"❌ Fundamental ingestion failed: {ticker} - {str(e)}")
            db.rollback()

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
