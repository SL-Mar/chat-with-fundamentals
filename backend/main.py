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

# Load environment variables FIRST (before any other imports)
from dotenv import load_dotenv
load_dotenv()  # Load .env file into os.environ

import asyncio
import logging                          # Ensure logging is always in scope
from contextlib import asynccontextmanager
import os
import signal

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# ─── Routers ──────────────────────────────────────────────────────────
from routers.analyzer      import router as chatfundamentals      # Fundamental analysis chat
from routers.quantanalyzer import router as quantanalyzer
from routers.llmloader     import router as llmloader              # LLM settings
from routers.chat_panels   import router as chat_panels_router # NEW: Chat with dynamic panels
from routers.simulater     import router as equity_router      # Monte-Carlo simulation
from routers.technical     import router as technical_router   # Technical indicators & screener
from routers.calendar      import router as calendar_router    # Earnings, IPOs, splits calendar
from routers.special       import router as special_router     # Logos, analyst ratings, ESG, ETFs
from routers.corporate     import router as corporate_router   # Dividends, splits, insider transactions
from routers.news          import router as news_router        # News articles, sentiment, social
from routers.historical    import router as historical_router  # Intraday, live prices, EOD data
from routers.macro         import router as macro_router       # Macroeconomic indicators & events
from routers.monitoring    import router as monitoring_router  # NEW: Monitoring & metrics (Phase 2C)
from routers.admin         import router as admin_router       # NEW: Admin endpoints for DB management
from routers.ai_analysis   import router as ai_analysis_router # NEW: MarketSense AI analysis

# ─── Logger / core helpers ────────────────────────────────────────────
from core.logstream import log_ws_manager
from core.logger_config import setup_logger, set_main_event_loop
from core.stdout_stream import intercept_stdout
from core.auth import verify_api_key  # API key authentication

# ──────────────────────────────────────────────────────────────────────
# 1) Intercept stdout and configure logging
# ──────────────────────────────────────────────────────────────────────
intercept_stdout()
setup_logger()

# ──────────────────────────────────────────────────────────────────────
# 1.5) Rate limiting setup
# ──────────────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ──────────────────────────────────────────────────────────────────────
# 2) Lifespan context to expose the running asyncio loop
# ──────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger = logging.getLogger("main")
    loop = asyncio.get_event_loop()
    set_main_event_loop(loop)
    logger.info("🔧 AsyncIO event loop initialized for WebSocket logging")

    # ──────────────────────────────────────────────────────────────────────
    # Validate critical environment variables
    # ──────────────────────────────────────────────────────────────────────
    from core.config import settings

    logger.info("🔍 Validating environment configuration...")

    if not settings.eodhd_api_key:
        logger.error("❌ EODHD_API_KEY not set - data fetching will fail!")
        logger.error("❌ Set EODHD_API_KEY in .env file or environment variables")
        logger.error("❌ Get your free API key at: https://eodhd.com/register")

    if not settings.openai_api_key:
        logger.warning("⚠️  OPENAI_API_KEY not set - chat/AI features will be unavailable")
        logger.warning("⚠️  Some endpoints may return errors without OpenAI API key")

    app_api_key = os.getenv("APP_API_KEY")
    if not app_api_key:
        logger.warning("⚠️  APP_API_KEY not set - running in DEVELOPMENT MODE (no authentication)")
        logger.warning("⚠️  Set APP_API_KEY for production deployment to enable authentication")
    else:
        logger.info("✅ APP_API_KEY is set - authentication enabled")

    if settings.eodhd_api_key:
        logger.info("✅ EODHD_API_KEY is set - data fetching enabled")
    if settings.openai_api_key:
        logger.info("✅ OPENAI_API_KEY is set - AI features enabled")

    logger.info("✅ Environment validation complete")

    # Start background services
    from services.cache_warming_service import start_cache_warming
    from services.data_refresh_pipeline import start_data_refresh_pipeline

    try:
        # Start cache warming service (Phase 2C)
        logging.getLogger("main").info("🚀 Starting cache warming service...")
        start_cache_warming()

        # Start data refresh pipeline (Phase 2D - Incremental Refresh)
        logging.getLogger("main").info("🚀 Starting data refresh pipeline...")
        start_data_refresh_pipeline()

        logging.getLogger("main").info("✅ All background services started successfully")
    except Exception as e:
        logging.getLogger("main").error(f"⚠️  Failed to start background services: {e}")

    yield

    # Shutdown
    from services.cache_warming_service import stop_cache_warming
    from services.data_refresh_pipeline import stop_data_refresh_pipeline

    logging.getLogger("main").info("⏹️  Stopping background services...")
    try:
        stop_cache_warming()
        stop_data_refresh_pipeline()
        logging.getLogger("main").info("✅ Background services stopped successfully")
    except Exception as e:
        logging.getLogger("main").error(f"⚠️  Error stopping background services: {e}")

# ──────────────────────────────────────────────────────────────────────
# 3) FastAPI application
# ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Chat with Fundamentals API",
    lifespan=lifespan,
)

# Attach rate limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ──────────────────────────────────────────────────────────────────────
# 4) CORS configuration (local Next.js front-end + production)
# ──────────────────────────────────────────────────────────────────────
# Get allowed origins from environment variable for production
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001,http://localhost:3003,http://localhost:3005").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],  # Only allow needed methods (more secure)
    allow_headers=["Content-Type", "X-API-Key"],  # Explicitly allow API key header
)

# ──────────────────────────────────────────────────────────────────────
# 4.5) Request size limit middleware (prevent DoS via large payloads)
# ──────────────────────────────────────────────────────────────────────
@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    """Limit request body size to prevent memory exhaustion attacks"""
    MAX_SIZE = 10 * 1024 * 1024  # 10 MB limit
    content_length = request.headers.get("content-length")

    if content_length and int(content_length) > MAX_SIZE:
        logger.warning(f"Request blocked: body size {content_length} exceeds limit {MAX_SIZE}")
        return JSONResponse(
            status_code=413,
            content={"detail": "Request entity too large. Maximum size is 10MB."}
        )

    return await call_next(request)

# ──────────────────────────────────────────────────────────────────────
# 5) Register all routers WITH AUTHENTICATION
# ──────────────────────────────────────────────────────────────────────
# All routers require API key authentication to protect OpenAI/EODHD API keys
# If APP_API_KEY is not set, runs in dev mode (no auth required - local only!)
app.include_router(chatfundamentals, dependencies=[Depends(verify_api_key)])  # Fundamental analysis chat
app.include_router(quantanalyzer, dependencies=[Depends(verify_api_key)])  # EOD/OHLCV data
app.include_router(llmloader, dependencies=[Depends(verify_api_key)])      # LLM settings
app.include_router(chat_panels_router, dependencies=[Depends(verify_api_key)]) # NEW: Chat with dynamic panels
app.include_router(equity_router, dependencies=[Depends(verify_api_key)])
app.include_router(technical_router, dependencies=[Depends(verify_api_key)])
app.include_router(calendar_router, dependencies=[Depends(verify_api_key)])
app.include_router(special_router, dependencies=[Depends(verify_api_key)])      # NEW: Special data
app.include_router(corporate_router, dependencies=[Depends(verify_api_key)])    # NEW: Corporate actions
app.include_router(news_router, dependencies=[Depends(verify_api_key)])         # NEW: News & sentiment
app.include_router(historical_router, dependencies=[Depends(verify_api_key)])   # NEW: Historical price data
app.include_router(macro_router, dependencies=[Depends(verify_api_key)])        # NEW: Macroeconomic data
app.include_router(monitoring_router, dependencies=[Depends(verify_api_key)])  # NEW: Monitoring & metrics (requires auth)
app.include_router(admin_router, dependencies=[Depends(verify_api_key)])       # NEW: Admin endpoints (requires auth)
app.include_router(ai_analysis_router, dependencies=[Depends(verify_api_key)]) # NEW: MarketSense AI analysis (requires auth)

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
# 7) Public endpoints (health check) and protected test endpoints
# ──────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    """Public health check endpoint - no authentication required."""
    return {
        "status": "ok",
        "service": "Chat with Fundamentals API",
        "version": "1.0",
        "auth_required": os.getenv("APP_API_KEY") is not None
    }

@app.get("/log-test", dependencies=[Depends(verify_api_key)])
@limiter.limit("5/minute")  # Rate limit: 5 requests per minute
async def log_test(request: Request):
    """Protected test endpoint - requires authentication."""
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
        reload=False,
    )

