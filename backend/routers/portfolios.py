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
from scipy.optimize import minimize
from scipy import stats
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
    """Calculate portfolio performance metrics."""

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

    return {
        "total_return": round(total_return, 2),
        "annualized_return": round(annualized_return, 2),
        "volatility": round(volatility, 2),
        "sharpe_ratio": round(sharpe_ratio, 2),
        "max_drawdown": round(max_drawdown, 2)
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
    """Add a stock to a portfolio."""
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


# ========== Analysis Endpoints ==========

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

    # Calculate returns
    returns = prices_df.pct_change().dropna()

    # Equal weight
    n_stocks = len(prices_df.columns)
    weights = {ticker: 1.0 / n_stocks for ticker in prices_df.columns}

    # Calculate portfolio returns
    portfolio_returns = returns.mean(axis=1)  # Equal weight = simple average

    # Calculate metrics
    initial_value = 10000
    equity_curve = (1 + portfolio_returns).cumprod() * initial_value
    metrics = calculate_portfolio_metrics(portfolio_returns, initial_value)

    # Build equity curve response
    equity_curve_data = []
    for date, value in equity_curve.items():
        daily_return = portfolio_returns.loc[date] * 100 if date in portfolio_returns.index else 0
        equity_curve_data.append({
            "date": date.strftime("%Y-%m-%d"),
            "value": round(float(value), 2),
            "daily_return": round(float(daily_return), 4)
        })

    return PortfolioAnalysisResponse(
        portfolio_id=portfolio_id,
        portfolio_name=portfolio.name,
        tickers=list(prices_df.columns),
        start_date=prices_df.index[0].strftime("%Y-%m-%d"),
        end_date=prices_df.index[-1].strftime("%Y-%m-%d"),
        equity_curve=equity_curve_data,
        metrics=metrics,
        weights=weights
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
        market_returns = prices_df.pct_change().mean() * 252
        market_caps = np.exp(market_returns)
        market_caps = pd.Series(market_caps, index=prices_df.columns)
        market_caps = market_caps / market_caps.sum()

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

    # Calculate portfolio returns with optimal weights
    portfolio_returns = (returns * optimal_weights).sum(axis=1)

    # Calculate metrics
    initial_value = 10000
    equity_curve = (1 + portfolio_returns).cumprod() * initial_value
    metrics = calculate_portfolio_metrics(portfolio_returns, initial_value)

    # Build equity curve response
    equity_curve_data = []
    for date, value in equity_curve.items():
        daily_return = portfolio_returns.loc[date] * 100 if date in portfolio_returns.index else 0
        equity_curve_data.append({
            "date": date.strftime("%Y-%m-%d"),
            "value": round(float(value), 2),
            "daily_return": round(float(daily_return), 4)
        })

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

    # Equal weight (can be customized later)
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

    # Equal weight portfolio
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
