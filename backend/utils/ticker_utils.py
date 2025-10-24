"""
Ticker Formatting Utilities
Provides consistent ticker formatting across the application
"""

import logging
from typing import Optional
import re
from fastapi import HTTPException

logger = logging.getLogger("ticker_utils")

# Ticker validation pattern: 1-10 alphanumeric characters, optional .EXCHANGE suffix
TICKER_PATTERN = re.compile(r'^[A-Z0-9]{1,10}(\.[A-Z]{2,10})?$', re.IGNORECASE)


class TickerValidationError(ValueError):
    """Raised when ticker format is invalid"""
    pass


def format_ticker_for_eodhd(ticker: str, exchange_code: Optional[str] = None) -> str:
    """
    Format ticker with exchange suffix for EODHD API.

    EODHD API requires tickers in format: SYMBOL.EXCHANGE
    Examples: AAPL.US, BMW.XETRA, 7203.T

    Args:
        ticker: Base ticker symbol (e.g., 'AAPL' or 'AAPL.US')
        exchange_code: Exchange code (e.g., 'US', 'XETRA', 'T')
                      If None and ticker has no exchange, defaults to 'US'

    Returns:
        Formatted ticker with exchange suffix (e.g., 'AAPL.US')

    Examples:
        >>> format_ticker_for_eodhd('AAPL', 'US')
        'AAPL.US'

        >>> format_ticker_for_eodhd('AAPL.US', None)
        'AAPL.US'

        >>> format_ticker_for_eodhd('BMW', 'XETRA')
        'BMW.XETRA'

        >>> format_ticker_for_eodhd('AAPL')
        'AAPL.US'  # Default to US
    """
    # Normalize to uppercase
    ticker = ticker.upper().strip()

    # If ticker already has exchange suffix, return as-is
    if "." in ticker:
        return ticker

    # If exchange code provided, append it
    if exchange_code:
        exchange_code = exchange_code.upper().strip()
        return f"{ticker}.{exchange_code}"

    # Default to US exchange for backward compatibility
    logger.debug(f"No exchange specified for {ticker}, defaulting to .US")
    return f"{ticker}.US"


def format_ticker_for_company(company) -> str:
    """
    Format ticker with exchange suffix using Company model.

    Args:
        company: Company model instance with exchange relationship

    Returns:
        Formatted ticker (e.g., 'AAPL.US')

    Raises:
        ValueError: If company has no exchange and no default available
    """
    # Use company's exchange if available
    if company.exchange:
        return format_ticker_for_eodhd(
            ticker=company.ticker,
            exchange_code=company.exchange.code
        )

    # Fallback to just ticker (will use default .US in format_ticker_for_eodhd)
    logger.warning(
        f"Company {company.ticker} (ID: {company.id}) has no exchange assigned, "
        f"defaulting to .US suffix"
    )
    return format_ticker_for_eodhd(ticker=company.ticker)


def validate_ticker_format(ticker: str) -> bool:
    """
    Validate ticker format.

    Valid formats:
    - AAPL
    - AAPL.US
    - BMW.XETRA
    - 7203.T

    Args:
        ticker: Ticker string to validate

    Returns:
        True if valid, False otherwise

    Examples:
        >>> validate_ticker_format('AAPL')
        True

        >>> validate_ticker_format('AAPL.US')
        True

        >>> validate_ticker_format('invalid!!!')
        False
    """
    return bool(TICKER_PATTERN.match(ticker))


def parse_ticker(ticker: str) -> dict:
    """
    Parse ticker into symbol and exchange components.

    Args:
        ticker: Ticker string (e.g., 'AAPL.US' or 'AAPL')

    Returns:
        Dictionary with 'symbol' and 'exchange' keys

    Examples:
        >>> parse_ticker('AAPL.US')
        {'symbol': 'AAPL', 'exchange': 'US'}

        >>> parse_ticker('AAPL')
        {'symbol': 'AAPL', 'exchange': None}
    """
    ticker = ticker.upper().strip()

    if "." in ticker:
        symbol, exchange = ticker.split(".", 1)
        return {"symbol": symbol, "exchange": exchange}
    else:
        return {"symbol": ticker, "exchange": None}


def get_bare_ticker(ticker: str) -> str:
    """
    Extract bare ticker symbol without exchange suffix.

    Args:
        ticker: Ticker with or without exchange (e.g., 'AAPL.US' or 'AAPL')

    Returns:
        Bare ticker symbol (e.g., 'AAPL')

    Examples:
        >>> get_bare_ticker('AAPL.US')
        'AAPL'

        >>> get_bare_ticker('AAPL')
        'AAPL'
    """
    parsed = parse_ticker(ticker)
    return parsed["symbol"]


def validate_and_format_ticker(ticker: str, require_exchange: bool = False) -> str:
    """
    Validate ticker format and return formatted version.

    This function is designed for use in API endpoints to ensure
    ticker inputs are valid before processing.

    Args:
        ticker: Ticker string to validate and format
        require_exchange: If True, ticker must include exchange suffix

    Returns:
        Validated and formatted ticker (uppercase, trimmed)

    Raises:
        HTTPException: If ticker format is invalid (400 Bad Request)

    Examples:
        >>> validate_and_format_ticker('aapl')
        'AAPL'

        >>> validate_and_format_ticker('AAPL.US')
        'AAPL.US'

        >>> validate_and_format_ticker('invalid!!!')
        # Raises HTTPException(400)
    """
    if not ticker or not isinstance(ticker, str):
        raise HTTPException(
            status_code=400,
            detail="Ticker is required and must be a string"
        )

    # Normalize
    ticker = ticker.upper().strip()

    # Validate format
    if not validate_ticker_format(ticker):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid ticker format: '{ticker}'. Expected format: SYMBOL or SYMBOL.EXCHANGE (e.g., AAPL, AAPL.US, BMW.XETRA)"
        )

    # Check exchange requirement
    if require_exchange and "." not in ticker:
        raise HTTPException(
            status_code=400,
            detail=f"Ticker must include exchange suffix (e.g., {ticker}.US)"
        )

    return ticker


def sanitize_ticker(ticker: str) -> str:
    """
    Sanitize ticker input by removing dangerous characters.

    Args:
        ticker: Raw ticker input

    Returns:
        Sanitized ticker (alphanumeric + dot only)

    Examples:
        >>> sanitize_ticker('AAPL.US')
        'AAPL.US'

        >>> sanitize_ticker('AAPL; DROP TABLE--')
        'AAPPLDROPTABLE'
    """
    # Remove everything except alphanumeric and dot
    return re.sub(r'[^A-Z0-9.]', '', ticker.upper())
