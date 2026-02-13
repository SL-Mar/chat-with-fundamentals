"""Chat router — code agent endpoint + WebSocket for logs."""

import asyncio
import logging
import json
from typing import Optional
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from services import universe_service
from services.chat_agent_service import process_chat_message

logger = logging.getLogger(__name__)
router = APIRouter(tags=["chat"])

# In-memory log store per session (for WebSocket streaming)
_session_logs: dict[str, list[str]] = {}


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


@router.post("/api/universes/{universe_id}/chat")
async def chat(universe_id: str, req: ChatRequest):
    universe = await universe_service.get_universe(universe_id)
    if not universe:
        raise HTTPException(status_code=404, detail="Universe not found")

    if universe["status"] != "ready":
        raise HTTPException(status_code=400, detail=f"Universe not ready (status: {universe['status']})")

    session_id = req.session_id or ""
    logs = []
    _session_logs[session_id] = logs

    async def on_log(msg: str):
        logs.append(msg)

    result = await process_chat_message(
        universe_db_name=universe["db_name"],
        message=req.message,
        session_id=req.session_id,
        on_log=on_log,
    )

    # Include logs in response
    result["logs"] = logs

    # Clean up logs after a delay
    asyncio.get_event_loop().call_later(300, lambda: _session_logs.pop(session_id, None))

    return result


@router.websocket("/api/universes/{universe_id}/chat/ws")
async def chat_ws(websocket: WebSocket, universe_id: str):
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            session_id = msg.get("session_id", "")

            # Stream logs for this session
            last_idx = 0
            while True:
                logs = _session_logs.get(session_id, [])
                if len(logs) > last_idx:
                    for log_msg in logs[last_idx:]:
                        await websocket.send_json({
                            "type": "log",
                            "message": log_msg,
                        })
                    last_idx = len(logs)

                # Check if session is done (removed from store)
                if session_id not in _session_logs and last_idx > 0:
                    await websocket.send_json({"type": "done"})
                    break

                await asyncio.sleep(0.5)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
