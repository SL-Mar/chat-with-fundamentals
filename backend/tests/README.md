# Testing Guide

## Running Tests

### Install Test Dependencies
```bash
pip install -r requirements-test.txt
```

### Run All Tests
```bash
pytest
```

### Run with Coverage
```bash
pytest --cov=. --cov-report=html
```

### Run Specific Test File
```bash
pytest tests/test_ingestion/test_ohlcv_ingestion.py -v
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
├── test_ingestion/
│   ├── test_ohlcv_ingestion.py      # OHLCV ingestion tests
│   ├── test_fundamental_ingestion.py # Fundamental ingestion tests (TODO)
│   └── test_news_ingestion.py        # News ingestion tests (TODO)
├── test_cache/
│   └── test_redis_cache.py           # Redis caching tests (TODO)
└── test_database/
    └── test_queries.py                # Database query tests (TODO)
```

## Test Categories

### 1. Unit Tests
Test individual functions with mocks:
- Input validation
- Data transformation
- Error handling

### 2. Integration Tests
Test components working together:
- Database operations (with test DB)
- API calls (with mocked responses)
- Caching layer

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

## Current Test Coverage

- ✅ OHLCVIngestion - Input validation, rate limiting, security
- ⏳ FundamentalIngestion - TODO
- ⏳ NewsIngestion - TODO
- ⏳ RedisCache - TODO
- ⏳ DatabaseQueries - TODO

Target coverage: **80%+**
