"""
Portfolio Optimization Agent (25% weight)

Analyzes:
- Mean-Variance Optimization (MVO) opportunities
- Black-Litterman optimization potential
- Weight rebalancing suggestions
- Comparison with equal-weight baseline
"""

from typing import Optional, Dict, Any
import logging
from datetime import datetime, timedelta

from ..base import BaseAgent
from ...types import AgentOutput

logger = logging.getLogger(__name__)


class PortfolioOptimizationAgent(BaseAgent):
    """
    Analyzes portfolio optimization opportunities.

    Scoring criteria:
    - 9-10: Near-optimal allocation, minimal improvement possible
    - 7-8: Good allocation, minor optimization opportunities
    - 5-6: Moderate allocation, some optimization potential
    - 3-4: Poor allocation, significant optimization needed
    - 0-2: Very poor allocation, major rebalancing required
    """

    async def analyze(
        self,
        asset_id: str,
        research_context: Optional[Dict[str, Any]] = None
    ) -> AgentOutput:
        """Analyze portfolio optimization opportunities."""

        try:
            # Fetch optimization data
            optimization_data = await self.fetch_data(asset_id)

            # Analyze optimization potential
            analysis = self._analyze_optimization(optimization_data)

            # Score optimization (0-10)
            score = self._score_optimization(analysis)

            # Calculate confidence
            confidence = self.calculate_confidence(optimization_data)

            # Generate reasoning
            reasoning = self._generate_reasoning(optimization_data, analysis, score)

            return AgentOutput(
                agent_name=self.name,
                score=score,
                reasoning=reasoning,
                weight=self.weight,
                confidence=confidence,
                metadata={"analysis": analysis}
            )

        except Exception as e:
            logger.error(f"Optimization analysis failed for portfolio {asset_id}: {e}", exc_info=True)
            return AgentOutput(
                agent_name=self.name,
                score=5.0,  # Neutral on error
                reasoning=f"Unable to analyze optimization: {str(e)}",
                weight=self.weight,
                confidence=0.0
            )

    async def fetch_data(self, asset_id: str) -> Dict[str, Any]:
        """Fetch optimization analysis data via portfolio API."""
        try:
            import httpx

            # Fetch both equal-weight and MVO analyses
            end_date = datetime.now().strftime("%Y-%m-%d")
            start_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")

            async with httpx.AsyncClient() as client:
                # Get equal-weight analysis
                equal_weight_response = await client.get(
                    f"http://localhost:8000/api/portfolios/{asset_id}/analysis/equal-weight",
                    params={
                        "start_date": start_date,
                        "end_date": end_date,
                        "use_adjusted": True
                    },
                    timeout=30.0
                )

                # Get MVO analysis
                mvo_response = await client.get(
                    f"http://localhost:8000/api/portfolios/{asset_id}/analysis/optimized",
                    params={
                        "method": "mvo",
                        "start_date": start_date,
                        "end_date": end_date,
                        "use_adjusted": True
                    },
                    timeout=30.0
                )

                equal_weight = equal_weight_response.json() if equal_weight_response.status_code == 200 else {}
                mvo = mvo_response.json() if mvo_response.status_code == 200 else {}

                return {
                    "equal_weight": equal_weight,
                    "mvo": mvo
                }

        except Exception as e:
            logger.error(f"Failed to fetch optimization data for portfolio {asset_id}: {e}")
            return {"equal_weight": {}, "mvo": {}}

    def _analyze_optimization(self, optimization_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze optimization potential."""
        equal_weight = optimization_data.get("equal_weight", {})
        mvo = optimization_data.get("mvo", {})

        # Extract metrics
        ew_sharpe = equal_weight.get("sharpe_ratio", 0)
        ew_return = equal_weight.get("annualized_return", 0)
        mvo_sharpe = mvo.get("sharpe_ratio", 0)
        mvo_return = mvo.get("annualized_return", 0)

        # Calculate improvement potential
        sharpe_improvement = mvo_sharpe - ew_sharpe if mvo_sharpe and ew_sharpe else 0
        return_improvement = mvo_return - ew_return if mvo_return and ew_return else 0

        # Determine optimization potential (monotonically: more improvement needed = lower score)
        if sharpe_improvement > 0.5:
            optimization_potential = "high"
            potential_score = 3
        elif sharpe_improvement > 0.2:
            optimization_potential = "moderate"
            potential_score = 5
        elif sharpe_improvement > 0:
            optimization_potential = "low"
            potential_score = 7
        else:
            optimization_potential = "minimal"
            potential_score = 9  # Already well optimized

        return {
            "equal_weight_sharpe": ew_sharpe,
            "equal_weight_return": ew_return,
            "mvo_sharpe": mvo_sharpe,
            "mvo_return": mvo_return,
            "sharpe_improvement": sharpe_improvement,
            "return_improvement": return_improvement,
            "optimization_potential": optimization_potential,
            "potential_score": potential_score
        }

    def _score_optimization(self, analysis: Dict[str, Any]) -> float:
        """Score portfolio optimization."""
        # Higher score means portfolio is already well-optimized
        # Lower score means significant optimization opportunities exist
        return float(analysis.get("potential_score", 5.0))

    def _generate_reasoning(
        self,
        optimization_data: Dict[str, Any],
        analysis: Dict[str, Any],
        score: float
    ) -> str:
        """Generate human-readable reasoning."""
        ew_sharpe = analysis.get("equal_weight_sharpe", 0)
        mvo_sharpe = analysis.get("mvo_sharpe", 0)
        sharpe_improvement = analysis.get("sharpe_improvement", 0)
        return_improvement = analysis.get("return_improvement", 0)
        potential = analysis.get("optimization_potential", "unknown")

        if score >= 8:
            return (
                f"Portfolio is near-optimal. Equal-weight Sharpe: {ew_sharpe:.2f}, "
                f"MVO Sharpe: {mvo_sharpe:.2f} (improvement: {sharpe_improvement:+.2f}). "
                f"Minimal rebalancing needed - {potential} optimization potential."
            )
        elif score >= 6:
            return (
                f"Portfolio has moderate optimization potential. Equal-weight Sharpe: {ew_sharpe:.2f}, "
                f"MVO Sharpe: {mvo_sharpe:.2f} (improvement: {sharpe_improvement:+.2f}). "
                f"Consider MVO optimization for {return_improvement:+.1%} annualized return improvement."
            )
        elif score >= 4:
            return (
                f"Portfolio has significant optimization opportunities. Equal-weight Sharpe: {ew_sharpe:.2f}, "
                f"MVO Sharpe: {mvo_sharpe:.2f} (improvement: {sharpe_improvement:+.2f}). "
                f"MVO optimization could improve returns by {return_improvement:+.1%} annually."
            )
        else:
            return (
                f"Portfolio requires major optimization. Equal-weight Sharpe: {ew_sharpe:.2f}, "
                f"MVO Sharpe: {mvo_sharpe:.2f} (improvement: {sharpe_improvement:+.2f}). "
                f"Strong recommendation to rebalance using MVO ({return_improvement:+.1%} potential gain)."
            )
