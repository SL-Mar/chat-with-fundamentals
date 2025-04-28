from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from core.llm_settings import get_model_from_db, set_model_in_db
import logging

router = APIRouter(prefix="/settings", tags=["LLMLoader"])
logger = logging.getLogger("llmloader")  # ✅ create a child logger

class LLMSetting(BaseModel):
    manager: str
    store: str

class UpdateLLMRequest(BaseModel):
    field: str  # must be "manager" or "store"
    model_name: str

@router.get("/llm", response_model=List[LLMSetting])
def list_llm_settings():
    import sqlite3
    from core.llm_settings import DB_PATH

    try:
        with sqlite3.connect(DB_PATH) as conn:
            cur = conn.cursor()
            cur.execute("SELECT manager, store FROM llm_settings")
            rows = cur.fetchall()
            logger.info("🔍 Listed LLM settings successfully")
            return [{"manager": row[0], "store": row[1]} for row in rows]
    except Exception as e:
        logger.exception("❌ Failed to list LLM settings")
        raise HTTPException(status_code=500, detail="Failed to fetch LLM settings")

@router.post("/llm", response_model=LLMSetting)
def update_llm_setting(request: UpdateLLMRequest):
    try:
        if request.field not in ("manager", "store"):
            raise ValueError("Invalid field. Must be 'manager' or 'store'.")

        set_model_in_db(request.field, request.model_name)
        setting = get_model_from_db()

        logger.info(f"✅ Updated {request.field} to {request.model_name}")
        return {
            "manager": setting["manager"],
            "store": setting["store"]
        }
    except Exception as e:
        logger.exception(f"❌ Failed to update {request.field}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/llm/models", response_model=List[str])
def list_supported_models():
    logger.info("📋 Listed supported LLM models")
    return ["gpt-4.1", "o1", "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"]



@router.get("/llm/models", response_model=List[str])
def list_supported_models():
    return ["gpt-4.1", "o1", "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"]
