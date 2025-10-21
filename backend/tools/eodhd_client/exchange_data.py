"""
Exchange & Symbol Data API Client
Covers: Exchanges, Tickers, Trading Hours, Symbol Search
"""

from typing import Optional, Dict, Any, List
from .base_client import EODHDBaseClient


class ExchangeDataClient(EODHDBaseClient):
    """Client for exchange and symbol data endpoints"""

    def get_exchanges(self) -> List[Dict[str, Any]]:
        """
        Get list of all supported exchanges

        Returns:
            List of exchange dictionaries with Name, Code, OperatingMIC, Country, Currency, etc.

        Example:
            >>> exchanges = client.exchange.get_exchanges()
            >>> us_exchanges = [e for e in exchanges if e['Country'] == 'USA']
        """
        return self._make_request("exchanges-list", {})

    def get_exchange_symbols(
        self,
        exchange: str,
        type_param: Optional[str] = None,
        delisted: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get list of all symbols/tickers for a specific exchange

        Args:
            exchange: Exchange code (e.g., "US", "LSE", "XETRA")
            type_param: Optional filter by type ("Common Stock", "ETF", "Fund", "Preferred Stock", etc.)
            delisted: Include delisted symbols (1) or not (0, default)

        Returns:
            List of ticker dictionaries with Code, Name, Country, Exchange, Currency, Type, Isin

        Example:
            >>> us_stocks = client.exchange.get_exchange_symbols("US", type_param="Common Stock")
            >>> us_etfs = client.exchange.get_exchange_symbols("US", type_param="ETF")
        """
        params = {"delisted": delisted}
        if type_param:
            params["type"] = type_param

        return self._make_request(f"exchange-symbol-list/{exchange}", params)

    def get_trading_hours(
        self,
        exchange: str
    ) -> Dict[str, Any]:
        """
        Get trading hours and timezone information for an exchange

        Args:
            exchange: Exchange code (e.g., "US", "LSE")

        Returns:
            Dict with trading hours, timezone, and session information

        Example:
            >>> hours = client.exchange.get_trading_hours("US")
        """
        return self._make_request(f"exchange-details/{exchange}", {})

    def search_symbols(
        self,
        query: str,
        exchange: Optional[str] = None,
        type_param: Optional[str] = None,
        limit: int = 15
    ) -> List[Dict[str, Any]]:
        """
        Search for symbols by name or ticker

        Args:
            query: Search query (symbol or company name)
            exchange: Optional exchange filter
            type_param: Optional type filter
            limit: Maximum results (default 15)

        Returns:
            List of matching symbols

        Example:
            >>> results = client.exchange.search_symbols("Apple")
            >>> results = client.exchange.search_symbols("AAPL", exchange="US")
        """
        params = {
            "s": query,
            "limit": limit
        }
        if exchange:
            params["exchange"] = exchange
        if type_param:
            params["type"] = type_param

        return self._make_request("search", params)

    def get_delisted_symbols(
        self,
        exchange: str,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get delisted symbols for an exchange

        Args:
            exchange: Exchange code
            from_date: Delisting date from (YYYY-MM-DD)
            to_date: Delisting date to (YYYY-MM-DD)

        Returns:
            List of delisted symbols with delisting date and reason

        Example:
            >>> delisted = client.exchange.get_delisted_symbols("US", from_date="2024-01-01")
        """
        params = {"delisted": 1}
        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date

        return self._make_request(f"exchange-symbol-list/{exchange}", params)
