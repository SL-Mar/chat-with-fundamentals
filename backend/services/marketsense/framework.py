"""
MarketSense AI Framework - Main Orchestrator

Multi-agent system for comprehensive market analysis.
"""

import asyncio
import logging
from typing import Optional, Dict, Any
from datetime import datetime

from .types import (
    AssetType,
    SignalType,
    AgentOutput,
    AnalysisResult,
    AgentStatus,
    AgentLogMessage
)
from .agents.base import BaseAgent
from .agents.factory import AgentFactory

logger = logging.getLogger(__name__)


class MarketSenseAI:
    """
    MarketSense AI Framework - Multi-Agent Market Analysis System

    Coordinates multiple specialized agents to analyze assets and generate
    trading signals with transparency and explainability.

    Architecture:
    - Asset-specific agents (4 agents: 30%, 25%, 25%, 20% weights)
    - Master signal generator (synthesizes all agent outputs)
    - WebSocket logging for real-time transparency
    - Optional deep research integration

    Usage:
        ai = MarketSenseAI(asset_type="stock", asset_id="AAPL.US")
        result = await ai.analyze(deep_research=True, ws_manager=ws_manager)
        print(result.signal)  # BUY, HOLD, or SELL
    """

    def __init__(self, asset_type: AssetType, asset_id: str):
        """
        Initialize MarketSense AI for specific asset.

        Args:
            asset_type: Type of asset (stock, currency, etf, macro, portfolio)
            asset_id: Asset identifier (ticker, pair, symbol, indicator code)
        """
        self.asset_type = asset_type
        self.asset_id = asset_id.upper()

        # Get asset-specific agents from factory
        self.agents = AgentFactory.create_agents(asset_type)

        logger.info(f"MarketSense AI initialized for {asset_type.value}: {asset_id}")

    async def analyze(
        self,
        deep_research: bool = False,
        ws_manager: Optional[Any] = None
    ) -> AnalysisResult:
        """
        Run comprehensive analysis with all agents.

        Args:
            deep_research: Whether to include Tavily deep research
            ws_manager: WebSocket manager for real-time logging

        Returns:
            AnalysisResult with signal, confidence, and detailed agent outputs
        """
        start_time = datetime.now()

        try:
            # Step 1: Optional deep research
            research_context = None
            if deep_research:
                await self._log(ws_manager, "research", AgentStatus.RUNNING,
                              f"Starting deep research for {self.asset_id}...")
                research_context = await self._run_deep_research()
                await self._log(ws_manager, "research", AgentStatus.SUCCESS,
                              "Deep research complete")

            # Step 2: Run all analysis agents in parallel
            agent_results = await self._run_agents(research_context, ws_manager)

            # Step 3: Generate final signal
            await self._log(ws_manager, "signal_generator", AgentStatus.RUNNING,
                          "Synthesizing final signal from all agents...")

            signal_agent = self.agents.get("signal_generator")
            if not signal_agent:
                raise ValueError("Signal generator agent not found")

            final_result = await signal_agent.synthesize(
                agent_results,
                research_context
            )

            await self._log(ws_manager, "signal_generator", AgentStatus.SUCCESS,
                          f"Signal: {final_result.signal.value} (confidence: {final_result.confidence:.2f})")

            # Calculate execution time
            execution_time = (datetime.now() - start_time).total_seconds()
            final_result.execution_time_seconds = execution_time

            return final_result

        except Exception as e:
            logger.error(f"Analysis failed for {self.asset_id}: {e}", exc_info=True)
            await self._log(ws_manager, "system", AgentStatus.ERROR,
                          f"Analysis failed: {str(e)}")
            raise

    async def _run_agents(
        self,
        research_context: Optional[Dict[str, Any]],
        ws_manager: Optional[Any]
    ) -> Dict[str, AgentOutput]:
        """
        Run all analysis agents in parallel.

        Args:
            research_context: Optional deep research results
            ws_manager: WebSocket manager for logging

        Returns:
            Dictionary of agent outputs by agent name
        """
        agent_results = {}
        tasks = []

        # Run all agents except signal_generator (runs last)
        for agent_name, agent in self.agents.items():
            if agent_name == "signal_generator":
                continue

            # Log agent start
            await self._log(ws_manager, agent_name, AgentStatus.RUNNING,
                          f"Analyzing {self.asset_id}...")

            # Create task
            task = self._run_single_agent(
                agent_name,
                agent,
                research_context,
                ws_manager
            )
            tasks.append((agent_name, task))

        # Execute all agents in parallel
        for agent_name, task in tasks:
            try:
                result = await task
                agent_results[agent_name] = result

                # Log success
                await self._log(ws_manager, agent_name, AgentStatus.SUCCESS,
                              f"Score: {result.score:.1f}/10 (weight: {result.weight*100:.0f}%)")

            except Exception as e:
                logger.error(f"Agent {agent_name} failed: {e}", exc_info=True)
                await self._log(ws_manager, agent_name, AgentStatus.ERROR,
                              f"Analysis failed: {str(e)}")

                # Create default neutral output
                agent_results[agent_name] = AgentOutput(
                    agent_name=agent_name,
                    score=5.0,  # Neutral score
                    reasoning=f"Agent failed: {str(e)}",
                    weight=self.agents[agent_name].weight,
                    confidence=0.0
                )

        return agent_results

    async def _run_single_agent(
        self,
        agent_name: str,
        agent: BaseAgent,
        research_context: Optional[Dict[str, Any]],
        ws_manager: Optional[Any]
    ) -> AgentOutput:
        """Run a single agent with error handling."""
        return await agent.analyze(self.asset_id, research_context)

    async def _run_deep_research(self) -> Dict[str, Any]:
        """
        Run Tavily deep research for additional context.

        Returns:
            Research results dictionary
        """
        try:
            from services.tavily_research import TavilyResearch

            tavily = TavilyResearch()
            query = self._generate_research_query()
            results = await tavily.research(query, depth="comprehensive")
            return results

        except Exception as e:
            logger.error(f"Deep research failed: {e}", exc_info=True)
            return {"error": str(e)}

    def _generate_research_query(self) -> str:
        """Generate Tavily search query based on asset type."""
        queries = {
            AssetType.STOCK: f"Latest news, earnings, and analysis for {self.asset_id} stock",
            AssetType.CURRENCY: f"Latest developments affecting {self.asset_id} exchange rate and economic factors",
            AssetType.ETF: f"Latest news, holdings changes, and performance for {self.asset_id} ETF",
            AssetType.MACRO: f"Latest economic data, forecasts, and analysis for {self.asset_id} indicator",
            AssetType.PORTFOLIO: f"Market outlook and portfolio strategy recommendations"
        }
        return queries.get(self.asset_type, f"Analysis for {self.asset_id}")

    async def _log(
        self,
        ws_manager: Optional[Any],
        agent: str,
        status: AgentStatus,
        message: str
    ):
        """
        Send log message to WebSocket clients.

        Args:
            ws_manager: WebSocket manager
            agent: Agent name
            status: Agent status
            message: Log message
        """
        if ws_manager:
            log_message = AgentLogMessage(
                agent=agent,
                status=status,
                message=message,
                metadata={"asset_id": self.asset_id, "asset_type": self.asset_type.value}
            )
            try:
                await ws_manager.broadcast(log_message.dict())
            except Exception as e:
                logger.error(f"Failed to send WebSocket log: {e}")
