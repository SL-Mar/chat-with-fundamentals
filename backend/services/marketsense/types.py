"""
Type definitions for MarketSense AI Framework
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field


class AssetType(str, Enum):
    """Supported asset types"""
    STOCK = "stock"
    CURRENCY = "currency"
    ETF = "etf"
    MACRO = "macro"
    PORTFOLIO = "portfolio"


class SignalType(str, Enum):
    """Trading signal types"""
    BUY = "BUY"
    HOLD = "HOLD"
    SELL = "SELL"
    STRONG_BUY = "STRONG_BUY"
    STRONG_SELL = "STRONG_SELL"


class AgentStatus(str, Enum):
    """Agent execution status"""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    ERROR = "error"


class AgentOutput(BaseModel):
    """Output from a single agent"""
    agent_name: str = Field(..., description="Name of the agent")
    score: float = Field(..., ge=0, le=10, description="Score from 0-10")
    reasoning: str = Field(..., description="Explanation of the score")
    weight: float = Field(..., ge=0, le=1, description="Agent weight in final decision")
    confidence: float = Field(default=0.5, ge=0, le=1, description="Agent's confidence")
    timestamp: datetime = Field(default_factory=datetime.now)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AnalysisResult(BaseModel):
    """Final analysis result from MarketSense AI"""
    asset_type: AssetType
    asset_id: str = Field(..., description="Ticker, pair, symbol, or indicator code")
    signal: SignalType
    confidence: float = Field(..., ge=0, le=1, description="Overall confidence")
    weighted_score: float = Field(..., ge=0, le=10, description="Weighted average score")
    reasoning: str = Field(..., description="Final recommendation reasoning")
    agent_outputs: List[AgentOutput] = Field(default_factory=list)
    deep_research_summary: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)
    execution_time_seconds: float = Field(default=0.0)

    class Config:
        json_schema_extra = {
            "example": {
                "asset_type": "stock",
                "asset_id": "AAPL.US",
                "signal": "BUY",
                "confidence": 0.85,
                "weighted_score": 8.2,
                "reasoning": "Strong fundamentals (8.5/10), positive news sentiment (8.0/10), bullish technicals (8.5/10), favorable macro (7.8/10)",
                "agent_outputs": [],
                "deep_research_summary": "Recent product launch driving growth...",
                "timestamp": "2025-10-25T10:00:00Z",
                "execution_time_seconds": 45.3
            }
        }


class AgentLogMessage(BaseModel):
    """WebSocket log message from agent"""
    type: str = Field(default="agent_log")
    agent: str = Field(..., description="Agent name")
    status: AgentStatus
    message: str
    timestamp: datetime = Field(default_factory=datetime.now)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        json_schema_extra = {
            "example": {
                "type": "agent_log",
                "agent": "fundamentals",
                "status": "running",
                "message": "Analyzing financial statements for AAPL.US...",
                "timestamp": "2025-10-25T10:00:00Z",
                "metadata": {"ticker": "AAPL.US"}
            }
        }


class DeepResearchResult(BaseModel):
    """Result from Tavily deep research"""
    query: str
    summary: str
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    depth: str = Field(default="comprehensive")
    timestamp: datetime = Field(default_factory=datetime.now)
