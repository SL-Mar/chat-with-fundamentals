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
        Get macroeconomic indicator data

        Args:
            country: Country code (e.g., "USA", "GBR", "JPN")
            indicator: Indicator code
                Available: gdp_current_usd, gdp_per_capita_usd, inflation_consumer_prices_annual,
                          unemployment_total, population_total, real_interest_rate, etc.
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)

        Returns:
            List of macro indicator values with dates

        Example:
            >>> # Get US GDP data
            >>> gdp = client.macro.get_macro_indicator("USA", "gdp_current_usd")
            >>>
            >>> # Get inflation data
            >>> inflation = client.macro.get_macro_indicator("USA", "inflation_consumer_prices_annual")
        """
        params = {
            "country": country,
            "indicator": indicator
        }

        if from_date:
            params["from"] = self._format_date(from_date)
        if to_date:
            params["to"] = self._format_date(to_date)

        return self._make_request("macro-indicator", params)

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
