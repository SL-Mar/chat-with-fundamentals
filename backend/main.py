"""Chat with Fundamentals v2 — Universe-based Factor Analysis Platform."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.logger_config import setup_logging
from database.universe_db_manager import db_manager

setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Chat with Fundamentals v2...")
    await db_manager.init_registry()
    logger.info("Database initialized")
    yield
    await db_manager.dispose_all()
    logger.info("Shutdown complete")


app = FastAPI(
    title="Chat with Fundamentals v2",
    description="Universe-based Factor Analysis Platform",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from routers.health import router as health_router
from routers.universes import router as universes_router
from routers.chat import router as chat_router
from routers.settings import router as settings_router

app.include_router(health_router)
app.include_router(universes_router)
app.include_router(chat_router)
app.include_router(settings_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.backend_port, reload=True)
