"""
Fundamental Data API Client
Covers: Fundamentals (Stocks, Bonds, Crypto), Calendar, Insider Transactions, ESG
"""

from typing import Optional, Dict, Any, List
from datetime import date
from .base_client import EODHDBaseClient


class FundamentalDataClient(EODHDBaseClient):
    """Client for fundamental data endpoints"""

    def get_fundamentals(
        self,
        symbol: str,
        filter_param: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive fundamental data for stocks, ETFs, or mutual funds

        Args:
            symbol: Stock symbol with exchange (e.g., "AAPL.US")
            filter_param: Optional filter to get specific sections
                Examples: "General", "Highlights", "Valuation", "SharesStats",
                         "Technicals", "SplitsDividends", "AnalystRatings",
                         "Holders", "InsiderTransactions", "ESGScores", "Earnings",
                         "Financials::Balance_Sheet::yearly"

        Returns:
            Dict with comprehensive fundamental data

        Example:
            >>> # Get all fundamentals
            >>> client.fundamental.get_fundamentals("AAPL.US")
            >>>
            >>> # Get specific sections
            >>> client.fundamental.get_fundamentals("AAPL.US", filter_param="Highlights,Valuation")
        """
        symbol = self._validate_symbol(symbol)
        params = {}
        if filter_param:
            params["filter"] = filter_param

        return self._make_request(f"fundamentals/{symbol}", params)

    def get_bulk_fundamentals(
        self,
        exchange: str = "US",
        symbols: Optional[List[str]] = None,
        type_param: str = "Common Stock",
        offset: int = 0,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        Get bulk fundamental data for multiple symbols

        Args:
            exchange: Exchange code (e.g., "US", "LSE", "XETRA")
            symbols: Optional list of symbols to filter
            type_param: Type filter ("Common Stock", "ETF", "Fund", etc.)
            offset: Pagination offset
            limit: Number of results (max 1000)

        Returns:
            List of fundamental data dictionaries

        Example:
            >>> client.fundamental.get_bulk_fundamentals("US", type_param="ETF", limit=100)
        """
        params = {
            "type": type_param,
            "offset": offset,
            "limit": limit
        }

        if symbols:
            params["symbols"] = ",".join(symbols)

        return self._make_request(f"bulk-fundamentals/{exchange}", params)

    def get_calendar_earnings(
        self,
        from_date: Optional[str | date] = None,
        to_date: Optional[str | date] = None,
        symbols: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Get upcoming and past earnings calendar

        Args:
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)
            symbols: Optional list of symbols to filter

        Returns:
            Dict with earnings calendar data

        Example:
            >>> client.fundamental.get_calendar_earnings(from_date="2024-01-01", to_date="2024-01-31")
        """
        params = {}
        if from_date:
            params["from"] = self._format_date(from_date)
        if to_date:
            params["to"] = self._format_date(to_date)
        if symbols:
            params["symbols"] = ",".join(symbols)

        return self._make_request("calendar/earnings", params)

    def get_calendar_trends(self, symbols: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Get earnings trends data

        Args:
            symbols: Optional list of symbols

        Returns:
            Dict with earnings trends

        Example:
            >>> client.fundamental.get_calendar_trends(symbols=["AAPL", "TSLA"])
        """
        params = {}
        if symbols:
            params["symbols"] = ",".join(symbols)

        return self._make_request("calendar/trends", params)

    def get_calendar_ipos(
        self,
        from_date: Optional[str | date] = None,
        to_date: Optional[str | date] = None
    ) -> Dict[str, Any]:
        """
        Get upcoming and past IPO calendar

        Args:
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)

        Returns:
            Dict with IPO calendar data

        Example:
            >>> client.fundamental.get_calendar_ipos(from_date="2024-01-01")
        """
        params = {}
        if from_date:
            params["from"] = self._format_date(from_date)
        if to_date:
            params["to"] = self._format_date(to_date)

        return self._make_request("calendar/ipos", params)

    def get_calendar_splits(
        self,
        from_date: Optional[str | date] = None,
        to_date: Optional[str | date] = None
    ) -> Dict[str, Any]:
        """
        Get stock splits calendar

        Args:
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)

        Returns:
            Dict with splits calendar

        Example:
            >>> client.fundamental.get_calendar_splits(from_date="2024-01-01")
        """
        params = {}
        if from_date:
            params["from"] = self._format_date(from_date)
        if to_date:
            params["to"] = self._format_date(to_date)

        return self._make_request("calendar/splits", params)

    def get_insider_transactions(
        self,
        symbol: Optional[str] = None,
        from_date: Optional[str | date] = None,
        to_date: Optional[str | date] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get insider transactions (SEC Form 4 data)

        Args:
            symbol: Stock symbol with exchange (optional, None for all)
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)
            limit: Number of results

        Returns:
            List of insider transaction dictionaries

        Example:
            >>> client.fundamental.get_insider_transactions("AAPL.US", limit=50)
        """
        params = {"limit": limit}

        if symbol:
            symbol = self._validate_symbol(symbol)
            params["code"] = symbol

        if from_date:
            params["from"] = self._format_date(from_date)
        if to_date:
            params["to"] = self._format_date(to_date)

        return self._make_request("insider-transactions", params)

    def get_bond_fundamentals(
        self,
        isin: str
    ) -> Dict[str, Any]:
        """
        Get fundamental data for bonds

        Args:
            isin: Bond ISIN code

        Returns:
            Dict with bond fundamental data

        Example:
            >>> client.fundamental.get_bond_fundamentals("US0378331005")
        """
        return self._make_request(f"bond-fundamentals/{isin}", {})

    def get_crypto_fundamentals(
        self,
        symbol: str
    ) -> Dict[str, Any]:
        """
        Get fundamental data for cryptocurrencies

        Args:
            symbol: Crypto symbol (e.g., "BTC-USD", "ETH-USD")

        Returns:
            Dict with crypto fundamental data

        Example:
            >>> client.fundamental.get_crypto_fundamentals("BTC-USD")
        """
        return self._make_request(f"fundamentals/{symbol}", {})
