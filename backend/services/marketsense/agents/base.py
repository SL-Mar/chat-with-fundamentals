"""
Base Agent Class for MarketSense AI

All specialized agents inherit from this base class.
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
import logging

from ..types import AgentOutput

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """
    Base class for all MarketSense AI agents.

    Each agent analyzes a specific aspect of the asset and returns a scored output.

    Attributes:
        name: Agent name (e.g., "fundamentals", "news", "price_dynamics")
        weight: Weight in final decision (0.0 to 1.0)
        description: Human-readable description of what this agent analyzes
    """

    def __init__(self, name: str, weight: float, description: str = ""):
        """
        Initialize agent.

        Args:
            name: Unique agent name
            weight: Weight in final decision (0.0-1.0)
            description: What this agent analyzes
        """
        self.name = name
        self.weight = weight
        self.description = description

    @abstractmethod
    async def analyze(
        self,
        asset_id: str,
        research_context: Optional[Dict[str, Any]] = None
    ) -> AgentOutput:
        """
        Analyze the asset and return scored output.

        Args:
            asset_id: Asset identifier (ticker, pair, symbol, indicator code)
            research_context: Optional deep research results from Tavily

        Returns:
            AgentOutput with score (0-10), reasoning, and confidence

        Example:
            output = await agent.analyze("AAPL.US")
            print(f"Score: {output.score}/10")
            print(f"Reasoning: {output.reasoning}")
        """
        pass

    async def fetch_data(self, asset_id: str) -> Dict[str, Any]:
        """
        Fetch necessary data for analysis.

        Override this method to fetch asset-specific data from database or APIs.

        Args:
            asset_id: Asset identifier

        Returns:
            Dictionary of fetched data
        """
        return {}

    def calculate_confidence(self, data: Dict[str, Any]) -> float:
        """
        Calculate confidence level based on data completeness.

        Override to implement custom confidence calculation.

        Args:
            data: Fetched data

        Returns:
            Confidence score (0.0-1.0)
        """
        # Simple heuristic: more data = higher confidence
        if not data:
            return 0.0

        # Count non-null values
        non_null_count = sum(1 for v in data.values() if v is not None)
        total_count = len(data)

        return min(non_null_count / total_count, 1.0) if total_count > 0 else 0.0


class SignalGeneratorAgent(BaseAgent):
    """
    Master agent that synthesizes all agent outputs into final signal.

    This agent doesn't analyze the asset directly - it combines the outputs
    from all other agents using weighted voting.
    """

    def __init__(self):
        super().__init__(
            name="signal_generator",
            weight=1.0,  # Not used in voting
            description="Master orchestrator that synthesizes all agent outputs"
        )

    async def analyze(
        self,
        asset_id: str,
        research_context: Optional[Dict[str, Any]] = None
    ) -> AgentOutput:
        """
        Not used - signal generator uses synthesize() method instead.
        """
        raise NotImplementedError("Signal generator uses synthesize() method")

    async def synthesize(
        self,
        agent_outputs: Dict[str, AgentOutput],
        research_context: Optional[Dict[str, Any]] = None
    ):
        """
        Synthesize all agent outputs into final signal.

        Args:
            agent_outputs: Dictionary of agent outputs by agent name
            research_context: Optional deep research results

        Returns:
            AnalysisResult with final signal, confidence, and reasoning
        """
        from ..types import AnalysisResult, SignalType

        # Calculate weighted average score
        weighted_sum = 0.0
        total_weight = 0.0

        for agent_name, output in agent_outputs.items():
            weighted_sum += output.score * output.weight
            total_weight += output.weight

        weighted_score = weighted_sum / total_weight if total_weight > 0 else 5.0

        # Determine signal based on weighted score
        if weighted_score >= 8.0:
            signal = SignalType.STRONG_BUY
        elif weighted_score >= 6.5:
            signal = SignalType.BUY
        elif weighted_score >= 3.5:
            signal = SignalType.HOLD
        elif weighted_score >= 2.0:
            signal = SignalType.SELL
        else:
            signal = SignalType.STRONG_SELL

        # Calculate overall confidence (average of agent confidences)
        confidence = sum(o.confidence for o in agent_outputs.values()) / len(agent_outputs) if agent_outputs else 0.5

        # Generate reasoning
        reasoning = self._generate_reasoning(agent_outputs, weighted_score, signal)

        # Add deep research summary if available
        deep_research_summary = None
        if research_context and "summary" in research_context:
            deep_research_summary = research_context["summary"]

        return AnalysisResult(
            asset_type=None,  # Will be set by framework
            asset_id="",      # Will be set by framework
            signal=signal,
            confidence=confidence,
            weighted_score=weighted_score,
            reasoning=reasoning,
            agent_outputs=list(agent_outputs.values()),
            deep_research_summary=deep_research_summary
        )

    def _generate_reasoning(
        self,
        agent_outputs: Dict[str, AgentOutput],
        weighted_score: float,
        signal: SignalType
    ) -> str:
        """Generate human-readable reasoning from agent outputs."""
        reasoning_parts = []

        # Sort agents by score (descending)
        sorted_agents = sorted(
            agent_outputs.items(),
            key=lambda x: x[1].score,
            reverse=True
        )

        for agent_name, output in sorted_agents:
            weight_pct = output.weight * 100
            reasoning_parts.append(
                f"{agent_name.replace('_', ' ').title()}: "
                f"{output.score:.1f}/10 ({weight_pct:.0f}% weight)"
            )

        reasoning = f"Overall Score: {weighted_score:.1f}/10 → {signal.value}\n\n"
        reasoning += "\n".join(reasoning_parts)

        return reasoning
