"""
Base EODHD API Client
Provides core functionality for all EODHD API endpoints
"""

import os
import requests
from typing import Optional, Dict, Any, List
from datetime import datetime, date
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)


class EODHDBaseClient:
    """Base client for EODHD API with common functionality"""

    BASE_URL = "https://eodhd.com/api"

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize EODHD API client

        Args:
            api_key: EODHD API key. If None, reads from EODHD_API_KEY environment variable
        """
        self.api_key = api_key or os.getenv("EODHD_API_KEY")
        if not self.api_key:
            raise ValueError("EODHD API key is required. Set EODHD_API_KEY environment variable or pass api_key parameter")

        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "ChatWithFundamentals/2.0",
            "Accept": "application/json"
        })

    def _build_url(self, endpoint: str) -> str:
        """Build full API URL"""
        return f"{self.BASE_URL}/{endpoint}"

    def _add_api_token(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Add API token to parameters"""
        params = params.copy()
        params["api_token"] = self.api_key
        params["fmt"] = params.get("fmt", "json")
        return params

    def _make_request(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        method: str = "GET"
    ) -> Any:
        """
        Make API request with error handling

        Args:
            endpoint: API endpoint path
            params: Query parameters
            method: HTTP method (GET, POST, etc.)

        Returns:
            API response as dict or list

        Raises:
            requests.RequestException: On API errors
        """
        url = self._build_url(endpoint)
        params = self._add_api_token(params or {})

        try:
            if method == "GET":
                response = self.session.get(url, params=params, timeout=30)
            elif method == "POST":
                response = self.session.post(url, json=params, timeout=30)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            response.raise_for_status()

            # Handle different content types
            content_type = response.headers.get("Content-Type", "")
            if "application/json" in content_type:
                return response.json()
            else:
                return response.text

        except requests.HTTPError as e:
            logger.error(f"HTTP error for {endpoint}: {e.response.status_code} - {e.response.text}")
            raise
        except requests.RequestException as e:
            logger.error(f"Request error for {endpoint}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error for {endpoint}: {str(e)}")
            raise

    @staticmethod
    def _format_date(d: Optional[date | str]) -> Optional[str]:
        """Format date to YYYY-MM-DD string"""
        if d is None:
            return None
        if isinstance(d, str):
            return d
        if isinstance(d, (date, datetime)):
            return d.strftime("%Y-%m-%d")
        return str(d)

    @staticmethod
    def _validate_symbol(symbol: str, exchange: str = "US") -> str:
        """Validate and format symbol with exchange"""
        if not symbol:
            raise ValueError("Symbol cannot be empty")

        # If already has exchange suffix, return as is
        if "." in symbol:
            return symbol.upper()

        # Add exchange suffix
        return f"{symbol.upper()}.{exchange.upper()}"
