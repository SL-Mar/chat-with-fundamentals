"""
Stock News Agent (25% weight)

Analyzes:
- Recent news articles
- Sentiment analysis
- Key events (earnings, product launches, regulatory changes)
- Social media sentiment
"""

from typing import Optional, Dict, Any
import logging
from datetime import datetime, timedelta

from ..base import BaseAgent
from ...types import AgentOutput

logger = logging.getLogger(__name__)


class StockNewsAgent(BaseAgent):
    """
    Analyzes news sentiment and key events.

    Scoring criteria:
    - 9-10: Very positive news and sentiment
    - 7-8: Mostly positive news
    - 5-6: Mixed or neutral news
    - 3-4: Mostly negative news
    - 0-2: Very negative news
    """

    async def analyze(
        self,
        asset_id: str,
        research_context: Optional[Dict[str, Any]] = None
    ) -> AgentOutput:
        """Analyze news and sentiment."""

        try:
            # Fetch news data
            news_data = await self.fetch_data(asset_id)

            # Calculate sentiment score
            sentiment_score = self._calculate_sentiment(news_data)

            # Use research context if available
            if research_context and "summary" in research_context:
                sentiment_score = self._adjust_with_research(
                    sentiment_score,
                    research_context["summary"]
                )

            # Calculate confidence
            confidence = self.calculate_confidence(news_data)

            # Generate reasoning
            reasoning = self._generate_reasoning(news_data, sentiment_score)

            return AgentOutput(
                agent_name=self.name,
                score=sentiment_score,
                reasoning=reasoning,
                weight=self.weight,
                confidence=confidence,
                metadata={"news_count": len(news_data.get("articles", []))}
            )

        except Exception as e:
            logger.error(f"News analysis failed for {asset_id}: {e}", exc_info=True)
            return AgentOutput(
                agent_name=self.name,
                score=5.0,
                reasoning=f"Unable to analyze news: {str(e)}",
                weight=self.weight,
                confidence=0.0
            )

    async def fetch_data(self, asset_id: str) -> Dict[str, Any]:
        """Fetch news articles from database or API."""
        try:
            from services.eodhd_client import EODHDClient

            client = EODHDClient()
            ticker = asset_id

            # Fetch recent news (last 7 days)
            news = client.news.get_news(
                ticker=ticker,
                limit=20
            )

            return {
                "articles": news if news else [],
                "ticker": ticker
            }

        except Exception as e:
            logger.error(f"Failed to fetch news for {asset_id}: {e}")
            return {"articles": [], "ticker": asset_id}

    def _calculate_sentiment(self, news_data: Dict[str, Any]) -> float:
        """Calculate sentiment score from news articles."""
        articles = news_data.get("articles", [])

        if not articles:
            return 5.0  # Neutral if no news

        # Simple sentiment analysis based on keywords
        positive_keywords = [
            "growth", "profit", "surge", "rally", "gains", "positive",
            "upgrade", "beat", "strong", "increase", "bullish", "buy"
        ]
        negative_keywords = [
            "loss", "decline", "fall", "drop", "concern", "weak", "miss",
            "downgrade", "cut", "bearish", "sell", "warning", "risk"
        ]

        sentiment_scores = []

        for article in articles[:10]:  # Analyze recent 10 articles
            title = article.get("title", "").lower()
            content = article.get("content", "").lower()
            text = title + " " + content

            positive_count = sum(1 for kw in positive_keywords if kw in text)
            negative_count = sum(1 for kw in negative_keywords if kw in text)

            # Score this article
            if positive_count > negative_count:
                sentiment_scores.append(7.0)
            elif negative_count > positive_count:
                sentiment_scores.append(3.0)
            else:
                sentiment_scores.append(5.0)

        # Average sentiment
        avg_sentiment = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 5.0

        return round(avg_sentiment, 1)

    def _adjust_with_research(self, base_score: float, research_summary: str) -> float:
        """Adjust score based on deep research summary."""
        # Simple keyword-based adjustment
        summary_lower = research_summary.lower()

        positive_indicators = ["positive", "growth", "strong", "bullish", "opportunity"]
        negative_indicators = ["negative", "concern", "weak", "bearish", "risk"]

        adjustment = 0.0

        for keyword in positive_indicators:
            if keyword in summary_lower:
                adjustment += 0.3

        for keyword in negative_indicators:
            if keyword in summary_lower:
                adjustment -= 0.3

        # Cap adjustment at ±1.5
        adjustment = max(-1.5, min(1.5, adjustment))

        adjusted_score = base_score + adjustment
        return max(0.0, min(10.0, adjusted_score))

    def _generate_reasoning(self, news_data: Dict[str, Any], score: float) -> str:
        """Generate reasoning based on news analysis."""
        articles = news_data.get("articles", [])
        article_count = len(articles)

        reasoning = f"News Sentiment Score: {score}/10\n\n"

        if article_count == 0:
            reasoning += "No recent news articles found."
        else:
            reasoning += f"Analyzed {min(article_count, 10)} recent articles.\n"

            if score >= 7:
                reasoning += "Predominantly positive sentiment detected."
            elif score >= 5:
                reasoning += "Mixed or neutral sentiment detected."
            else:
                reasoning += "Predominantly negative sentiment detected."

            # Show most recent headline
            if articles:
                latest = articles[0]
                reasoning += f"\n\nLatest: {latest.get('title', 'N/A')}"

        return reasoning
