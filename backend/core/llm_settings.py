"""core/llm_settings.py – simplified single‑flow settings store.

The application now has only one logical LLM flow, so we replace the old
(flow, manager, store) schema with a single‑row table containing
`manager_model` and `store_model`.

Key points:
* Table has exactly one row (id = 1).
* `get_models()` returns `{"manager": ..., "store": ...}`.
* `set_model(role, model)` updates either column; `role` must be 'manager' or 'store'.
* On first import the table and default row are created if absent.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Tuple, Dict

DB_PATH = Path(__file__).parent / "llm_config.db"
DEFAULT_MANAGER = "gpt-4o"
DEFAULT_STORE = "gpt-4o"

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
        cur = conn.execute("SELECT COUNT(*) FROM llm_settings WHERE id = 1")
        if cur.fetchone()[0] == 0:
            conn.execute(
                "INSERT INTO llm_settings (id, manager, store) VALUES (1, ?, ?)",
                (DEFAULT_MANAGER, DEFAULT_STORE),
            )
    print("✅ LLM settings DB ready (single‑flow mode)")

_init_db()

# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def _fetch_row() -> Tuple[str, str]:
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute("SELECT manager, store FROM llm_settings WHERE id = 1")
        row = cur.fetchone()
        if row is None:
            raise RuntimeError("LLM settings row missing – DB not initialised correctly")
        return row  # type: ignore


def get_model_from_db() -> Dict[str, str]:
    """Return the current {{'manager': ..., 'store': ...}} model names."""
    mgr, sto = _fetch_row()
    return {"manager": mgr, "store": sto}


def set_model_in_db(role: str, model_name: str) -> None:
    """Update either the manager or store model.

    Args:
        role: 'manager' | 'store'
        model_name: the OpenAI model name to persist
    """
    if role not in {"manager", "store"}:
        raise ValueError("role must be 'manager' or 'store'")
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(f"UPDATE llm_settings SET {role} = ? WHERE id = 1", (model_name,))
    print(f"Updated {role} model → {model_name}")
