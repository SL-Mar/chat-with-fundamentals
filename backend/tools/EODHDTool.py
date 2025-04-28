from crewai.tools import BaseTool
from pydantic import Field
import os, requests
from typing import Optional, Dict

class EODHDTool(BaseTool):
    name: str = "EODHD Fundamentals Tool"
    description: str = "Fetches fundamental data for a given stock symbol from EODHD API"
    cache: Dict[str, str] = Field(default_factory=dict)

    def get_from_cache(self, symbol: str) -> Optional[str]:
        print(f"Using cached data")
        return self.cache.get(symbol)

    def save_to_cache(self, symbol: str, data: str) -> None:
        self.cache[symbol] = data

    def _run(self, symbol: str) -> str:
        api_token = os.getenv("EODHD_API_KEY")
        FilterSelection = (
            "General::Name,General::Sector,General::Industry,"
            "Highlights::MarketCapitalization,Highlights::PERatio,"
            "Highlights::ProfitMargin,Highlights::ReturnOnEquityTTM,"
            "Highlights::RevenueTTM,Highlights::OperatingMarginTTM,"
            "Valuation::TrailingPE,Valuation::ForwardPE,"
            "Valuation::PriceSalesTTM,SplitsDividends::DividendYield,"
            "SplitsDividends::PayoutRatio,Earnings::History::EPSActual,"
            "Earnings::History::EPSEstimate,Earnings::History::SurprisePercent,"
            "Financials::Income_Statement::yearly,Financials::Balance_Sheet::yearly,"
            "Financials::Cash_Flow::yearly"
        )
        url = f"https://eodhd.com/api/fundamentals/{symbol}.US?filter={FilterSelection}&api_token={api_token}&fmt=json"
        if (cached := self.get_from_cache(symbol)):
            return cached
        try:
            response = requests.get(url)
            response.raise_for_status()
            data = str(response.json())
            self.save_to_cache(symbol, data)
            return data
        except requests.RequestException as e:
            return f"Error fetching data for {symbol}: {e}"
