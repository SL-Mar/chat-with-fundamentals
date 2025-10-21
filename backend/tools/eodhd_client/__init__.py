"""
Comprehensive EODHD API Client
Supports 50+ endpoints across all EODHD API categories
"""

from .base_client import EODHDBaseClient
from .historical_data import HistoricalDataClient
from .fundamental_data import FundamentalDataClient
from .exchange_data import ExchangeDataClient
from .corporate_actions import CorporateActionsClient
from .technical_analysis import TechnicalAnalysisClient
from .news_sentiment import NewsSentimentClient
from .special_data import SpecialDataClient
from .macro_economic import MacroEconomicClient
from .user_api import UserAPIClient

__all__ = [
    "EODHDClient",
    "EODHDBaseClient",
]


class EODHDClient:
    """
    Comprehensive EODHD API Client

    Provides access to all EODHD API endpoints organized by category:
    - Historical Data (EOD, Intraday, Live, Tick)
    - Fundamental Data (Stocks, Bonds, Crypto, Calendar)
    - Exchange & Symbol Data
    - Corporate Actions (Splits, Dividends, Bulk)
    - Technical Analysis & Screener
    - News & Sentiment
    - Special Data (Options, ETF Holdings, ESG, Logos)
    - Macro/Economic Data
    - User Account API

    Example:
        >>> client = EODHDClient(api_key="your_key")
        >>>
        >>> # Get EOD data
        >>> eod_data = client.historical.get_eod("AAPL.US", from_date="2024-01-01")
        >>>
        >>> # Get fundamentals
        >>> fundamentals = client.fundamental.get_fundamentals("TSLA.US")
        >>>
        >>> # Get news
        >>> news = client.news.get_news("MSFT", limit=10)
        >>>
        >>> # Get exchanges
        >>> exchanges = client.exchange.get_exchanges()
    """

    def __init__(self, api_key: str = None):
        """
        Initialize comprehensive EODHD client

        Args:
            api_key: EODHD API key (or set EODHD_API_KEY environment variable)
        """
        self.api_key = api_key

        # Initialize all endpoint clients
        self.historical = HistoricalDataClient(api_key)
        self.fundamental = FundamentalDataClient(api_key)
        self.exchange = ExchangeDataClient(api_key)
        self.corporate = CorporateActionsClient(api_key)
        self.technical = TechnicalAnalysisClient(api_key)
        self.news = NewsSentimentClient(api_key)
        self.special = SpecialDataClient(api_key)
        self.macro = MacroEconomicClient(api_key)
        self.user = UserAPIClient(api_key)

    def __repr__(self) -> str:
        return f"EODHDClient(api_key={'***' if self.api_key else 'None'})"
