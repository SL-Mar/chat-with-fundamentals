# File: routers/llmloader.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from core.llm_settings import (
    get_model_from_db, set_model_in_db,
    get_provider_from_db, set_provider_in_db,
    SUPPORTED_MODELS,
)
import logging

router = APIRouter(prefix="/settings", tags=["LLMLoader"])
logger = logging.getLogger("llmloader")


class LLMSetting(BaseModel):
    manager: str
    store: str
    provider: str


class UpdateLLMRequest(BaseModel):
    field: str  # "manager", "store", or "provider"
    model_name: str


@router.get("/llm", response_model=List[LLMSetting])
def list_llm_settings():
    try:
        row = get_model_from_db()
        logger.info("Listed LLM settings successfully")
        return [row]
    except Exception:
        logger.exception("Failed to list LLM settings")
        raise HTTPException(status_code=500, detail="Failed to fetch LLM settings")


@router.post("/llm", response_model=LLMSetting)
def update_llm_setting(request: UpdateLLMRequest):
    try:
        if request.field == "provider":
            set_provider_in_db(request.model_name)
        elif request.field in ("manager", "store"):
            set_model_in_db(request.field, request.model_name)
        else:
            raise ValueError("field must be 'manager', 'store', or 'provider'")

        setting = get_model_from_db()
        logger.info(f"Updated {request.field} to {request.model_name}")
        return setting
    except Exception as e:
        logger.exception(f"Failed to update {request.field}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/llm/models", response_model=Dict[str, List[str]])
def list_supported_models():
    """Return models grouped by provider."""
    logger.info("Listed supported LLM models")
    return SUPPORTED_MODELS


@router.get("/llm/ollama-models", response_model=List[str])
def list_ollama_models():
    """Discover locally available Ollama models."""
    try:
        import httpx
        from core.config import settings
        resp = httpx.get(f"{settings.ollama_base_url}/api/tags", timeout=5.0)
        resp.raise_for_status()
        models = [m["name"] for m in resp.json().get("models", [])]
        return models
    except Exception as e:
        logger.warning(f"Could not reach Ollama: {e}")
        return []
