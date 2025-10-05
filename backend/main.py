import logging
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from routers.coder import router as coder
from routers.filemanager import router as filemanager
from routers.llmloader import router as llmloader
from routers.backtester import router as backtester  # Import the new backtester router
from core.logstream import log_ws_manager
from core.logger_config import setup_logger, set_main_event_loop
from core.stdout_stream import intercept_stdout
from core.config import settings

# ──────────────────────────────────────────────
# 1️⃣ Setup stdout & logging
# ──────────────────────────────────────────────
intercept_stdout()
setup_logger()

# ──────────────────────────────────────────────
# 2️⃣ Async lifespan for app-wide init
# ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_event_loop()
    set_main_event_loop(loop)
    logging.getLogger("main").info("🔧 AsyncIO event loop initialized")
    yield

# ──────────────────────────────────────────────
# 3️⃣ Create the app
# ──────────────────────────────────────────────
app = FastAPI(
    title="QuantCoder API",
    lifespan=lifespan,
)

# ──────────────────────────────────────────────
# 4️⃣ Enable frontend CORS (Security hardened)
# ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3003"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],  # Explicit methods only
    allow_headers=["Content-Type", "Authorization"],  # Explicit headers only
)

# ──────────────────────────────────────────────
# 5️⃣ Register routers
# ──────────────────────────────────────────────
app.include_router(filemanager)
app.include_router(coder)
app.include_router(llmloader)  # ✅ Now active
app.include_router(backtester)  # ✅ Added the new backtester router

# ──────────────────────────────────────────────
# 6️⃣ WebSocket log stream
# ──────────────────────────────────────────────
@app.websocket("/ws/logs")
async def log_stream(websocket: WebSocket):
    await websocket.accept()

    # Send recent lines from log file
    try:
        with open("quantcoder.log", "r") as f:
            lines = f.readlines()[-50:]
        for line in lines:
            await websocket.send_text(line.strip())
    except Exception:
        await websocket.send_text("[log stream unavailable]")

    await log_ws_manager.connect(websocket)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        log_ws_manager.disconnect(websocket)

# ──────────────────────────────────────────────
# 7️⃣ Manual log ping
# ──────────────────────────────────────────────
@app.get("/log-test")
def log_test():
    logging.getLogger("analyzer").info("🧪 Manual /log-test log message emitted")
    return {"status": "ok"}

# ──────────────────────────────────────────────
# 8️⃣ Entry point
# ──────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8003,
        reload=True,
        log_config=None,
    )
