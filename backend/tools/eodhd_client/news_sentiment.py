"""
News & Sentiment API Client
Covers: Financial News, Sentiment Analysis
"""

from typing import Optional, Dict, Any, List
from datetime import date
from .base_client import EODHDBaseClient


class NewsSentimentClient(EODHDBaseClient):
    """Client for news and sentiment endpoints"""

    def get_news(
        self,
        symbol: Optional[str] = None,
        from_date: Optional[str | date] = None,
        to_date: Optional[str | date] = None,
        limit: int = 50,
        offset: int = 0,
        tag: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get financial news articles

        Args:
            symbol: Stock symbol (without exchange suffix) or None for all news
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)
            limit: Number of articles (max 1000)
            offset: Pagination offset
            tag: News tag filter (e.g., "earnings", "ipo", "merger")

        Returns:
            List of news article dictionaries with:
            - date, title, content, link, symbols, tags, sentiment

        Example:
            >>> # Get news for specific symbol
            >>> news = client.news.get_news("AAPL", limit=10)
            >>>
            >>> # Get all market news
            >>> market_news = client.news.get_news(limit=50)
            >>>
            >>> # Get earnings-related news
            >>> earnings_news = client.news.get_news(tag="earnings", limit=20)
        """
        params = {
            "limit": limit,
            "offset": offset
        }

        if symbol:
            params["s"] = symbol
        if from_date:
            params["from"] = self._format_date(from_date)
        if to_date:
            params["to"] = self._format_date(to_date)
        if tag:
            params["tag"] = tag

        return self._make_request("news", params)

    def get_sentiment(
        self,
        symbol: str,
        from_date: Optional[str | date] = None,
        to_date: Optional[str | date] = None
    ) -> Dict[str, Any]:
        """
        Get sentiment analysis for a symbol

        Args:
            symbol: Stock symbol with exchange
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)

        Returns:
            Dict with sentiment scores and analysis

        Example:
            >>> sentiment = client.news.get_sentiment("AAPL.US")
        """
        symbol = self._validate_symbol(symbol)
        params = {}

        if from_date:
            params["from"] = self._format_date(from_date)
        if to_date:
            params["to"] = self._format_date(to_date)

        return self._make_request(f"sentiments/{symbol}", params)

    def get_twitter_mentions(
        self,
        symbol: str,
        from_date: Optional[str | date] = None,
        to_date: Optional[str | date] = None
    ) -> List[Dict[str, Any]]:
        """
        Get Twitter/X mentions and sentiment for a symbol

        Args:
            symbol: Stock symbol
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)

        Returns:
            List of Twitter mention data

        Example:
            >>> mentions = client.news.get_twitter_mentions("TSLA")
        """
        params = {"s": symbol}

        if from_date:
            params["from"] = self._format_date(from_date)
        if to_date:
            params["to"] = self._format_date(to_date)

        return self._make_request("twitter-mentions", params)
