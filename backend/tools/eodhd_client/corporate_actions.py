"""
Corporate Actions API Client
Covers: Dividends, Splits, Bulk Data Downloads
"""

from typing import Optional, Dict, Any, List
from datetime import date
from .base_client import EODHDBaseClient


class CorporateActionsClient(EODHDBaseClient):
    """Client for corporate actions endpoints"""

    def get_dividends(
        self,
        symbol: str,
        from_date: Optional[str | date] = None,
        to_date: Optional[str | date] = None
    ) -> List[Dict[str, Any]]:
        """
        Get dividend history for a symbol

        Args:
            symbol: Stock symbol with exchange (e.g., "AAPL.US")
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)

        Returns:
            List of dividend dictionaries with date, dividend, currency, unadjustedValue

        Example:
            >>> divs = client.corporate.get_dividends("AAPL.US", from_date="2023-01-01")
        """
        symbol = self._validate_symbol(symbol)
        params = {}

        if from_date:
            params["from"] = self._format_date(from_date)
        if to_date:
            params["to"] = self._format_date(to_date)

        return self._make_request(f"div/{symbol}", params)

    def get_splits(
        self,
        symbol: str,
        from_date: Optional[str | date] = None,
        to_date: Optional[str | date] = None
    ) -> List[Dict[str, Any]]:
        """
        Get stock split history for a symbol

        Args:
            symbol: Stock symbol with exchange (e.g., "AAPL.US")
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)

        Returns:
            List of split dictionaries with date, split ratio

        Example:
            >>> splits = client.corporate.get_splits("TSLA.US", from_date="2020-01-01")
        """
        symbol = self._validate_symbol(symbol)
        params = {}

        if from_date:
            params["from"] = self._format_date(from_date)
        if to_date:
            params["to"] = self._format_date(to_date)

        return self._make_request(f"splits/{symbol}", params)

    def get_bulk_eod(
        self,
        exchange: str,
        date_param: str | date,
        symbols: Optional[List[str]] = None,
        type_param: Optional[str] = None,
        filter_param: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get bulk end-of-day data for entire exchange

        Args:
            exchange: Exchange code (e.g., "US", "LSE")
            date_param: Date to fetch (YYYY-MM-DD)
            symbols: Optional list of symbols to filter
            type_param: Optional type filter ("Common Stock", "ETF", etc.)
            filter_param: Optional filter for extended data ("extended")

        Returns:
            List of EOD data for all symbols on exchange

        Example:
            >>> bulk_data = client.corporate.get_bulk_eod("US", "2024-01-15")
            >>> etf_data = client.corporate.get_bulk_eod("US", "2024-01-15", type_param="ETF")
        """
        params = {"date": self._format_date(date_param)}

        if symbols:
            params["symbols"] = ",".join(symbols)
        if type_param:
            params["type"] = type_param
        if filter_param:
            params["filter"] = filter_param

        return self._make_request(f"eod-bulk-last-day/{exchange}", params)

    def get_bulk_splits(
        self,
        exchange: str,
        date_param: str | date
    ) -> List[Dict[str, Any]]:
        """
        Get bulk splits data for entire exchange

        Args:
            exchange: Exchange code
            date_param: Date (YYYY-MM-DD)

        Returns:
            List of splits for all symbols

        Example:
            >>> splits = client.corporate.get_bulk_splits("US", "2024-01-15")
        """
        params = {"date": self._format_date(date_param)}
        return self._make_request(f"splits-bulk/{exchange}", params)

    def get_bulk_dividends(
        self,
        exchange: str,
        date_param: str | date
    ) -> List[Dict[str, Any]]:
        """
        Get bulk dividends data for entire exchange

        Args:
            exchange: Exchange code
            date_param: Date (YYYY-MM-DD)

        Returns:
            List of dividends for all symbols

        Example:
            >>> divs = client.corporate.get_bulk_dividends("US", "2024-01-15")
        """
        params = {"date": self._format_date(date_param)}
        return self._make_request(f"dividends-bulk/{exchange}", params)
