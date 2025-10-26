"""
MarketSense AI Framework

Multi-agent AI system for comprehensive market analysis across all asset classes.

Based on MarketSense AI framework (Fatouros et al., 2024):
https://arxiv.org/abs/2401.03737

Architecture:
- 5 agents with weighted voting
- Asset-specific implementations
- WebSocket logging for transparency
- Deep research integration (Tavily)

Supported Asset Types:
- Stocks (equity analysis)
- Currencies (forex analysis)
- ETFs (fund analysis)
- Macro (economic indicators)
- Portfolios (multi-asset analysis)
"""

from .framework import MarketSenseAI
from .types import (
    AgentOutput,
    AnalysisResult,
    SignalType,
    AssetType
)

__all__ = [
    'MarketSenseAI',
    'AgentOutput',
    'AnalysisResult',
    'SignalType',
    'AssetType'
]
