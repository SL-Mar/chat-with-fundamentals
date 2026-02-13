"""LLM router with fallback — tries Ollama first, falls back to Anthropic."""

import logging
from typing import Optional

from core.config import settings
from .providers import OllamaProvider, AnthropicProvider
from .types import ChatResult

logger = logging.getLogger(__name__)


class LLMRouter:
    def __init__(
        self,
        ollama_url: str = None,
        ollama_model: str = None,
        anthropic_key: str = None,
        anthropic_model: str = None,
    ):
        self.ollama_url = ollama_url or settings.ollama_base_url
        self.ollama_model = ollama_model or settings.llm_model
        self.anthropic_key = anthropic_key or settings.anthropic_api_key
        self.anthropic_model = anthropic_model or "claude-sonnet-4-20250514"

        self._ollama = OllamaProvider(base_url=self.ollama_url, model=self.ollama_model)
        self._anthropic = (
            AnthropicProvider(api_key=self.anthropic_key, model=self.anthropic_model)
            if self.anthropic_key
            else None
        )

    async def chat(
        self,
        system_prompt: str,
        user_message: str,
        temperature: float = 0.1,
        max_tokens: int = 4096,
        provider: str = None,
    ) -> ChatResult:
        """Route to provider. Default: try Ollama, fallback to Anthropic."""
        if provider == "anthropic" and self._anthropic:
            return await self._anthropic.chat(system_prompt, user_message, temperature, max_tokens)

        # Try Ollama first
        result = await self._ollama.chat(system_prompt, user_message, temperature, max_tokens)
        if not result.error:
            return result

        # Fallback to Anthropic
        if self._anthropic:
            logger.warning(f"Ollama failed ({result.error}), falling back to Anthropic")
            return await self._anthropic.chat(system_prompt, user_message, temperature, max_tokens)

        # No fallback available
        return result


llm_router = LLMRouter()
