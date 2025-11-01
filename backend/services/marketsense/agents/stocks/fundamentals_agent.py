"""
Stock Fundamentals Agent (30% weight)

Analyzes:
- Financial statements (balance sheet, income statement, cash flow)
- Financial ratios (P/E, P/B, ROE, Debt/Equity, etc.)
- Revenue and earnings growth
- Profitability metrics
"""

from typing import Optional, Dict, Any
import logging

from ..base import BaseAgent
from ...types import AgentOutput

logger = logging.getLogger(__name__)


class StockFundamentalsAgent(BaseAgent):
    """
    Analyzes stock fundamentals to assess company financial health.

    Scoring criteria:
    - 9-10: Exceptional fundamentals (strong balance sheet, high profitability, low debt)
    - 7-8: Strong fundamentals (solid financials, good profitability)
    - 5-6: Average fundamentals (mixed signals)
    - 3-4: Weak fundamentals (concerns in financials)
    - 0-2: Poor fundamentals (financial distress signals)
    """

    async def analyze(
        self,
        asset_id: str,
        research_context: Optional[Dict[str, Any]] = None
    ) -> AgentOutput:
        """Analyze stock fundamentals."""

        try:
            # Fetch fundamental data from database/API
            fundamentals = await self.fetch_data(asset_id)

            # Calculate financial ratios
            ratios = self._calculate_ratios(fundamentals)

            # Score fundamentals (0-10)
            score = self._score_fundamentals(ratios)

            # Calculate confidence
            confidence = self.calculate_confidence(fundamentals)

            # Generate reasoning
            reasoning = self._generate_reasoning(fundamentals, ratios, score)

            return AgentOutput(
                agent_name=self.name,
                score=score,
                reasoning=reasoning,
                weight=self.weight,
                confidence=confidence,
                metadata={"ratios": ratios}
            )

        except Exception as e:
            logger.error(f"Fundamentals analysis failed for {asset_id}: {e}", exc_info=True)
            return AgentOutput(
                agent_name=self.name,
                score=5.0,  # Neutral on error
                reasoning=f"Unable to analyze fundamentals: {str(e)}",
                weight=self.weight,
                confidence=0.0
            )

    async def fetch_data(self, asset_id: str) -> Dict[str, Any]:
        """Fetch fundamental data from EODHD API or database."""
        try:
            from tools.eodhd_client import EODHDClient

            client = EODHDClient()
            ticker = asset_id

            # Fetch fundamentals from EODHD
            fundamentals = client.fundamental.get_fundamentals(ticker)

            # Extract key metrics
            general = fundamentals.get("General", {})
            highlights = fundamentals.get("Highlights", {})
            valuation = fundamentals.get("Valuation", {})
            technicals = fundamentals.get("Technicals", {})

            return {
                "market_cap": highlights.get("MarketCapitalization"),
                "pe_ratio": highlights.get("PERatio"),
                "peg_ratio": highlights.get("PEGRatio"),
                "book_value": highlights.get("BookValue"),
                "dividend_yield": highlights.get("DividendYield"),
                "eps": highlights.get("EarningsShare"),
                "revenue_per_share": highlights.get("RevenuePerShareTTM"),
                "profit_margin": highlights.get("ProfitMargin"),
                "operating_margin": highlights.get("OperatingMarginTTM"),
                "roe": highlights.get("ReturnOnEquityTTM"),
                "roa": highlights.get("ReturnOnAssetsTTM"),
                "debt_to_equity": highlights.get("DebtToEquity"),
                "current_ratio": highlights.get("CurrentRatio"),
                "quick_ratio": highlights.get("QuickRatio"),
                "trailing_pe": valuation.get("TrailingPE"),
                "forward_pe": valuation.get("ForwardPE"),
                "price_to_book": valuation.get("PriceBookMRQ")
            }

        except Exception as e:
            logger.error(f"Failed to fetch fundamentals for {asset_id}: {e}")
            return {}

    def _calculate_ratios(self, fundamentals: Dict[str, Any]) -> Dict[str, float]:
        """Calculate additional ratios from fundamental data."""
        ratios = {}

        try:
            # PE Ratio assessment
            pe = fundamentals.get("pe_ratio")
            if pe:
                if pe < 15:
                    ratios["pe_score"] = 10
                elif pe < 20:
                    ratios["pe_score"] = 8
                elif pe < 30:
                    ratios["pe_score"] = 6
                elif pe < 50:
                    ratios["pe_score"] = 4
                else:
                    ratios["pe_score"] = 2

            # ROE assessment
            roe = fundamentals.get("roe")
            if roe:
                roe_pct = roe * 100 if roe < 1 else roe
                if roe_pct > 20:
                    ratios["roe_score"] = 10
                elif roe_pct > 15:
                    ratios["roe_score"] = 8
                elif roe_pct > 10:
                    ratios["roe_score"] = 6
                elif roe_pct > 5:
                    ratios["roe_score"] = 4
                else:
                    ratios["roe_score"] = 2

            # Debt to Equity assessment
            dte = fundamentals.get("debt_to_equity")
            if dte is not None:
                if dte < 0.3:
                    ratios["debt_score"] = 10
                elif dte < 0.5:
                    ratios["debt_score"] = 8
                elif dte < 1.0:
                    ratios["debt_score"] = 6
                elif dte < 2.0:
                    ratios["debt_score"] = 4
                else:
                    ratios["debt_score"] = 2

            # Profit Margin assessment
            pm = fundamentals.get("profit_margin")
            if pm:
                pm_pct = pm * 100 if pm < 1 else pm
                if pm_pct > 20:
                    ratios["margin_score"] = 10
                elif pm_pct > 15:
                    ratios["margin_score"] = 8
                elif pm_pct > 10:
                    ratios["margin_score"] = 6
                elif pm_pct > 5:
                    ratios["margin_score"] = 4
                else:
                    ratios["margin_score"] = 2

        except Exception as e:
            logger.error(f"Error calculating ratios: {e}")

        return ratios

    def _score_fundamentals(self, ratios: Dict[str, float]) -> float:
        """Score fundamentals based on ratios (0-10)."""
        if not ratios:
            return 5.0  # Neutral if no data

        # Average all ratio scores
        scores = list(ratios.values())
        avg_score = sum(scores) / len(scores) if scores else 5.0

        return round(avg_score, 1)

    def _generate_reasoning(
        self,
        fundamentals: Dict[str, Any],
        ratios: Dict[str, float],
        score: float
    ) -> str:
        """Generate human-readable reasoning."""
        reasoning = f"Fundamental Analysis Score: {score}/10\n\n"

        # Valuation metrics
        pe = fundamentals.get("pe_ratio")
        if pe:
            reasoning += f"P/E Ratio: {pe:.2f} - "
            if pe < 15:
                reasoning += "Undervalued\n"
            elif pe < 25:
                reasoning += "Fair value\n"
            else:
                reasoning += "Overvalued\n"

        # Profitability
        roe = fundamentals.get("roe")
        if roe:
            roe_pct = (roe * 100) if roe < 1 else roe
            reasoning += f"ROE: {roe_pct:.1f}% - "
            if roe_pct > 15:
                reasoning += "Strong profitability\n"
            else:
                reasoning += "Average profitability\n"

        # Debt levels
        dte = fundamentals.get("debt_to_equity")
        if dte is not None:
            reasoning += f"Debt/Equity: {dte:.2f} - "
            if dte < 0.5:
                reasoning += "Low debt\n"
            elif dte < 1.0:
                reasoning += "Moderate debt\n"
            else:
                reasoning += "High debt\n"

        # Profit margin
        pm = fundamentals.get("profit_margin")
        if pm:
            pm_pct = (pm * 100) if pm < 1 else pm
            reasoning += f"Profit Margin: {pm_pct:.1f}% - "
            if pm_pct > 15:
                reasoning += "Excellent margins\n"
            else:
                reasoning += "Average margins\n"

        return reasoning.strip()
