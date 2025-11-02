"""
Portfolio Risk Agent (25% weight)

Analyzes:
- Portfolio volatility and risk metrics
- Value at Risk (VaR) and Conditional VaR
- Sharpe ratio and risk-adjusted returns
- Maximum drawdown
"""

from typing import Optional, Dict, Any
import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

from ..base import BaseAgent
from ...types import AgentOutput

logger = logging.getLogger(__name__)


class PortfolioRiskAgent(BaseAgent):
    """
    Analyzes portfolio risk metrics to assess risk exposure.

    Scoring criteria:
    - 9-10: Excellent risk profile (low volatility, high Sharpe ratio)
    - 7-8: Good risk profile (moderate volatility, positive Sharpe)
    - 5-6: Moderate risk profile (average volatility)
    - 3-4: High risk profile (high volatility, negative Sharpe)
    - 0-2: Extreme risk profile (very high volatility, large drawdowns)
    """

    async def analyze(
        self,
        asset_id: str,
        research_context: Optional[Dict[str, Any]] = None
    ) -> AgentOutput:
        """Analyze portfolio risk."""

        try:
            # Fetch risk data
            risk_data = await self.fetch_data(asset_id)

            # Calculate risk metrics
            metrics = self._calculate_risk_metrics(risk_data)

            # Score risk profile (0-10)
            score = self._score_risk(metrics)

            # Calculate confidence
            confidence = self.calculate_confidence(risk_data)

            # Generate reasoning
            reasoning = self._generate_reasoning(metrics, score)

            return AgentOutput(
                agent_name=self.name,
                score=score,
                reasoning=reasoning,
                weight=self.weight,
                confidence=confidence,
                metadata={"metrics": metrics}
            )

        except Exception as e:
            logger.error(f"Risk analysis failed for portfolio {asset_id}: {e}", exc_info=True)
            return AgentOutput(
                agent_name=self.name,
                score=5.0,  # Neutral on error
                reasoning=f"Unable to analyze risk: {str(e)}",
                weight=self.weight,
                confidence=0.0
            )

    async def fetch_data(self, asset_id: str) -> Dict[str, Any]:
        """Fetch risk analysis data via portfolio API."""
        try:
            import httpx

            # Fetch VaR analysis from portfolio endpoint
            async with httpx.AsyncClient() as client:
                # Default to 3 months of historical data
                end_date = datetime.now().strftime("%Y-%m-%d")
                start_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")

                response = await client.get(
                    f"http://localhost:8000/api/portfolios/{asset_id}/risk/var",
                    params={
                        "start_date": start_date,
                        "end_date": end_date,
                        "confidence_level": 0.95,
                        "time_horizon_days": 1
                    },
                    timeout=30.0
                )

                if response.status_code == 200:
                    return response.json()
                else:
                    logger.warning(f"VaR API returned {response.status_code}, using defaults")
                    return {}

        except Exception as e:
            logger.error(f"Failed to fetch risk data for portfolio {asset_id}: {e}")
            return {}

    def _calculate_risk_metrics(self, risk_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate risk metrics from VaR data."""
        # Extract metrics from VaR response
        var_percent = risk_data.get("var_percent", 0)
        cvar_percent = risk_data.get("cvar_percent", 0)
        portfolio_vol = risk_data.get("portfolio_volatility", 0)
        sharpe = risk_data.get("sharpe_ratio", 0)

        # Calculate risk score based on metrics
        # Lower VaR and CVaR are better
        # Lower volatility is better
        # Higher Sharpe ratio is better

        var_score = 10 - min(var_percent / 2, 10)  # 20% VaR = score 0
        vol_score = 10 - min(portfolio_vol * 100 / 5, 10)  # 50% vol = score 0

        # Sharpe ratio scoring (>2 is excellent, <0 is poor)
        if sharpe >= 2.0:
            sharpe_score = 10
        elif sharpe >= 1.0:
            sharpe_score = 7
        elif sharpe >= 0.5:
            sharpe_score = 5
        elif sharpe >= 0:
            sharpe_score = 3
        else:
            sharpe_score = 1

        return {
            "var_percent": var_percent,
            "cvar_percent": cvar_percent,
            "portfolio_volatility": portfolio_vol,
            "sharpe_ratio": sharpe,
            "var_score": var_score,
            "volatility_score": vol_score,
            "sharpe_score": sharpe_score
        }

    def _score_risk(self, metrics: Dict[str, Any]) -> float:
        """Score risk profile."""
        # Weighted average of risk metrics
        var_score = metrics.get("var_score", 5)
        vol_score = metrics.get("volatility_score", 5)
        sharpe_score = metrics.get("sharpe_score", 5)

        # Weight: VaR 40%, Volatility 30%, Sharpe 30%
        score = (var_score * 0.4) + (vol_score * 0.3) + (sharpe_score * 0.3)

        return round(score, 1)

    def _generate_reasoning(self, metrics: Dict[str, Any], score: float) -> str:
        """Generate human-readable reasoning."""
        var_percent = metrics.get("var_percent", 0)
        cvar_percent = metrics.get("cvar_percent", 0)
        vol = metrics.get("portfolio_volatility", 0)
        sharpe = metrics.get("sharpe_ratio", 0)

        if score >= 8:
            return (
                f"Excellent risk profile: VaR (95%) = {var_percent:.1f}%, "
                f"CVaR = {cvar_percent:.1f}%, Volatility = {vol:.1%}, "
                f"Sharpe Ratio = {sharpe:.2f}. Low risk with strong risk-adjusted returns."
            )
        elif score >= 6:
            return (
                f"Good risk profile: VaR (95%) = {var_percent:.1f}%, "
                f"CVaR = {cvar_percent:.1f}%, Volatility = {vol:.1%}, "
                f"Sharpe Ratio = {sharpe:.2f}. Moderate risk with acceptable returns."
            )
        elif score >= 4:
            return (
                f"Moderate risk profile: VaR (95%) = {var_percent:.1f}%, "
                f"CVaR = {cvar_percent:.1f}%, Volatility = {vol:.1%}, "
                f"Sharpe Ratio = {sharpe:.2f}. Above-average risk exposure."
            )
        else:
            return (
                f"High risk profile: VaR (95%) = {var_percent:.1f}%, "
                f"CVaR = {cvar_percent:.1f}%, Volatility = {vol:.1%}, "
                f"Sharpe Ratio = {sharpe:.2f}. Significant risk exposure - consider rebalancing."
            )
