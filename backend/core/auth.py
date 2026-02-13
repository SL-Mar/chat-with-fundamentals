import os
import secrets
from typing import Optional
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
import logging

logger = logging.getLogger("auth")

APP_API_KEY = os.getenv("APP_API_KEY", None)
DEV_MODE = APP_API_KEY is None

if DEV_MODE:
    logger.warning("APP_API_KEY not set - running in DEVELOPMENT MODE (no authentication)")

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: Optional[str] = Security(api_key_header)) -> str:
    if DEV_MODE:
        return "dev-mode"

    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API Key. Include 'X-API-Key' header.",
        )

    if not secrets.compare_digest(api_key.encode("utf8"), APP_API_KEY.encode("utf8")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key",
        )

    return api_key
