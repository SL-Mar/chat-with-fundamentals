"""
Portfolio Management and Analysis Router

Provides CRUD operations for portfolios and advanced analytics:
- Equal-weight portfolio analysis
- Mean-Variance Optimization (MVO)
- Minimum Variance optimization
- Black-Litterman model
- Monte Carlo simulation
- Value at Risk (VaR) calculations
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import logging
from scipy.optimize import minimize
from scipy import stats

logger = logging.getLogger(__name__)
from pypfopt import EfficientFrontier, BlackLittermanModel, risk_models, expected_returns

from database.models.base import get_db
from database.models import Portfolio, PortfolioStock, OHLCV, Company
from tools.eodhd_client import EODHDClient
import os

router = APIRouter(prefix="/api/portfolios", tags=["portfolios"])


# ========== Pydantic Models ==========

class PortfolioCreate(BaseModel):
    name: str
    description: Optional[str] = None


class PortfolioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class AddStockRequest(BaseModel):
    ticker: str
    weight: Optional[float] = None  # 0-1 (e.g., 0.25 for 25%)
    shares: Optional[float] = None


class BulkWeightUpdate(BaseModel):
    weights: Dict[str, float]  # ticker -> weight (0-1)


class BulkSharesUpdate(BaseModel):
    shares: Dict[str, float]  # ticker -> number of shares


class WeightsToSharesRequest(BaseModel):
    weights: Dict[str, float]  # ticker -> weight (0-1)
    portfolio_value: float  # Total portfolio value in dollars


class WeightsToSharesResponse(BaseModel):
    shares: Dict[str, float]  # ticker -> number of shares
    total_value: float
    current_prices: Dict[str, float]  # ticker -> current price


class PortfolioStockResponse(BaseModel):
    id: int
    ticker: str
    weight: Optional[float]
    shares: Optional[float]
    added_at: datetime

    class Config:
        from_attributes = True


class PortfolioResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    stocks: List[PortfolioStockResponse]

    class Config:
        from_attributes = True


class PortfolioAnalysisResponse(BaseModel):
    portfolio_id: int
    portfolio_name: str
    tickers: List[str]
    start_date: str
    end_date: str
    equity_curve: List[Dict[str, Any]]  # [{date: str, value: float, daily_return: float}]
    metrics: Dict[str, float]  # {total_return, annualized_return, volatility, sharpe_ratio, max_drawdown}
    weights: Dict[str, float]  # {ticker: weight}
    rolling_sharpe_curves: Optional[Dict[str, List[Dict[str, Any]]]] = None  # {rolling_sharpe_5d: [{date, value}], ...}


class MonteCarloPath(BaseModel):
    dates: List[str]
    values: List[float]


class MonteCarloResponse(BaseModel):
    portfolio_id: int
    portfolio_name: str
    num_simulations: int
    time_horizon_days: int
    initial_value: float
    paths: List[MonteCarloPath]
    percentile_5th: List[float]
    percentile_50th: List[float]
    percentile_95th: List[float]
    final_value_mean: float
    final_value_median: float
    final_value_std: float
    final_value_min: float
    final_value_max: float
    final_value_5th: float
    final_value_95th: float


class VaRResponse(BaseModel):
    portfolio_id: int
    portfolio_name: str
    initial_value: float
    time_horizon_days: int
    confidence_level: float
    var_value: float  # Value at Risk (absolute loss)
    var_percent: float  # VaR as percentage
    cvar_value: float  # Conditional VaR (Expected Shortfall)
    cvar_percent: float
    historical_var: float
    parametric_var: float


# ========== Helper Functions ==========

def calculate_portfolio_value_at_date(
    portfolio: Portfolio,
    prices_df: pd.DataFrame,
    date_index: int = 0
) -> float:
    """
    Calculate portfolio value from actual shares at a specific date.

    Args:
        portfolio: Portfolio object with shares
        prices_df: Price data DataFrame
        date_index: Index in prices_df (0 = first date, -1 = last date)

    Returns:
        Total portfolio value (sum of shares × price_at_date for each stock)
    """
    if prices_df.empty:
        return 0.0

    portfolio_value = 0.0
    target_date = prices_df.index[date_index]

    for stock in portfolio.stocks:
        if not stock.shares or stock.shares <= 0:
            continue

        if stock.ticker not in prices_df.columns:
            logger.warning(f"No price data for {stock.ticker}, skipping from portfolio value")
            continue

        # Get price at target date
        price_at_date = float(prices_df.loc[target_date, stock.ticker])
        stock_value = stock.shares * price_at_date
        portfolio_value += stock_value

    return portfolio_value


def fetch_price_data(
    tickers: List[str],
    start_date: str,
    end_date: str,
    db: Session,
    use_adjusted: bool = True
) -> pd.DataFrame:
    """
    Fetch price data from database or EODHD API.

    Args:
        tickers: List of ticker symbols
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        db: Database session
        use_adjusted: Use adjusted close prices (default True)

    Returns:
        DataFrame with dates as index and tickers as columns
    """
    price_data = {}
    client = EODHDClient()

    for ticker in tickers:
        # Try database first - need to get company_id from ticker
        company = db.query(Company).filter(Company.ticker == ticker).first()

        if company:
            db_prices = db.query(OHLCV).filter(
                OHLCV.company_id == company.id,
                OHLCV.date >= start_date,
                OHLCV.date <= end_date
            ).order_by(OHLCV.date).all()

            if db_prices and len(db_prices) > 0:
                # Use database data
                df = pd.DataFrame([{
                    'date': p.date,
                    'close': p.adjusted_close if use_adjusted else p.close
                } for p in db_prices])
                df['date'] = pd.to_datetime(df['date'])
                df = df.set_index('date')
                price_data[ticker] = df['close']
                continue

        # Fallback to EODHD API if no database data
        try:
                ticker_with_exchange = ticker if '.' in ticker else f"{ticker}.US"
                eod_data = client.historical.get_eod(
                    ticker_with_exchange,
                    from_date=start_date,
                    to_date=end_date
                )

                if eod_data:
                    df = pd.DataFrame(eod_data)
                    df['date'] = pd.to_datetime(df['date'])
                    df = df.set_index('date')
                    price_field = 'adjusted_close' if use_adjusted else 'close'
                    price_data[ticker] = df[price_field]
        except Exception as e:
            print(f"Error fetching {ticker}: {e}")
            continue

    if not price_data:
        raise HTTPException(status_code=400, detail="Could not fetch price data for any tickers")

    # Create price DataFrame and remove missing data
    prices_df = pd.DataFrame(price_data)
    prices_df = prices_df.dropna()

    if len(prices_df) == 0:
        raise HTTPException(status_code=400, detail="No overlapping price data found")

    return prices_df


def calculate_portfolio_metrics(
    portfolio_returns: pd.Series,
    initial_value: float = 10000
) -> Dict[str, float]:
    """Calculate portfolio performance metrics with rolling Sharpe ratios."""

    # Calculate equity curve
    equity_curve = (1 + portfolio_returns).cumprod() * initial_value

    # Total return
    total_return = (equity_curve.iloc[-1] / initial_value - 1) * 100

    # Annualized return
    n_days = len(equity_curve)
    n_years = n_days / 252
    annualized_return = ((equity_curve.iloc[-1] / initial_value) ** (1 / n_years) - 1) * 100 if n_years > 0 else 0

    # Volatility (annualized)
    volatility = portfolio_returns.std() * np.sqrt(252) * 100

    # Sharpe ratio (assuming 0% risk-free rate)
    sharpe_ratio = (annualized_return / volatility) if volatility > 0 else 0

    # Max drawdown
    cumulative = (1 + portfolio_returns).cumprod()
    running_max = cumulative.expanding().max()
    drawdown = (cumulative - running_max) / running_max
    max_drawdown = drawdown.min() * 100

    # Rolling Sharpe ratios (20, 60 trading days)
    # Calculate annualized rolling mean and std, then Sharpe
    rolling_sharpe_20 = None
    rolling_sharpe_60 = None

    if len(portfolio_returns) >= 20:
        rolling_mean_20 = portfolio_returns.rolling(window=20).mean() * 252
        rolling_std_20 = portfolio_returns.rolling(window=20).std() * np.sqrt(252)
        rolling_sharpe_20 = (rolling_mean_20 / rolling_std_20).iloc[-1]
        rolling_sharpe_20 = round(float(rolling_sharpe_20), 2) if not pd.isna(rolling_sharpe_20) else None

    if len(portfolio_returns) >= 60:
        rolling_mean_60 = portfolio_returns.rolling(window=60).mean() * 252
        rolling_std_60 = portfolio_returns.rolling(window=60).std() * np.sqrt(252)
        rolling_sharpe_60 = (rolling_mean_60 / rolling_std_60).iloc[-1]
        rolling_sharpe_60 = round(float(rolling_sharpe_60), 2) if not pd.isna(rolling_sharpe_60) else None

    return {
        "total_return": round(total_return, 2),
        "annualized_return": round(annualized_return, 2),
        "volatility": round(volatility, 2),
        "sharpe_ratio": round(sharpe_ratio, 2),
        "max_drawdown": round(max_drawdown, 2),
        "rolling_sharpe_20d": rolling_sharpe_20,
        "rolling_sharpe_60d": rolling_sharpe_60
    }


# ========== CRUD Endpoints ==========

@router.post("", response_model=PortfolioResponse)
def create_portfolio(portfolio: PortfolioCreate, db: Session = Depends(get_db)):
    """Create a new portfolio."""
    db_portfolio = Portfolio(
        name=portfolio.name,
        description=portfolio.description
    )
    db.add(db_portfolio)
    db.commit()
    db.refresh(db_portfolio)
    return db_portfolio


@router.get("", response_model=List[PortfolioResponse])
def list_portfolios(db: Session = Depends(get_db)):
    """Get all portfolios."""
    portfolios = db.query(Portfolio).order_by(Portfolio.created_at.desc()).all()
    return portfolios


@router.get("/{portfolio_id}", response_model=PortfolioResponse)
def get_portfolio(portfolio_id: int, db: Session = Depends(get_db)):
    """Get a specific portfolio by ID."""
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio


@router.patch("/{portfolio_id}", response_model=PortfolioResponse)
def update_portfolio(portfolio_id: int, updates: PortfolioUpdate, db: Session = Depends(get_db)):
    """Update portfolio name or description."""
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    if updates.name is not None:
        portfolio.name = updates.name
    if updates.description is not None:
        portfolio.description = updates.description

    db.commit()
    db.refresh(portfolio)
    return portfolio


@router.delete("/{portfolio_id}")
def delete_portfolio(portfolio_id: int, db: Session = Depends(get_db)):
    """Delete a portfolio."""
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    db.delete(portfolio)
    db.commit()
    return {"message": "Portfolio deleted successfully"}


@router.post("/{portfolio_id}/stocks", response_model=PortfolioResponse)
def add_stock_to_portfolio(
    portfolio_id: int,
    stock: AddStockRequest,
    db: Session = Depends(get_db)
):
    """
    Add a stock to a portfolio.
    If shares are provided, weights will be automatically calculated for ALL stocks.
    """
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Check if stock already exists
    existing = db.query(PortfolioStock).filter(
        PortfolioStock.portfolio_id == portfolio_id,
        PortfolioStock.ticker == stock.ticker.upper()
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Stock already in portfolio")

    # Add new stock
    portfolio_stock = PortfolioStock(
        portfolio_id=portfolio_id,
        ticker=stock.ticker.upper(),
        weight=stock.weight,
        shares=stock.shares
    )
    db.add(portfolio_stock)
    db.commit()

    # If shares were provided, recalculate weights for entire portfolio
    logger.info(f"Stock added: {stock.ticker}, shares={stock.shares}, weight={stock.weight}")
    if stock.shares is not None and stock.shares > 0:
        logger.info(f"Recalculating weights for portfolio {portfolio_id} (shares provided: {stock.shares})")
        eodhd = EODHDClient(api_key=os.getenv("EODHD_API_KEY"))
        portfolio_values = {}

        # Get all stocks including the newly added one
        all_stocks = db.query(PortfolioStock).filter(
            PortfolioStock.portfolio_id == portfolio_id
        ).all()

        # Calculate portfolio value
        for pstock in all_stocks:
            if pstock.shares is None or pstock.shares == 0:
                # Skip stocks without shares
                continue

            try:
                end_date = datetime.now().strftime("%Y-%m-%d")
                start_date = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")

                # Add .US suffix if not present (EODHD requires exchange suffix)
                ticker_with_exchange = pstock.ticker if '.' in pstock.ticker else f"{pstock.ticker}.US"
                eod_data = eodhd.historical.get_eod(ticker_with_exchange, from_date=start_date, to_date=end_date)
                if not eod_data:
                    logger.warning(f"No price data for {pstock.ticker}, skipping weight calculation")
                    continue

                df = pd.DataFrame(eod_data)
                current_price = float(df.iloc[-1]['close'])
                position_value = pstock.shares * current_price
                portfolio_values[pstock.ticker] = (pstock.shares, current_price, position_value)
            except Exception as e:
                logger.error(f"Failed to fetch price for {pstock.ticker}: {e}")
                continue

        # Calculate total value and update weights
        if portfolio_values:
            total_value = sum(pv[2] for pv in portfolio_values.values())

            for pstock in all_stocks:
                if pstock.ticker in portfolio_values:
                    _, _, value = portfolio_values[pstock.ticker]
                    pstock.weight = value / total_value

            db.commit()
            logger.info(f"Recalculated weights for portfolio {portfolio_id}. Total value: ${total_value:,.2f}")

    db.refresh(portfolio)
    return portfolio


@router.delete("/{portfolio_id}/stocks/{ticker}")
def remove_stock_from_portfolio(
    portfolio_id: int,
    ticker: str,
    db: Session = Depends(get_db)
):
    """Remove a stock from a portfolio."""
    stock = db.query(PortfolioStock).filter(
        PortfolioStock.portfolio_id == portfolio_id,
        PortfolioStock.ticker == ticker.upper()
    ).first()

    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found in portfolio")

    db.delete(stock)
    db.commit()
    return {"message": "Stock removed from portfolio"}


@router.patch("/{portfolio_id}/stocks/{ticker}")
def update_stock_in_portfolio(
    portfolio_id: int,
    ticker: str,
    updates: AddStockRequest,
    db: Session = Depends(get_db)
):
    """Update stock weight or shares in a portfolio."""
    stock = db.query(PortfolioStock).filter(
        PortfolioStock.portfolio_id == portfolio_id,
        PortfolioStock.ticker == ticker.upper()
    ).first()

    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found in portfolio")

    if updates.weight is not None:
        stock.weight = updates.weight
    if updates.shares is not None:
        stock.shares = updates.shares

    db.commit()
    return {"message": "Stock updated successfully"}


@router.put("/{portfolio_id}/shares", response_model=PortfolioResponse)
def update_portfolio_shares(
    portfolio_id: int,
    shares_update: BulkSharesUpdate,
    db: Session = Depends(get_db)
):
    """
    Update shares for all stocks in portfolio and automatically calculate weights.
    Weights are calculated based on: (shares × current_price) / total_portfolio_value
    """
    # Verify portfolio exists
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Get current prices for all stocks
    eodhd = EODHDClient(api_key=os.getenv("EODHD_API_KEY"))
    portfolio_values = {}  # ticker -> (shares, price, value)

    for ticker, shares in shares_update.shares.items():
        ticker_upper = ticker.upper()

        # Fetch current price from EODHD (latest close price)
        try:
            # Get last 1 day of data
            end_date = datetime.now().strftime("%Y-%m-%d")
            start_date = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")

            # Add .US suffix if not present (EODHD requires exchange suffix)
            ticker_with_exchange = ticker_upper if '.' in ticker_upper else f"{ticker_upper}.US"
            eod_data = eodhd.historical.get_eod(ticker_with_exchange, from_date=start_date, to_date=end_date)
            if not eod_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"No price data available for {ticker_upper}"
                )

            df = pd.DataFrame(eod_data)
            current_price = float(df.iloc[-1]['close'])
            position_value = shares * current_price
            portfolio_values[ticker_upper] = (shares, current_price, position_value)

        except Exception as e:
            logger.error(f"Failed to fetch price for {ticker_upper}: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to fetch current price for {ticker_upper}"
            )

    # Calculate total portfolio value
    total_value = sum(pv[2] for pv in portfolio_values.values())

    if total_value == 0:
        raise HTTPException(
            status_code=400,
            detail="Portfolio value is zero - cannot calculate weights"
        )

    # Update shares and weights for each stock
    updated_count = 0
    for ticker_upper, (shares, price, value) in portfolio_values.items():
        weight = value / total_value

        stock = db.query(PortfolioStock).filter(
            PortfolioStock.portfolio_id == portfolio_id,
            PortfolioStock.ticker == ticker_upper
        ).first()

        if stock:
            stock.shares = shares
            stock.weight = weight
            updated_count += 1
        else:
            logger.warning(f"Stock {ticker_upper} not found in portfolio {portfolio_id}")

    # Update portfolio timestamp
    portfolio.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(portfolio)

    logger.info(f"Updated {updated_count} stocks in portfolio {portfolio_id}. Total value: ${total_value:,.2f}")

    return portfolio


@router.post("/{portfolio_id}/weights-to-shares", response_model=WeightsToSharesResponse)
def convert_weights_to_shares(
    portfolio_id: int,
    request: WeightsToSharesRequest,
    db: Session = Depends(get_db)
):
    """
    Convert optimized weights to number of shares based on target portfolio value.
    This is used when applying optimization results to determine how many shares to buy.
    """
    # Verify portfolio exists
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Get current prices for all stocks
    eodhd = EODHDClient(api_key=os.getenv("EODHD_API_KEY"))
    current_prices = {}
    shares_result = {}

    for ticker, weight in request.weights.items():
        ticker_upper = ticker.upper()

        # Fetch current price
        try:
            end_date = datetime.now().strftime("%Y-%m-%d")
            start_date = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")

            # Add .US suffix if not present (EODHD requires exchange suffix)
            ticker_with_exchange = ticker_upper if '.' in ticker_upper else f"{ticker_upper}.US"
            eod_data = eodhd.historical.get_eod(ticker_with_exchange, from_date=start_date, to_date=end_date)
            if not eod_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"No price data available for {ticker_upper}"
                )

            df = pd.DataFrame(eod_data)
            current_price = float(df.iloc[-1]['close'])
            current_prices[ticker_upper] = current_price

            # Calculate shares: (portfolio_value × weight) / current_price
            target_value = request.portfolio_value * weight
            shares = target_value / current_price
            # Round to whole shares (no fractional shares)
            shares_result[ticker_upper] = round(shares)

        except Exception as e:
            logger.error(f"Failed to fetch price for {ticker_upper}: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to fetch current price for {ticker_upper}"
            )

    # Calculate actual total value (may differ slightly due to rounding)
    total_value = sum(
        shares_result[ticker] * current_prices[ticker]
        for ticker in shares_result.keys()
    )

    return WeightsToSharesResponse(
        shares=shares_result,
        total_value=total_value,
        current_prices=current_prices
    )


@router.put("/{portfolio_id}/weights", response_model=PortfolioResponse)
def update_portfolio_weights(
    portfolio_id: int,
    weight_update: BulkWeightUpdate,
    db: Session = Depends(get_db)
):
    """Bulk update weights for all stocks in portfolio."""
    # Verify portfolio exists
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Validate weights sum to 1.0 (with small tolerance for floating point)
    total_weight = sum(weight_update.weights.values())
    if abs(total_weight - 1.0) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Weights must sum to 1.0 (100%), got {total_weight:.4f}"
        )

    # Update each stock's weight
    updated_count = 0
    for ticker, weight in weight_update.weights.items():
        stock = db.query(PortfolioStock).filter(
            PortfolioStock.portfolio_id == portfolio_id,
            PortfolioStock.ticker == ticker.upper()
        ).first()

        if stock:
            stock.weight = weight
            updated_count += 1
        else:
            logger.warning(f"Stock {ticker} not found in portfolio {portfolio_id}")

    # Update portfolio timestamp
    portfolio.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(portfolio)

    return portfolio


# ========== Analysis Endpoints ==========

@router.get("/{portfolio_id}/analysis/actual", response_model=PortfolioAnalysisResponse)
def analyze_actual_portfolio(
    portfolio_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    use_adjusted: bool = True,
    db: Session = Depends(get_db)
):
    """
    Analyze portfolio based on ACTUAL shares held.
    Uses current weights calculated from shares × prices.
    Returns equity curve and performance metrics.
    """
    # Get portfolio
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    if len(portfolio.stocks) == 0:
        raise HTTPException(status_code=400, detail="Portfolio has no stocks")

    # Check if all stocks have shares defined
    stocks_with_shares = [s for s in portfolio.stocks if s.shares and s.shares > 0]
    if len(stocks_with_shares) == 0:
        raise HTTPException(
            status_code=400,
            detail="No stocks have shares defined. Add shares to stocks first."
        )

    tickers = [stock.ticker for stock in portfolio.stocks]

    # Set default date range (last 1 year)
    if not end_date:
        end_date = datetime.now().strftime("%Y-%m-%d")
    if not start_date:
        start_date = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")

    # Fetch price data
    prices_df = fetch_price_data(
        tickers, start_date, end_date, db, use_adjusted
    )

    # Normalize actual portfolio to $10,000 starting value for fair comparison
    # Calculate weights based on actual shares at start date
    starting_portfolio_value = 10000
    equity_curve_data = []

    # Calculate actual portfolio value at start date
    start_date_obj = prices_df.index[0]
    actual_start_value = 0.0
    for stock in portfolio.stocks:
        if stock.shares and stock.shares > 0 and stock.ticker in prices_df.columns:
            price_at_start = float(prices_df.loc[start_date_obj, stock.ticker])
            actual_start_value += stock.shares * price_at_start

    # Calculate scaling factor to normalize to $10,000
    scaling_factor = starting_portfolio_value / actual_start_value if actual_start_value > 0 else 0

    # Calculate normalized shares (scaled to start at $10,000)
    normalized_shares = {}
    for stock in portfolio.stocks:
        if stock.shares and stock.shares > 0:
            normalized_shares[stock.ticker] = stock.shares * scaling_factor

    for date in prices_df.index:
        portfolio_value = 0.0

        for ticker, shares in normalized_shares.items():
            if ticker not in prices_df.columns:
                continue

            # Get price at this date
            price_at_date = float(prices_df.loc[date, ticker])
            stock_value = shares * price_at_date
            portfolio_value += stock_value

        # Calculate daily return (percentage change from previous day)
        daily_return = 0.0
        if len(equity_curve_data) > 0:
            prev_value = equity_curve_data[-1]["value"]
            if prev_value > 0:
                daily_return = (portfolio_value - prev_value) / prev_value

        equity_curve_data.append({
            "date": str(date.date()),
            "value": float(portfolio_value),
            "daily_return": float(daily_return)
        })

    # Calculate weights at the start date (based on actual portfolio composition)
    weights = {}
    total_value_start = equity_curve_data[0]["value"] if equity_curve_data else 0

    for ticker, shares in normalized_shares.items():
        if ticker in prices_df.columns:
            price = float(prices_df.loc[start_date_obj, ticker])
            stock_value = shares * price
            weights[ticker] = stock_value / total_value_start if total_value_start > 0 else 0

    # Calculate returns for metrics (daily percentage changes)
    values = pd.Series([item["value"] for item in equity_curve_data], index=prices_df.index)
    portfolio_returns = values.pct_change().dropna()

    # Calculate metrics
    metrics = calculate_portfolio_metrics(portfolio_returns)

    # Calculate rolling Sharpe ratio curves (time series)
    rolling_sharpe_curves = {}

    for window, label in [(20, 'rolling_sharpe_20d'), (60, 'rolling_sharpe_60d')]:
        if len(portfolio_returns) >= window:
            rolling_mean = portfolio_returns.rolling(window=window).mean() * 252
            rolling_std = portfolio_returns.rolling(window=window).std() * np.sqrt(252)
            rolling_sharpe = rolling_mean / rolling_std

            # Convert to list of {date, value} objects
            rolling_sharpe_curves[label] = [
                {
                    "date": str(date.date()),
                    "value": float(sharpe) if not pd.isna(sharpe) else None
                }
                for date, sharpe in rolling_sharpe.items()
            ]

    equity_data = equity_curve_data

    return PortfolioAnalysisResponse(
        portfolio_id=portfolio_id,
        portfolio_name=portfolio.name,
        tickers=tickers,
        start_date=start_date,
        end_date=end_date,
        equity_curve=equity_data,
        metrics=metrics,
        weights=weights,
        rolling_sharpe_curves=rolling_sharpe_curves
    )


@router.get("/{portfolio_id}/analysis/equal-weight", response_model=PortfolioAnalysisResponse)
def analyze_equal_weight_portfolio(
    portfolio_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    use_adjusted: bool = True,
    db: Session = Depends(get_db)
):
    """
    Analyze portfolio with equal weighting.
    Uses the same starting portfolio value as actual portfolio for fair comparison.
    Returns equity curve and performance metrics.
    """
    # Get portfolio
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    if len(portfolio.stocks) == 0:
        raise HTTPException(status_code=400, detail="Portfolio has no stocks")

    tickers = [stock.ticker for stock in portfolio.stocks]

    # Set default date range (last 1 year)
    if not end_date:
        end_date = datetime.now().strftime("%Y-%m-%d")
    if not start_date:
        start_dt = datetime.now().replace(year=datetime.now().year - 1)
        start_date = start_dt.strftime("%Y-%m-%d")

    # Fetch price data
    prices_df = fetch_price_data(tickers, start_date, end_date, db, use_adjusted)

    # For Equal Weight, use a generic starting value of $10,000
    # This allows fair comparison against actual portfolio performance
    starting_portfolio_value = 10000

    # Equal weight
    n_stocks = len(prices_df.columns)
    equal_weights = {ticker: 1.0 / n_stocks for ticker in prices_df.columns}

    # Calculate portfolio value at each date using equal weights
    # Imagine we allocated starting_portfolio_value equally across stocks at start date
    # Then track how that allocation performs over time
    equity_curve_data = []

    # Calculate initial shares for each stock based on equal weight allocation
    start_date = prices_df.index[0]
    initial_investment_per_stock = starting_portfolio_value / n_stocks
    shares_per_stock = {}

    for ticker in prices_df.columns:
        start_price = float(prices_df.loc[start_date, ticker])
        if start_price > 0:
            shares_per_stock[ticker] = initial_investment_per_stock / start_price
        else:
            shares_per_stock[ticker] = 0

    # Now calculate portfolio value at each date
    for date in prices_df.index:
        portfolio_value = 0.0

        for ticker in prices_df.columns:
            if ticker in shares_per_stock and shares_per_stock[ticker] > 0:
                price_at_date = float(prices_df.loc[date, ticker])
                portfolio_value += shares_per_stock[ticker] * price_at_date

        # Calculate daily return
        daily_return = 0.0
        if len(equity_curve_data) > 0:
            prev_value = equity_curve_data[-1]["value"]
            if prev_value > 0:
                daily_return = (portfolio_value - prev_value) / prev_value

        equity_curve_data.append({
            "date": str(date.date()),
            "value": float(portfolio_value),
            "daily_return": float(daily_return)
        })

    # Calculate returns for metrics
    values = pd.Series([item["value"] for item in equity_curve_data], index=prices_df.index)
    portfolio_returns = values.pct_change().dropna()

    # Calculate metrics
    metrics = calculate_portfolio_metrics(portfolio_returns)

    return PortfolioAnalysisResponse(
        portfolio_id=portfolio_id,
        portfolio_name=portfolio.name,
        tickers=list(prices_df.columns),
        start_date=prices_df.index[0].strftime("%Y-%m-%d"),
        end_date=prices_df.index[-1].strftime("%Y-%m-%d"),
        equity_curve=equity_curve_data,
        metrics=metrics,
        weights=equal_weights
    )


@router.get("/{portfolio_id}/analysis/optimized", response_model=PortfolioAnalysisResponse)
def analyze_optimized_portfolio(
    portfolio_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    method: str = "mvo",  # "mvo", "min_variance", "black_litterman"
    use_adjusted: bool = True,
    db: Session = Depends(get_db)
):
    """
    Analyze portfolio with optimization methods.
    Uses the same starting portfolio value as actual portfolio for fair comparison.

    Methods:
    - mvo: Mean-Variance Optimization (maximize Sharpe ratio)
    - min_variance: Minimum Variance Portfolio
    - black_litterman: Black-Litterman model with market equilibrium
    """
    # Get portfolio
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    if len(portfolio.stocks) == 0:
        raise HTTPException(status_code=400, detail="Portfolio has no stocks")

    tickers = [stock.ticker for stock in portfolio.stocks]

    # Set default date range
    if not end_date:
        end_date = datetime.now().strftime("%Y-%m-%d")
    if not start_date:
        start_dt = datetime.now().replace(year=datetime.now().year - 1)
        start_date = start_dt.strftime("%Y-%m-%d")

    # Fetch price data
    prices_df = fetch_price_data(tickers, start_date, end_date, db, use_adjusted)

    # For Optimized, use a generic starting value of $10,000
    # This allows fair comparison against actual portfolio performance
    starting_portfolio_value = 10000

    # Calculate returns
    returns = prices_df.pct_change().dropna()

    # Check for flat/zero-variance stocks
    std_devs = returns.std()
    flat_stocks = std_devs[std_devs < 1e-8].index.tolist()

    if flat_stocks:
        raise HTTPException(
            status_code=400,
            detail=f"Stocks with flat price curves: {', '.join(flat_stocks)}. Remove before optimization."
        )

    # Use PyPortfolioOpt for optimization
    mu = expected_returns.mean_historical_return(prices_df, frequency=252)
    S = risk_models.sample_cov(prices_df, frequency=252)

    # Run optimization based on method
    if method == "mvo":
        ef = EfficientFrontier(mu, S)
        raw_weights = ef.max_sharpe()
        optimal_weights_dict = ef.clean_weights()
        method_label = "Mean-Variance Optimized"

    elif method == "min_variance":
        ef = EfficientFrontier(mu, S)
        raw_weights = ef.min_volatility()
        optimal_weights_dict = ef.clean_weights()
        method_label = "Minimum Variance"

    elif method == "black_litterman":
        # Black-Litterman Model
        # Use equal weights as market weight proxy (no market cap data available)
        n = len(prices_df.columns)
        market_caps = pd.Series([1.0 / n] * n, index=prices_df.columns)

        delta = 2.5  # Risk aversion coefficient
        pi = delta * S.dot(market_caps)  # Market-implied equilibrium returns
        tau = 0.025  # Uncertainty in prior

        bl_returns = pi
        bl_cov = (1 + tau) * S

        ef = EfficientFrontier(bl_returns, bl_cov)
        raw_weights = ef.max_sharpe()
        optimal_weights_dict = ef.clean_weights()
        method_label = "Black-Litterman"

    else:
        raise HTTPException(status_code=400, detail="Invalid method. Use 'mvo', 'min_variance', or 'black_litterman'")

    # Convert to numpy array
    optimal_weights = np.array([optimal_weights_dict[ticker] for ticker in prices_df.columns])

    # Create weights dictionary
    weights_dict = {ticker: float(weight) for ticker, weight in zip(prices_df.columns, optimal_weights)}

    # Calculate portfolio value at each date using optimal weights
    # Imagine we allocated starting_portfolio_value according to optimal weights at start date
    # Then track how that allocation performs over time
    equity_curve_data = []

    # Calculate initial shares for each stock based on optimal weight allocation
    start_date_index = prices_df.index[0]
    shares_per_stock = {}

    for ticker in prices_df.columns:
        weight = optimal_weights_dict[ticker]
        initial_investment_for_stock = starting_portfolio_value * weight
        start_price = float(prices_df.loc[start_date_index, ticker])
        if start_price > 0:
            shares_per_stock[ticker] = initial_investment_for_stock / start_price
        else:
            shares_per_stock[ticker] = 0

    # Now calculate portfolio value at each date
    for date in prices_df.index:
        portfolio_value = 0.0

        for ticker in prices_df.columns:
            if ticker in shares_per_stock and shares_per_stock[ticker] > 0:
                price_at_date = float(prices_df.loc[date, ticker])
                portfolio_value += shares_per_stock[ticker] * price_at_date

        # Calculate daily return
        daily_return = 0.0
        if len(equity_curve_data) > 0:
            prev_value = equity_curve_data[-1]["value"]
            if prev_value > 0:
                daily_return = (portfolio_value - prev_value) / prev_value

        equity_curve_data.append({
            "date": str(date.date()),
            "value": float(portfolio_value),
            "daily_return": float(daily_return)
        })

    # Calculate returns for metrics
    values = pd.Series([item["value"] for item in equity_curve_data], index=prices_df.index)
    portfolio_returns = values.pct_change().dropna()

    # Calculate metrics
    metrics = calculate_portfolio_metrics(portfolio_returns)

    return PortfolioAnalysisResponse(
        portfolio_id=portfolio_id,
        portfolio_name=f"{portfolio.name} ({method_label})",
        tickers=list(prices_df.columns),
        start_date=prices_df.index[0].strftime("%Y-%m-%d"),
        end_date=prices_df.index[-1].strftime("%Y-%m-%d"),
        equity_curve=equity_curve_data,
        metrics=metrics,
        weights=weights_dict
    )


# ========== Risk Analysis Endpoints ==========

@router.get("/{portfolio_id}/risk/monte-carlo", response_model=MonteCarloResponse)
def monte_carlo_simulation(
    portfolio_id: int,
    num_simulations: int = 1000,
    time_horizon_days: int = 252,  # 1 year
    initial_value: float = 10000,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    use_adjusted: bool = True,
    db: Session = Depends(get_db)
):
    """
    Run Monte Carlo simulation for portfolio.
    Uses historical returns and covariance to simulate future paths.
    """
    # Get portfolio
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    if len(portfolio.stocks) == 0:
        raise HTTPException(status_code=400, detail="Portfolio has no stocks")

    tickers = [stock.ticker for stock in portfolio.stocks]

    # Set default date range
    if not end_date:
        end_date = datetime.now().strftime("%Y-%m-%d")
    if not start_date:
        start_dt = datetime.now().replace(year=datetime.now().year - 1)
        start_date = start_dt.strftime("%Y-%m-%d")

    # Fetch price data
    prices_df = fetch_price_data(tickers, start_date, end_date, db, use_adjusted)

    # Calculate returns
    returns = prices_df.pct_change().dropna()

    # Check for flat stocks
    std_devs = returns.std()
    flat_stocks = std_devs[std_devs < 1e-8].index.tolist()

    if flat_stocks:
        raise HTTPException(
            status_code=400,
            detail=f"Stocks with zero variance: {', '.join(flat_stocks)}. Remove before simulation."
        )

    # Build weights from portfolio stocks, ordered by ticker to match prices_df.columns
    stock_weights = {s.ticker: s.weight for s in portfolio.stocks}
    if all(stock_weights.get(t) is not None for t in prices_df.columns):
        weights = np.array([stock_weights[t] for t in prices_df.columns])
        weights = weights / weights.sum()  # Normalize
    else:
        weights = np.array([1.0 / len(prices_df.columns)] * len(prices_df.columns))

    # Calculate portfolio statistics
    mean_returns = returns.mean().values
    cov_matrix = returns.cov().values

    # Check if covariance matrix is valid
    try:
        np.linalg.cholesky(cov_matrix)
    except np.linalg.LinAlgError:
        raise HTTPException(
            status_code=400,
            detail="Covariance matrix is singular. Try different stocks or date range."
        )

    # Monte Carlo simulation
    np.random.seed(42)
    all_paths = []
    final_values = []

    for _ in range(num_simulations):
        # Simulate daily returns
        simulated_returns = np.random.multivariate_normal(mean_returns, cov_matrix, time_horizon_days)

        # Calculate portfolio returns
        portfolio_returns = np.dot(simulated_returns, weights)

        # Calculate cumulative wealth
        wealth_path = initial_value * np.cumprod(1 + portfolio_returns)
        all_paths.append(wealth_path)
        final_values.append(wealth_path[-1])

    all_paths = np.array(all_paths)
    final_values = np.array(final_values)

    # Generate dates
    sim_dates = pd.date_range(start=datetime.now(), periods=time_horizon_days, freq='B')
    date_strings = [d.strftime("%Y-%m-%d") for d in sim_dates]

    # Calculate percentiles
    percentile_5 = np.percentile(all_paths, 5, axis=0)
    percentile_50 = np.percentile(all_paths, 50, axis=0)
    percentile_95 = np.percentile(all_paths, 95, axis=0)

    # Sample 100 paths for visualization
    sample_indices = np.random.choice(num_simulations, min(100, num_simulations), replace=False)
    sampled_paths = [
        MonteCarloPath(dates=date_strings, values=[float(v) for v in all_paths[i]])
        for i in sample_indices
    ]

    # Calculate final value percentiles
    final_value_5th = float(np.percentile(final_values, 5))
    final_value_95th = float(np.percentile(final_values, 95))

    return MonteCarloResponse(
        portfolio_id=portfolio_id,
        portfolio_name=portfolio.name,
        num_simulations=num_simulations,
        time_horizon_days=time_horizon_days,
        initial_value=initial_value,
        paths=sampled_paths,
        percentile_5th=[float(v) for v in percentile_5],
        percentile_50th=[float(v) for v in percentile_50],
        percentile_95th=[float(v) for v in percentile_95],
        final_value_mean=float(np.mean(final_values)),
        final_value_median=float(np.median(final_values)),
        final_value_std=float(np.std(final_values)),
        final_value_min=float(np.min(final_values)),
        final_value_max=float(np.max(final_values)),
        final_value_5th=final_value_5th,
        final_value_95th=final_value_95th
    )


@router.get("/{portfolio_id}/risk/var", response_model=VaRResponse)
def calculate_var(
    portfolio_id: int,
    confidence_level: float = 0.95,
    time_horizon_days: int = 10,
    initial_value: float = 10000,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    use_adjusted: bool = True,
    db: Session = Depends(get_db)
):
    """
    Calculate Value at Risk (VaR) and Conditional VaR (CVaR).

    Methods:
    - Historical VaR: Based on historical returns
    - Parametric VaR: Assumes normal distribution
    - CVaR: Expected Shortfall (average loss beyond VaR)
    """
    # Get portfolio
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    if len(portfolio.stocks) == 0:
        raise HTTPException(status_code=400, detail="Portfolio has no stocks")

    tickers = [stock.ticker for stock in portfolio.stocks]

    # Set default date range
    if not end_date:
        end_date = datetime.now().strftime("%Y-%m-%d")
    if not start_date:
        start_dt = datetime.now().replace(year=datetime.now().year - 1)
        start_date = start_dt.strftime("%Y-%m-%d")

    # Fetch price data
    prices_df = fetch_price_data(tickers, start_date, end_date, db, use_adjusted)

    # Calculate returns
    returns = prices_df.pct_change().dropna()

    # Check for flat stocks
    std_devs = returns.std()
    flat_stocks = std_devs[std_devs < 1e-8].index.tolist()

    if flat_stocks:
        raise HTTPException(
            status_code=400,
            detail=f"Stocks with zero variance: {', '.join(flat_stocks)}. Remove before VaR calculation."
        )

    # Build weights from portfolio stocks, ordered by ticker to match prices_df.columns
    stock_weights = {s.ticker: s.weight for s in portfolio.stocks}
    if all(stock_weights.get(t) is not None for t in prices_df.columns):
        weights = np.array([stock_weights[t] for t in prices_df.columns])
        weights = weights / weights.sum()  # Normalize
    else:
        weights = np.array([1.0 / len(prices_df.columns)] * len(prices_df.columns))
    portfolio_returns = (returns * weights).sum(axis=1)

    # 1. Historical VaR
    sorted_returns = np.sort(portfolio_returns)
    var_index = int((1 - confidence_level) * len(sorted_returns))
    historical_var_return = sorted_returns[var_index]

    # Scale to time horizon (square root of time rule)
    historical_var_scaled = historical_var_return * np.sqrt(time_horizon_days)
    historical_var_value = -historical_var_scaled * initial_value

    # 2. Parametric VaR (assumes normal distribution)
    mean_return = portfolio_returns.mean()
    std_return = portfolio_returns.std()

    z_score = stats.norm.ppf(1 - confidence_level)
    parametric_var_return = mean_return + z_score * std_return
    parametric_var_scaled = parametric_var_return * np.sqrt(time_horizon_days)
    parametric_var_value = -parametric_var_scaled * initial_value

    # 3. Conditional VaR (CVaR / Expected Shortfall)
    tail_losses = sorted_returns[:var_index]
    if len(tail_losses) > 0:
        cvar_return = tail_losses.mean()
        cvar_scaled = cvar_return * np.sqrt(time_horizon_days)
        cvar_value = -cvar_scaled * initial_value
    else:
        cvar_value = historical_var_value

    # Use historical VaR as primary measure
    var_value = historical_var_value
    var_percent = (var_value / initial_value) * 100
    cvar_percent = (cvar_value / initial_value) * 100

    return VaRResponse(
        portfolio_id=portfolio_id,
        portfolio_name=portfolio.name,
        initial_value=initial_value,
        time_horizon_days=time_horizon_days,
        confidence_level=confidence_level,
        var_value=round(var_value, 2),
        var_percent=round(var_percent, 2),
        cvar_value=round(cvar_value, 2),
        cvar_percent=round(cvar_percent, 2),
        historical_var=round(historical_var_value, 2),
        parametric_var=round(parametric_var_value, 2)
    )
