"""
AI Analysis Router

Endpoints for MarketSense AI analysis across all asset types.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, Request, Path
from sqlalchemy.orm import Session
from typing import Optional
import logging
import os

from database.config import get_db
from services.marketsense import MarketSenseAI, AssetType, AnalysisResult
from core.agent_console_manager import agent_console_manager
from core.auth import verify_api_key
from core.validation import (
    validate_ticker,
    validate_currency_pair,
    validate_indicator,
    validate_portfolio_id,
    sanitize_error_message
)
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2", tags=["AI Analysis"])

# Rate limiter instance
limiter = Limiter(key_func=get_remote_address)


# ──────────────────────────────────────────────────────────────
# WebSocket Endpoint for Agent Console
# ──────────────────────────────────────────────────────────────

@router.websocket("/ws/agent-console")
async def agent_console_websocket(
    websocket: WebSocket,
    token: Optional[str] = Query(None, description="API authentication token")
):
    """
    WebSocket endpoint for real-time agent console logging.

    Connects clients to receive live agent execution logs during analysis.

    **SECURITY:** Requires authentication token via query parameter.
    - In production: token must match APP_API_KEY environment variable
    - In development: authentication is bypassed if APP_API_KEY is not set

    Usage:
        const apiKey = 'your-api-key';
        const ws = new WebSocket(`ws://localhost:8000/api/v2/ws/agent-console?token=${apiKey}`);
        ws.onmessage = (event) => {
            const log = JSON.parse(event.data);
            console.log(`[${log.agent}] ${log.message}`);
        };
    """
    # Authentication check
    app_api_key = os.getenv("APP_API_KEY")

    # Only enforce authentication if APP_API_KEY is set (production mode)
    if app_api_key:
        if not token:
            logger.warning("WebSocket connection rejected: missing authentication token")
            await websocket.close(code=1008, reason="Authentication required")
            return

        if token != app_api_key:
            logger.warning("WebSocket connection rejected: invalid authentication token")
            await websocket.close(code=1008, reason="Invalid authentication token")
            return
    else:
        logger.info("WebSocket authentication bypassed (development mode - APP_API_KEY not set)")

    await agent_console_manager.connect(websocket)
    logger.info("Agent Console client connected")

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
@limiter.limit("10/minute")  # Rate limit: 10 AI analyses per minute (expensive operations)
async def analyze_stock(
    request: Request,  # Required for rate limiting
    ticker: str = Path(..., description="Stock ticker symbol"),
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

    **SECURITY:**
    - Input validation prevents SQL injection attacks
    - Rate limited to 10 requests per minute
    - Requires API key authentication

    Args:
        ticker: Stock ticker (e.g., AAPL.US, MSFT.US) - validated format
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
        # Validate ticker format to prevent injection attacks
        validated_ticker = validate_ticker(ticker)

        logger.info(f"Starting AI analysis for {validated_ticker} (deep_research={deep_research})")

        # Initialize MarketSense AI for stock
        ai = MarketSenseAI(
            asset_type=AssetType.STOCK,
            asset_id=validated_ticker
        )

        # Run analysis with WebSocket logging
        result = await ai.analyze(
            deep_research=deep_research,
            ws_manager=agent_console_manager
        )

        # Set asset info
        result.asset_type = AssetType.STOCK
        result.asset_id = validated_ticker

        logger.info(f"Analysis complete for {validated_ticker}: {result.signal} ({result.confidence:.2f})")

        # TODO: Store analysis result in database for history
        # from database.models.ai_analysis import AIAnalysis
        # analysis_record = AIAnalysis(
        #     asset_type="stock",
        #     asset_id=validated_ticker,
        #     signal=result.signal.value,
        #     confidence=result.confidence,
        #     weighted_score=result.weighted_score,
        #     reasoning=result.reasoning,
        #     execution_time=result.execution_time_seconds
        # )
        # db.add(analysis_record)
        # db.commit()

        return result

    except HTTPException:
        # Re-raise validation errors as-is
        raise
    except Exception as e:
        logger.error(f"AI analysis failed for {ticker}: {e}", exc_info=True)
        # Sanitize error message to prevent information leakage
        user_message = sanitize_error_message(e, user_facing=True)
        raise HTTPException(
            status_code=500,
            detail=user_message
        )


@router.get("/stocks/{ticker}/ai-analysis/history", dependencies=[Depends(verify_api_key)])
async def get_stock_analysis_history(
    ticker: str = Path(..., description="Stock ticker symbol"),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get historical AI analysis results for a stock.

    **SECURITY:** Input validation prevents injection attacks

    Args:
        ticker: Stock ticker - validated format
        limit: Maximum number of results (1-100)

    Returns:
        List of previous analysis results
    """
    try:
        # Validate ticker format
        validated_ticker = validate_ticker(ticker)

        # TODO: Implement database query for history
        # For now, return empty list
        return {
            "ticker": validated_ticker,
            "results": [],
            "message": "Analysis history not yet implemented"
        }

    except HTTPException:
        # Re-raise validation errors
        raise
    except Exception as e:
        logger.error(f"Failed to fetch history for {ticker}: {e}", exc_info=True)
        user_message = sanitize_error_message(e, user_facing=True)
        raise HTTPException(status_code=500, detail=user_message)


# ──────────────────────────────────────────────────────────────
# Currency AI Analysis Endpoints (Phase 3)
# ──────────────────────────────────────────────────────────────

@router.post("/currencies/{pair}/ai-analysis", dependencies=[Depends(verify_api_key)])
@limiter.limit("10/minute")  # Rate limit: 10 AI analyses per minute
async def analyze_currency(
    request: Request,  # Required for rate limiting
    pair: str = Path(..., description="Currency pair (e.g., EUR/USD)"),
    deep_research: bool = Query(False, description="Include Tavily deep research"),
    db: Session = Depends(get_db)
):
    """
    Run MarketSense AI analysis on a currency pair.

    **SECURITY:**
    - Input validation prevents injection attacks
    - Rate limited to 10 requests per minute
    - Requires API key authentication

    Args:
        pair: Currency pair (e.g., EUR/USD, GBP/USD) - validated format
        deep_research: Include Tavily deep research

    Returns:
        AnalysisResult with signal and confidence
    """
    try:
        # Validate currency pair format
        validated_pair = validate_currency_pair(pair)

        logger.info(f"Starting AI analysis for {validated_pair} (deep_research={deep_research})")

        # Initialize MarketSense AI for currency
        ai = MarketSenseAI(
            asset_type=AssetType.CURRENCY,
            asset_id=validated_pair
        )

        result = await ai.analyze(
            deep_research=deep_research,
            ws_manager=agent_console_manager
        )

        result.asset_type = AssetType.CURRENCY
        result.asset_id = validated_pair

        logger.info(f"Analysis complete for {validated_pair}: {result.signal}")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Currency analysis failed for {pair}: {e}", exc_info=True)
        user_message = sanitize_error_message(e, user_facing=True)
        raise HTTPException(status_code=500, detail=user_message)


# ──────────────────────────────────────────────────────────────
# ETF AI Analysis Endpoints (Phase 4)
# ──────────────────────────────────────────────────────────────

@router.post("/etfs/{symbol}/ai-analysis", dependencies=[Depends(verify_api_key)])
@limiter.limit("10/minute")  # Rate limit: 10 AI analyses per minute
async def analyze_etf(
    request: Request,  # Required for rate limiting
    symbol: str = Path(..., description="ETF symbol (e.g., SPY, QQQ)"),
    deep_research: bool = Query(False, description="Include Tavily deep research"),
    db: Session = Depends(get_db)
):
    """
    Run MarketSense AI analysis on an ETF.

    **SECURITY:**
    - Input validation prevents injection attacks
    - Rate limited to 10 requests per minute
    - Requires API key authentication

    Args:
        symbol: ETF symbol (e.g., SPY, QQQ) - validated format
        deep_research: Include Tavily deep research

    Returns:
        AnalysisResult with signal and confidence
    """
    try:
        # Validate ETF symbol (same rules as stock ticker)
        validated_symbol = validate_ticker(symbol)

        logger.info(f"Starting AI analysis for ETF {validated_symbol} (deep_research={deep_research})")

        ai = MarketSenseAI(
            asset_type=AssetType.ETF,
            asset_id=validated_symbol
        )

        result = await ai.analyze(
            deep_research=deep_research,
            ws_manager=agent_console_manager
        )

        result.asset_type = AssetType.ETF
        result.asset_id = validated_symbol

        logger.info(f"Analysis complete for ETF {validated_symbol}: {result.signal}")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ETF analysis failed for {symbol}: {e}", exc_info=True)
        user_message = sanitize_error_message(e, user_facing=True)
        raise HTTPException(status_code=500, detail=user_message)


# ──────────────────────────────────────────────────────────────
# Macro AI Analysis Endpoints (Phase 5)
# ──────────────────────────────────────────────────────────────

@router.post("/macro/{indicator}/ai-analysis", dependencies=[Depends(verify_api_key)])
@limiter.limit("10/minute")  # Rate limit: 10 AI analyses per minute
async def analyze_macro(
    request: Request,  # Required for rate limiting
    indicator: str = Path(..., description="Macro indicator code (e.g., US_GDP, CPI)"),
    deep_research: bool = Query(False, description="Include Tavily deep research"),
    db: Session = Depends(get_db)
):
    """
    Run MarketSense AI analysis on a macro indicator.

    **SECURITY:**
    - Input validation prevents injection attacks
    - Rate limited to 10 requests per minute
    - Requires API key authentication

    Args:
        indicator: Indicator code (e.g., US_GDP, CPI) - validated format
        deep_research: Include Tavily deep research

    Returns:
        AnalysisResult with signal and confidence
    """
    try:
        # Validate indicator code format
        validated_indicator = validate_indicator(indicator)

        logger.info(f"Starting AI analysis for macro indicator {validated_indicator} (deep_research={deep_research})")

        ai = MarketSenseAI(
            asset_type=AssetType.MACRO,
            asset_id=validated_indicator
        )

        result = await ai.analyze(
            deep_research=deep_research,
            ws_manager=agent_console_manager
        )

        result.asset_type = AssetType.MACRO
        result.asset_id = validated_indicator

        logger.info(f"Analysis complete for macro indicator {validated_indicator}: {result.signal}")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Macro analysis failed for {indicator}: {e}", exc_info=True)
        user_message = sanitize_error_message(e, user_facing=True)
        raise HTTPException(status_code=500, detail=user_message)


# ──────────────────────────────────────────────────────────────
# Portfolio AI Analysis Endpoints (Phase 6)
# ──────────────────────────────────────────────────────────────

@router.post("/portfolios/{portfolio_id}/ai-analysis", dependencies=[Depends(verify_api_key)])
@limiter.limit("10/minute")  # Rate limit: 10 AI analyses per minute
async def analyze_portfolio(
    request: Request,  # Required for rate limiting
    portfolio_id: int = Path(..., description="Portfolio ID", gt=0),
    deep_research: bool = Query(False, description="Include Tavily deep research"),
    db: Session = Depends(get_db)
):
    """
    Run MarketSense AI analysis on a portfolio.

    **SECURITY:**
    - Input validation prevents injection attacks
    - Rate limited to 10 requests per minute
    - Requires API key authentication

    Args:
        portfolio_id: Portfolio ID - validated positive integer
        deep_research: Include Tavily deep research

    Returns:
        AnalysisResult with recommendations
    """
    try:
        # Validate portfolio ID
        validated_id = validate_portfolio_id(portfolio_id)

        logger.info(f"Starting AI analysis for portfolio {validated_id} (deep_research={deep_research})")

        ai = MarketSenseAI(
            asset_type=AssetType.PORTFOLIO,
            asset_id=str(validated_id)
        )

        result = await ai.analyze(
            deep_research=deep_research,
            ws_manager=agent_console_manager
        )

        result.asset_type = AssetType.PORTFOLIO
        result.asset_id = str(validated_id)

        logger.info(f"Analysis complete for portfolio {validated_id}: {result.signal}")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Portfolio analysis failed for {portfolio_id}: {e}", exc_info=True)
        user_message = sanitize_error_message(e, user_facing=True)
        raise HTTPException(status_code=500, detail=user_message)
