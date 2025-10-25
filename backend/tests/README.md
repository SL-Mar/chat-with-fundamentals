# Testing Guide

Comprehensive pytest test suite for the Chat with Fundamentals API.

## Quick Start

### Install Test Dependencies
```bash
pip install -r requirements-test.txt
```

### Run All Tests
```bash
cd backend
pytest tests/ -v
```

### Run with Coverage
```bash
pytest tests/ --cov=routers --cov-report=html
```

### Run Specific Test File
```bash
pytest tests/test_equity_endpoints.py -v
```

### Run Security Scans
```bash
# Check for security vulnerabilities in code
bandit -r ../

# Check for vulnerable dependencies
safety check

# Run all security tests
pytest tests/test_ingestion/test_ohlcv_ingestion.py::TestSecurityFeatures -v
```

## Test Structure

```
tests/
├── test_equity_endpoints.py         # Equity analysis (Monte Carlo, returns, performance)
├── test_technical_endpoints.py      # Technical indicators and screener
├── test_historical_endpoints.py     # EOD, intraday, live prices
├── test_news_endpoints.py           # News and sentiment analysis
├── test_corporate_endpoints.py      # Dividends, splits, insider transactions
├── test_calendar_endpoints.py       # Earnings, IPOs, economic events
├── test_chat_panels.py              # AI-generated panel suggestions
├── conftest.py                      # Shared fixtures and configuration
├── test_ingestion/
│   ├── test_ohlcv_ingestion.py      # OHLCV ingestion tests
│   ├── test_fundamental_ingestion.py # Fundamental ingestion tests (TODO)
│   └── test_news_ingestion.py        # News ingestion tests (TODO)
├── test_cache/
│   └── test_redis_cache.py           # Redis caching tests (TODO)
└── test_database/
    └── test_queries.py                # Database query tests (TODO)
```

**Total:** 100+ test cases covering all major API endpoints

## Test Categories

### 1. API Endpoint Tests
Comprehensive tests for all API endpoints:

**Equity Analysis** (`test_equity_endpoints.py`)
- Monte Carlo simulation (1000 paths, percentiles)
- Returns calculation (daily, cumulative)
- Volatility forecast (EWMA)
- Performance ratios (Sharpe, Sortino, Calmar, Max DD)

**Technical Analysis** (`test_technical_endpoints.py`)
- Technical indicators (RSI, MACD, SMA, EMA, Bollinger Bands)
- Stock screener with signals and filters
- Date range filtering

**Historical Data** (`test_historical_endpoints.py`)
- EOD (End-of-Day) historical data
- EOD Extended (30+ years from database)
- Intraday minute-level data (1m, 5m, 15m)
- Live prices with extended hours

**News & Sentiment** (`test_news_endpoints.py`)
- Latest news articles with pagination
- Sentiment analysis with score ranges
- Date range filtering

**Corporate Actions** (`test_corporate_endpoints.py`)
- Dividend payment history
- Stock split events
- Insider transactions (buy/sell)

**Calendar** (`test_calendar_endpoints.py`)
- Earnings calendar (upcoming reports)
- IPO calendar (upcoming offerings)
- Economic calendar (macro events)

**Chat Panels** (`test_chat_panels.py`)
- AI-generated panel suggestions
- Multi-panel responses
- Conversation context handling

### 2. Integration Tests
Test complete workflows:
- Database operations (with test DB)
- Multi-endpoint workflows
- Data consistency checks

### 3. Security Tests
Test security features:
- SQL injection prevention
- Input validation
- Rate limiting
- API key handling

### 4. Performance Tests
Test performance requirements:
- Bulk insert speed
- Query response times
- Cache hit rates

## Writing New Tests

### Example Test Structure
```python
import pytest
from unittest.mock import Mock, patch

class TestYourFeature:
    @pytest.fixture
    def setup(self):
        # Setup code
        return instance

    def test_valid_input(self, setup):
        # Test with valid input
        result = setup.method(valid_input)
        assert result == expected

    def test_invalid_input(self, setup):
        # Test with invalid input
        with pytest.raises(ValueError):
            setup.method(invalid_input)

    @patch('module.external_dependency')
    def test_with_mock(self, mock_dep, setup):
        # Test with mocked dependency
        mock_dep.return_value = mocked_value
        result = setup.method()
        assert result == expected
```

## Continuous Integration

Add to `.github/workflows/test.yml`:
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-test.txt
      - name: Run tests
        run: pytest --cov=.
      - name: Security scan
        run: bandit -r .
```

## Test Markers

Use pytest markers to run specific test categories:

```bash
# Run integration tests only
pytest -m integration

# Run slow tests (disabled by default)
pytest --runslow

# Run database tests
pytest -m database

# Run API tests (requires external API access)
pytest -m api --runapi
```

## Current Test Coverage

**API Endpoints:** ✅ Complete
- ✅ Equity Analysis - Monte Carlo, returns, performance ratios
- ✅ Technical Analysis - Indicators, screener
- ✅ Historical Data - EOD, intraday, live prices
- ✅ News & Sentiment - Latest news, sentiment analysis
- ✅ Corporate Actions - Dividends, splits, insider transactions
- ✅ Calendar - Earnings, IPOs, economic events
- ✅ Chat Panels - AI-generated panels

**Data Ingestion:** ⏳ Partial
- ✅ OHLCV Ingestion - Input validation, rate limiting, security
- ⏳ Fundamental Ingestion - TODO
- ⏳ News Ingestion - TODO

**Infrastructure:** ⏳ TODO
- ⏳ Redis Cache - TODO
- ⏳ Database Queries - TODO

Target coverage: **80%+**
Current coverage: **~70%** (API endpoints fully covered)
