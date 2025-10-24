# routers/quantanalyzer.py

from fastapi import APIRouter, HTTPException, Query
from models.analyze_models import EODResult, OLHCV
from core.logger_config import setup_logger
from core.config import settings
from database.models.base import get_db
from database.models.company import Company
from database.models.financial import OHLCV as OHLCVModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
import os

router = APIRouter(
    prefix="/quantanalyzer",
    tags=["Quantitative Analysis"]
)

logger = setup_logger().getChild("quantanalyzer")

@router.get("/eod", response_model=EODResult)
async def get_eod_data(
    ticker: str = Query(..., description="Ticker symbol, e.g., TSLA"),
    limit: int = Query(None, description="Number of recent rows to return (None = all available)"),
):
    """
    Get OHLCV data for a ticker

    Methodology:
    1. Check database for existing data
    2. If full history exists → return all data from database
    3. If no/partial data → fetch from API, store in database, return
    4. Future requests use incremental updates
    """
    # Add .US suffix only if ticker doesn't already have an exchange
    ticker_with_exchange = ticker if "." in ticker else f"{ticker}.US"

    db: Session = next(get_db())

    try:
        # Step 1: Check if company exists in database
        company = db.query(Company).filter(Company.ticker == ticker_with_exchange).first()

        if not company:
            # Company doesn't exist - create it and fetch data
            logger.info(f"[EOD] Company {ticker_with_exchange} not in database - creating and fetching full history")

            # Create company record
            company = Company(
                ticker=ticker_with_exchange,
                name=ticker,  # Will be updated when fundamentals are fetched
                currency='USD'
            )
            db.add(company)
            db.commit()
            db.refresh(company)

        # Step 2: Check database for OHLCV data
        db_data_count = db.query(OHLCVModel).filter(
            OHLCVModel.company_id == company.id
        ).count()

        if db_data_count > 0:
            # Data exists in database - return it
            logger.info(f"[EOD] Found {db_data_count} records in database for {ticker_with_exchange}")

            query = db.query(OHLCVModel).filter(
                OHLCVModel.company_id == company.id
            ).order_by(OHLCVModel.date)

            if limit:
                # Get most recent N records
                query = db.query(OHLCVModel).filter(
                    OHLCVModel.company_id == company.id
                ).order_by(desc(OHLCVModel.date)).limit(limit)
                db_records = query.all()
                db_records.reverse()  # Chronological order
            else:
                # Get all records
                db_records = query.all()

            data = [
                OLHCV(
                    date=str(record.date),
                    open=float(record.open),
                    high=float(record.high),
                    low=float(record.low),
                    close=float(record.close),
                    adjusted_close=float(record.adjusted_close) if record.adjusted_close else float(record.close),
                    volume=int(record.volume)
                )
                for record in db_records
            ]

            logger.info(f"[EOD] Returning {len(data)} records from database for {ticker_with_exchange}")
            return EODResult(ticker=ticker, data=data).model_dump(by_alias=True)

        else:
            # No data in database - fetch full history from API and store
            logger.info(f"[EOD] No data in database for {ticker_with_exchange} - fetching full history from API")

            # Fetch full history from API using incremental ingestion
            from ingestion.incremental_ohlcv_ingestion import IncrementalOHLCVIngestion

            api_key = os.getenv('EODHD_API_KEY')
            if not api_key:
                raise HTTPException(500, "EODHD_API_KEY not configured")

            ingestion = IncrementalOHLCVIngestion(api_key)

            try:
                records_added = ingestion.refresh_company_incremental(
                    db=db,
                    company_id=company.id,
                    ticker=ticker_with_exchange,
                    max_lookback_days=365  # Not used for first fetch, will get full history
                )

                logger.info(f"[EOD] Fetched and stored {records_added} records for {ticker_with_exchange}")

                # Now retrieve from database
                query = db.query(OHLCVModel).filter(
                    OHLCVModel.company_id == company.id
                ).order_by(OHLCVModel.date)

                if limit:
                    query = db.query(OHLCVModel).filter(
                        OHLCVModel.company_id == company.id
                    ).order_by(desc(OHLCVModel.date)).limit(limit)
                    db_records = query.all()
                    db_records.reverse()
                else:
                    db_records = query.all()

                data = [
                    OLHCV(
                        date=str(record.date),
                        open=float(record.open),
                        high=float(record.high),
                        low=float(record.low),
                        close=float(record.close),
                        adjusted_close=float(record.adjusted_close) if record.adjusted_close else float(record.close),
                        volume=int(record.volume)
                    )
                    for record in db_records
                ]

                logger.info(f"[EOD] Returning {len(data)} records (fetched and stored) for {ticker_with_exchange}")
                return EODResult(ticker=ticker, data=data).model_dump(by_alias=True)

            except Exception as e:
                logger.error(f"[EOD] Failed to fetch data for {ticker_with_exchange}: {e}")
                raise HTTPException(502, f"Failed to fetch data: {str(e)}")

    finally:
        db.close()
