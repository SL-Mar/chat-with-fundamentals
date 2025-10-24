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

    elif any(word in message_lower for word in ['etf', 'holdings', 'components', 'portfolio']):
        panels.append({
            "type": "show_etf_holdings",
            "props": {"ticker": ticker}
        })
        response_text = f"Here are the ETF holdings for {ticker}:"

    elif any(word in message_lower for word in ['news', 'article', 'headline']):
        panels.append({
            "type": "show_news",
            "props": {"ticker": ticker, "limit": 10}
        })
        response_text = f"Here are recent news articles for {ticker}:"

    elif any(word in message_lower for word in ['live', 'quote', 'current price', 'real-time']):
        panels.append({
            "type": "show_live_price",
            "props": {"ticker": ticker}
        })
        response_text = f"Here's the live price for {ticker}:"

    elif any(word in message_lower for word in ['earnings', 'eps', 'earnings calendar']):
        panels.append({
            "type": "show_earnings_calendar",
            "props": {}
        })
        response_text = "Here's the upcoming earnings calendar:"

    elif any(word in message_lower for word in ['esg', 'environmental', 'sustainability', 'governance']):
        panels.append({
            "type": "show_esg",
            "props": {"ticker": ticker}
        })
        response_text = f"Here are the ESG scores for {ticker}:"

    elif any(word in message_lower for word in ['shareholder', 'institutional', 'ownership']):
        panels.append({
            "type": "show_shareholders",
            "props": {"ticker": ticker}
        })
        response_text = f"Here are the major shareholders of {ticker}:"

    elif any(word in message_lower for word in ['sentiment', 'mood', 'bullish', 'bearish']):
        panels.append({
            "type": "show_sentiment",
            "props": {"ticker": ticker}
        })
        response_text = f"Here's the sentiment analysis for {ticker}:"

    elif any(word in message_lower for word in ['split', 'splits', 'stock split']):
        panels.append({
            "type": "show_stock_splits",
            "props": {"ticker": ticker}
        })
        response_text = f"Here are the stock splits for {ticker}:"

    elif any(word in message_lower for word in ['screen', 'screener', 'technical screen']):
        panels.append({
            "type": "show_technical_screener",
            "props": {"limit": 50}
        })
        response_text = "Here are the technical screening results:"

    elif any(word in message_lower for word in ['returns distribution', 'return distribution', 'distribution']):
        panels.append({
            "type": "show_returns_distribution",
            "props": {"ticker": ticker, "period": "1y"}
        })
        response_text = f"Here's the returns distribution for {ticker}:"

    elif any(word in message_lower for word in ['cumulative return', 'cumret', 'cumulative']):
        panels.append({
            "type": "show_cumulative_returns",
            "props": {"ticker": ticker, "period": "1y"}
        })
        response_text = f"Here are the cumulative returns for {ticker}:"

    elif any(word in message_lower for word in ['market cap', 'marketcap', 'capitalization']):
        panels.append({
            "type": "show_market_cap_history",
            "props": {"ticker": ticker}
        })
        response_text = f"Here's the market cap history for {ticker}:"

    elif any(word in message_lower for word in ['twitter', 'social media', 'mentions', 'tweet']):
        panels.append({
            "type": "show_twitter_mentions",
            "props": {"ticker": ticker, "limit": 20}
        })
        response_text = f"Here are Twitter mentions for {ticker}:"

    elif any(word in message_lower for word in ['ipo', 'initial public offering', 'ipo calendar']):
        panels.append({
            "type": "show_ipo_calendar",
            "props": {}
        })
        response_text = "Here's the upcoming IPO calendar:"

    elif any(word in message_lower for word in ['monte carlo', 'simulation', 'price projection']):
        panels.append({
            "type": "show_monte_carlo",
            "props": {"ticker": ticker, "days": 30, "simulations": 1000}
        })
        response_text = f"Here's the Monte Carlo simulation for {ticker}:"

    elif any(word in message_lower for word in ['volatility', 'vol forecast', 'historical vol']):
        panels.append({
            "type": "show_volatility_forecast",
            "props": {"ticker": ticker, "lookback": 250}
        })
        response_text = f"Here's the volatility forecast for {ticker}:"

    elif any(word in message_lower for word in ['performance ratio', 'sharpe', 'sortino', 'calmar']):
        panels.append({
            "type": "show_performance_ratios",
            "props": {"ticker": ticker, "years": 3}
        })
        response_text = f"Here are the performance ratios for {ticker}:"

    elif any(word in message_lower for word in ['economic', 'economic event', 'economic calendar']):
        panels.append({
            "type": "show_economic_events",
            "props": {}
        })
        response_text = "Here's the upcoming economic events calendar:"

    elif any(word in message_lower for word in ['index constituent', 'index holding', 'sp500 stocks', 's&p']):
        # Try to extract index symbol
        index = 'GSPC'  # Default to S&P 500
        if 'dow' in message_lower:
            index = 'DJI'
        elif 'nasdaq' in message_lower:
            index = 'IXIC'
        panels.append({
            "type": "show_index_constituents",
            "props": {"index": index}
        })
        response_text = f"Here are the constituents of the index:"

    elif any(word in message_lower for word in ['logo', 'company logo']):
        panels.append({
            "type": "show_logo",
            "props": {"ticker": ticker}
        })
        response_text = f"Here's the logo for {ticker}:"

    elif any(word in message_lower for word in ['historical constituent', 'historical index']):
        panels.append({
            "type": "show_historical_constituents",
            "props": {"index": "GSPC"}
        })
        response_text = "Here are the historical index constituents:"

    elif any(word in message_lower for word in ['eod extended', 'extended data']):
        panels.append({
            "type": "show_eod_extended",
            "props": {"ticker": ticker}
        })
        response_text = f"Here's the extended EOD data for {ticker}:"

    elif any(word in message_lower for word in ['technical indicator', 'rsi', 'macd', 'sma', 'ema']):
        panels.append({
            "type": "show_technical_indicators",
            "props": {"ticker": ticker, "indicators": ["RSI", "MACD", "SMA"]}
        })
        response_text = f"Here are the technical indicators for {ticker}:"

    elif any(word in message_lower for word in ['macro', 'bond yield', 'treasury', 'inflation']):
        panels.append({
            "type": "show_macro_indicators",
            "props": {"indicators": ["10Y_YIELD", "INFLATION", "FED_RATE"]}
        })
        response_text = "Here are the macro economic indicators:"

    else:
        response_text = f"I can show you many data panels for {ticker}. Try asking about: dividends, charts, analyst ratings, insider transactions, ETF holdings, news, live prices, earnings, ESG, shareholders, sentiment, stock splits, screener, returns, market cap, Twitter, IPOs, simulations, volatility, performance, economic events, index constituents, logo, technical indicators, or macro indicators."

    return ChatResponse(
        message=response_text,
        panels=panels
    )
