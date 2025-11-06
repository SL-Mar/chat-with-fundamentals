"""
Pair Trading Analysis Service
Statistical arbitrage using cointegration testing and z-score mean reversion
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
import logging
from statsmodels.tsa.stattools import coint, adfuller
from statsmodels.regression.linear_model import OLS
import requests

from core.config import settings

logger = logging.getLogger(__name__)


class PairTradingService:
    """Service for pair trading analysis using cointegration and mean reversion"""

    def __init__(self):
        self.api_key = settings.eodhd_api_key

    def fetch_price_data(
        self,
        ticker: str,
        days: int = 365,
        use_adjusted: bool = True
    ) -> pd.DataFrame:
        """
        Fetch historical price data from EODHD.

        Args:
            ticker: Stock ticker symbol
            days: Number of days of historical data
            use_adjusted: Use adjusted_close vs close

        Returns:
            DataFrame with date index and 'close' column
        """
        if not self.api_key:
            raise ValueError("EODHD API key not configured")

        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        url = f"https://eodhd.com/api/eod/{ticker}"
        params = {
            "api_token": self.api_key,
            "from": start_date.strftime("%Y-%m-%d"),
            "to": end_date.strftime("%Y-%m-%d"),
            "fmt": "json"
        }

        logger.info(f"Fetching {days} days of price data for {ticker}")
        response = requests.get(url, params=params, timeout=30)

        if response.status_code != 200:
            raise ValueError(f"Failed to fetch price data for {ticker}: {response.status_code}")

        data = response.json()
        if not data:
            raise ValueError(f"No price data found for {ticker}")

        df = pd.DataFrame(data)
        df['date'] = pd.to_datetime(df['date'])
        df = df.set_index('date')
        df = df.sort_index()

        # Use adjusted_close or close based on parameter
        price_field = 'adjusted_close' if use_adjusted else 'close'
        return df[[price_field]].rename(columns={price_field: 'close'})

    def test_cointegration(
        self,
        stock1_prices: pd.Series,
        stock2_prices: pd.Series
    ) -> Dict[str, Any]:
        """
        Test if two stocks are cointegrated using Engle-Granger method.

        Args:
            stock1_prices: Price series for first stock
            stock2_prices: Price series for second stock

        Returns:
            Dictionary with cointegration results including:
            - is_cointegrated: bool
            - p_value: float
            - test_statistic: float
            - hedge_ratio: float
            - half_life: float (days)
            - spread_mean: float
            - spread_std: float
            - current_z_score: float
            - signal: str (LONG/SHORT/NEUTRAL)
            - spread: list of spread values
            - dates: list of dates
        """
        # Align the series
        df = pd.DataFrame({'stock1': stock1_prices, 'stock2': stock2_prices}).dropna()

        if len(df) < 30:
            raise ValueError("Insufficient data for cointegration test (need at least 30 days)")

        stock1 = df['stock1'].values
        stock2 = df['stock2'].values

        # Engle-Granger cointegration test
        score, p_value, _ = coint(stock1, stock2)

        # Calculate hedge ratio using OLS regression
        model = OLS(stock1, stock2).fit()
        hedge_ratio = model.params[0]

        # Calculate spread
        spread = stock1 - hedge_ratio * stock2

        # Calculate z-score
        spread_mean = np.mean(spread)
        spread_std = np.std(spread)
        z_score = (spread[-1] - spread_mean) / spread_std if spread_std > 0 else 0

        # Calculate half-life of mean reversion
        half_life = self._calculate_half_life(spread)

        # Determine signal based on z-score
        if z_score < -2.0:
            signal = "LONG"  # Long spread (buy stock1, sell stock2)
        elif z_score > 2.0:
            signal = "SHORT"  # Short spread (sell stock1, buy stock2)
        else:
            signal = "NEUTRAL"

        return {
            "is_cointegrated": bool(p_value < 0.05),
            "p_value": float(p_value),
            "test_statistic": float(score),
            "hedge_ratio": float(hedge_ratio),
            "half_life": half_life,
            "spread_mean": float(spread_mean),
            "spread_std": float(spread_std),
            "current_z_score": float(z_score),
            "signal": signal,
            "spread": spread.tolist(),
            "dates": [d.isoformat() for d in df.index]
        }

    def _calculate_half_life(self, spread: np.ndarray) -> Optional[float]:
        """
        Calculate half-life of mean reversion using AR(1) model.

        Args:
            spread: Array of spread values

        Returns:
            Half-life in days, or None if not mean-reverting
        """
        spread_lag = spread[:-1]
        spread_diff = spread[1:] - spread[:-1]

        # Fit AR(1) model
        model = OLS(spread_diff, spread_lag).fit()
        theta = model.params[0]

        if theta >= 0:
            return None  # Not mean-reverting

        half_life = -np.log(2) / theta
        return float(half_life) if half_life > 0 and half_life < 365 else None

    def backtest_pair_strategy(
        self,
        stock1_prices: pd.Series,
        stock2_prices: pd.Series,
        hedge_ratio: float,
        entry_z: float = 2.0,
        exit_z: float = 0.5
    ) -> Dict[str, Any]:
        """
        Backtest simple z-score mean reversion strategy.

        Args:
            stock1_prices: Price series for first stock
            stock2_prices: Price series for second stock
            hedge_ratio: Hedge ratio from cointegration test
            entry_z: Z-score threshold to enter trade (default 2.0)
            exit_z: Z-score threshold to exit trade (default 0.5)

        Returns:
            Dictionary with backtest results:
            - trades: List of trade dictionaries
            - total_trades: int
            - win_rate: float (percentage)
            - avg_profit_per_trade: float (percentage)
            - avg_trade_duration: float (days)
            - total_return: float (percentage)
            - sharpe_ratio: float
        """
        df = pd.DataFrame({'stock1': stock1_prices, 'stock2': stock2_prices}).dropna()

        stock1 = df['stock1'].values
        stock2 = df['stock2'].values

        # Calculate spread and rolling z-score
        spread = stock1 - hedge_ratio * stock2
        rolling_mean = pd.Series(spread).rolling(window=30).mean()
        rolling_std = pd.Series(spread).rolling(window=30).std()
        z_score = (spread - rolling_mean) / rolling_std

        position = 0  # 1 = long spread, -1 = short spread
        trades = []
        entry_idx = 0
        entry_price1 = 0
        entry_price2 = 0

        for i in range(30, len(z_score)):  # Start after rolling window
            if pd.isna(z_score[i]):
                continue

            if position == 0:
                # Entry logic
                if z_score[i] < -entry_z:
                    position = 1  # Long spread
                    entry_idx = i
                    entry_price1 = stock1[i]
                    entry_price2 = stock2[i]
                elif z_score[i] > entry_z:
                    position = -1  # Short spread
                    entry_idx = i
                    entry_price1 = stock1[i]
                    entry_price2 = stock2[i]

            elif abs(z_score[i]) < exit_z:
                # Exit logic
                exit_price1 = stock1[i]
                exit_price2 = stock2[i]

                # Calculate P&L
                if position == 1:
                    pnl = ((exit_price1 - entry_price1) / entry_price1 -
                           hedge_ratio * (exit_price2 - entry_price2) / entry_price2)
                else:
                    pnl = -((exit_price1 - entry_price1) / entry_price1 -
                            hedge_ratio * (exit_price2 - entry_price2) / entry_price2)

                trades.append({
                    'entry_date': df.index[entry_idx].isoformat(),
                    'exit_date': df.index[i].isoformat(),
                    'entry_z': float(z_score[entry_idx]),
                    'exit_z': float(z_score[i]),
                    'pnl': float(pnl * 100),  # Convert to percentage
                    'duration': i - entry_idx,
                    'direction': 'LONG' if position == 1 else 'SHORT'
                })
                position = 0

        # Calculate performance metrics
        if trades:
            pnls = [t['pnl'] for t in trades]
            win_rate = len([p for p in pnls if p > 0]) / len(pnls) * 100
            avg_pnl = np.mean(pnls)
            avg_duration = np.mean([t['duration'] for t in trades])
            total_return = sum(pnls)

            # Calculate Sharpe ratio (annualized)
            if len(pnls) > 1:
                sharpe = (np.mean(pnls) / np.std(pnls)) * np.sqrt(252 / avg_duration) if np.std(pnls) > 0 else 0
            else:
                sharpe = 0
        else:
            win_rate = 0
            avg_pnl = 0
            avg_duration = 0
            total_return = 0
            sharpe = 0

        return {
            "trades": trades,
            "total_trades": len(trades),
            "win_rate": float(win_rate),
            "avg_profit_per_trade": float(avg_pnl),
            "avg_trade_duration": float(avg_duration),
            "total_return": float(total_return),
            "sharpe_ratio": float(sharpe)
        }

    def analyze_pair(
        self,
        ticker1: str,
        ticker2: str,
        days: int = 365,
        use_adjusted: bool = True,
        entry_z: float = 2.0,
        exit_z: float = 0.5
    ) -> Dict[str, Any]:
        """
        Complete pair trading analysis.

        Args:
            ticker1: First stock ticker
            ticker2: Second stock ticker
            days: Days of historical data
            use_adjusted: Use adjusted prices
            entry_z: Entry z-score threshold
            exit_z: Exit z-score threshold

        Returns:
            Complete analysis including cointegration test, spread data, and backtest
        """
        logger.info(f"Analyzing pair: {ticker1} / {ticker2}")

        # Fetch price data
        df1 = self.fetch_price_data(ticker1, days=days, use_adjusted=use_adjusted)
        df2 = self.fetch_price_data(ticker2, days=days, use_adjusted=use_adjusted)

        # Merge data
        df = df1.join(df2, how='inner', lsuffix='_1', rsuffix='_2')
        df.columns = ['stock1', 'stock2']

        # Run cointegration test
        coint_result = self.test_cointegration(df['stock1'], df['stock2'])

        # Calculate spread series with z-scores
        spread = df['stock1'].values - coint_result['hedge_ratio'] * df['stock2'].values
        spread_mean = np.mean(spread)
        spread_std = np.std(spread)
        z_scores = (spread - spread_mean) / spread_std

        spread_series = [
            {
                "date": date.isoformat(),
                "spread": float(s),
                "z_score": float(z)
            }
            for date, s, z in zip(df.index, spread, z_scores)
        ]

        price_series = [
            {
                "date": date.isoformat(),
                "ticker1": float(row['stock1']),
                "ticker2": float(row['stock2'])
            }
            for date, row in df.iterrows()
        ]

        # Run backtest
        backtest_result = self.backtest_pair_strategy(
            df['stock1'],
            df['stock2'],
            coint_result['hedge_ratio'],
            entry_z=entry_z,
            exit_z=exit_z
        )

        return {
            "ticker1": ticker1,
            "ticker2": ticker2,
            "cointegration": coint_result,
            "spread_series": spread_series,
            "price_series": price_series,
            "backtest": backtest_result,
            "analyzed_at": datetime.now().isoformat()
        }


# Singleton instance
pair_trading_service = PairTradingService()
