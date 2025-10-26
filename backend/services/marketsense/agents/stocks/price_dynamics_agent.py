"""
Stock Price Dynamics Agent (25% weight)

Analyzes:
- Price trends and momentum
- Volume patterns
- Technical indicators (RSI, MACD, Moving Averages)
- Support and resistance levels
"""

from typing import Optional, Dict, Any
import logging

from ..base import BaseAgent
from ...types import AgentOutput

logger = logging.getLogger(__name__)


class StockPriceDynamicsAgent(BaseAgent):
    """
    Analyzes price action and technical indicators.

    Scoring criteria:
    - 9-10: Strong bullish technicals
    - 7-8: Moderate bullish technicals
    - 5-6: Neutral or mixed technicals
    - 3-4: Moderate bearish technicals
    - 0-2: Strong bearish technicals
    """

    async def analyze(
        self,
        asset_id: str,
        research_context: Optional[Dict[str, Any]] = None
    ) -> AgentOutput:
        """Analyze price dynamics and technical indicators."""

        try:
            # Fetch price data and technical indicators
            price_data = await self.fetch_data(asset_id)

            # Calculate technical score
            technical_score = self._calculate_technical_score(price_data)

            # Calculate confidence
            confidence = self.calculate_confidence(price_data)

            # Generate reasoning
            reasoning = self._generate_reasoning(price_data, technical_score)

            return AgentOutput(
                agent_name=self.name,
                score=technical_score,
                reasoning=reasoning,
                weight=self.weight,
                confidence=confidence,
                metadata={"technicals": price_data.get("indicators", {})}
            )

        except Exception as e:
            logger.error(f"Price dynamics analysis failed for {asset_id}: {e}", exc_info=True)
            return AgentOutput(
                agent_name=self.name,
                score=5.0,
                reasoning=f"Unable to analyze price dynamics: {str(e)}",
                weight=self.weight,
                confidence=0.0
            )

    async def fetch_data(self, asset_id: str) -> Dict[str, Any]:
        """Fetch price data and technical indicators."""
        try:
            from services.eodhd_client import EODHDClient

            client = EODHDClient()
            ticker = asset_id

            # Fetch technical indicators
            technicals = client.technical.get_technicals(ticker)

            # Extract key indicators
            indicators = {}
            if technicals:
                indicators = {
                    "rsi": technicals.get("RSI", {}).get("value"),
                    "macd": technicals.get("MACD", {}).get("value"),
                    "macd_signal": technicals.get("MACD", {}).get("signal"),
                    "sma_50": technicals.get("SMA50", {}).get("value"),
                    "sma_200": technicals.get("SMA200", {}).get("value"),
                    "current_price": technicals.get("close")
                }

            return {
                "indicators": indicators,
                "ticker": ticker
            }

        except Exception as e:
            logger.error(f"Failed to fetch price data for {asset_id}: {e}")
            return {"indicators": {}, "ticker": asset_id}

    def _calculate_technical_score(self, price_data: Dict[str, Any]) -> float:
        """Calculate technical score based on indicators."""
        indicators = price_data.get("indicators", {})

        if not indicators:
            return 5.0  # Neutral if no data

        scores = []

        # RSI analysis (0-100)
        rsi = indicators.get("rsi")
        if rsi is not None:
            if rsi < 30:
                scores.append(8.0)  # Oversold - potential buy
            elif rsi < 40:
                scores.append(7.0)
            elif rsi < 60:
                scores.append(5.0)  # Neutral
            elif rsi < 70:
                scores.append(4.0)
            else:
                scores.append(2.0)  # Overbought - potential sell

        # MACD analysis
        macd = indicators.get("macd")
        macd_signal = indicators.get("macd_signal")
        if macd is not None and macd_signal is not None:
            if macd > macd_signal:
                scores.append(7.0)  # Bullish
            else:
                scores.append(3.0)  # Bearish

        # Moving Average analysis
        sma_50 = indicators.get("sma_50")
        sma_200 = indicators.get("sma_200")
        current_price = indicators.get("current_price")

        if all([sma_50, sma_200, current_price]):
            # Golden cross / Death cross
            if sma_50 > sma_200:
                if current_price > sma_50:
                    scores.append(8.0)  # Strong bullish
                else:
                    scores.append(6.0)  # Moderate bullish
            else:
                if current_price < sma_50:
                    scores.append(2.0)  # Strong bearish
                else:
                    scores.append(4.0)  # Moderate bearish

        # Average all technical scores
        if scores:
            avg_score = sum(scores) / len(scores)
            return round(avg_score, 1)
        else:
            return 5.0

    def _generate_reasoning(self, price_data: Dict[str, Any], score: float) -> str:
        """Generate reasoning based on technical analysis."""
        indicators = price_data.get("indicators", {})

        reasoning = f"Technical Analysis Score: {score}/10\n\n"

        if not indicators:
            reasoning += "No technical data available."
            return reasoning

        # RSI
        rsi = indicators.get("rsi")
        if rsi is not None:
            reasoning += f"RSI: {rsi:.1f} - "
            if rsi < 30:
                reasoning += "Oversold (bullish signal)\n"
            elif rsi > 70:
                reasoning += "Overbought (bearish signal)\n"
            else:
                reasoning += "Neutral zone\n"

        # MACD
        macd = indicators.get("macd")
        macd_signal = indicators.get("macd_signal")
        if macd is not None and macd_signal is not None:
            trend = "Bullish" if macd > macd_signal else "Bearish"
            reasoning += f"MACD: {trend} crossover\n"

        # Moving Averages
        sma_50 = indicators.get("sma_50")
        sma_200 = indicators.get("sma_200")
        current_price = indicators.get("current_price")

        if all([sma_50, sma_200, current_price]):
            if sma_50 > sma_200 and current_price > sma_50:
                reasoning += "Price above both MAs - Strong uptrend\n"
            elif sma_50 < sma_200 and current_price < sma_50:
                reasoning += "Price below both MAs - Strong downtrend\n"
            else:
                reasoning += "Mixed moving average signals\n"

        return reasoning.strip()
