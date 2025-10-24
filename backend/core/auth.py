"""Authentication and security module for Chat with Fundamentals.

This module provides API key-based authentication to protect OpenAI and EODHD
API keys from unauthorized access.

Usage:
    Add `dependencies=[Depends(verify_api_key)]` to routes that need protection.

Environment Variables:
    APP_API_KEY: Secret key required in X-API-Key header (required for production)
"""

import os
import secrets
from typing import Optional
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
import logging

logger = logging.getLogger("auth")

# Read API key from environment (required for production deployment)
APP_API_KEY = os.getenv("APP_API_KEY", None)

# Development mode: allow access without key if APP_API_KEY not set
DEV_MODE = APP_API_KEY is None

if DEV_MODE:
    logger.warning("⚠️  APP_API_KEY not set - running in DEVELOPMENT MODE (no authentication)")
    logger.warning("⚠️  Set APP_API_KEY environment variable for production deployment")
else:
    logger.info("✅ Authentication enabled - APP_API_KEY is set")

# API key header scheme
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: Optional[str] = Security(api_key_header)) -> str:
    """Verify the API key from request header.

    Args:
        api_key: The API key from X-API-Key header

    Returns:
        The validated API key

    Raises:
        HTTPException: 401 if API key is invalid or missing
    """
    # Development mode: skip authentication
    if DEV_MODE:
        return "dev-mode"

    # Production mode: require valid API key
    if api_key is None:
        logger.warning("Authentication failed: Missing X-API-Key header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API Key. Include 'X-API-Key' header with your request.",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    # Use constant-time comparison to prevent timing attacks
    is_valid = secrets.compare_digest(api_key.encode("utf8"), APP_API_KEY.encode("utf8"))

    if not is_valid:
        logger.warning(f"Authentication failed: Invalid API key (received: {api_key[:8]}...)")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    logger.debug("Authentication successful")
    return api_key


def generate_api_key() -> str:
    """Generate a secure random API key.

    Returns:
        A 64-character hexadecimal string suitable for use as APP_API_KEY

    Example:
        >>> key = generate_api_key()
        >>> print(f"APP_API_KEY={key}")
        APP_API_KEY=d4f7a8b9c2e1f3a6b5c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0
    """
    return secrets.token_hex(32)


# For convenience: if running this file directly, generate a new API key
if __name__ == "__main__":
    print("=" * 70)
    print("Generated API Key for Chat with Fundamentals")
    print("=" * 70)
    print()
    print(f"APP_API_KEY={generate_api_key()}")
    print()
    print("Add this to your environment variables:")
    print("  - Local: Add to .env file")
    print("  - Railway: Add in Variables tab")
    print("  - Render: Add in Environment Variables section")
    print("  - Fly.io: Run `fly secrets set APP_API_KEY=<value>`")
    print()
    print("=" * 70)
