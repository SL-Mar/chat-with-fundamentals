"""
Historical Data API Client
Covers: EOD, Intraday, Live/Real-time, and Tick Data
"""

from typing import Optional, Dict, Any, List
from datetime import date
from .base_client import EODHDBaseClient


class HistoricalDataClient(EODHDBaseClient):
    """Client for historical price data endpoints"""

    def get_eod(
        self,
        symbol: str,
        from_date: Optional[str | date] = None,
        to_date: Optional[str | date] = None,
        period: str = "d",
        order: str = "a"
    ) -> List[Dict[str, Any]]:
        """
        Get End-of-Day historical data

        Args:
            symbol: Stock symbol with exchange (e.g., "AAPL.US")
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)
            period: Data period - 'd' (daily), 'w' (weekly), 'm' (monthly)
            order: Sort order - 'a' (ascending), 'd' (descending)

        Returns:
            List of OHLCV dictionaries with keys: date, open, high, low, close, adjusted_close, volume

        Example:
            >>> client.historical.get_eod("AAPL.US", from_date="2024-01-01", to_date="2024-12-31")
        """
        symbol = self._validate_symbol(symbol)
        params = {
            "period": period,
            "order": order
        }

        if from_date:
            params["from"] = self._format_date(from_date)
        if to_date:
            params["to"] = self._format_date(to_date)

        return self._make_request(f"eod/{symbol}", params)

    def get_intraday(
        self,
        symbol: str,
        interval: str = "5m",
        from_timestamp: Optional[int] = None,
        to_timestamp: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get Intraday historical data

        Args:
            symbol: Stock symbol with exchange (e.g., "AAPL.US")
            interval: Time interval - '1m', '5m', '1h' (minute/hour)
            from_timestamp: Start Unix timestamp
            to_timestamp: End Unix timestamp

        Returns:
            List of intraday OHLCV data

        Example:
            >>> client.historical.get_intraday("TSLA.US", interval="5m")
        """
        symbol = self._validate_symbol(symbol)
        params = {"interval": interval}

        if from_timestamp:
            params["from"] = from_timestamp
        if to_timestamp:
            params["to"] = to_timestamp

        return self._make_request(f"intraday/{symbol}", params)

    def get_live_price(
        self,
        symbol: str,
        filter_param: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get live/real-time stock price (delayed 15-20 min for free plan)

        Args:
            symbol: Stock symbol with exchange (e.g., "AAPL.US")
            filter_param: Optional filter for specific fields

        Returns:
            Dict with live price data including: code, timestamp, gmtoffset, open, high, low,
            close, volume, previousClose, change, change_p

        Example:
            >>> client.historical.get_live_price("AAPL.US")
        """
        symbol = self._validate_symbol(symbol)
        params = {}
        if filter_param:
            params["filter"] = filter_param

        return self._make_request(f"real-time/{symbol}", params)

    def get_live_prices_bulk(
        self,
        symbols: List[str],
        exchange: str = "US"
    ) -> List[Dict[str, Any]]:
        """
        Get live prices for multiple symbols at once

        Args:
            symbols: List of stock symbols (without exchange suffix)
            exchange: Exchange code (default: "US")

        Returns:
            List of live price dictionaries

        Example:
            >>> client.historical.get_live_prices_bulk(["AAPL", "TSLA", "MSFT"], "US")
        """
        symbols_str = ",".join([f"{s}.{exchange}" for s in symbols])
        params = {"s": symbols_str}

        return self._make_request("real-time-bulk", params)

    def get_tick_data(
        self,
        symbol: str,
        from_timestamp: int,
        to_timestamp: int,
        limit: int = 100000
    ) -> List[Dict[str, Any]]:
        """
        Get tick-level data (requires premium plan)

        Args:
            symbol: Stock symbol with exchange
            from_timestamp: Start Unix timestamp
            to_timestamp: End Unix timestamp
            limit: Maximum number of ticks (max 100000)

        Returns:
            List of tick data with timestamp, price, volume

        Example:
            >>> client.historical.get_tick_data("AAPL.US", from_timestamp=1640000000, to_timestamp=1640100000)
        """
        symbol = self._validate_symbol(symbol)
        params = {
            "from": from_timestamp,
            "to": to_timestamp,
            "limit": limit
        }

        return self._make_request(f"tick/{symbol}", params)

    def get_options_data(
        self,
        symbol: str,
        from_date: Optional[str | date] = None,
        to_date: Optional[str | date] = None,
        trade_date_from: Optional[str | date] = None,
        trade_date_to: Optional[str | date] = None,
        contract_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get options data for a symbol

        Args:
            symbol: Stock symbol with exchange
            from_date: Expiration date from
            to_date: Expiration date to
            trade_date_from: Trade date from
            trade_date_to: Trade date to
            contract_name: Specific contract name

        Returns:
            Options chain data

        Example:
            >>> client.historical.get_options_data("AAPL.US", from_date="2024-01-01")
        """
        symbol = self._validate_symbol(symbol)
        params = {}

        if from_date:
            params["from"] = self._format_date(from_date)
        if to_date:
            params["to"] = self._format_date(to_date)
        if trade_date_from:
            params["trade_date_from"] = self._format_date(trade_date_from)
        if trade_date_to:
            params["trade_date_to"] = self._format_date(trade_date_to)
        if contract_name:
            params["contract_name"] = contract_name

        return self._make_request(f"options/{symbol}", params)
