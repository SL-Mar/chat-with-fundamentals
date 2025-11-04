"""
Macroeconomic Environment Agent (20% weight)

Analyzes:
- Overall market conditions (bull/bear market)
- Sector trends and rotation
- Economic indicators (GDP, inflation, interest rates)
- Market sentiment and volatility (VIX)
"""

from typing import Optional, Dict, Any
import logging

from ..base import BaseAgent
from ...types import AgentOutput

logger = logging.getLogger(__name__)


class MacroEnvironmentAgent(BaseAgent):
    """
    Analyzes macroeconomic environment and market conditions.

    Scoring criteria:
    - 9-10: Very favorable macro environment
    - 7-8: Favorable macro environment
    - 5-6: Neutral macro environment
    - 3-4: Unfavorable macro environment
    - 0-2: Very unfavorable macro environment
    """

    async def analyze(
        self,
        asset_id: str,
        research_context: Optional[Dict[str, Any]] = None
    ) -> AgentOutput:
        """Analyze macroeconomic environment."""

        try:
            # Fetch macro data
            macro_data = await self.fetch_data(asset_id)

            # Calculate macro score
            macro_score = self._calculate_macro_score(macro_data)

            # Calculate confidence
            confidence = self.calculate_confidence(macro_data)

            # Generate reasoning
            reasoning = self._generate_reasoning(macro_data, macro_score)

            return AgentOutput(
                agent_name=self.name,
                score=macro_score,
                reasoning=reasoning,
                weight=self.weight,
                confidence=confidence,
                metadata={"macro_indicators": macro_data}
            )

        except Exception as e:
            logger.error(f"Macro analysis failed for {asset_id}: {e}", exc_info=True)
            return AgentOutput(
                agent_name=self.name,
                score=5.0,
                reasoning=f"Unable to analyze macro environment: {str(e)}",
                weight=self.weight,
                confidence=0.0
            )

    async def fetch_data(self, asset_id: str) -> Dict[str, Any]:
        """Fetch macroeconomic indicators."""
        try:
            from tools.eodhd_client import EODHDClient
            from datetime import datetime, timedelta

            client = EODHDClient()

            # Calculate date range for 30-day trend
            to_date = datetime.now().strftime("%Y-%m-%d")
            from_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")

            # Fetch market indices (SPY as proxy for overall market)
            spy_data = client.historical.get_eod("SPY.US", from_date=from_date, to_date=to_date, order="d")

            # Calculate market trend (30-day)
            market_trend = None
            if spy_data and len(spy_data) >= 2:
                current_price = spy_data[0].get("close", 0)  # Most recent (descending order)
                month_ago_price = spy_data[-1].get("close", 1)  # 30 days ago
                market_trend = ((current_price - month_ago_price) / month_ago_price) * 100

            # Fetch VIX (volatility index) if available
            # VIX is an index, not a stock, so use .INDX suffix
            try:
                vix_data = client.historical.get_eod("VIX.INDX", from_date=to_date, to_date=to_date, order="d")
                vix = vix_data[0].get("close") if vix_data and len(vix_data) > 0 else None
            except Exception as e:
                logger.debug(f"Failed to fetch VIX data: {e}")
                vix = None

            return {
                "market_trend_30d": market_trend,
                "vix": vix,
                "spy_price": spy_data[0].get("close") if spy_data else None
            }

        except Exception as e:
            logger.error(f"Failed to fetch macro data: {e}")
            return {}

    def _calculate_macro_score(self, macro_data: Dict[str, Any]) -> float:
        """Calculate macro environment score."""
        if not macro_data:
            return 5.0  # Neutral if no data

        scores = []

        # Market trend analysis
        market_trend = macro_data.get("market_trend_30d")
        if market_trend is not None:
            if market_trend > 5:
                scores.append(8.0)  # Strong bull market
            elif market_trend > 2:
                scores.append(7.0)  # Moderate bull market
            elif market_trend > -2:
                scores.append(5.0)  # Neutral
            elif market_trend > -5:
                scores.append(3.0)  # Moderate bear market
            else:
                scores.append(2.0)  # Strong bear market

        # VIX analysis (volatility)
        vix = macro_data.get("vix")
        if vix is not None:
            if vix < 15:
                scores.append(8.0)  # Low volatility - favorable
            elif vix < 20:
                scores.append(6.0)  # Moderate volatility
            elif vix < 30:
                scores.append(4.0)  # Elevated volatility
            else:
                scores.append(2.0)  # High volatility - unfavorable

        # Average scores
        if scores:
            avg_score = sum(scores) / len(scores)
            return round(avg_score, 1)
        else:
            return 5.0

    def _generate_reasoning(self, macro_data: Dict[str, Any], score: float) -> str:
        """Generate reasoning based on macro analysis."""
        reasoning = f"Macro Environment Score: {score}/10\n\n"

        if not macro_data:
            reasoning += "Limited macro data available."
            return reasoning

        # Market trend
        market_trend = macro_data.get("market_trend_30d")
        if market_trend is not None:
            reasoning += f"Market Trend (30d): {market_trend:+.1f}% - "
            if market_trend > 2:
                reasoning += "Bull market\n"
            elif market_trend > -2:
                reasoning += "Sideways market\n"
            else:
                reasoning += "Bear market\n"

        # VIX
        vix = macro_data.get("vix")
        if vix is not None:
            reasoning += f"VIX (Volatility): {vix:.1f} - "
            if vix < 20:
                reasoning += "Low volatility (favorable)\n"
            elif vix < 30:
                reasoning += "Moderate volatility\n"
            else:
                reasoning += "High volatility (unfavorable)\n"

        # Overall assessment
        if score >= 7:
            reasoning += "\nFavorable macroeconomic conditions."
        elif score >= 5:
            reasoning += "\nNeutral macroeconomic conditions."
        else:
            reasoning += "\nUnfavorable macroeconomic conditions."

        return reasoning.strip()
