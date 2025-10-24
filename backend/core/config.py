# File: core/config.py

from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    openai_api_key: Optional[str] = None  # Made optional for testing macro/ETF features
    model_name: str = "gpt-4o-mini"  # Cheapest OpenAI model (90% cheaper than gpt-4o)

    eodhd_api_key: Optional[str] = None
    serper_api_key: Optional[str] = None
    mistral_api_key: Optional[str] = None

    NOTION_API_KEY: str = ""
    NOTION_DATABASE_ID: str = ""

    local_mode: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )

settings = Settings()

