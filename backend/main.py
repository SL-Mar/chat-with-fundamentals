# Copyright 2024 SL MAR - Sebastien M. LAIGNEL

# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# main.py – FastAPI entry-point

import asyncio
import logging                          # Ensure logging is always in scope
from contextlib import asynccontextmanager
import os
import signal

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# ─── Routers ──────────────────────────────────────────────────────────
from routers.analyzer      import router as chatfundamentals
from routers.quantanalyzer import router as quantanalyzer
from routers.llmloader     import router as llmloader
from routers.simulater     import router as equity_router      # Monte-Carlo simulation
from routers.researcher    import router as researcher 

# ─── Logger / core helpers ────────────────────────────────────────────
from core.logstream import log_ws_manager
from core.logger_config import setup_logger, set_main_event_loop
from core.stdout_stream import intercept_stdout

# ──────────────────────────────────────────────────────────────────────
# 1) Intercept stdout and configure logging
# ──────────────────────────────────────────────────────────────────────
intercept_stdout()
setup_logger()

# ──────────────────────────────────────────────────────────────────────
# 2) Lifespan context to expose the running asyncio loop
# ──────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_event_loop()
    set_main_event_loop(loop)
    logging.getLogger("main").info("🔧 AsyncIO event loop initialized for WebSocket logging")
    yield

# ──────────────────────────────────────────────────────────────────────
# 3) FastAPI application
# ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Chat with Fundamentals API",
    lifespan=lifespan,
)

# ──────────────────────────────────────────────────────────────────────
# 4) CORS configuration (local Next.js front-end)
# ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────────────
# 5) Register all routers
# ──────────────────────────────────────────────────────────────────────
app.include_router(chatfundamentals)
app.include_router(quantanalyzer)
app.include_router(llmloader)
app.include_router(equity_router)
app.include_router(researcher)

# ──────────────────────────────────────────────────────────────────────
# 6) WebSocket log stream
# ──────────────────────────────────────────────────────────────────────
@app.websocket("/ws/logs")
async def log_stream(websocket: WebSocket):
    await websocket.accept()

    # send last N lines of existing log file on connect
    N = 10
    try:
        with open("chatwithfundamentals.log", "r") as f:
            for line in f.readlines()[-N:]:
                await websocket.send_text(line.rstrip())
    except FileNotFoundError:
        pass

    await log_ws_manager.connect(websocket)
    try:
        while True:
            await asyncio.sleep(10)  # Keep-alive heartbeat every 10s
            await websocket.send_text("Connection alive")
    except WebSocketDisconnect:
        log_ws_manager.disconnect(websocket)

# ──────────────────────────────────────────────────────────────────────
# 7) Manual log-test endpoint and shutdown
# ──────────────────────────────────────────────────────────────────────
@app.get("/log-test")
def log_test():
    logging.getLogger("analyzer").info("🧪 Manual /log-test log message emitted")
    return {"status": "ok"}

@app.post("/shutdown")
async def shutdown():
    pid = os.getpid()
    asyncio.create_task(delayed_shutdown(pid))
    return {"message": "Shutting down"}

async def delayed_shutdown(pid):
    await asyncio.sleep(1)
    os.kill(pid, signal.SIGINT)


# ──────────────────────────────────────────────────────────────────────
# 8) Run with `python main.py` in dev
# ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        log_config=None,
        reload=True,
    )

