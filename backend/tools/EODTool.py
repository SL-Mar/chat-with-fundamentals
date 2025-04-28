from crewai.tools import BaseTool
from pydantic import Field
from datetime import datetime, timedelta
import os, requests
from typing import Dict, Any

class EODTool(BaseTool):
    name: str = "EOD Tool"
    description: str = "Fetches end-of-day data for a given stock symbol from EODHD API"
    cache: Dict[str, Any] = Field(default_factory=dict)

    def get_from_cache(self, symbol: str) -> Dict[str, Any]:
        return self.cache.get(symbol, {})

    def save_to_cache(self, symbol: str, data: Dict[str, Any]) -> None:
        self.cache[symbol] = data

    def _run(self, symbol: str) -> Dict[str, Any]:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)
        api_token = os.getenv("EODHD_API_KEY")
        url = f"https://eodhd.com/api/eod/{symbol}?from={start_date:%Y-%m-%d}&to={end_date:%Y-%m-%d}&api_token={api_token}&fmt=json"
        if (cached := self.get_from_cache(symbol)):
            return cached
        try:
            response = requests.get(url)
            response.raise_for_status()
            data = response.json()
            self.save_to_cache(symbol, data)
            return data
        except requests.RequestException as e:
            return [{"error": f"Error fetching data for {symbol}: {e}"}]
