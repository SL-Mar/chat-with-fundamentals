"""core/llm_settings.py – single-row LLM settings store with multi-provider support.

Table has exactly one row (id = 1) containing:
  manager  – model name for the "manager" role
  store    – model name for the "store" role
  provider – LLM provider: openai | anthropic | ollama
"""

from __future__ import annotations

import sqlite3
import logging
from pathlib import Path
from typing import Dict

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent / "llm_config.db"
DEFAULT_MANAGER = "gpt-4o-mini"
DEFAULT_STORE = "gpt-4o-mini"
DEFAULT_PROVIDER = "openai"

SUPPORTED_MODELS: Dict[str, list] = {
    "openai": ["gpt-4.1", "o1", "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
    "anthropic": [
        "claude-sonnet-4-5-20250929",
        "claude-haiku-4-5-20251001",
        "claude-opus-4-6",
    ],
    "ollama": ["llama3.1", "llama3.2", "mistral", "deepseek-r1", "qwen2.5"],
}

DEFAULT_MODELS: Dict[str, str] = {
    "openai": "gpt-4o-mini",
    "anthropic": "claude-sonnet-4-5-20250929",
    "ollama": "llama3.1",
}

# ---------------------------------------------------------------------------
# DB initialisation
# ---------------------------------------------------------------------------

def _init_db() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS llm_settings (
                id       INTEGER PRIMARY KEY CHECK (id = 1),
                manager  TEXT NOT NULL,
                store    TEXT NOT NULL
            )
            """
        )
        # Migrate: add provider column if missing
        cursor = conn.execute("PRAGMA table_info(llm_settings)")
        columns = [row[1] for row in cursor.fetchall()]
        if "provider" not in columns:
            conn.execute(
                f"ALTER TABLE llm_settings ADD COLUMN provider TEXT NOT NULL DEFAULT '{DEFAULT_PROVIDER}'"
            )
            logger.info("Migrated llm_settings: added 'provider' column")

        cur = conn.execute("SELECT COUNT(*) FROM llm_settings WHERE id = 1")
        if cur.fetchone()[0] == 0:
            conn.execute(
                "INSERT INTO llm_settings (id, manager, store, provider) VALUES (1, ?, ?, ?)",
                (DEFAULT_MANAGER, DEFAULT_STORE, DEFAULT_PROVIDER),
            )
    logger.info("LLM settings DB ready (multi-provider mode)")

_init_db()

# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def get_model_from_db() -> Dict[str, str]:
    """Return {'manager': ..., 'store': ..., 'provider': ...}."""
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute("SELECT manager, store, provider FROM llm_settings WHERE id = 1")
        row = cur.fetchone()
        if row is None:
            raise RuntimeError("LLM settings row missing")
        return {"manager": row[0], "store": row[1], "provider": row[2]}


def set_model_in_db(role: str, model_name: str) -> None:
    """Update manager or store model."""
    VALID_COLUMNS = {"manager": "manager", "store": "store"}
    column = VALID_COLUMNS.get(role)
    if not column:
        raise ValueError("role must be 'manager' or 'store'")

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(f"UPDATE llm_settings SET {column} = ? WHERE id = 1", (model_name,))
    logger.info(f"Updated {role} model to {model_name}")


def get_provider_from_db() -> str:
    """Return current provider name."""
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute("SELECT provider FROM llm_settings WHERE id = 1")
        row = cur.fetchone()
        return row[0] if row else DEFAULT_PROVIDER


def set_provider_in_db(provider: str) -> None:
    """Switch provider and reset models to that provider's defaults."""
    if provider not in SUPPORTED_MODELS:
        raise ValueError(f"Unsupported provider: {provider}. Must be one of {list(SUPPORTED_MODELS.keys())}")

    default_model = DEFAULT_MODELS[provider]
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "UPDATE llm_settings SET provider = ?, manager = ?, store = ? WHERE id = 1",
            (provider, default_model, default_model),
        )
    logger.info(f"Switched provider to {provider}, models reset to {default_model}")
