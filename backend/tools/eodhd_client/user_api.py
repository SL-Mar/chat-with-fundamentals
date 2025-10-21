"""
User & Account API Client
Covers: API Usage, Limits, Account Info
"""

from typing import Dict, Any
from .base_client import EODHDBaseClient


class UserAPIClient(EODHDBaseClient):
    """Client for user account and API usage endpoints"""

    def get_user_info(self) -> Dict[str, Any]:
        """
        Get user account information and API usage

        Returns:
            Dict with:
            - apiRequests: Number of API requests made today
            - apiRequestsLimit: Daily API request limit
            - dailyRateLimit: Rate limit per day
            - subscriptionType: Plan type (e.g., "All-World", "Crypto", etc.)
            - endDate: Subscription end date

        Example:
            >>> info = client.user.get_user_info()
            >>> print(f"Used: {info['apiRequests']} / {info['apiRequestsLimit']}")
            >>> print(f"Plan: {info['subscriptionType']}")
        """
        return self._make_request("user", {})

    def check_api_limit(self) -> Dict[str, Any]:
        """
        Check current API usage against limits

        Returns:
            Dict with usage statistics

        Example:
            >>> usage = client.user.check_api_limit()
            >>> remaining = usage['apiRequestsLimit'] - usage['apiRequests']
            >>> print(f"Remaining requests today: {remaining}")
        """
        return self.get_user_info()

    def get_subscription_details(self) -> Dict[str, Any]:
        """
        Get detailed subscription information

        Returns:
            Dict with subscription details

        Example:
            >>> sub = client.user.get_subscription_details()
        """
        return self.get_user_info()
