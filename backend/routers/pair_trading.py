"""
Pair Trading API Router
Statistical arbitrage analysis endpoints
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
import logging

from services.pair_trading_service import pair_trading_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pair-trading", tags=["pair-trading"])


# Request/Response Models
class PairAnalysisRequest(BaseModel):
    """Request to analyze a stock pair"""
    ticker1: str = Field(..., description="First stock ticker symbol")
    ticker2: str = Field(..., description="Second stock ticker symbol")
    days: int = Field(default=365, ge=30, le=1095, description="Days of historical data")
    use_adjusted: bool = Field(default=True, description="Use adjusted close prices")
    entry_z: float = Field(default=2.0, ge=0.5, le=5.0, description="Entry z-score threshold")
    exit_z: float = Field(default=0.5, ge=0.1, le=2.0, description="Exit z-score threshold")


@router.post("/analyze")
async def analyze_pair(request: PairAnalysisRequest):
    """
    Analyze a stock pair for trading opportunities.

    This endpoint performs:
    1. Cointegration testing (Engle-Granger method)
    2. Spread calculation and z-score analysis
    3. Half-life of mean reversion calculation
    4. Historical backtest with entry/exit signals
    5. Performance metrics (win rate, Sharpe ratio, etc.)

    Returns:
        Complete pair trading analysis including:
        - Cointegration test results (p-value, hedge ratio, etc.)
        - Spread time series with z-scores
        - Price time series for both stocks
        - Backtest results with all trades
        - Performance metrics
    """
    try:
        logger.info(f"Pair analysis request: {request.ticker1} / {request.ticker2}")

        result = pair_trading_service.analyze_pair(
            ticker1=request.ticker1,
            ticker2=request.ticker2,
            days=request.days,
            use_adjusted=request.use_adjusted,
            entry_z=request.entry_z,
            exit_z=request.exit_z
        )

        return result

    except ValueError as e:
        logger.error(f"Validation error in pair analysis: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to analyze pair {request.ticker1}/{request.ticker2}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test-cointegration")
async def test_cointegration(
    ticker1: str = Query(..., description="First stock ticker"),
    ticker2: str = Query(..., description="Second stock ticker"),
    days: int = Query(365, ge=30, le=1095, description="Days of data"),
    use_adjusted: bool = Query(True, description="Use adjusted prices")
):
    """
    Quick cointegration test without backtest.

    Returns just the statistical test results:
    - Is the pair cointegrated? (p-value < 0.05)
    - P-value and test statistic
    - Hedge ratio
    - Half-life of mean reversion
    - Current z-score
    - Trading signal (LONG/SHORT/NEUTRAL)
    """
    try:
        logger.info(f"Cointegration test: {ticker1} / {ticker2}")

        # Fetch data
        df1 = pair_trading_service.fetch_price_data(ticker1, days=days, use_adjusted=use_adjusted)
        df2 = pair_trading_service.fetch_price_data(ticker2, days=days, use_adjusted=use_adjusted)

        # Merge
        import pandas as pd
        df = df1.join(df2, how='inner', lsuffix='_1', rsuffix='_2')
        df.columns = ['stock1', 'stock2']

        # Test cointegration
        result = pair_trading_service.test_cointegration(df['stock1'], df['stock2'])

        # Remove spread/dates arrays for quick response
        result.pop('spread', None)
        result.pop('dates', None)

        return {
            "ticker1": ticker1,
            "ticker2": ticker2,
            "cointegration": result
        }

    except ValueError as e:
        logger.error(f"Validation error in cointegration test: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to test cointegration {ticker1}/{ticker2}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/backtest")
async def backtest_strategy(
    ticker1: str = Query(..., description="First stock ticker"),
    ticker2: str = Query(..., description="Second stock ticker"),
    days: int = Query(365, ge=30, le=1095, description="Days of data"),
    entry_z: float = Query(2.0, ge=0.5, le=5.0, description="Entry z-score"),
    exit_z: float = Query(0.5, ge=0.1, le=2.0, description="Exit z-score"),
    use_adjusted: bool = Query(True, description="Use adjusted prices")
):
    """
    Backtest pair trading strategy with custom parameters.

    Allows testing different entry/exit thresholds to optimize strategy.

    Returns:
        Backtest results including:
        - All trades with entry/exit dates and P&L
        - Total trades
        - Win rate (%)
        - Average profit per trade (%)
        - Average trade duration (days)
        - Total return (%)
        - Sharpe ratio
    """
    try:
        logger.info(f"Backtest request: {ticker1} / {ticker2} (entry_z={entry_z}, exit_z={exit_z})")

        # Fetch data
        df1 = pair_trading_service.fetch_price_data(ticker1, days=days, use_adjusted=use_adjusted)
        df2 = pair_trading_service.fetch_price_data(ticker2, days=days, use_adjusted=use_adjusted)

        # Merge
        import pandas as pd
        df = df1.join(df2, how='inner', lsuffix='_1', rsuffix='_2')
        df.columns = ['stock1', 'stock2']

        # Get hedge ratio first
        coint_result = pair_trading_service.test_cointegration(df['stock1'], df['stock2'])

        # Run backtest
        result = pair_trading_service.backtest_pair_strategy(
            df['stock1'],
            df['stock2'],
            coint_result['hedge_ratio'],
            entry_z=entry_z,
            exit_z=exit_z
        )

        return {
            "ticker1": ticker1,
            "ticker2": ticker2,
            "hedge_ratio": coint_result['hedge_ratio'],
            "backtest": result
        }

    except ValueError as e:
        logger.error(f"Validation error in backtest: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to backtest {ticker1}/{ticker2}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
