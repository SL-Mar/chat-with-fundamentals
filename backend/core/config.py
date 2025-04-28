import os
from typing import Optional
from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    openai_api_key: str
    model_name: str = "gpt-4o"

    eodhd_api_key: Optional[str] = None
    serper_api_key: Optional[str] = None
    mistral_api_key: Optional[str] = None

    NOTION_API_KEY: str = ""
    NOTION_DATABASE_ID: str = ""

    local_mode: bool = True

settings = Settings()

