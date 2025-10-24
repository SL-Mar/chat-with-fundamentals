"""
Macro & Economic Data API Client
Covers: Macro Indicators, Economic Calendar
"""

from typing import Optional, Dict, Any, List
from datetime import date
from .base_client import EODHDBaseClient


class MacroEconomicClient(EODHDBaseClient):
    """Client for macro and economic data endpoints"""

    def get_macro_indicator(
        self,
        country: str,
        indicator: str,
        from_date: Optional[str | date] = None,
        to_date: Optional[str | date] = None
    ) -> List[Dict[str, Any]]:
        """
        Get macroeconomic indicator data via government bonds EOD API

        NOTE: EODHD provides macro data through special ticker symbols using EOD API:
        - Government Bonds: UK10Y.GBOND, US10Y.GBOND, etc.
        - Money Market: EURIBOR3M.MONEY, LIBOREUR2M.MONEY, etc.
        - Exchange Rates: ECBEURUSD.MONEY, NORGEUSDNOK.MONEY, etc.

        Args:
            country: Country code (e.g., "USA", "UK", "DE")
            indicator: Indicator type - government_bond_10y, euribor_3m, etc.
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)

        Returns:
            List of EOD price data for the macro indicator

        Example:
            >>> # Get US 10Y bond data
            >>> bonds = client.macro.get_macro_indicator("USA", "government_bond_10y")
        """
        # Map common indicators to EODHD ticker symbols
        ticker_map = {
            # Government Bonds (10 year)
            "government_bond_10y": {
                "USA": "US10Y.GBOND",
                "UK": "UK10Y.GBOND",
                "DE": "DE10Y.GBOND",
                "FR": "FR10Y.GBOND",
                "IT": "IT10Y.GBOND",
                "JP": "JP10Y.GBOND",
                "CN": "CN10Y.GBOND",
            },
            # EURIBOR rates
            "euribor_3m": {"EUR": "EURIBOR3M.MONEY"},
            "euribor_6m": {"EUR": "EURIBOR6M.MONEY"},
            "euribor_12m": {"EUR": "EURIBOR12M.MONEY"},
            # LIBOR rates
            "libor_usd_3m": {"USD": "LIBORUSD3M.MONEY"},
            "libor_eur_3m": {"EUR": "LIBOREUR3M.MONEY"},
            "libor_gbp_3m": {"GBP": "LIBORGBP3M.MONEY"},
        }

        # Get ticker symbol
        if indicator not in ticker_map:
            raise ValueError(f"Unsupported indicator: {indicator}. Available: {list(ticker_map.keys())}")

        country_map = ticker_map[indicator]
        if country not in country_map:
            raise ValueError(f"Country {country} not available for {indicator}. Available: {list(country_map.keys())}")

        ticker = country_map[country]

        # Use EOD API
        params = {}
        if from_date:
            params["from"] = self._format_date(from_date)
        if to_date:
            params["to"] = self._format_date(to_date)
        params["period"] = "d"
        params["order"] = "a"

        return self._make_request(f"eod/{ticker}", params)

    def get_economic_events(
        self,
        from_date: Optional[str | date] = None,
        to_date: Optional[str | date] = None,
        country: Optional[str] = None,
        comparison: Optional[str] = None,
        offset: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get economic calendar events

        Args:
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)
            country: Country filter (e.g., "US", "GB", "JP")
            comparison: Comparison filter
            offset: Pagination offset
            limit: Number of results

        Returns:
            List of economic events with date, country, event, actual, forecast, previous values

        Example:
            >>> # Get upcoming US economic events
            >>> events = client.macro.get_economic_events(
            ...     from_date="2024-01-01",
            ...     to_date="2024-01-31",
            ...     country="US"
            ... )
        """
        params = {
            "offset": offset,
            "limit": limit
        }

        if from_date:
            params["from"] = self._format_date(from_date)
        if to_date:
            params["to"] = self._format_date(to_date)
        if country:
            params["country"] = country
        if comparison:
            params["comparison"] = comparison

        return self._make_request("economic-events", params)
