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
from datetime import datetime, timedelta
import os
import numpy as np
import pandas as pd

router = APIRouter(
    prefix="/quantanalyzer",
    tags=["Quantitative Analysis"]
)

logger = setup_logger().getChild("quantanalyzer")

def add_exchange_suffix(ticker: str) -> str:
    """
    Add appropriate exchange suffix to ticker if not already present.

    - Currency pairs (6 chars, all uppercase) → .FOREX
    - All other tickers → .US
    """
    if "." in ticker:
        return ticker

    # Detect currency pairs (e.g., EURUSD, GBPJPY)
    if len(ticker) == 6 and ticker.isupper():
        return f"{ticker}.FOREX"

    return f"{ticker}.US"

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
    ticker_with_exchange = add_exchange_suffix(ticker)

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


@router.get("/returns")
async def returns_analysis(
    ticker: str = Query(..., description="US ticker, e.g. TSLA"),
    years: int = Query(3, ge=1, le=10),
    benchmark: str = Query("SPY"),
):
    """
    Calculate returns distribution and beta analysis

    Returns:
    - returns.list: Array of daily returns for histogram
    - scatter.x: Benchmark returns
    - scatter.y: Ticker returns
    - scatter.beta: Beta coefficient
    - scatter.alpha: Alpha coefficient
    - scatter.r2: R-squared value
    """
    ticker_with_exchange = add_exchange_suffix(ticker)
    benchmark_with_exchange = add_exchange_suffix(benchmark)

    logger.info(f"[RETURNS] Analyzing {ticker_with_exchange} vs {benchmark_with_exchange} for {years} years")

    db: Session = next(get_db())

    try:
        # Calculate days to fetch (years * 365.25 + buffer)
        days = int(years * 365.25) + 30
        cutoff_date = datetime.now() - timedelta(days=days)

        # Get company IDs
        ticker_company = db.query(Company).filter(Company.ticker == ticker_with_exchange).first()
        benchmark_company = db.query(Company).filter(Company.ticker == benchmark_with_exchange).first()

        if not ticker_company:
            raise HTTPException(404, f"Company {ticker_with_exchange} not found in database")
        if not benchmark_company:
            raise HTTPException(404, f"Benchmark {benchmark_with_exchange} not found in database")

        # Fetch OHLCV data for ticker
        ticker_data = db.query(OHLCVModel).filter(
            OHLCVModel.company_id == ticker_company.id,
            OHLCVModel.date >= cutoff_date
        ).order_by(OHLCVModel.date).all()

        # Fetch OHLCV data for benchmark
        benchmark_data = db.query(OHLCVModel).filter(
            OHLCVModel.company_id == benchmark_company.id,
            OHLCVModel.date >= cutoff_date
        ).order_by(OHLCVModel.date).all()

        if len(ticker_data) < 60:
            raise HTTPException(400, f"Insufficient history for {ticker_with_exchange} (<60 trading days)")
        if len(benchmark_data) < 60:
            raise HTTPException(400, f"Insufficient history for {benchmark_with_exchange} (<60 trading days)")

        # Convert to pandas Series
        ticker_series = pd.Series(
            [float(record.close) for record in ticker_data],
            index=[record.date for record in ticker_data]
        )
        benchmark_series = pd.Series(
            [float(record.close) for record in benchmark_data],
            index=[record.date for record in benchmark_data]
        )

        # Calculate returns
        r1 = ticker_series.pct_change().dropna()
        r2 = benchmark_series.pct_change().dropna()

        # Merge returns on common dates
        df = pd.concat([r1, r2], axis=1, join="inner").dropna()
        if df.empty:
            raise HTTPException(500, "No overlapping return history")

        y, x = df.iloc[:, 0].values, df.iloc[:, 1].values

        # Calculate beta and alpha using linear regression
        beta, alpha = np.polyfit(x, y, 1)
        r2_val = np.corrcoef(x, y)[0, 1] ** 2

        logger.info(f"[RETURNS] Calculated beta={beta:.4f}, alpha={alpha:.4f}, R²={r2_val:.4f} for {ticker_with_exchange}")

        return {
            "ticker": ticker.upper(),
            "benchmark": benchmark.upper(),
            "years": years,
            "returns": {
                "list": y.tolist(),
                "mean": float(y.mean()),
                "std": float(y.std())
            },
            "scatter": {
                "x": x.tolist(),
                "y": y.tolist(),
                "beta": round(beta, 4),
                "alpha": round(alpha, 4),
                "r2": round(r2_val, 4),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[RETURNS] Failed to calculate returns for {ticker_with_exchange}: {e}")
        raise HTTPException(500, f"Failed to calculate returns: {str(e)}")
    finally:
        db.close()
