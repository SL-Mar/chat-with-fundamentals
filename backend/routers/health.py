import logging
from fastapi import APIRouter
from core.config import settings
import httpx
import redis

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health_check():
    checks = {}

    # Database
    try:
        from database.universe_db_manager import db_manager
        async with db_manager.get_registry_session() as session:
            from sqlalchemy import text
            await session.execute(text("SELECT 1"))
        checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"unhealthy: {str(e)[:100]}"

    # Redis
    try:
        r = redis.from_url(settings.redis_url, socket_timeout=3)
        r.ping()
        checks["redis"] = "healthy"
        r.close()
    except Exception as e:
        checks["redis"] = f"unhealthy: {str(e)[:100]}"

    # Ollama
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{settings.ollama_base_url}/api/tags")
            if resp.status_code == 200:
                models = [m["name"] for m in resp.json().get("models", [])]
                checks["ollama"] = f"healthy ({len(models)} models)"
            else:
                checks["ollama"] = f"unhealthy: status {resp.status_code}"
    except Exception as e:
        checks["ollama"] = f"unavailable: {str(e)[:100]}"

    overall = "healthy" if all("healthy" in v for v in checks.values()) else "degraded"
    return {"status": overall, "checks": checks}
