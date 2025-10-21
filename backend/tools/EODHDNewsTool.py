# File: tools/EODHDNewsTool.py
# Not explicitly used - can be passed to a CrewAI agent - but a deterministic fetching is faster

from crewai.tools import BaseTool
from pydantic import Field
import requests
from typing import Dict, Any, List
from core.config import settings

class EODHDNewsTool(BaseTool):
    name: str = "EODHD News Tool"
    description: str = "Fetches news articles for a given stock symbol from EODHD API"
    cache: Dict[str, str] = Field(default_factory=dict)

    def get_from_cache(self, symbol: str) -> str:
        return self.cache.get(symbol, "")

    def save_to_cache(self, symbol: str, data: str) -> None:
        self.cache[symbol] = data

    def _run(self, symbol: str) -> str:
        api_token = settings.eodhd_api_key
        url = f'https://eodhd.com/api/news?s={symbol}&offset=0&limit=10&api_token={api_token}&fmt=json'
        if (cached := self.get_from_cache(symbol)):
            return cached
        try:
            response = requests.get(url)
            response.raise_for_status()
            data = str(response.json())
            self.save_to_cache(symbol, data)
            return data
        except requests.RequestException as e:
            return str([{"error": f"Error fetching news for {symbol}: {e}"}])
