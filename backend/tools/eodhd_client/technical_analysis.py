"""
Technical Analysis & Screener API Client
Covers: Technical Indicators, Stock Screener
"""

from typing import Optional, Dict, Any, List
from datetime import date
from .base_client import EODHDBaseClient


class TechnicalAnalysisClient(EODHDBaseClient):
    """Client for technical analysis and screening endpoints"""

    def get_technical_indicator(
        self,
        symbol: str,
        function: str,
        from_date: Optional[str | date] = None,
        to_date: Optional[str | date] = None,
        period: int = 50,
        order: str = "a",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Get technical indicator data

        Args:
            symbol: Stock symbol with exchange (e.g., "AAPL.US")
            function: Technical indicator function name
                Available: sma, ema, wma, rsi, macd, stochastic, bbands, adx, cci, aroon,
                          atr, williams, momentum, roc, stochrsi, dema, tema, trima, kama,
                          mama, t3, linearreg, linearregslope, linearregintercept, stddev, var
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)
            period: Period for indicator calculation (default 50)
            order: Sort order - 'a' (ascending), 'd' (descending)
            **kwargs: Additional indicator-specific parameters
                - fastperiod, slowperiod, signalperiod (for MACD)
                - fastkperiod, slowkperiod, slowdperiod (for Stochastic)
                - etc.

        Returns:
            Dict with indicator values

        Example:
            >>> # Simple Moving Average
            >>> sma = client.technical.get_technical_indicator("AAPL.US", "sma", period=50)
            >>>
            >>> # RSI
            >>> rsi = client.technical.get_technical_indicator("AAPL.US", "rsi", period=14)
            >>>
            >>> # MACD
            >>> macd = client.technical.get_technical_indicator(
            ...     "AAPL.US", "macd",
            ...     fastperiod=12, slowperiod=26, signalperiod=9
            ... )
        """
        symbol = self._validate_symbol(symbol)
        params = {
            "function": function,
            "period": period,
            "order": order,
            **kwargs
        }

        if from_date:
            params["from"] = self._format_date(from_date)
        if to_date:
            params["to"] = self._format_date(to_date)

        return self._make_request(f"technical/{symbol}", params)

    def screen_stocks(
        self,
        filters: Optional[List[str]] = None,
        signals: Optional[str] = None,
        sort: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Screen stocks based on filters and technical signals

        Args:
            filters: List of filter conditions
                Examples:
                - "market_capitalization>1000000000" (market cap > $1B)
                - "pe_ratio<20" (P/E ratio < 20)
                - "dividend_yield>0.03" (dividend yield > 3%)
                - "code=US" (US stocks only)
                - "exchange=NYSE" (NYSE only)
                - "sector=Technology"
            signals: Technical signal filter
                Examples: "50d_new_hi", "50d_new_lo", "200d_new_hi", "200d_new_lo"
            sort: Sort field and order
                Examples: "market_capitalization.desc", "pe_ratio.asc", "code.asc"
            limit: Number of results (max 100)
            offset: Pagination offset

        Returns:
            Dict with screener results

        Example:
            >>> # Find tech stocks with market cap > $100B and P/E < 30
            >>> results = client.technical.screen_stocks(
            ...     filters=[
            ...         "market_capitalization>100000000000",
            ...         "pe_ratio<30",
            ...         "sector=Technology",
            ...         "code=US"
            ...     ],
            ...     sort="market_capitalization.desc",
            ...     limit=20
            ... )
            >>>
            >>> # Find stocks at 52-week high
            >>> high_stocks = client.technical.screen_stocks(signals="50d_new_hi", limit=30)
        """
        params = {
            "limit": limit,
            "offset": offset
        }

        if filters:
            params["filters"] = ",".join(filters)
        if signals:
            params["signals"] = signals
        if sort:
            params["sort"] = sort

        return self._make_request("screener", params)
