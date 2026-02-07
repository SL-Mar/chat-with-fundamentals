"""
GPT-Researcher service for deep research reports.

Provides recursive web search and comprehensive research generation
using gpt-researcher. Supports OpenAI, Anthropic, and Ollama providers
via the provider:model format that gpt-researcher expects.
"""

import os
import logging
from typing import Optional, Dict, Any

from gpt_researcher import GPTResearcher

from core.config import settings
from core.llm_provider import get_current_provider
from core.llm_settings import get_model_from_db

logger = logging.getLogger(__name__)


def _configure_researcher_env() -> None:
    """Set env vars for gpt-researcher based on current provider/model settings."""
    db = get_model_from_db()
    provider = db.get("provider", "openai")
    model = db.get("store", settings.model_name)

    # gpt-researcher uses "provider:model" format for non-OpenAI providers
    if provider == "openai":
        llm_spec = model
        os.environ["OPENAI_API_KEY"] = settings.openai_api_key or ""
    elif provider == "anthropic":
        llm_spec = f"anthropic:{model}"
        os.environ["ANTHROPIC_API_KEY"] = settings.anthropic_api_key or ""
    elif provider == "ollama":
        llm_spec = f"ollama:{model}"
        os.environ["OLLAMA_BASE_URL"] = settings.ollama_base_url
    else:
        llm_spec = model

    os.environ["FAST_LLM"] = llm_spec
    os.environ["SMART_LLM"] = llm_spec
    os.environ["STRATEGIC_LLM"] = llm_spec
    os.environ["STREAM_OUTPUT"] = "False"

    # Clean up deprecated env vars
    for old_key in ("SMART_LLM_MODEL", "STRATEGIC_LLM_MODEL", "FAST_LLM_MODEL"):
        os.environ.pop(old_key, None)


class GPTResearcherService:
    """Service for generating deep research reports using GPT-Researcher."""

    def __init__(self, ticker: str, openai_key: str, tavily_key: str, ws_manager: Optional[Any] = None):
        self.ticker = ticker
        self.openai_key = openai_key
        self.tavily_key = tavily_key
        self.ws_manager = ws_manager

        if not self.tavily_key:
            raise ValueError("TAVILY_API_KEY not configured")

    async def _log(self, status: str, message: str):
        """Send log message to WebSocket clients."""
        if self.ws_manager:
            from services.marketsense.types import AgentStatus, AgentLogMessage

            status_map = {
                'running': AgentStatus.RUNNING,
                'success': AgentStatus.SUCCESS,
                'error': AgentStatus.ERROR,
                'info': AgentStatus.RUNNING
            }

            log_message = AgentLogMessage(
                agent='gpt_researcher',
                status=status_map.get(status, AgentStatus.RUNNING),
                message=message,
                metadata={
                    'ticker': self.ticker,
                    'asset_type': 'research'
                }
            )
            try:
                await self.ws_manager.broadcast(log_message.model_dump(mode='json'))
            except Exception as e:
                logger.error(f"Failed to send WebSocket log: {e}")

    async def generate_research_report(
        self,
        query: str,
        report_type: str = "research_report",
        report_source: str = "web"
    ) -> Dict[str, Any]:
        logger.info(f"Generating {report_type} for {self.ticker}: {query}")
        await self._log('running', f'Starting deep research: {query[:100]}...')

        try:
            # Configure env vars for the active provider
            _configure_researcher_env()

            # Always need Tavily key for web search
            os.environ["TAVILY_API_KEY"] = self.tavily_key

            # If the caller passed an OpenAI key explicitly, set it too (backward compat)
            if self.openai_key:
                os.environ["OPENAI_API_KEY"] = self.openai_key

            await self._log('info', 'Initializing GPT-Researcher...')
            researcher = GPTResearcher(
                query=query,
                report_type=report_type,
                source_urls=None,
                config_path=None,
                websocket=None,
            )

            await self._log('running', 'Searching web sources with Tavily...')
            await researcher.conduct_research()

            await self._log('running', 'Generating comprehensive research report with AI...')
            report_markdown = await researcher.write_report()

            sources = self._extract_sources(researcher)
            await self._log('info', f'Analyzed {len(sources)} sources')

            result = {
                "query": query,
                "report": report_markdown,
                "sources": sources,
                "report_type": report_type,
                "ticker": self.ticker,
            }

            logger.info(f"Research complete for {self.ticker}: {len(report_markdown)} chars, {len(sources)} sources")
            await self._log('success', f'Research complete: {len(report_markdown)} chars, {len(sources)} sources')
            return result

        except Exception as e:
            logger.error(f"Error generating research report for {self.ticker}: {e}", exc_info=True)
            await self._log('error', f'Research failed: {str(e)}')
            raise

    def _extract_sources(self, researcher: GPTResearcher) -> list:
        sources = []
        if hasattr(researcher, "visited_urls") and researcher.visited_urls:
            sources = list(researcher.visited_urls)
            logger.info(f"Extracted {len(sources)} sources from visited_urls")
        elif hasattr(researcher, "context") and researcher.context:
            logger.info("No visited_urls found, sources may be incomplete")
        return sources
