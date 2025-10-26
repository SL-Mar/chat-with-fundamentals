"""
MarketSense AI Agents

Specialized agents for different aspects of market analysis:
- Fundamentals/Economic agents (30% weight)
- News/Sentiment agents (25% weight)
- Price Dynamics/Technical agents (25% weight)
- Macro Environment agents (20% weight)
- Signal Generator (master orchestrator)
"""

from .base import BaseAgent
from .factory import AgentFactory

__all__ = ['BaseAgent', 'AgentFactory']
