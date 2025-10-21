# routers/chat_panels.py
# Chat endpoint with dynamic panel rendering support

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
from tools.panel_tools import PANEL_TOOLS, extract_panel_commands
from core.config import settings

router = APIRouter(prefix="/chat", tags=["Chat with Panels"])
logger = logging.getLogger("chat_panels")


class ChatMessage(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []


class ChatResponse(BaseModel):
    message: str
    panels: List[Dict[str, Any]]


@router.post("/panels", response_model=ChatResponse)
async def chat_with_panels(request: ChatMessage):
    """
    Chat with LLM that can dynamically render panels

    User: "Show me dividends for AAPL"
    LLM: Returns text response + panel command to render DividendHistory component
    """
    try:
        # Check if OpenAI API key is available
        if not settings.openai_api_key:
            # Fallback: Simple pattern matching without LLM
            logger.warning("[CHAT_PANELS] OpenAI API key not set, using fallback pattern matching")
            return fallback_pattern_matching(request.message)

        # Use OpenAI with function calling
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)

        # Build message history
        messages = [
            {
                "role": "system",
                "content": """You are a financial analysis assistant. When users ask about stock data,
use the available functions to display interactive panels.

Examples:
- "Show me AAPL dividends" → call show_dividend_history
- "MSFT price chart" → call show_price_chart
- "Analyst ratings for TSLA" → call show_analyst_ratings

Always provide a brief text response along with the panel."""
            }
        ]

        # Add history
        for msg in request.history:
            messages.append(msg)

        # Add current message
        messages.append({"role": "user", "content": request.message})

        # Call OpenAI with tools
        response = client.chat.completions.create(
            model=settings.model_name,
            messages=messages,
            tools=PANEL_TOOLS,
            tool_choice="auto"
        )

        assistant_message = response.choices[0].message

        # Extract panels from tool calls
        panels = extract_panel_commands(assistant_message.tool_calls)

        # Get text response
        text_response = assistant_message.content or "Here's the requested data:"

        logger.info(f"[CHAT_PANELS] Generated {len(panels)} panel(s) for: {request.message}")

        return ChatResponse(
            message=text_response,
            panels=panels
        )

    except Exception as e:
        logger.error(f"[CHAT_PANELS] Error: {e}")
        # Fallback to pattern matching if LLM fails
        return fallback_pattern_matching(request.message)


def fallback_pattern_matching(message: str) -> ChatResponse:
    """
    Simple pattern matching fallback when LLM is not available
    """
    message_lower = message.lower()
    panels = []
    response_text = ""

    # Extract ticker
    import re
    ticker_match = re.search(r'\b([A-Z]{1,5})\b', message.upper())
    ticker = ticker_match.group(1) if ticker_match else None

    if not ticker:
        return ChatResponse(
            message="Please specify a stock ticker (e.g., AAPL, MSFT, TSLA)",
            panels=[]
        )

    # Pattern matching for different panel types
    if any(word in message_lower for word in ['dividend', 'dividends', 'div']):
        panels.append({
            "type": "show_dividend_history",
            "props": {"ticker": ticker}
        })
        response_text = f"Here's the dividend history for {ticker}:"

    elif any(word in message_lower for word in ['chart', 'price', 'candle']):
        panels.append({
            "type": "show_price_chart",
            "props": {"ticker": ticker, "interval": "5m"}
        })
        response_text = f"Here's the price chart for {ticker}:"

    elif any(word in message_lower for word in ['analyst', 'rating', 'target']):
        panels.append({
            "type": "show_analyst_ratings",
            "props": {"ticker": ticker}
        })
        response_text = f"Here are the analyst ratings for {ticker}:"

    elif any(word in message_lower for word in ['insider', 'transaction']):
        panels.append({
            "type": "show_insider_transactions",
            "props": {"ticker": ticker, "limit": 20}
        })
        response_text = f"Here are the insider transactions for {ticker}:"

    else:
        response_text = f"I can show you dividends, charts, analyst ratings, or insider transactions for {ticker}. What would you like to see?"

    return ChatResponse(
        message=response_text,
        panels=panels
    )
