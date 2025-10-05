from pathlib import Path
import sqlite3
from langchain_community.chat_models import ChatOpenAI
from core.config import settings

DB_PATH = Path("core/llm_config.db")

def get_llm(role: str = "store") -> ChatOpenAI:
    """
    Retrieve the active LLM for a given role ('manager' or 'store').

    Falls back to .env MODEL_NAME if not found in DB.
    """
    # Validate role to prevent SQL injection
    allowed_roles = {"manager": "manager", "store": "store"}
    if role not in allowed_roles:
        raise ValueError(f"Invalid role: {role}. Must be 'manager' or 'store'.")

    column = allowed_roles[role]

    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            # Use validated column name - safe from SQL injection
            cursor.execute(f"SELECT {column} FROM llm_settings LIMIT 1")
            row = cursor.fetchone()
            model_name = row[0] if row and row[0] else settings.model_name
    except Exception:
        model_name = settings.model_name

    return ChatOpenAI(
        model=model_name,
        api_key=settings.openai_api_key,
        temperature=0.3
    )
