"""
AI Analysis Router

Endpoints for MarketSense AI analysis across all asset types.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import Optional
import logging

from database.config import get_db
from services.marketsense import MarketSenseAI, AssetType, AnalysisResult
from core.agent_console_manager import agent_console_manager
from core.auth import verify_api_key

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2", tags=["AI Analysis"])


# ──────────────────────────────────────────────────────────────
# WebSocket Endpoint for Agent Console
# ──────────────────────────────────────────────────────────────

@router.websocket("/ws/agent-console")
async def agent_console_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time agent console logging.

    Connects clients to receive live agent execution logs during analysis.

    Usage:
        const ws = new WebSocket('ws://localhost:8000/api/v2/ws/agent-console');
        ws.onmessage = (event) => {
            const log = JSON.parse(event.data);
            console.log(`[${log.agent}] ${log.message}`);
        };
    """
    await agent_console_manager.connect(websocket)

    try:
        # Keep connection alive
        while True:
            # Wait for client messages (heartbeat)
            data = await websocket.receive_text()

            # Echo back for heartbeat
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        agent_console_manager.disconnect(websocket)
        logger.info("Agent Console client disconnected")


# ──────────────────────────────────────────────────────────────
# Stock AI Analysis Endpoints
# ──────────────────────────────────────────────────────────────

@router.post("/stocks/{ticker}/ai-analysis", dependencies=[Depends(verify_api_key)])
async def analyze_stock(
    ticker: str,
    deep_research: bool = Query(False, description="Include Tavily deep research"),
    db: Session = Depends(get_db)
) -> AnalysisResult:
    """
    Run MarketSense AI analysis on a stock.

    This endpoint executes the full 5-agent analysis:
    - Fundamentals Agent (30% weight)
    - News Agent (25% weight)
    - Price Dynamics Agent (25% weight)
    - Macro Environment Agent (20% weight)
    - Signal Generator (combines all agents)

    Args:
        ticker: Stock ticker (e.g., AAPL.US, MSFT.US)
        deep_research: Whether to include Tavily deep research (slower but more comprehensive)

    Returns:
        AnalysisResult with signal (BUY/HOLD/SELL), confidence, reasoning, and agent outputs

    Example:
        POST /api/v2/stocks/AAPL.US/ai-analysis?deep_research=true

        Response:
        {
            "asset_type": "stock",
            "asset_id": "AAPL.US",
            "signal": "BUY",
            "confidence": 0.85,
            "weighted_score": 8.2,
            "reasoning": "Strong fundamentals (8.5/10), positive news (7.8/10)...",
            "agent_outputs": [...],
            "deep_research_summary": "Apple recently announced...",
            "execution_time_seconds": 45.3
        }
    """
    try:
        logger.info(f"Starting AI analysis for {ticker} (deep_research={deep_research})")

        # Initialize MarketSense AI for stock
        ai = MarketSenseAI(
            asset_type=AssetType.STOCK,
            asset_id=ticker
        )

        # Run analysis with WebSocket logging
        result = await ai.analyze(
            deep_research=deep_research,
            ws_manager=agent_console_manager
        )

        # Set asset info
        result.asset_type = AssetType.STOCK
        result.asset_id = ticker

        logger.info(f"Analysis complete for {ticker}: {result.signal} ({result.confidence:.2f})")

        # TODO: Store analysis result in database for history
        # from database.models.ai_analysis import AIAnalysis
        # analysis_record = AIAnalysis(
        #     asset_type="stock",
        #     asset_id=ticker,
        #     signal=result.signal.value,
        #     confidence=result.confidence,
        #     weighted_score=result.weighted_score,
        #     reasoning=result.reasoning,
        #     execution_time=result.execution_time_seconds
        # )
        # db.add(analysis_record)
        # db.commit()

        return result

    except Exception as e:
        logger.error(f"AI analysis failed for {ticker}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {str(e)}"
        )


@router.get("/stocks/{ticker}/ai-analysis/history", dependencies=[Depends(verify_api_key)])
async def get_stock_analysis_history(
    ticker: str,
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get historical AI analysis results for a stock.

    Args:
        ticker: Stock ticker
        limit: Maximum number of results (1-100)

    Returns:
        List of previous analysis results
    """
    # TODO: Implement database query for history
    # For now, return empty list
    return {
        "ticker": ticker,
        "history": [],
        "message": "Analysis history not yet implemented"
    }


# ──────────────────────────────────────────────────────────────
# Currency AI Analysis Endpoints (Phase 3)
# ──────────────────────────────────────────────────────────────

@router.post("/currencies/{pair}/ai-analysis", dependencies=[Depends(verify_api_key)])
async def analyze_currency(
    pair: str,
    deep_research: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    Run MarketSense AI analysis on a currency pair.

    Args:
        pair: Currency pair (e.g., EUR/USD, GBP/USD)
        deep_research: Include Tavily deep research

    Returns:
        AnalysisResult with signal and confidence
    """
    try:
        # Initialize MarketSense AI for currency
        ai = MarketSenseAI(
            asset_type=AssetType.CURRENCY,
            asset_id=pair
        )

        result = await ai.analyze(
            deep_research=deep_research,
            ws_manager=agent_console_manager
        )

        result.asset_type = AssetType.CURRENCY
        result.asset_id = pair

        return result

    except Exception as e:
        logger.error(f"Currency analysis failed for {pair}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────
# ETF AI Analysis Endpoints (Phase 4)
# ──────────────────────────────────────────────────────────────

@router.post("/etfs/{symbol}/ai-analysis", dependencies=[Depends(verify_api_key)])
async def analyze_etf(
    symbol: str,
    deep_research: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    Run MarketSense AI analysis on an ETF.

    Args:
        symbol: ETF symbol (e.g., SPY, QQQ)
        deep_research: Include Tavily deep research

    Returns:
        AnalysisResult with signal and confidence
    """
    try:
        ai = MarketSenseAI(
            asset_type=AssetType.ETF,
            asset_id=symbol
        )

        result = await ai.analyze(
            deep_research=deep_research,
            ws_manager=agent_console_manager
        )

        result.asset_type = AssetType.ETF
        result.asset_id = symbol

        return result

    except Exception as e:
        logger.error(f"ETF analysis failed for {symbol}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────
# Macro AI Analysis Endpoints (Phase 5)
# ──────────────────────────────────────────────────────────────

@router.post("/macro/{indicator}/ai-analysis", dependencies=[Depends(verify_api_key)])
async def analyze_macro(
    indicator: str,
    deep_research: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    Run MarketSense AI analysis on a macro indicator.

    Args:
        indicator: Indicator code (e.g., US_GDP, CPI)
        deep_research: Include Tavily deep research

    Returns:
        AnalysisResult with signal and confidence
    """
    try:
        ai = MarketSenseAI(
            asset_type=AssetType.MACRO,
            asset_id=indicator
        )

        result = await ai.analyze(
            deep_research=deep_research,
            ws_manager=agent_console_manager
        )

        result.asset_type = AssetType.MACRO
        result.asset_id = indicator

        return result

    except Exception as e:
        logger.error(f"Macro analysis failed for {indicator}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────
# Portfolio AI Analysis Endpoints (Phase 6)
# ──────────────────────────────────────────────────────────────

@router.post("/portfolios/{portfolio_id}/ai-analysis", dependencies=[Depends(verify_api_key)])
async def analyze_portfolio(
    portfolio_id: int,
    deep_research: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    Run MarketSense AI analysis on a portfolio.

    Args:
        portfolio_id: Portfolio ID
        deep_research: Include Tavily deep research

    Returns:
        AnalysisResult with recommendations
    """
    try:
        ai = MarketSenseAI(
            asset_type=AssetType.PORTFOLIO,
            asset_id=str(portfolio_id)
        )

        result = await ai.analyze(
            deep_research=deep_research,
            ws_manager=agent_console_manager
        )

        result.asset_type = AssetType.PORTFOLIO
        result.asset_id = str(portfolio_id)

        return result

    except Exception as e:
        logger.error(f"Portfolio analysis failed for {portfolio_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
