"""
Pytest Configuration and Fixtures

Shared fixtures and configuration for all test modules.
"""

import pytest
import os
from typing import Generator
from fastapi.testclient import TestClient


# Configure pytest markers
def pytest_configure(config):
    """Configure custom pytest markers"""
    config.addinivalue_line(
        "markers", "integration: mark test as integration test (slow)"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "database: mark test as requiring database connection"
    )
    config.addinivalue_line(
        "markers", "api: mark test as requiring external API access"
    )


@pytest.fixture(scope="session")
def test_config():
    """Test configuration settings"""
    return {
        "test_ticker": "AAPL",
        "test_tickers": ["AAPL", "MSFT", "GOOGL", "TSLA"],
        "test_date_from": "2024-01-01",
        "test_date_to": "2024-12-31",
        "default_timeout": 30,
    }


@pytest.fixture(scope="session")
def api_client() -> Generator[TestClient, None, None]:
    """
    FastAPI test client fixture.

    Reuses the same client for all tests in the session for better performance.
    """
    from main import app

    with TestClient(app) as client:
        yield client


@pytest.fixture
def sample_ohlcv_data():
    """Sample OHLCV data for testing"""
    return [
        {
            "date": "2024-01-02",
            "open": 185.64,
            "high": 186.95,
            "low": 184.35,
            "close": 185.58,
            "volume": 82488900,
        },
        {
            "date": "2024-01-03",
            "open": 184.22,
            "high": 185.88,
            "low": 183.43,
            "close": 184.25,
            "volume": 58414460,
        },
        {
            "date": "2024-01-04",
            "open": 182.15,
            "high": 183.08,
            "low": 180.88,
            "close": 181.91,
            "volume": 77663400,
        },
    ]


@pytest.fixture
def sample_news_article():
    """Sample news article for testing"""
    return {
        "title": "Apple Announces Record Quarterly Earnings",
        "date": "2024-01-30",
        "url": "https://example.com/article",
        "source": "Financial Times",
        "sentiment": 0.75,
    }


@pytest.fixture
def sample_dividend_event():
    """Sample dividend event for testing"""
    return {
        "date": "2024-02-15",
        "dividend": 0.24,
        "payment_date": "2024-02-15",
        "record_date": "2024-02-12",
        "ex_dividend_date": "2024-02-09",
    }


@pytest.fixture
def sample_earnings_event():
    """Sample earnings event for testing"""
    return {
        "symbol": "AAPL",
        "date": "2024-02-01",
        "time": "AMC",  # After Market Close
        "eps_estimate": 2.10,
        "revenue_estimate": 121.5e9,
    }


# Database fixtures (for future database testing)


@pytest.fixture(scope="session")
def database_url():
    """Database URL for testing"""
    # Use test database or mock
    return os.getenv(
        "TEST_DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/test_fundamentals"
    )


@pytest.fixture
def mock_api_response():
    """Mock API response factory"""
    def _create_response(data, status_code=200):
        """Create a mock API response"""
        class MockResponse:
            def __init__(self, data, status_code):
                self.data = data
                self.status_code = status_code
                self.headers = {"Content-Type": "application/json"}

            def json(self):
                return self.data

            def raise_for_status(self):
                if self.status_code >= 400:
                    raise Exception(f"HTTP {self.status_code}")

        return MockResponse(data, status_code)

    return _create_response


# Helper functions for tests


def assert_ohlc_valid(data: dict):
    """Assert that OHLC data is valid"""
    assert "open" in data
    assert "high" in data
    assert "low" in data
    assert "close" in data

    # High should be >= low
    assert data["high"] >= data["low"]

    # High should be >= open and close
    assert data["high"] >= data["open"]
    assert data["high"] >= data["close"]

    # Low should be <= open and close
    assert data["low"] <= data["open"]
    assert data["low"] <= data["close"]

    # Prices should be positive
    assert data["open"] > 0
    assert data["high"] > 0
    assert data["low"] > 0
    assert data["close"] > 0


def assert_date_in_range(date_str: str, from_date: str, to_date: str):
    """Assert that date is within range"""
    from datetime import datetime

    date = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    from_dt = datetime.fromisoformat(from_date)
    to_dt = datetime.fromisoformat(to_date)

    assert from_dt <= date <= to_dt


# Pytest hooks


def pytest_collection_modifyitems(config, items):
    """
    Modify test collection to add markers and handle slow tests.
    """
    # Skip slow tests by default unless --runslow is passed
    if not config.getoption("--runslow", default=False):
        skip_slow = pytest.mark.skip(reason="need --runslow option to run")
        for item in items:
            if "slow" in item.keywords:
                item.add_marker(skip_slow)


def pytest_addoption(parser):
    """Add custom command line options"""
    parser.addoption(
        "--runslow",
        action="store_true",
        default=False,
        help="run slow tests"
    )
    parser.addoption(
        "--runapi",
        action="store_true",
        default=False,
        help="run tests that require external API access"
    )


# Parametrize common test cases


COMMON_TICKERS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"]

COMMON_PERIODS = ["1M", "3M", "6M", "1Y", "3Y", "5Y", "MAX"]

COMMON_INTERVALS = ["1m", "5m", "15m", "30m", "1h", "1d"]


# Export commonly used fixtures and helpers
__all__ = [
    "test_config",
    "api_client",
    "sample_ohlcv_data",
    "sample_news_article",
    "sample_dividend_event",
    "sample_earnings_event",
    "database_url",
    "mock_api_response",
    "assert_ohlc_valid",
    "assert_date_in_range",
    "COMMON_TICKERS",
    "COMMON_PERIODS",
    "COMMON_INTERVALS",
]
