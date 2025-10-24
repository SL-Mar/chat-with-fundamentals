# File: routers/news.py
# News and sentiment endpoints
# NOW WITH DATABASE-FIRST APPROACH (Phase 2B)

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging
from tools.eodhd_client import EODHDClient
from services.data_service import DataService

router = APIRouter(prefix="/news", tags=["News & Sentiment"])
logger = logging.getLogger("news")

# Initialize data service (database-first)
data_service = DataService()


@router.get("/articles")
async def get_news_articles(
    ticker: Optional[str] = Query(None, alias="symbol", description="Stock symbol (e.g., AAPL) - omit for general market news"),
    tag: Optional[str] = Query(None, description="News tag (e.g., 'earnings', 'ipo')"),
    limit: int = Query(10, ge=1, le=100, description="Number of articles to return"),
    offset: int = Query(0, ge=0, description="Pagination offset")
):
    """Get financial news articles.

    Args:
        ticker: Filter by stock symbol (optional)
        tag: Filter by news category (optional)
        limit: Number of articles
        offset: Pagination offset

    Returns list of news articles with:
    - Title, content summary
    - Published date
    - Source
    - Sentiment (if available)
    - Related symbols

    **NEW: Database-First Approach (Phase 2B)**
    - Checks database first (1 hour cache)
    - Falls back to EODHD API if stale
    - Automatically stores API response for future queries

    Examples:
    - /news/articles?symbol=AAPL&limit=10
    - /news/articles?tag=earnings&limit=20
    - /news/articles?limit=50  (general market news)
    """
    try:
        # If ticker specified, use database-first approach
        if ticker:
            news = data_service.get_news(ticker=ticker, limit=limit, offset=offset)
        else:
            # General market news - fetch from API (no database caching for general news)
            client = EODHDClient()
            news = client.news.get_news(
                s=ticker,
                tag=tag,
                limit=limit,
                offset=offset
            )

        logger.info(f"[NEWS] Fetched {limit} articles for symbol={ticker}, tag={tag}")
        return news

    except Exception as e:
        logger.error(f"[NEWS] Failed to fetch news: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch news: {str(e)}")


@router.get("/sentiment")
async def get_sentiment_analysis(
    ticker: str = Query(..., description="Stock symbol (e.g., AAPL.US)")
):
    """Get sentiment analysis for a stock.

    Returns:
    - Overall sentiment score (bullish/bearish)
    - Sentiment trend over time
    - News sentiment breakdown
    - Social media sentiment (if available)

    Example: /news/sentiment?ticker=AAPL.US
    """
    try:
        client = EODHDClient()
        sentiment = client.news.get_sentiment(ticker)

        logger.info(f"[SENTIMENT] Fetched sentiment for {ticker}")
        return sentiment

    except Exception as e:
        # Sentiment data may not be available for all stocks or from certain IPs
        # Return empty result instead of error to allow page to load gracefully
        logger.warning(f"[SENTIMENT] Sentiment analysis not available for {ticker}: {e}")
        return {"ticker": ticker, "sentiment": None, "score": 0, "note": "Sentiment analysis not available for this stock or current API subscription"}


@router.get("/twitter-mentions")
async def get_twitter_mentions(
    symbol: str = Query(..., description="Stock symbol (e.g., TSLA)")
):
    """Get Twitter mentions and social media buzz.

    Returns recent Twitter mentions and engagement metrics.

    Example: /news/twitter-mentions?symbol=TSLA
    """
    try:
        client = EODHDClient()
        mentions = client.news.get_twitter_mentions(symbol)

        logger.info(f"[TWITTER] Fetched Twitter mentions for {symbol}")
        return mentions

    except Exception as e:
        logger.error(f"[TWITTER] Failed to fetch Twitter mentions for {symbol}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch Twitter mentions: {str(e)}")
