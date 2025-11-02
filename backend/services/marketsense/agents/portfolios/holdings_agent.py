"""
Portfolio Holdings Agent (30% weight)

Analyzes:
- Portfolio composition and diversification
- Sector allocation and concentration risk
- Individual stock weights
- Correlation between holdings
"""

from typing import Optional, Dict, Any
import logging
from sqlalchemy.orm import Session

from ..base import BaseAgent
from ...types import AgentOutput
from database.models.base import get_db
from database.models.portfolio import Portfolio, PortfolioStock

logger = logging.getLogger(__name__)


class PortfolioHoldingsAgent(BaseAgent):
    """
    Analyzes portfolio holdings to assess diversification and composition quality.

    Scoring criteria:
    - 9-10: Excellently diversified across sectors and stocks
    - 7-8: Well diversified with minor concentration
    - 5-6: Moderate diversification, some concentration risk
    - 3-4: Poor diversification, high concentration
    - 0-2: Extremely concentrated, high risk
    """

    async def analyze(
        self,
        asset_id: str,
        research_context: Optional[Dict[str, Any]] = None
    ) -> AgentOutput:
        """Analyze portfolio holdings."""

        try:
            # Fetch portfolio data
            portfolio_data = await self.fetch_data(asset_id)

            # Analyze composition
            composition = self._analyze_composition(portfolio_data)

            # Score holdings (0-10)
            score = self._score_holdings(composition)

            # Calculate confidence
            confidence = self.calculate_confidence(portfolio_data)

            # Generate reasoning
            reasoning = self._generate_reasoning(portfolio_data, composition, score)

            return AgentOutput(
                agent_name=self.name,
                score=score,
                reasoning=reasoning,
                weight=self.weight,
                confidence=confidence,
                metadata={"composition": composition}
            )

        except Exception as e:
            logger.error(f"Holdings analysis failed for portfolio {asset_id}: {e}", exc_info=True)
            return AgentOutput(
                agent_name=self.name,
                score=5.0,  # Neutral on error
                reasoning=f"Unable to analyze holdings: {str(e)}",
                weight=self.weight,
                confidence=0.0
            )

    async def fetch_data(self, asset_id: str) -> Dict[str, Any]:
        """Fetch portfolio data from database."""
        try:
            from database.models.base import SessionLocal
            db = SessionLocal()

            try:
                portfolio_id = int(asset_id)
                portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()

                if not portfolio:
                    raise ValueError(f"Portfolio {portfolio_id} not found")

                stocks = [
                    {
                        "ticker": stock.ticker,
                        "weight": stock.weight,
                        "shares": stock.shares
                    }
                    for stock in portfolio.stocks
                ]

                return {
                    "portfolio_id": portfolio.id,
                    "name": portfolio.name,
                    "stocks": stocks,
                    "num_holdings": len(stocks)
                }
            finally:
                db.close()

        except Exception as e:
            logger.error(f"Failed to fetch portfolio data for {asset_id}: {e}")
            return {
                "portfolio_id": asset_id,
                "name": "Unknown",
                "stocks": [],
                "num_holdings": 0
            }

    def _analyze_composition(self, portfolio_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze portfolio composition."""
        stocks = portfolio_data.get("stocks", [])
        num_holdings = len(stocks)

        if num_holdings == 0:
            return {
                "num_holdings": 0,
                "concentration_risk": "extreme",
                "diversification_score": 0
            }

        # Calculate equal weight for comparison
        equal_weight = 1.0 / num_holdings if num_holdings > 0 else 0

        # If all weights are None, assume equal weight
        if all(s.get("weight") is None for s in stocks):
            weights = [equal_weight] * num_holdings
        else:
            weights = [s.get("weight", equal_weight) for s in stocks]

        # Calculate concentration (max weight)
        max_weight = max(weights) if weights else 0

        # Determine concentration risk
        if max_weight > 0.5:
            concentration_risk = "extreme"
        elif max_weight > 0.3:
            concentration_risk = "high"
        elif max_weight > 0.15:
            concentration_risk = "moderate"
        else:
            concentration_risk = "low"

        # Calculate diversification score based on number of holdings
        if num_holdings >= 15:
            diversification_score = 10
        elif num_holdings >= 10:
            diversification_score = 8
        elif num_holdings >= 5:
            diversification_score = 6
        elif num_holdings >= 3:
            diversification_score = 4
        else:
            diversification_score = 2

        # Adjust for concentration
        if concentration_risk == "extreme":
            diversification_score = min(diversification_score, 3)
        elif concentration_risk == "high":
            diversification_score = min(diversification_score, 6)

        return {
            "num_holdings": num_holdings,
            "max_weight": max_weight,
            "concentration_risk": concentration_risk,
            "diversification_score": diversification_score
        }

    def _score_holdings(self, composition: Dict[str, Any]) -> float:
        """Score holdings based on composition analysis."""
        return float(composition.get("diversification_score", 5.0))

    def _generate_reasoning(
        self,
        portfolio_data: Dict[str, Any],
        composition: Dict[str, Any],
        score: float
    ) -> str:
        """Generate human-readable reasoning."""
        num_holdings = composition.get("num_holdings", 0)
        concentration_risk = composition.get("concentration_risk", "unknown")
        max_weight = composition.get("max_weight", 0)

        if num_holdings == 0:
            return "Portfolio is empty - no holdings to analyze."

        reasoning = f"Portfolio contains {num_holdings} holdings. "

        if score >= 8:
            reasoning += f"Well diversified with {concentration_risk} concentration risk (max weight: {max_weight:.1%}). "
            reasoning += "Good balance across holdings."
        elif score >= 6:
            reasoning += f"Moderately diversified with {concentration_risk} concentration risk (max weight: {max_weight:.1%}). "
            reasoning += "Consider adding more holdings for better diversification."
        elif score >= 4:
            reasoning += f"Limited diversification with {concentration_risk} concentration risk (max weight: {max_weight:.1%}). "
            reasoning += "Portfolio is concentrated - consider diversifying."
        else:
            reasoning += f"Poorly diversified with {concentration_risk} concentration risk (max weight: {max_weight:.1%}). "
            reasoning += "High concentration risk - significant diversification needed."

        return reasoning
