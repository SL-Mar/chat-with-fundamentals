"""
Tavily Research Service

Deep research integration using Tavily AI-powered search API.
Provides comprehensive web research for enhanced market analysis.
"""

import os
import logging
import httpx
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)


class TavilyResearch:
    """
    Tavily AI Research API integration.

    Provides deep web research with AI-powered summarization for:
    - Stock analysis
    - Currency analysis
    - ETF analysis
    - Macro indicators
    - Portfolio strategy research
    """

    def __init__(self):
        """Initialize Tavily client with API key from environment."""
        self.api_key = os.getenv("TAVILY_API_KEY")
        self.base_url = "https://api.tavily.com/search"

        if not self.api_key:
            logger.warning("TAVILY_API_KEY not set - deep research will be unavailable")

    async def research(
        self,
        query: str,
        depth: str = "basic",
        max_results: int = 5
    ) -> Dict[str, Any]:
        """
        Run Tavily deep research.

        Args:
            query: Search query
            depth: Research depth
                - "basic": Fast search (5 sources, ~10 seconds)
                - "comprehensive": Deep search (20+ sources, ~30-60 seconds)
            max_results: Maximum number of results to return

        Returns:
            Dictionary with search results and AI summary:
            {
                "query": "...",
                "summary": "AI-generated summary of findings",
                "results": [
                    {
                        "title": "Article title",
                        "url": "https://...",
                        "content": "Excerpt...",
                        "score": 0.95,  # Relevance score
                        "published_date": "2025-10-25"
                    },
                    ...
                ],
                "images": [...],  # Optional images
                "answer": "Direct answer if available"
            }

        Raises:
            Exception: If API call fails
        """

        if not self.api_key:
            logger.error("Tavily API key not configured")
            return {
                "query": query,
                "summary": "Tavily API key not configured",
                "results": [],
                "error": "API key missing"
            }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    self.base_url,
                    json={
                        "api_key": self.api_key,
                        "query": query,
                        "search_depth": depth,
                        "max_results": max_results,
                        "include_answer": True,
                        "include_raw_content": False,
                        "include_images": False
                    }
                )

                response.raise_for_status()
                data = response.json()

                # Extract and format results
                return {
                    "query": query,
                    "summary": data.get("answer", ""),
                    "results": data.get("results", []),
                    "images": data.get("images", [])
                }

        except httpx.TimeoutException:
            logger.error(f"Tavily API timeout for query: {query}")
            return {
                "query": query,
                "summary": "Research timeout - please try again",
                "results": [],
                "error": "timeout"
            }

        except httpx.HTTPStatusError as e:
            logger.error(f"Tavily API error: {e.response.status_code} - {e.response.text}")
            return {
                "query": query,
                "summary": f"Research failed: {e.response.status_code}",
                "results": [],
                "error": str(e)
            }

        except Exception as e:
            logger.error(f"Tavily research failed: {e}", exc_info=True)
            return {
                "query": query,
                "summary": f"Research failed: {str(e)}",
                "results": [],
                "error": str(e)
            }

    def format_for_agents(self, research_results: Dict[str, Any]) -> str:
        """
        Format research results for agent consumption.

        Converts structured research results into a text summary
        that agents can use as context.

        Args:
            research_results: Results from research() method

        Returns:
            Formatted text summary

        Example:
            context = tavily.format_for_agents(results)
            # Use in agent analysis
            agent_output = await agent.analyze(ticker, research_context=context)
        """

        if not research_results or research_results.get("error"):
            return "No research context available"

        summary = research_results.get("summary", "")
        results = research_results.get("results", [])

        # Build formatted context
        context = f"Research Summary:\n{summary}\n\n"

        if results:
            context += "Top Sources:\n"
            for i, result in enumerate(results[:3], 1):  # Top 3 sources
                title = result.get("title", "Unknown")
                content = result.get("content", "")
                url = result.get("url", "")

                context += f"\n{i}. {title}\n"
                context += f"   {content[:200]}...\n"
                if url:
                    context += f"   Source: {url}\n"

        return context

    async def research_stock(self, ticker: str) -> Dict[str, Any]:
        """
        Convenience method for stock research.

        Args:
            ticker: Stock ticker (e.g., "AAPL.US")

        Returns:
            Research results
        """
        query = f"Latest news, earnings, developments, and analysis for {ticker} stock"
        return await self.research(query, depth="comprehensive")

    async def research_currency(self, pair: str) -> Dict[str, Any]:
        """
        Convenience method for currency research.

        Args:
            pair: Currency pair (e.g., "EUR/USD")

        Returns:
            Research results
        """
        query = f"Latest developments, forecasts, and analysis affecting {pair} exchange rate"
        return await self.research(query, depth="comprehensive")

    async def research_etf(self, symbol: str) -> Dict[str, Any]:
        """
        Convenience method for ETF research.

        Args:
            symbol: ETF symbol (e.g., "SPY")

        Returns:
            Research results
        """
        query = f"Latest news, holdings changes, and performance for {symbol} ETF"
        return await self.research(query, depth="comprehensive")

    async def research_macro(self, indicator: str) -> Dict[str, Any]:
        """
        Convenience method for macro indicator research.

        Args:
            indicator: Indicator code (e.g., "US_GDP", "CPI")

        Returns:
            Research results
        """
        query = f"Latest economic data, forecasts, and analysis for {indicator} indicator"
        return await self.research(query, depth="comprehensive")
