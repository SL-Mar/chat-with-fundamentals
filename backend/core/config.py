from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    eodhd_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    ollama_base_url: str = "http://localhost:11434"

    llm_provider: str = "ollama"
    llm_model: str = "qwen2.5-coder:14b"

    database_url: str = "postgresql://postgres:postgres@localhost:5435/universe_registry"
    redis_url: str = "redis://localhost:6381"

    backend_port: int = 8001
    frontend_port: int = 3006

    model_config = SettingsConfigDict(
        env_file=str(_PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()
