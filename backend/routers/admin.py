# routers/admin.py
# Admin endpoints for database management

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime

from tools.eodhd_client import EODHDClient
from database.models.base import get_db
from database.models.company import Company, Exchange, Sector
from database.models.market_data import OHLCV, Fundamental
from database.models.news import News
from database.models.dividends import Dividend
from database.models.intraday_models import IntradayDataStatus
from database.models.intraday_base import get_db as get_intraday_db
from core.config import settings
from sqlalchemy import func, desc

router = APIRouter(prefix="/admin", tags=["Admin"])
logger = logging.getLogger("admin")


class PopulateResponse(BaseModel):
    status: str
    message: str
    companies_added: int
    total_companies: int


class IngestionStatus(BaseModel):
    status: str
    message: str
    companies_processed: int
    success_count: int
    error_count: int


class DataStatus(BaseModel):
    available: bool
    record_count: Optional[int] = 0
    last_update: Optional[str] = None
    date_range: Optional[str] = None


class IntradayStatus(BaseModel):
    available: bool
    timeframes: Optional[Dict[str, int]] = None  # {'1m': 1000, '5m': 500, ...}
    last_update: Optional[str] = None


class TickerInfo(BaseModel):
    ticker: str
    name: str
    exchange: str
    ohlcv: DataStatus
    intraday: Optional[IntradayStatus] = None
    fundamentals: DataStatus
    news: DataStatus
    dividends: DataStatus
    completeness_score: int  # 0-100


class TickerInventoryResponse(BaseModel):
    total_tickers: int
    tickers: List[TickerInfo]


class RefreshTickerRequest(BaseModel):
    ticker: str
    data_types: List[str]  # ["ohlcv", "fundamentals", "news", "dividends"]


class RefreshTickerResponse(BaseModel):
    status: str
    message: str
    ticker: str
    results: Dict[str, Any]


@router.post("/populate-companies", response_model=PopulateResponse)
async def populate_us_companies(
    limit: int = 1500,
    exchange: str = "US",
    type_filter: str = "common_stock"
):
    """
    Populate database with US equities

    Args:
        limit: Number of companies to add (default 1500)
        exchange: Exchange code (default "US")
        type_filter: Type filter (default "common_stock")

    Returns:
        Status and count of companies added
    """
    try:
        logger.info(f"[ADMIN] Starting company population: {limit} companies from {exchange}")

        # Initialize EODHD client
        client = EODHDClient(api_key=settings.eodhd_api_key)

        # Get database session
        db = next(get_db())

        # Fetch stocks from EODHD
        logger.info(f"[ADMIN] Fetching {type_filter} from {exchange}...")
        stocks = client.exchange.get_exchange_symbols(
            exchange=exchange,
            type_param=type_filter,
            delisted=0
        )

        logger.info(f"[ADMIN] Found {len(stocks)} stocks")

        # Filter to limit
        stocks = sorted(stocks, key=lambda x: x.get('Code', ''))[:limit]

        # Get or create exchanges
        us_exchange = db.query(Exchange).filter_by(code='US').first()
        if not us_exchange:
            us_exchange = Exchange(
                code='US',
                name='New York Stock Exchange',
                country='United States',
                timezone='America/New_York'
            )
            db.add(us_exchange)
            db.commit()
            db.refresh(us_exchange)

        nasdaq_exchange = db.query(Exchange).filter_by(code='NASDAQ').first()
        if not nasdaq_exchange:
            nasdaq_exchange = Exchange(
                code='NASDAQ',
                name='NASDAQ Stock Exchange',
                country='United States',
                timezone='America/New_York'
            )
            db.add(nasdaq_exchange)
            db.commit()
            db.refresh(nasdaq_exchange)

        # Add companies
        added_count = 0
        skipped_count = 0

        for stock in stocks:
            code = stock.get('Code')
            name = stock.get('Name', '')
            exchange_code = stock.get('Exchange', 'US')

            # Format ticker with exchange suffix
            ticker = f"{code}.US"

            # Check if already exists
            existing = db.query(Company).filter_by(ticker=ticker).first()
            if existing:
                skipped_count += 1
                continue

            # Determine exchange
            exchange_obj = nasdaq_exchange if 'NASDAQ' in exchange_code else us_exchange

            # Create company
            company = Company(
                ticker=ticker,
                name=name,
                exchange_id=exchange_obj.id,
                currency='USD',
                is_active=True,
                created_at=datetime.utcnow()
            )

            db.add(company)
            added_count += 1

            # Commit in batches of 100
            if added_count % 100 == 0:
                db.commit()
                logger.info(f"[ADMIN] Added {added_count} companies so far...")

        # Final commit
        db.commit()

        total_in_db = db.query(Company).count()

        logger.info(f"[ADMIN] Population complete: {added_count} added, {skipped_count} skipped, {total_in_db} total")

        return PopulateResponse(
            status="success",
            message=f"Added {added_count} companies, skipped {skipped_count} existing",
            companies_added=added_count,
            total_companies=total_in_db
        )

    except Exception as e:
        logger.error(f"[ADMIN] Population failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to populate companies: {str(e)}")


@router.post("/ingest-ohlcv", response_model=IngestionStatus)
async def ingest_ohlcv_data(
    background_tasks: BackgroundTasks,
    limit: Optional[int] = 50,
    background: bool = False
):
    """
    Ingest OHLCV (price) data for companies in database

    Args:
        limit: Number of companies to process (default 50, None for all)
        background: Run in background (default False)

    Returns:
        Ingestion status
    """
    try:
        logger.info(f"[ADMIN] Starting OHLCV ingestion for {limit or 'all'} companies")

        if background:
            # Run in background
            background_tasks.add_task(run_ohlcv_ingestion, limit)
            return IngestionStatus(
                status="started",
                message=f"OHLCV ingestion started in background for {limit or 'all'} companies",
                companies_processed=0,
                success_count=0,
                error_count=0
            )
        else:
            # Run synchronously
            result = await run_ohlcv_ingestion(limit)
            return result

    except Exception as e:
        logger.error(f"[ADMIN] OHLCV ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to ingest OHLCV data: {str(e)}")


async def run_ohlcv_ingestion(limit: Optional[int] = None) -> IngestionStatus:
    """Run OHLCV ingestion for companies"""
    from ingestion.incremental_ohlcv_ingestion import IncrementalOHLCVIngestion

    db = next(get_db())

    # Get companies
    query = db.query(Company).filter_by(is_active=True)
    if limit:
        query = query.limit(limit)

    companies = query.all()

    if not companies:
        return IngestionStatus(
            status="error",
            message="No companies found in database",
            companies_processed=0,
            success_count=0,
            error_count=0
        )

    logger.info(f"[ADMIN] Processing {len(companies)} companies for OHLCV ingestion")

    ingestion = IncrementalOHLCVIngestion(api_key=settings.eodhd_api_key)

    success_count = 0
    error_count = 0

    for i, company in enumerate(companies, 1):
        try:
            logger.info(f"[ADMIN] [{i}/{len(companies)}] Ingesting {company.ticker}...")
            ingestion.ingest_company(db, company)
            success_count += 1
        except Exception as e:
            logger.error(f"[ADMIN] Failed to ingest {company.ticker}: {e}")
            error_count += 1

    logger.info(f"[ADMIN] OHLCV ingestion complete: {success_count} success, {error_count} errors")

    return IngestionStatus(
        status="completed",
        message=f"Ingested OHLCV data for {len(companies)} companies",
        companies_processed=len(companies),
        success_count=success_count,
        error_count=error_count
    )


@router.get("/database-stats")
async def get_database_stats():
    """
    Get database statistics

    Returns:
        Database record counts and status
    """
    try:
        db = next(get_db())
        intraday_db = next(get_intraday_db())

        company_count = db.query(Company).count()
        active_company_count = db.query(Company).filter_by(is_active=True).count()
        exchange_count = db.query(Exchange).count()
        sector_count = db.query(Sector).count()

        # Count companies with each data type
        companies_with_ohlcv = db.query(func.count(func.distinct(OHLCV.company_id))).scalar()
        companies_with_fundamentals = db.query(func.count(func.distinct(Fundamental.company_id))).scalar()
        companies_with_news = db.query(func.count(func.distinct(News.company_id))).scalar()
        companies_with_dividends = db.query(func.count(func.distinct(Dividend.company_id))).scalar()

        # Count intraday data by timeframe
        intraday_counts = {}
        try:
            timeframe_stats = intraday_db.query(
                IntradayDataStatus.timeframe,
                func.count(func.distinct(IntradayDataStatus.ticker)).label('ticker_count')
            ).group_by(IntradayDataStatus.timeframe).all()

            for timeframe, count in timeframe_stats:
                intraday_counts[timeframe] = count
        except Exception as e:
            logger.warning(f"[ADMIN] Failed to get intraday stats: {e}")

        intraday_db.close()

        return {
            "status": "healthy",
            "statistics": {
                "total_companies": company_count,
                "active_companies": active_company_count,
                "exchanges": exchange_count,
                "sectors": sector_count
            },
            "data_availability": {
                "ohlcv": companies_with_ohlcv,
                "fundamentals": companies_with_fundamentals,
                "news": companies_with_news,
                "dividends": companies_with_dividends,
                "intraday": intraday_counts
            },
            "message": "Database is operational"
        }

    except Exception as e:
        logger.error(f"[ADMIN] Failed to get database stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get database stats: {str(e)}")


@router.get("/ticker-inventory", response_model=TickerInventoryResponse)
async def get_ticker_inventory(
    search: Optional[str] = None,
    filter_missing: bool = False,
    limit: int = 1000,
    offset: int = 0
):
    """
    Get detailed inventory of all tickers with data availability status

    Args:
        search: Optional search term for ticker or name
        filter_missing: Only show tickers missing some data (filter_missing=true shows only incomplete)
        limit: Number of results per page
        offset: Pagination offset

    Returns:
        Detailed ticker inventory with data status matrix
    """
    try:
        db = next(get_db())

        # Build base query with LEFT JOIN to include companies without exchange_id
        query = db.query(Company).outerjoin(Exchange)

        # Apply search filter
        if search:
            search_term = f"%{search.upper()}%"
            query = query.filter(
                (Company.ticker.ilike(search_term)) |
                (Company.name.ilike(search_term))
            )

        # Filter to only show tickers with at least one dataset
        # Get companies with any data (OHLCV, fundamentals, news, or dividends)
        companies_with_data_ids = set()

        # Companies with OHLCV
        ohlcv_company_ids = db.query(OHLCV.company_id).distinct().all()
        companies_with_data_ids.update([row[0] for row in ohlcv_company_ids])

        # Companies with fundamentals
        fund_company_ids = db.query(Fundamental.company_id).distinct().all()
        companies_with_data_ids.update([row[0] for row in fund_company_ids])

        # Companies with news
        news_company_ids = db.query(News.company_id).distinct().all()
        companies_with_data_ids.update([row[0] for row in news_company_ids])

        # Companies with dividends
        div_company_ids = db.query(Dividend.company_id).distinct().all()
        companies_with_data_ids.update([row[0] for row in div_company_ids])

        # Filter query to only include companies with at least one dataset
        if companies_with_data_ids:
            query = query.filter(Company.id.in_(list(companies_with_data_ids)))

        # Get total count
        total_count = query.count()

        # Get companies with pagination
        companies = query.order_by(Company.ticker).limit(limit).offset(offset).all()

        if not companies:
            return TickerInventoryResponse(total_tickers=0, tickers=[])

        # Extract company IDs for batch queries
        company_ids = [c.id for c in companies]
        ticker_to_company = {c.ticker: c for c in companies}

        # === BATCH QUERY 1: OHLCV data ===
        ohlcv_stats = db.query(
            OHLCV.company_id,
            func.count(OHLCV.date).label('count'),
            func.min(OHLCV.date).label('first_date'),
            func.max(OHLCV.date).label('last_date')
        ).filter(OHLCV.company_id.in_(company_ids)).group_by(OHLCV.company_id).all()

        ohlcv_lookup = {row.company_id: row for row in ohlcv_stats}

        # === BATCH QUERY 2: Fundamentals ===
        fundamentals = db.query(Fundamental).filter(Fundamental.company_id.in_(company_ids)).all()
        fundamentals_lookup = {f.company_id: f for f in fundamentals}

        # === BATCH QUERY 3: News data ===
        news_stats = db.query(
            News.company_id,
            func.count(News.id).label('count'),
            func.max(News.published_at).label('last_date')
        ).filter(News.company_id.in_(company_ids)).group_by(News.company_id).all()

        news_lookup = {row.company_id: row for row in news_stats}

        # === BATCH QUERY 4: Dividends data ===
        dividend_stats = db.query(
            Dividend.company_id,
            func.count(Dividend.id).label('count'),
            func.max(Dividend.ex_date).label('last_date')
        ).filter(Dividend.company_id.in_(company_ids)).group_by(Dividend.company_id).all()

        dividend_lookup = {row.company_id: row for row in dividend_stats}

        # === BATCH QUERY 5: Intraday data (from separate database) ===
        intraday_lookup = {}
        try:
            intraday_db = next(get_intraday_db())

            # Get base tickers (strip exchange suffix)
            base_tickers = list(set([
                c.ticker.split('.')[0] if '.' in c.ticker else c.ticker
                for c in companies
            ]))

            # Query all intraday records at once
            all_intraday_records = intraday_db.query(IntradayDataStatus).filter(
                IntradayDataStatus.ticker.in_(base_tickers)
            ).all()

            # Group by ticker
            from collections import defaultdict
            intraday_by_ticker = defaultdict(list)
            for record in all_intraday_records:
                intraday_by_ticker[record.ticker].append(record)

            intraday_lookup = dict(intraday_by_ticker)
            intraday_db.close()
        except Exception as e:
            logger.warning(f"[ADMIN] Failed to fetch intraday data in batch: {e}")

        # === Build response from pre-fetched data ===
        tickers_info = []

        for company in companies:
            # OHLCV status (from batch data)
            ohlcv_data = ohlcv_lookup.get(company.id)
            if ohlcv_data:
                ohlcv_status = DataStatus(
                    available=True,
                    record_count=ohlcv_data.count,
                    last_update=ohlcv_data.last_date.isoformat() if ohlcv_data.last_date else None,
                    date_range=f"{ohlcv_data.first_date.isoformat()} to {ohlcv_data.last_date.isoformat()}" if ohlcv_data.first_date and ohlcv_data.last_date else None
                )
            else:
                ohlcv_status = DataStatus(available=False, record_count=0)

            # Fundamentals status (from batch data)
            fundamental = fundamentals_lookup.get(company.id)
            fundamentals_status = DataStatus(
                available=fundamental is not None,
                last_update=fundamental.updated_at.isoformat() if fundamental and fundamental.updated_at else None
            )

            # News status (from batch data)
            news_data = news_lookup.get(company.id)
            if news_data:
                news_status = DataStatus(
                    available=True,
                    record_count=news_data.count,
                    last_update=news_data.last_date.isoformat() if news_data.last_date else None
                )
            else:
                news_status = DataStatus(available=False, record_count=0)

            # Dividends status (from batch data)
            dividend_data = dividend_lookup.get(company.id)
            if dividend_data:
                dividends_status = DataStatus(
                    available=True,
                    record_count=dividend_data.count,
                    last_update=dividend_data.last_date.isoformat() if dividend_data.last_date else None
                )
            else:
                dividends_status = DataStatus(available=False, record_count=0)

            # Intraday status (from batch data)
            base_ticker = company.ticker.split('.')[0] if '.' in company.ticker else company.ticker
            intraday_records = intraday_lookup.get(base_ticker, [])

            if intraday_records:
                timeframes = {}
                last_update = None

                for record in intraday_records:
                    timeframes[record.timeframe] = record.total_records
                    if record.last_timestamp:
                        if last_update is None or record.last_timestamp > last_update:
                            last_update = record.last_timestamp

                intraday_status = IntradayStatus(
                    available=len(timeframes) > 0,
                    timeframes=timeframes,
                    last_update=last_update.isoformat() if last_update else None
                )
            else:
                intraday_status = IntradayStatus(available=False)

            # Calculate completeness score (including intraday as optional)
            available_count = sum([
                ohlcv_status.available,
                fundamentals_status.available,
                news_status.available,
                dividends_status.available
            ])
            completeness_score = int((available_count / 4) * 100)

            # Apply filter for missing data
            if filter_missing and completeness_score == 100:
                continue

            ticker_info = TickerInfo(
                ticker=company.ticker,
                name=company.name,
                exchange=company.exchange.code if company.exchange else "N/A",
                ohlcv=ohlcv_status,
                intraday=intraday_status,
                fundamentals=fundamentals_status,
                news=news_status,
                dividends=dividends_status,
                completeness_score=completeness_score
            )

            tickers_info.append(ticker_info)

        logger.info(f"[ADMIN] Ticker inventory: {len(tickers_info)} tickers returned")

        return TickerInventoryResponse(
            total_tickers=total_count,
            tickers=tickers_info
        )

    except Exception as e:
        logger.error(f"[ADMIN] Failed to get ticker inventory: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get ticker inventory: {str(e)}")


@router.post("/refresh-ticker", response_model=RefreshTickerResponse)
async def refresh_ticker_data(request: RefreshTickerRequest):
    """
    Refresh specific data types for a single ticker

    Args:
        ticker: Company ticker symbol (e.g., "A.US")
        data_types: List of data types to refresh ["ohlcv", "fundamentals", "news", "dividends"]

    Returns:
        Status of refresh operation for each data type
    """
    try:
        from ingestion.incremental_ohlcv_ingestion import IncrementalOHLCVIngestion
        from ingestion.incremental_fundamentals_ingestion import IncrementalFundamentalsIngestion
        from ingestion.incremental_news_ingestion import IncrementalNewsIngestion
        from datetime import datetime, timedelta

        db = next(get_db())

        # Find company
        company = db.query(Company).filter_by(ticker=request.ticker).first()
        if not company:
            raise HTTPException(status_code=404, detail=f"Company {request.ticker} not found")

        logger.info(f"[ADMIN] Refreshing {request.ticker} - data types: {request.data_types}")

        results = {}

        # Initialize incremental ingestion clients (they check DB first)
        ohlcv_ingestion = IncrementalOHLCVIngestion(api_key=settings.eodhd_api_key) if "ohlcv" in request.data_types else None
        fundamentals_ingestion = IncrementalFundamentalsIngestion(api_key=settings.eodhd_api_key, freshness_threshold_days=1) if "fundamentals" in request.data_types else None
        news_ingestion = IncrementalNewsIngestion(api_key=settings.eodhd_api_key, lookback_days=30) if "news" in request.data_types else None

        # Refresh OHLCV (incremental - only fetches missing days)
        if "ohlcv" in request.data_types and ohlcv_ingestion:
            try:
                # Use incremental refresh - only fetches days missing from DB
                records_added = ohlcv_ingestion.refresh_company_incremental(
                    db=db,
                    company_id=company.id,
                    ticker=request.ticker,
                    max_lookback_days=730  # Last 2 years max
                )

                results["ohlcv"] = {
                    "success": True,
                    "records_added": records_added,
                    "message": f"Added {records_added} new OHLCV records" if records_added > 0 else "OHLCV data is up to date"
                }
                db.commit()

            except Exception as e:
                logger.error(f"[ADMIN] OHLCV refresh failed for {request.ticker}: {e}")
                results["ohlcv"] = {
                    "success": False,
                    "error": str(e)
                }
                db.rollback()

        # Refresh Fundamentals (incremental - only if stale)
        if "fundamentals" in request.data_types and fundamentals_ingestion:
            try:
                # Use incremental refresh method
                refreshed = fundamentals_ingestion.refresh_company_incremental(
                    db=db,
                    company_id=company.id,
                    ticker=request.ticker
                )

                if refreshed:
                    results["fundamentals"] = {
                        "success": True,
                        "message": "Fundamentals updated"
                    }
                else:
                    results["fundamentals"] = {
                        "success": True,
                        "message": "Fundamentals are up to date (< 1 day old)"
                    }
                db.commit()

            except Exception as e:
                logger.error(f"[ADMIN] Fundamentals refresh failed for {request.ticker}: {e}")
                results["fundamentals"] = {
                    "success": False,
                    "error": str(e)
                }
                db.rollback()

        # Refresh News
        if "news" in request.data_types and news_ingestion:
            try:
                # Use incremental news ingestion
                # Extract ticker without exchange suffix for news API
                ticker_base = request.ticker.split('.')[0]

                articles_added = news_ingestion.refresh_company_incremental(
                    db=db,
                    company_id=company.id,
                    ticker=ticker_base,
                    limit=50
                )

                results["news"] = {
                    "success": True,
                    "records_added": articles_added,
                    "message": f"Added {articles_added} news articles"
                }
                db.commit()

            except Exception as e:
                logger.error(f"[ADMIN] News refresh failed for {request.ticker}: {e}")
                results["news"] = {
                    "success": False,
                    "error": str(e)
                }
                db.rollback()

        # Refresh Dividends (skip if already exists)
        if "dividends" in request.data_types:
            try:
                from database.models.dividends import Dividend

                # Check if dividends already exist
                existing_count = db.query(Dividend).filter_by(company_id=company.id).count()

                if existing_count > 0:
                    # Dividends already exist, skip refresh
                    results["dividends"] = {
                        "success": True,
                        "records_added": 0,
                        "message": f"Dividends already exist ({existing_count} records), skipped"
                    }
                else:
                    # No dividends yet, fetch from API
                    from tools.eodhd_client import EODHDClient
                    client = EODHDClient(api_key=settings.eodhd_api_key)

                    # Fetch dividends
                    dividends_data = client.corporate.get_dividends(symbol=request.ticker)

                    if dividends_data:
                        # Convert to list if single dict
                        records = [dividends_data] if isinstance(dividends_data, dict) else dividends_data

                        # Manual insertion for dividends
                        for record in records:
                            dividend = Dividend(
                                company_id=company.id,
                                ex_date=datetime.fromisoformat(record.get('date')).date() if record.get('date') else None,
                                amount=record.get('value', 0),
                                currency='USD'
                            )
                            db.merge(dividend)

                        results["dividends"] = {
                            "success": True,
                            "records_added": len(records),
                            "message": f"Added {len(records)} dividend records"
                        }
                        db.commit()
                    else:
                        results["dividends"] = {
                            "success": True,
                            "records_added": 0,
                            "message": "No dividends data available"
                        }

            except Exception as e:
                logger.error(f"[ADMIN] Dividends refresh failed for {request.ticker}: {e}")
                results["dividends"] = {
                    "success": False,
                    "error": str(e)
                }
                db.rollback()

        logger.info(f"[ADMIN] Refresh complete for {request.ticker}: {results}")

        return RefreshTickerResponse(
            status="success",
            message=f"Refreshed {len(results)} data types for {request.ticker}",
            ticker=request.ticker,
            results=results
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ADMIN] Failed to refresh {request.ticker}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to refresh ticker: {str(e)}")


class AddTickerRequest(BaseModel):
    tickers: List[str]  # List of tickers without exchange suffix (e.g., ["SPY", "QQQ"])
    exchange: str = "US"  # Default to US exchange


class AddTickerResponse(BaseModel):
    status: str
    message: str
    added: int
    skipped: int
    failed: List[str]


@router.post("/add-tickers", response_model=AddTickerResponse)
async def add_specific_tickers(request: AddTickerRequest):
    """
    Add specific tickers to the database

    Useful for adding index ETFs or specific stocks on demand

    Args:
        tickers: List of ticker symbols (without exchange suffix)
        exchange: Exchange code (default: "US")

    Returns:
        Status with counts of added, skipped, and failed tickers
    """
    db = next(get_db())
    try:
        logger.info(f"[ADMIN] Adding {len(request.tickers)} tickers to database")

        # Initialize EODHD client
        client = EODHDClient(api_key=settings.eodhd_api_key)

        # Fetch all symbols from exchange (cached by EODHD)
        logger.info(f"[ADMIN] Fetching symbol list from {request.exchange}...")
        all_symbols = client.exchange.get_exchange_symbols(exchange=request.exchange)
        symbol_lookup = {s['Code']: s for s in all_symbols}

        added = 0
        skipped = 0
        failed = []

        for ticker in request.tickers:
            ticker_with_exchange = f"{ticker}.{request.exchange}"

            # Check if already exists
            existing = db.query(Company).filter(Company.ticker == ticker_with_exchange).first()
            if existing:
                logger.info(f"[ADMIN] {ticker_with_exchange}: Already exists, skipping")
                skipped += 1
                continue

            # Look up ticker details
            ticker_info = symbol_lookup.get(ticker)
            if not ticker_info:
                logger.warning(f"[ADMIN] {ticker}: Not found in {request.exchange} exchange")
                failed.append(ticker)
                continue

            # Create company record
            company = Company(
                ticker=ticker_with_exchange,
                name=ticker_info.get('Name', ticker),
                isin=ticker_info.get('Isin'),
                currency=ticker_info.get('Currency', 'USD')
            )

            db.add(company)
            logger.info(f"[ADMIN] ✅ Added {ticker_with_exchange}: {company.name}")
            added += 1

        # Commit all at once
        if added > 0:
            db.commit()
            logger.info(f"[ADMIN] Successfully committed {added} new tickers to database")

        message = f"Added {added} tickers, skipped {skipped} existing"
        if failed:
            message += f", failed {len(failed)} tickers"

        logger.info(f"[ADMIN] {message}")

        return AddTickerResponse(
            status="success",
            message=message,
            added=added,
            skipped=skipped,
            failed=failed
        )

    except Exception as e:
        db.rollback()
        logger.error(f"[ADMIN] Failed to add tickers: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add tickers: {str(e)}")
    finally:
        db.close()


class PopulateFromETFRequest(BaseModel):
    etf_ticker: str  # e.g., "SPY", "IWM", "VTI"
    exchange: str = "US"
    max_holdings: Optional[int] = None  # Limit number of holdings to add (None = all)
    min_weight: Optional[float] = None  # Minimum weight % to include (None = all)


class PopulateFromETFResponse(BaseModel):
    status: str
    message: str
    etf_ticker: str
    total_holdings: int
    added: int
    skipped: int
    failed: List[str]


@router.post("/populate-from-etf", response_model=PopulateFromETFResponse)
async def populate_from_etf_holdings(request: PopulateFromETFRequest):
    """
    Populate database with stocks from an ETF's holdings

    Example: Load all SPY component stocks (99 largest holdings)
             Load all IWM component stocks (1936 Russell 2000 stocks)
             Load all VTI component stocks (3339 total market stocks)

    Use this to quickly populate the database with liquid, tradeable stocks.
    """
    db = next(get_db())
    try:
        etf_symbol = f"{request.etf_ticker}.{request.exchange}"
        logger.info(f"[ADMIN] Fetching holdings for {etf_symbol}")

        # Initialize EODHD client
        client = EODHDClient(api_key=settings.eodhd_api_key)

        # Get ETF fundamentals to extract holdings
        etf_data = client.fundamental.get_fundamentals(etf_symbol)

        if not etf_data or 'ETF_Data' not in etf_data:
            raise HTTPException(
                status_code=404,
                detail=f"ETF data not found for {etf_symbol}. Ensure it's a valid ETF ticker."
            )

        holdings = etf_data['ETF_Data'].get('Holdings', {})

        if not holdings:
            raise HTTPException(
                status_code=404,
                detail=f"No holdings found for {etf_symbol}"
            )

        logger.info(f"[ADMIN] Found {len(holdings)} holdings in {etf_symbol}")

        # Filter holdings by weight if specified
        if request.min_weight is not None:
            holdings = {
                ticker: info for ticker, info in holdings.items()
                if info.get('Assets_%', 0) >= request.min_weight
            }
            logger.info(f"[ADMIN] Filtered to {len(holdings)} holdings with weight >= {request.min_weight}%")

        # Limit number of holdings if specified
        if request.max_holdings is not None:
            # Sort by weight (descending) and take top N
            sorted_holdings = sorted(
                holdings.items(),
                key=lambda x: x[1].get('Assets_%', 0),
                reverse=True
            )
            holdings = dict(sorted_holdings[:request.max_holdings])
            logger.info(f"[ADMIN] Limited to top {len(holdings)} holdings by weight")

        # Get all symbols from exchange for validation
        all_symbols = client.exchange.get_exchange_symbols(exchange=request.exchange)
        symbol_lookup = {s['Code']: s for s in all_symbols}

        added = 0
        skipped = 0
        failed = []

        for ticker_with_exchange, holding_info in holdings.items():
            # Extract ticker without exchange suffix
            ticker = holding_info.get('Code', ticker_with_exchange.split('.')[0])
            ticker_full = f"{ticker}.{request.exchange}"

            # Check if already exists
            existing = db.query(Company).filter(Company.ticker == ticker_full).first()
            if existing:
                skipped += 1
                continue

            # Get detailed ticker info from exchange symbols
            ticker_details = symbol_lookup.get(ticker)

            if not ticker_details:
                # Use holding info as fallback
                ticker_details = {
                    'Name': holding_info.get('Name', ticker),
                    'Isin': None,
                    'Currency': 'USD'
                }

            # Create company record
            company = Company(
                ticker=ticker_full,
                name=ticker_details.get('Name', holding_info.get('Name', ticker)),
                isin=ticker_details.get('Isin'),
                currency=ticker_details.get('Currency', 'USD')
            )

            db.add(company)
            added += 1

        # Commit all at once
        if added > 0:
            db.commit()
            logger.info(f"[ADMIN] ✅ Successfully added {added} holdings from {etf_symbol}")

        return PopulateFromETFResponse(
            status="success",
            message=f"Added {added} stocks from {etf_symbol}, skipped {skipped} existing",
            etf_ticker=request.etf_ticker,
            total_holdings=len(holdings),
            added=added,
            skipped=skipped,
            failed=failed
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[ADMIN] Failed to populate from ETF: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to populate from ETF: {str(e)}")
    finally:
        db.close()
