"""Chat agent service — bridges router to pipeline."""

import logging
import uuid
from core.config import settings
from agents.pipeline import run_agent_pipeline

logger = logging.getLogger(__name__)


async def process_chat_message(
    universe_db_name: str,
    message: str,
    session_id: str = None,
    on_log: callable = None,
) -> dict:
    """Process a chat message through the code agent pipeline."""
    if not session_id:
        session_id = str(uuid.uuid4())

    # Build DB connection string for the universe database
    base_url = settings.database_url
    parts = base_url.rsplit("/", 1)
    db_url = f"{parts[0]}/{universe_db_name}"

    result = await run_agent_pipeline(
        message=message,
        db_connection_string=db_url,
        session_id=session_id,
        on_log=on_log,
    )

    result["session_id"] = session_id
    return result
