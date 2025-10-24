"""
Ticker Formatting Utilities
Provides consistent ticker formatting across the application
"""

import logging
from typing import Optional
import re

logger = logging.getLogger("ticker_utils")

# Ticker validation pattern: 1-10 alphanumeric characters, optional .EXCHANGE suffix
TICKER_PATTERN = re.compile(r'^[A-Z0-9]{1,10}(\.[A-Z]{2,10})?$', re.IGNORECASE)


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
