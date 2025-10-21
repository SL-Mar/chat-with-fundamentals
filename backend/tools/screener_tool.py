# tools/screener_tool.py
"""Stock screener tool for AI agent"""

import httpx
from typing import List, Dict, Any, Optional
from crewai.tools import BaseTool
from pydantic import Field
from core.config import settings


class StockScreenerTool(BaseTool):
    """Tool to screen stocks based on fundamental and technical criteria"""

    name: str = "stock_screener"
    description: str = """Screen stocks based on fundamental and technical criteria.

    Parameters:
    - min_market_cap: Minimum market capitalization (e.g., 1000000000 for $1B)
    - max_market_cap: Maximum market capitalization
    - min_pe: Minimum P/E ratio
    - max_pe: Maximum P/E ratio
    - min_dividend: Minimum dividend yield (as decimal, e.g., 0.02 for 2%)
    - max_dividend: Maximum dividend yield
    - sector: Sector filter (e.g., 'Technology', 'Healthcare')
    - signal: Technical signal (e.g., '50d_new_hi', '200d_new_lo')
    - sort: Sort field (e.g., 'market_capitalization.desc', 'pe_ratio.asc')
    - limit: Maximum number of results (default 50)

    Example: screen stocks with market cap > 1B, P/E < 20, and dividend yield > 2%
    """

    def _run(
        self,
        min_market_cap: Optional[float] = None,
        max_market_cap: Optional[float] = None,
        min_pe: Optional[float] = None,
        max_pe: Optional[float] = None,
        min_dividend: Optional[float] = None,
        max_dividend: Optional[float] = None,
        sector: Optional[str] = None,
        signal: Optional[str] = None,
        sort: str = "market_capitalization.desc",
        limit: int = 50
    ) -> str:
        """Execute stock screening"""

        # Build filters array
        filters = []

        if min_market_cap:
            filters.append(["market_capitalization", ">", min_market_cap])
        if max_market_cap:
            filters.append(["market_capitalization", "<", max_market_cap])
        if min_pe:
            filters.append(["pe_ratio", ">", min_pe])
        if max_pe:
            filters.append(["pe_ratio", "<", max_pe])
        if min_dividend:
            filters.append(["dividend_yield", ">", min_dividend])
        if max_dividend:
            filters.append(["dividend_yield", "<", max_dividend])
        if sector:
            filters.append(["sector", "=", sector])

        # Call EODHD screener API
        url = "https://eodhd.com/api/screener"
        params = {
            "api_token": settings.eodhd_api_key,
            "sort": sort,
            "limit": limit,
            "offset": 0
        }

        if filters:
            import json
            params["filters"] = json.dumps(filters)

        if signal:
            params["signals"] = signal

        try:
            with httpx.Client(timeout=20.0) as client:
                resp = client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()

            # Extract key info for LLM
            results = data.get("data", [])

            if not results:
                return "No stocks found matching the criteria."

            # Format results for LLM
            output = f"Found {len(results)} stocks:\n\n"
            for stock in results[:20]:  # Limit to top 20 for LLM context
                output += f"- {stock.get('code', 'N/A')}: {stock.get('name', 'N/A')}\n"
                output += f"  Price: ${stock.get('close', 0):.2f}\n"
                output += f"  Market Cap: ${stock.get('market_capitalization', 0) / 1e9:.2f}B\n"
                output += f"  P/E: {stock.get('pe_ratio', 'N/A')}\n"
                output += f"  Dividend Yield: {stock.get('dividend_yield', 0) * 100:.2f}%\n"
                output += f"  Sector: {stock.get('sector', 'N/A')}\n\n"

            return output

        except Exception as e:
            return f"Error screening stocks: {str(e)}"
