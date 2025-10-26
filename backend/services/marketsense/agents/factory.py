"""
Agent Factory - Creates asset-specific agents

Returns the appropriate set of agents for each asset type.
"""

from typing import Dict
from ..types import AssetType
from .base import BaseAgent, SignalGeneratorAgent

# Import stock agents
from .stocks.fundamentals_agent import StockFundamentalsAgent
from .stocks.news_agent import StockNewsAgent
from .stocks.price_dynamics_agent import StockPriceDynamicsAgent
from .stocks.macro_agent import MacroEnvironmentAgent


class AgentFactory:
    """
    Factory for creating asset-specific agent sets.

    Each asset type has its own specialized agents with appropriate weights.
    """

    @staticmethod
    def create_agents(asset_type: AssetType) -> Dict[str, BaseAgent]:
        """
        Create agents for the specified asset type.

        Args:
            asset_type: Type of asset (stock, currency, etf, macro, portfolio)

        Returns:
            Dictionary of agents by name

        Example:
            agents = AgentFactory.create_agents(AssetType.STOCK)
            # Returns: {
            #   "fundamentals": StockFundamentalsAgent(weight=0.30),
            #   "news": StockNewsAgent(weight=0.25),
            #   "price_dynamics": StockPriceDynamicsAgent(weight=0.25),
            #   "macro": MacroEnvironmentAgent(weight=0.20),
            #   "signal_generator": SignalGeneratorAgent()
            # }
        """

        if asset_type == AssetType.STOCK:
            return AgentFactory._create_stock_agents()
        elif asset_type == AssetType.CURRENCY:
            return AgentFactory._create_currency_agents()
        elif asset_type == AssetType.ETF:
            return AgentFactory._create_etf_agents()
        elif asset_type == AssetType.MACRO:
            return AgentFactory._create_macro_agents()
        elif asset_type == AssetType.PORTFOLIO:
            return AgentFactory._create_portfolio_agents()
        else:
            raise ValueError(f"Unknown asset type: {asset_type}")

    @staticmethod
    def _create_stock_agents() -> Dict[str, BaseAgent]:
        """Create agents for stock analysis."""
        return {
            "fundamentals": StockFundamentalsAgent(
                name="fundamentals",
                weight=0.30,
                description="Analyzes financial statements, ratios, and company fundamentals"
            ),
            "news": StockNewsAgent(
                name="news",
                weight=0.25,
                description="Analyzes news sentiment and key events"
            ),
            "price_dynamics": StockPriceDynamicsAgent(
                name="price_dynamics",
                weight=0.25,
                description="Analyzes price action, volume, and technical indicators"
            ),
            "macro": MacroEnvironmentAgent(
                name="macro",
                weight=0.20,
                description="Analyzes macroeconomic environment and sector trends"
            ),
            "signal_generator": SignalGeneratorAgent()
        }

    @staticmethod
    def _create_currency_agents() -> Dict[str, BaseAgent]:
        """Create agents for currency/forex analysis."""
        # TODO: Implement currency-specific agents in Phase 3
        # For now, reuse stock agents structure
        from .currencies.economic_agent import CurrencyEconomicAgent
        from .currencies.news_agent import CurrencyNewsAgent
        from .currencies.price_dynamics_agent import CurrencyPriceDynamicsAgent

        return {
            "economic_factors": CurrencyEconomicAgent(
                name="economic_factors",
                weight=0.30,
                description="Analyzes interest rates, inflation, GDP, and central bank policy"
            ),
            "news": CurrencyNewsAgent(
                name="news",
                weight=0.25,
                description="Analyzes forex news and geopolitical events"
            ),
            "price_dynamics": CurrencyPriceDynamicsAgent(
                name="price_dynamics",
                weight=0.25,
                description="Analyzes exchange rate trends and technical patterns"
            ),
            "macro": MacroEnvironmentAgent(
                name="macro",
                weight=0.20,
                description="Analyzes global macroeconomic conditions"
            ),
            "signal_generator": SignalGeneratorAgent()
        }

    @staticmethod
    def _create_etf_agents() -> Dict[str, BaseAgent]:
        """Create agents for ETF analysis."""
        # TODO: Implement ETF-specific agents in Phase 4
        from .etfs.holdings_agent import ETFHoldingsAgent
        from .etfs.performance_agent import ETFPerformanceAgent
        from .etfs.price_dynamics_agent import ETFPriceDynamicsAgent

        return {
            "holdings_analysis": ETFHoldingsAgent(
                name="holdings_analysis",
                weight=0.30,
                description="Analyzes ETF holdings, sector allocation, and concentration"
            ),
            "performance": ETFPerformanceAgent(
                name="performance",
                weight=0.25,
                description="Analyzes tracking error, expense ratio, and performance metrics"
            ),
            "price_dynamics": ETFPriceDynamicsAgent(
                name="price_dynamics",
                weight=0.25,
                description="Analyzes ETF price action and technical indicators"
            ),
            "macro": MacroEnvironmentAgent(
                name="macro",
                weight=0.20,
                description="Analyzes macroeconomic impact on ETF category"
            ),
            "signal_generator": SignalGeneratorAgent()
        }

    @staticmethod
    def _create_macro_agents() -> Dict[str, BaseAgent]:
        """Create agents for macroeconomic indicator analysis."""
        # TODO: Implement macro-specific agents in Phase 5
        from .macro.indicator_agent import MacroIndicatorAgent
        from .macro.cross_country_agent import CrossCountryAgent
        from .macro.trends_agent import MacroTrendsAgent
        from .macro.policy_agent import PolicyAnalysisAgent

        return {
            "indicator_analysis": MacroIndicatorAgent(
                name="indicator_analysis",
                weight=0.30,
                description="Analyzes indicator data, trends, and forecasts"
            ),
            "cross_country": CrossCountryAgent(
                name="cross_country",
                weight=0.25,
                description="Analyzes cross-country comparisons and correlations"
            ),
            "trends": MacroTrendsAgent(
                name="trends",
                weight=0.25,
                description="Analyzes long-term trends and cycles"
            ),
            "policy": PolicyAnalysisAgent(
                name="policy",
                weight=0.20,
                description="Analyzes policy implications and forecasts"
            ),
            "signal_generator": SignalGeneratorAgent()
        }

    @staticmethod
    def _create_portfolio_agents() -> Dict[str, BaseAgent]:
        """Create agents for portfolio analysis."""
        # TODO: Implement portfolio-specific agents in Phase 6
        from .portfolios.holdings_agent import PortfolioHoldingsAgent
        from .portfolios.risk_agent import PortfolioRiskAgent
        from .portfolios.optimization_agent import PortfolioOptimizationAgent

        return {
            "holdings_analysis": PortfolioHoldingsAgent(
                name="holdings_analysis",
                weight=0.30,
                description="Analyzes portfolio composition and diversification"
            ),
            "risk_analysis": PortfolioRiskAgent(
                name="risk_analysis",
                weight=0.25,
                description="Analyzes portfolio risk metrics and exposures"
            ),
            "optimization": PortfolioOptimizationAgent(
                name="optimization",
                weight=0.25,
                description="Analyzes optimization opportunities"
            ),
            "macro": MacroEnvironmentAgent(
                name="macro",
                weight=0.20,
                description="Analyzes macro environment impact on portfolio"
            ),
            "signal_generator": SignalGeneratorAgent()
        }
