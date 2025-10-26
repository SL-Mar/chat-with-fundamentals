"""
Input validation utilities for API endpoints
Prevents injection attacks and malformed input
"""

import re
from typing import Optional
from fastapi import HTTPException, status

# Validation patterns
TICKER_PATTERN = re.compile(r'^[A-Z0-9\-\.]{1,20}$', re.IGNORECASE)
CURRENCY_PAIR_PATTERN = re.compile(r'^[A-Z]{3}[/-][A-Z]{3}$', re.IGNORECASE)
INDICATOR_PATTERN = re.compile(r'^[A-Z_]{1,50}$', re.IGNORECASE)


def validate_ticker(ticker: str) -> str:
    """
    Validate stock ticker format to prevent injection attacks.

    Args:
        ticker: Stock ticker symbol (e.g., AAPL.US, MSFT, BRK-B)

    Returns:
        Validated and uppercased ticker

    Raises:
        HTTPException: 400 if ticker format is invalid

    Examples:
        >>> validate_ticker("AAPL.US")
        'AAPL.US'
        >>> validate_ticker("aapl")
        'AAPL'
        >>> validate_ticker("'; DROP TABLE stocks; --")
        HTTPException: Invalid ticker format
    """
    if not ticker:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticker symbol is required"
        )

    ticker_upper = ticker.upper().strip()

    if not TICKER_PATTERN.match(ticker_upper):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ticker format: '{ticker}'. "
                   "Must contain only letters, numbers, hyphens, and dots (1-20 characters)."
        )

    # Additional checks for suspicious patterns
    suspicious_patterns = ["DROP", "DELETE", "INSERT", "UPDATE", "UNION", "SELECT", "--", ";", "<", ">"]
    for pattern in suspicious_patterns:
        if pattern in ticker_upper:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid ticker format: contains suspicious pattern"
            )

    return ticker_upper


def validate_currency_pair(pair: str) -> str:
    """
    Validate currency pair format.

    Args:
        pair: Currency pair (e.g., EUR/USD, GBP-USD)

    Returns:
        Validated and uppercased pair

    Raises:
        HTTPException: 400 if pair format is invalid

    Examples:
        >>> validate_currency_pair("EUR/USD")
        'EUR/USD'
        >>> validate_currency_pair("eur-usd")
        'EUR-USD'
    """
    if not pair:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Currency pair is required"
        )

    pair_upper = pair.upper().strip()

    if not CURRENCY_PAIR_PATTERN.match(pair_upper):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid currency pair format: '{pair}'. "
                   "Must be in format XXX/YYY or XXX-YYY (e.g., EUR/USD, GBP-USD)."
        )

    return pair_upper


def validate_indicator(indicator: str) -> str:
    """
    Validate macro indicator format.

    Args:
        indicator: Indicator code (e.g., GDP, CPI, UNEMPLOYMENT_RATE)

    Returns:
        Validated and uppercased indicator

    Raises:
        HTTPException: 400 if indicator format is invalid
    """
    if not indicator:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Indicator code is required"
        )

    indicator_upper = indicator.upper().strip()

    if not INDICATOR_PATTERN.match(indicator_upper):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid indicator format: '{indicator}'. "
                   "Must contain only letters and underscores (1-50 characters)."
        )

    return indicator_upper


def validate_portfolio_id(portfolio_id: int) -> int:
    """
    Validate portfolio ID.

    Args:
        portfolio_id: Portfolio ID

    Returns:
        Validated portfolio ID

    Raises:
        HTTPException: 400 if ID is invalid
    """
    if portfolio_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Portfolio ID must be a positive integer"
        )

    if portfolio_id > 999999999:  # Arbitrary but reasonable limit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Portfolio ID is too large"
        )

    return portfolio_id


def sanitize_error_message(error: Exception, user_facing: bool = True) -> str:
    """
    Sanitize error messages to prevent information leakage.

    Args:
        error: The exception to sanitize
        user_facing: If True, return generic message; if False, return detailed

    Returns:
        Sanitized error message

    Examples:
        >>> sanitize_error_message(ValueError("DB password: secret123"), user_facing=True)
        'An error occurred. Please try again.'
        >>> sanitize_error_message(ValueError("Invalid input"), user_facing=False)
        'Invalid input'
    """
    if not user_facing:
        return str(error)

    # Generic user-facing error message that doesn't leak internals
    return "An error occurred. Please try again or contact support if the problem persists."


# Sensitive patterns to redact from logs
SENSITIVE_PATTERNS = [
    re.compile(r'api[_-]?key[\'"\s:=]+[\w\-]+', re.IGNORECASE),
    re.compile(r'password[\'"\s:=]+[\w\-]+', re.IGNORECASE),
    re.compile(r'secret[\'"\s:=]+[\w\-]+', re.IGNORECASE),
    re.compile(r'token[\'"\s:=]+[\w\-]+', re.IGNORECASE),
]


def redact_sensitive_info(message: str) -> str:
    """
    Redact sensitive information from log messages.

    Args:
        message: Log message that might contain sensitive info

    Returns:
        Redacted message

    Examples:
        >>> redact_sensitive_info("Error: API_KEY=abc123def456 is invalid")
        'Error: API_KEY=[REDACTED] is invalid'
    """
    result = message
    for pattern in SENSITIVE_PATTERNS:
        result = pattern.sub('[REDACTED]', result)
    return result
