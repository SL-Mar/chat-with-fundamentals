"""
Special Data API Client
Covers: ETF Holdings, Index Constituents, ESG Data, Logos, Market Cap History
"""

from typing import Optional, Dict, Any, List
from datetime import date
from .base_client import EODHDBaseClient


class SpecialDataClient(EODHDBaseClient):
    """Client for special data endpoints"""

    def get_etf_holdings(
        self,
        symbol: str
    ) -> Dict[str, Any]:
        """
        Get ETF holdings and composition data

        Args:
            symbol: ETF symbol with exchange (e.g., "SPY.US", "QQQ.US")

        Returns:
            Dict with ETF holdings, sector allocation, and fund info

        Example:
            >>> holdings = client.special.get_etf_holdings("SPY.US")
            >>> top_10 = holdings['Holdings'][:10] if 'Holdings' in holdings else []
        """
        symbol = self._validate_symbol(symbol)
        return self._make_request(f"fundamentals/{symbol}", {"filter": "ETF_Data"})

    def get_index_constituents(
        self,
        symbol: str
    ) -> Dict[str, Any]:
        """
        Get index constituents and composition

        Args:
            symbol: Index symbol (e.g., "GSPC.INDX" for S&P 500, "DJI.INDX" for Dow Jones)

        Returns:
            Dict with index constituents and weights

        Example:
            >>> sp500 = client.special.get_index_constituents("GSPC.INDX")
            >>> dow_jones = client.special.get_index_constituents("DJI.INDX")
        """
        return self._make_request(f"fundamentals/{symbol}", {"filter": "Components"})

    def get_index_historical_constituents(
        self,
        symbol: str,
        date_param: str | date
    ) -> List[Dict[str, Any]]:
        """
        Get historical index constituents for a specific date

        Args:
            symbol: Index symbol
            date_param: Historical date (YYYY-MM-DD)

        Returns:
            List of constituents at that date

        Example:
            >>> historical = client.special.get_index_historical_constituents(
            ...     "GSPC.INDX",
            ...     "2020-01-01"
            ... )
        """
        params = {"date": self._format_date(date_param)}
        return self._make_request(f"historical-constituents/{symbol}", params)

    def get_esg_scores(
        self,
        symbol: str
    ) -> Dict[str, Any]:
        """
        Get ESG (Environmental, Social, Governance) scores

        Args:
            symbol: Stock symbol with exchange

        Returns:
            Dict with ESG scores and ratings

        Example:
            >>> esg = client.special.get_esg_scores("AAPL.US")
        """
        symbol = self._validate_symbol(symbol)
        return self._make_request(f"fundamentals/{symbol}", {"filter": "ESGScores"})

    def get_logo(
        self,
        symbol: str
    ) -> str:
        """
        Get company logo URL

        Args:
            symbol: Stock symbol with exchange

        Returns:
            URL string to company logo image

        Example:
            >>> logo_url = client.special.get_logo("AAPL.US")
        """
        symbol = self._validate_symbol(symbol)
        data = self._make_request(f"fundamentals/{symbol}", {"filter": "General::LogoURL"})
        return data.get("General", {}).get("LogoURL", "")

    def get_market_cap_history(
        self,
        symbol: str,
        from_date: Optional[str | date] = None,
        to_date: Optional[str | date] = None
    ) -> List[Dict[str, Any]]:
        """
        Get historical market capitalization data

        Args:
            symbol: Stock symbol with exchange
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)

        Returns:
            List of market cap history dictionaries

        Example:
            >>> market_cap = client.special.get_market_cap_history(
            ...     "AAPL.US",
            ...     from_date="2020-01-01"
            ... )
        """
        symbol = self._validate_symbol(symbol)
        params = {}

        if from_date:
            params["from"] = self._format_date(from_date)
        if to_date:
            params["to"] = self._format_date(to_date)

        return self._make_request(f"market-capitalization/{symbol}", params)

    def get_analyst_ratings(
        self,
        symbol: str
    ) -> Dict[str, Any]:
        """
        Get analyst ratings and recommendations

        Args:
            symbol: Stock symbol with exchange

        Returns:
            Dict with analyst ratings, target prices, and recommendations

        Example:
            >>> ratings = client.special.get_analyst_ratings("TSLA.US")
        """
        symbol = self._validate_symbol(symbol)
        return self._make_request(f"fundamentals/{symbol}", {"filter": "AnalystRatings"})

    def get_shareholders(
        self,
        symbol: str,
        holder_type: str = "institutions"
    ) -> Dict[str, Any]:
        """
        Get major shareholders data

        Args:
            symbol: Stock symbol with exchange
            holder_type: Type of holders - "institutions" or "funds"

        Returns:
            Dict with shareholder information

        Example:
            >>> institutions = client.special.get_shareholders("AAPL.US", "institutions")
            >>> funds = client.special.get_shareholders("AAPL.US", "funds")
        """
        symbol = self._validate_symbol(symbol)
        filter_map = {
            "institutions": "Holders::Institutions",
            "funds": "Holders::Funds"
        }
        filter_param = filter_map.get(holder_type, "Holders")
        return self._make_request(f"fundamentals/{symbol}", {"filter": filter_param})
