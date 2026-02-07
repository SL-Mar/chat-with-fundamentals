# routers/chat_panels.py
# Chat endpoint with dynamic panel rendering support

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
from tools.panel_tools import PANEL_TOOLS, extract_panel_commands
from core.llm_provider import get_llm, get_current_provider
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

router = APIRouter(prefix="/chat", tags=["Chat with Panels"])
logger = logging.getLogger("chat_panels")

SYSTEM_PROMPT = """You are an expert financial analysis assistant with access to a comprehensive
database containing 30+ years of historical market data, fundamentals, news, corporate actions,
and macroeconomic indicators.

**Data Architecture:**
- Database-first approach: All data is cached for instant retrieval
- Historical depth: 30+ years of daily OHLCV data for thousands of stocks
- Real-time data: Live prices, news, analyst ratings, insider transactions
- Full coverage: Dividends, splits, earnings, IPO calendars, ESG scores, ETF holdings

**Your Capabilities:**
When users ask questions, use the available function tools to generate interactive panels.
You can call MULTIPLE functions in a single response to provide comprehensive analysis.

**Panel Selection Guidelines:**
1. **Price Analysis**: Use show_price_chart for intraday, show_eod_extended for historical
2. **Financial Health**: Combine show_performance_ratios + show_dividend_history
3. **Risk Assessment**: Use show_monte_carlo + show_volatility_forecast together
4. **News & Sentiment**: Combine show_news + show_sentiment + show_analyst_ratings
5. **Corporate Actions**: show_dividend_history + show_stock_splits + show_insider_transactions
6. **Calendar Events**: show_earnings_calendar + show_ipo_calendar + show_economic_events
7. **Market Screening**: show_technical_screener for finding opportunities

**Examples:**
- "Analyze AAPL dividends" → show_dividend_history + show_stock_splits
- "MSFT risk analysis" → show_volatility_forecast + show_monte_carlo
- "What's happening with TSLA?" → show_live_price + show_news + show_sentiment
- "Compare tech giants" → show_performance_ratios for each ticker
- "SPY holdings breakdown" → show_etf_holdings + show_index_constituents

**Response Style:**
1. Always provide a brief, professional text summary (2-3 sentences)
2. Call relevant functions to generate panels
3. Explain what data the panels will show
4. For complex queries, use 2-4 panels to provide comprehensive analysis

**Important:**
- All data comes from the database (fast, reliable)
- Historical data goes back 30+ years
- Combine panels when users need comprehensive analysis
- Ticker format: Always add .US suffix (e.g., AAPL.US, MSFT.US) unless specified otherwise"""


class ChatMessage(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []


class ChatResponse(BaseModel):
    message: str
    panels: List[Dict[str, Any]]


@router.post("/panels", response_model=ChatResponse)
async def chat_with_panels(request: ChatMessage):
    """
    Chat with LLM that can dynamically render panels.
    Uses LangChain bind_tools() for provider-agnostic tool calling.
    """
    try:
        provider = get_current_provider()

        # Ollama models often lack tool-calling support – use fallback
        if provider == "ollama":
            logger.info("[CHAT_PANELS] Ollama provider detected, using fallback pattern matching")
            return fallback_pattern_matching(request.message)

        llm = get_llm("chat_panels", role="store")

        # Bind tools to the LLM (works for OpenAI + Anthropic via LangChain)
        llm_with_tools = llm.bind_tools(PANEL_TOOLS)

        # Build messages
        messages = [SystemMessage(content=SYSTEM_PROMPT)]
        for msg in request.history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant":
                messages.append(AIMessage(content=content))

        messages.append(HumanMessage(content=request.message))

        # Invoke LLM
        response: AIMessage = llm_with_tools.invoke(messages)

        # Extract panels from tool_calls (LangChain format: list of dicts)
        panels = extract_panel_commands(response.tool_calls)

        text_response = response.content or "Here's the requested data:"

        logger.info(f"[CHAT_PANELS] Generated {len(panels)} panel(s) for: {request.message}")

        return ChatResponse(
            message=text_response,
            panels=panels
        )

    except Exception as e:
        logger.error(f"[CHAT_PANELS] Error: {e}")
        return fallback_pattern_matching(request.message)


def fallback_pattern_matching(message: str) -> ChatResponse:
    """
    Simple pattern matching fallback when LLM is not available
    """
    message_lower = message.lower()
    panels = []
    response_text = ""

    # Extract ticker (skip common English words)
    import re
    SKIP_WORDS = {
        'SHOW', 'ME', 'THE', 'FOR', 'AND', 'GET', 'WHAT', 'ARE', 'TOP',
        'HOW', 'DOES', 'WITH', 'FROM', 'ABOUT', 'THIS', 'THAT', 'GIVE',
        'FIND', 'LIST', 'ALL', 'ANY', 'CAN', 'HAS', 'HAVE', 'BEEN',
        'WILL', 'WOULD', 'COULD', 'SHOULD', 'TELL', 'LOOK', 'WANT',
        'NEED', 'LIKE', 'MUCH', 'MANY', 'SOME', 'MOST', 'LAST', 'NEXT',
        'YEAR', 'YEARS', 'DAY', 'DAYS', 'WEEK', 'MONTH', 'BUY', 'SELL',
    }
    ticker = None
    for m in re.finditer(r'\b([A-Z]{1,5})\b', message.upper()):
        if m.group(1) not in SKIP_WORDS:
            ticker = m.group(1)
            break

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
        index = 'GSPC'
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
