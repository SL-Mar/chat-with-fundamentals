# File: core/config.py

from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    openai_api_key: Optional[str] = None
    model_name: str = "gpt-4o-mini"

    anthropic_api_key: Optional[str] = None
    ollama_base_url: str = "http://localhost:11434"
    llm_provider: str = "openai"  # startup default; runtime value comes from DB

    eodhd_api_key: Optional[str] = None
    serper_api_key: Optional[str] = None
    mistral_api_key: Optional[str] = None
    tavily_api_key: Optional[str] = None

    NOTION_API_KEY: str = ""
    NOTION_DATABASE_ID: str = ""

    local_mode: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )

settings = Settings()
