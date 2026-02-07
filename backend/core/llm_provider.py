# core/llm_provider.py
"""Multi-provider LLM factory.

Every consumer calls `get_llm(flow, role)` and gets back a LangChain
BaseChatModel configured for the active provider stored in SQLite.
"""

import logging
from langchain_core.language_models.chat_models import BaseChatModel

from core.config import settings
from core.llm_settings import get_model_from_db, get_provider_from_db

logger = logging.getLogger(__name__)


def get_current_provider() -> str:
    """Return the active provider name (openai / anthropic / ollama)."""
    return get_provider_from_db()


def _create_llm(provider: str, model: str, temperature: float = 0.3) -> BaseChatModel:
    """Internal factory – returns the right LangChain chat model."""
    if provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model,
            api_key=settings.openai_api_key,
            temperature=temperature,
        )

    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=model,
            api_key=settings.anthropic_api_key,
            temperature=temperature,
        )

    if provider == "ollama":
        from langchain_ollama import ChatOllama
        return ChatOllama(
            model=model,
            base_url=settings.ollama_base_url,
            temperature=temperature,
        )

    raise ValueError(f"Unknown provider: {provider}")


def get_llm(flow: str = "default", role: str = "store") -> BaseChatModel:
    """
    Retrieve the LLM for a given flow and role ('manager' or 'store').

    Falls back to .env MODEL_NAME / default provider if DB read fails.
    """
    try:
        db = get_model_from_db()
        provider = db.get("provider", "openai")
        model_name = db.get(role, settings.model_name)
    except Exception:
        provider = settings.llm_provider
        model_name = settings.model_name

    logger.debug(f"get_llm({flow}, {role}) → {provider}:{model_name}")
    return _create_llm(provider, model_name)
