"""Settings router — LLM config, defaults, API keys."""

import logging
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import select, text

from core.config import settings
from database.universe_db_manager import db_manager
from database.models.universe_registry import AppSettings
from services.factor_service import get_factor_catalog

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["settings"])

# EODHD sectors (subset of most common US sectors)
SECTORS = [
    "Basic Materials",
    "Communication Services",
    "Consumer Cyclical",
    "Consumer Defensive",
    "Energy",
    "Financial Services",
    "Healthcare",
    "Industrials",
    "Real Estate",
    "Technology",
    "Utilities",
]


class LLMSettingsUpdate(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None
    ollama_url: Optional[str] = None
    anthropic_key: Optional[str] = None


class DefaultsUpdate(BaseModel):
    default_granularities: Optional[list[str]] = None


@router.get("/settings")
async def get_settings():
    stored = {}
    try:
        async with db_manager.get_registry_session() as session:
            result = await session.execute(select(AppSettings))
            for row in result.scalars():
                stored[row.key] = row.value
    except Exception:
        pass

    return {
        "llm": {
            "provider": stored.get("llm_provider", {}).get("value", settings.llm_provider),
            "model": stored.get("llm_model", {}).get("value", settings.llm_model),
            "ollama_url": settings.ollama_base_url,
            "anthropic_key_set": bool(settings.anthropic_api_key),
        },
        "defaults": {
            "granularities": stored.get("default_granularities", {}).get("value", ["d"]),
        },
        "eodhd_key_set": bool(settings.eodhd_api_key),
    }


@router.put("/settings/llm")
async def update_llm_settings(req: LLMSettingsUpdate):
    async with db_manager.get_registry_session() as session:
        if req.provider:
            await _upsert_setting(session, "llm_provider", {"value": req.provider})
        if req.model:
            await _upsert_setting(session, "llm_model", {"value": req.model})
    return {"status": "updated"}


@router.put("/settings/defaults")
async def update_defaults(req: DefaultsUpdate):
    async with db_manager.get_registry_session() as session:
        if req.default_granularities:
            await _upsert_setting(
                session, "default_granularities",
                {"value": req.default_granularities},
            )
    return {"status": "updated"}


@router.get("/sectors")
async def get_sectors():
    return SECTORS


@router.get("/factors/catalog")
async def get_factors():
    return get_factor_catalog()


async def _upsert_setting(session, key: str, value: dict):
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    stmt = pg_insert(AppSettings).values(key=key, value=value)
    stmt = stmt.on_conflict_do_update(
        index_elements=["key"],
        set_={"value": value},
    )
    await session.execute(stmt)
