"""
Dataset Population Endpoints

Populate database with stock data using various methods:
- ETF constituents (SPY, QQQ, etc.)
- Index constituents (S&P 500, NASDAQ 100, etc.)
- Custom ticker lists
- Market screeners
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import logging
from datetime import datetime, timedelta

from tools.eodhd_client import EODHDClient
from database.models.base import get_db
from database.models.company import Company, Exchange, Sector, Industry
from database.models.market_data import OHLCV
from database.models.financial import Fundamental
from sqlalchemy.orm import Session
from sqlalchemy import text
from core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


class PopulateRequest(BaseModel):
    """Request to populate database with stocks"""
    method: str  # 'etf', 'index', 'custom', 'screener'
    source: Optional[str] = None  # ETF symbol (SPY.US) or index symbol (GSPC.INDX)
    tickers: Optional[List[str]] = None  # Custom ticker list
    include_fundamentals: bool = True
    include_prices: bool = True
    price_days: int = 365  # Days of historical prices to fetch


class PopulateProgress(BaseModel):
    """Progress tracking for population task"""
    task_id: str
    status: str  # 'pending', 'running', 'completed', 'failed'
    progress: float  # 0-100
    total_tickers: int
    processed_tickers: int
    current_ticker: Optional[str] = None
    errors: List[str] = []
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


# In-memory progress tracking (use Redis in production)
populate_tasks: Dict[str, PopulateProgress] = {}


@router.post("/api/v2/database/populate")
async def populate_database(
    request: PopulateRequest,
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """
    Populate database with stocks using various methods.

    Methods:
    - etf: Populate from ETF holdings (e.g., SPY, QQQ)
    - index: Populate from index constituents (e.g., S&P 500, NASDAQ 100)
    - custom: Populate from custom ticker list
    - screener: Populate from market screener results

    Returns:
        Task ID for tracking progress
    """
    try:
        # Generate task ID
        task_id = f"{request.method}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # Get tickers based on method
        if request.method == 'etf':
            if not request.source:
                raise HTTPException(status_code=400, detail="ETF symbol required for 'etf' method")
            tickers = await get_etf_constituents(request.source)

        elif request.method == 'index':
            if not request.source:
                raise HTTPException(status_code=400, detail="Index symbol required for 'index' method")
            tickers = await get_index_constituents(request.source)

        elif request.method == 'custom':
            if not request.tickers:
                raise HTTPException(status_code=400, detail="Tickers list required for 'custom' method")
            tickers = request.tickers

        elif request.method == 'screener':
            raise HTTPException(status_code=501, detail="Screener method not yet implemented")

        else:
            raise HTTPException(status_code=400, detail=f"Unknown method: {request.method}")

        # Initialize progress tracker
        populate_tasks[task_id] = PopulateProgress(
            task_id=task_id,
            status='pending',
            progress=0,
            total_tickers=len(tickers),
            processed_tickers=0,
            started_at=datetime.now().isoformat()
        )

        # Start background task
        background_tasks.add_task(
            populate_stocks_background,
            task_id,
            tickers,
            request.include_fundamentals,
            request.include_prices,
            request.price_days
        )

        return {
            "task_id": task_id,
            "method": request.method,
            "source": request.source,
            "total_tickers": len(tickers),
            "status": "started"
        }

    except Exception as e:
        logger.error(f"Failed to start population task: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/v2/database/populate/{task_id}")
async def get_populate_progress(task_id: str) -> PopulateProgress:
    """Get progress of a population task"""
    if task_id not in populate_tasks:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    return populate_tasks[task_id]


@router.get("/api/v2/database/populate/methods/available")
async def get_available_methods() -> Dict[str, Any]:
    """
    Get available population methods and popular ETFs/indices.

    Returns:
        Available methods with examples and popular sources
    """
    return {
        "methods": [
            {
                "id": "etf",
                "name": "ETF Constituents",
                "description": "Populate from ETF holdings",
                "requires_source": True
            },
            {
                "id": "index",
                "name": "Index Constituents",
                "description": "Populate from market index",
                "requires_source": True
            },
            {
                "id": "custom",
                "name": "Custom List",
                "description": "Populate from custom ticker list",
                "requires_tickers": True
            }
        ],
        "popular_etfs": [
            {"symbol": "SPY.US", "name": "SPDR S&P 500 ETF", "approx_holdings": 500},
            {"symbol": "QQQ.US", "name": "Invesco QQQ Trust", "approx_holdings": 100},
            {"symbol": "IWM.US", "name": "iShares Russell 2000 ETF", "approx_holdings": 2000},
            {"symbol": "DIA.US", "name": "SPDR Dow Jones Industrial Average", "approx_holdings": 30},
            {"symbol": "VTI.US", "name": "Vanguard Total Stock Market ETF", "approx_holdings": 3500},
        ],
        "popular_indices": [
            {"symbol": "GSPC.INDX", "name": "S&P 500 Index", "approx_constituents": 500},
            {"symbol": "DJI.INDX", "name": "Dow Jones Industrial Average", "approx_constituents": 30},
            {"symbol": "IXIC.INDX", "name": "NASDAQ Composite", "approx_constituents": 3000},
        ]
    }


async def get_etf_constituents(etf_symbol: str) -> List[str]:
    """Get list of tickers from ETF holdings"""
    try:
        client = EODHDClient(api_key=settings.eodhd_api_key)

        # Fetch ETF holdings
        holdings_data = client.special.get_etf_holdings(etf_symbol)

        # Extract tickers from holdings
        tickers = []
        if 'Holdings' in holdings_data and isinstance(holdings_data['Holdings'], dict):
            for ticker, holding in holdings_data['Holdings'].items():
                # Add .US suffix if not present
                if '.' not in ticker:
                    ticker = f"{ticker}.US"
                tickers.append(ticker)

        logger.info(f"Found {len(tickers)} constituents in {etf_symbol}")
        return tickers

    except Exception as e:
        logger.error(f"Failed to get ETF constituents for {etf_symbol}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch ETF holdings: {str(e)}")


async def get_index_constituents(index_symbol: str) -> List[str]:
    """Get list of tickers from index constituents"""
    try:
        client = EODHDClient(api_key=settings.eodhd_api_key)

        # Fetch index constituents
        constituents_data = client.special.get_index_constituents(index_symbol)

        # Extract tickers from components
        tickers = []
        if 'Components' in constituents_data and isinstance(constituents_data['Components'], dict):
            for ticker in constituents_data['Components'].keys():
                # Add .US suffix if not present
                if '.' not in ticker:
                    ticker = f"{ticker}.US"
                tickers.append(ticker)

        logger.info(f"Found {len(tickers)} constituents in {index_symbol}")
        return tickers

    except Exception as e:
        logger.error(f"Failed to get index constituents for {index_symbol}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch index constituents: {str(e)}")


async def populate_stocks_background(
    task_id: str,
    tickers: List[str],
    include_fundamentals: bool,
    include_prices: bool,
    price_days: int
):
    """
    Background task to populate stocks.

    This runs asynchronously and updates progress tracker.
    """
    try:
        populate_tasks[task_id].status = 'running'
        client = EODHDClient(api_key=settings.eodhd_api_key)
        db = next(get_db())

        total = len(tickers)
        errors = []

        for idx, ticker in enumerate(tickers):
            try:
                # Update progress
                populate_tasks[task_id].current_ticker = ticker
                populate_tasks[task_id].processed_tickers = idx
                populate_tasks[task_id].progress = (idx / total) * 100

                # Extract exchange and symbol
                if '.' in ticker:
                    symbol, exchange_code = ticker.split('.')
                else:
                    symbol = ticker
                    exchange_code = 'US'

                # 1. Add company to database
                existing = db.query(Company).filter_by(ticker=ticker).first()
                if not existing:
                    # Fetch company fundamentals for metadata
                    try:
                        fund_data = client.fundamental.get_fundamentals(ticker)
                        general = fund_data.get('General', {})

                        # Get or create exchange
                        exchange = db.query(Exchange).filter_by(code=exchange_code).first()
                        if not exchange:
                            exchange = Exchange(
                                code=exchange_code,
                                name=f"{exchange_code} Exchange",
                                country='United States',
                                timezone='America/New_York'
                            )
                            db.add(exchange)
                            db.commit()

                        # Create company
                        company = Company(
                            ticker=ticker,
                            name=general.get('Name', symbol),
                            exchange_id=exchange.id,
                            description=general.get('Description'),
                            website=general.get('WebURL')
                        )
                        db.add(company)
                        db.commit()
                        logger.info(f"Added company: {ticker}")
                    except Exception as e:
                        logger.warning(f"Failed to add company {ticker}: {e}")
                        continue

                # 2. Add fundamentals (if requested)
                if include_fundamentals:
                    try:
                        fund_data = client.fundamental.get_fundamentals(ticker)
                        financials = fund_data.get('Financials', {})

                        # Store quarterly and annual financials
                        for period_type in ['quarterly', 'yearly']:
                            period_data = financials.get('Balance_Sheet', {}).get(period_type, {})

                            for date_str, values in period_data.items():
                                # Check if already exists
                                existing_fund = db.query(Fundamental).filter_by(
                                    ticker=ticker,
                                    fiscal_date=date_str,
                                    period_type=period_type
                                ).first()

                                if not existing_fund:
                                    fundamental = Fundamental(
                                        ticker=ticker,
                                        fiscal_date=date_str,
                                        period_type=period_type,
                                        total_assets=values.get('totalAssets'),
                                        total_liabilities=values.get('totalLiab'),
                                        total_equity=values.get('totalStockholderEquity'),
                                        # Add more fields as needed
                                    )
                                    db.add(fundamental)

                        db.commit()
                        logger.info(f"Added fundamentals for {ticker}")
                    except Exception as e:
                        logger.warning(f"Failed to add fundamentals for {ticker}: {e}")

                # 3. Add historical prices (if requested)
                if include_prices:
                    try:
                        end_date = datetime.now()
                        start_date = end_date - timedelta(days=price_days)

                        prices = client.historical.get_eod_data(
                            ticker,
                            from_date=start_date.strftime('%Y-%m-%d'),
                            to_date=end_date.strftime('%Y-%m-%d')
                        )

                        for price_data in prices:
                            date_str = price_data.get('date')

                            # Check if already exists
                            existing_price = db.query(OHLCV).filter_by(
                                ticker=ticker,
                                timestamp=date_str
                            ).first()

                            if not existing_price:
                                ohlcv = OHLCV(
                                    ticker=ticker,
                                    timestamp=date_str,
                                    open=price_data.get('open'),
                                    high=price_data.get('high'),
                                    low=price_data.get('low'),
                                    close=price_data.get('close'),
                                    adjusted_close=price_data.get('adjusted_close'),
                                    volume=price_data.get('volume')
                                )
                                db.add(ohlcv)

                        db.commit()
                        logger.info(f"Added {len(prices)} price records for {ticker}")
                    except Exception as e:
                        logger.warning(f"Failed to add prices for {ticker}: {e}")

            except Exception as e:
                error_msg = f"{ticker}: {str(e)}"
                errors.append(error_msg)
                logger.error(f"Error processing {ticker}: {e}")

        # Mark as completed
        populate_tasks[task_id].status = 'completed'
        populate_tasks[task_id].progress = 100
        populate_tasks[task_id].processed_tickers = total
        populate_tasks[task_id].completed_at = datetime.now().isoformat()
        populate_tasks[task_id].errors = errors

        db.close()

        logger.info(f"Population task {task_id} completed. Processed {total} tickers with {len(errors)} errors.")

    except Exception as e:
        populate_tasks[task_id].status = 'failed'
        populate_tasks[task_id].errors.append(f"Fatal error: {str(e)}")
        logger.error(f"Population task {task_id} failed: {e}", exc_info=True)
