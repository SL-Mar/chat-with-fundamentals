"""
GPT-Researcher service for deep research reports.

Provides recursive web search and comprehensive research generation
using gpt-researcher (which wraps Tavily + OpenAI).
"""

import os
import logging
from typing import Optional, Dict, Any

from gpt_researcher import GPTResearcher

logger = logging.getLogger(__name__)


class GPTResearcherService:
    """Service for generating deep research reports using GPT-Researcher."""

    def __init__(self, ticker: str, openai_key: str, tavily_key: str):
        """
        Initialize GPT-Researcher service for a specific ticker.

        Args:
            ticker: Stock ticker (e.g., "AAPL.US")
            openai_key: OpenAI API key
            tavily_key: Tavily API key
        """
        self.ticker = ticker
        self.openai_key = openai_key
        self.tavily_key = tavily_key

        # Validate API keys
        if not self.openai_key:
            raise ValueError("OPENAI_API_KEY not configured")
        if not self.tavily_key:
            raise ValueError("TAVILY_API_KEY not configured")

    async def generate_research_report(
        self,
        query: str,
        report_type: str = "research_report",
        report_source: str = "web"
    ) -> Dict[str, Any]:
        """
        Generate comprehensive research report using GPT-Researcher.

        Args:
            query: Research query/question
            report_type: Type of report to generate
                - "research_report" (default): Detailed research report
                - "outline_report": Outline format
                - "resource_report": List of resources
            report_source: Source to search
                - "web" (default): Web search
                - "local": Local documents
                - "hybrid": Both web and local

        Returns:
            Dict with keys:
                - query: Original query
                - report: Generated report (markdown)
                - sources: List of source URLs
                - report_type: Type of report generated
                - ticker: Stock ticker
        """
        logger.info(f"Generating {report_type} for {self.ticker}: {query}")

        try:
            # Set environment variables for gpt-researcher BEFORE initializing
            os.environ["OPENAI_API_KEY"] = self.openai_key
            os.environ["TAVILY_API_KEY"] = self.tavily_key

            # Configure GPT-Researcher to use compatible models without streaming
            os.environ["STREAM_OUTPUT"] = "False"
            os.environ["SMART_LLM_MODEL"] = "gpt-4o-mini"  # Use compatible model
            os.environ["STRATEGIC_LLM_MODEL"] = "gpt-4o-mini"
            os.environ["FAST_LLM_MODEL"] = "gpt-4o-mini"

            # Initialize researcher
            researcher = GPTResearcher(
                query=query,
                report_type=report_type,
                source_urls=None,  # Let it discover sources
                config_path=None,  # Use default config
                websocket=None,    # No websocket streaming
            )

            # Conduct research (this does recursive search + report generation)
            await researcher.conduct_research()

            # Get research report
            report_markdown = await researcher.write_report()

            # Extract sources
            sources = self._extract_sources(researcher)

            result = {
                "query": query,
                "report": report_markdown,
                "sources": sources,
                "report_type": report_type,
                "ticker": self.ticker,
            }

            logger.info(f"Research complete for {self.ticker}: {len(report_markdown)} chars, {len(sources)} sources")
            return result

        except Exception as e:
            logger.error(f"Error generating research report for {self.ticker}: {e}", exc_info=True)
            raise

    def _extract_sources(self, researcher: GPTResearcher) -> list:
        """
        Extract source URLs from researcher context.

        Args:
            researcher: GPTResearcher instance

        Returns:
            List of source URL strings
        """
        sources = []

        # Try to extract from researcher.visited_urls
        if hasattr(researcher, "visited_urls") and researcher.visited_urls:
            sources = list(researcher.visited_urls)
            logger.info(f"Extracted {len(sources)} sources from visited_urls")
        elif hasattr(researcher, "context") and researcher.context:
            # Fallback: try to extract URLs from context
            logger.info("No visited_urls found, sources may be incomplete")

        return sources
