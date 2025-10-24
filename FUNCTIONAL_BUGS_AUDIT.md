# Functional Bugs Audit

**Date**: 2024
**Scope**: Complete codebase review for functional bugs
**Status**: Issues identified, fixes in progress

---

## Critical Bugs (P0)

### 1. **Hardcoded `.US` Exchange Suffix**
**Severity**: P0 - CRITICAL
**Impact**: Application only works for US stocks, fails for international stocks
**Status**: IDENTIFIED

**Problem**:
Multiple files hardcode `.US` suffix when constructing tickers, assuming all companies are US-based. The database has an `Exchange` model and companies have an `exchange_id` relationship, but this is ignored in data ingestion/refresh logic.

**Affected Files**:
```
backend/services/data_refresh_pipeline.py:217
    ticker = f"{company.ticker}.US"  # ❌ HARDCODED

backend/ingestion/incremental_ohlcv_ingestion.py:185
    ticker = f"{company.ticker}.US"  # ❌ HARDCODED

backend/ingestion/incremental_fundamentals_ingestion.py:174
    ticker = f"{company.ticker}.US"  # ❌ HARDCODED

backend/services/cache_warming_service.py:84
    ticker=f"{ticker}.US"  # ❌ HARDCODED (EOD warming)

backend/services/cache_warming_service.py:114
    ticker=f"{ticker}.US"  # ❌ HARDCODED (fundamentals warming)

backend/services/cache_warming_service.py:166
    ticker=f"{ticker}.US"  # ❌ HARDCODED (dividends warming)
```

**Correct Approach**:
```python
# Instead of:
ticker = f"{company.ticker}.US"

# Should be:
if company.exchange:
    ticker = f"{company.ticker}.{company.exchange.code}"
else:
    ticker = company.ticker  # Or raise error if exchange is required
```

**Why This Matters**:
- Breaks multi-exchange support
- Prevents adding international stocks
- Silently fails for non-US tickers
- Database schema supports exchanges but code ignores it

---

## High Priority Bugs (P1)

### 2. **Inconsistent Ticker Format Handling**
**Severity**: P1 - HIGH
**Impact**: Confusing API behavior, some endpoints work with bare tickers, others require exchange suffix
**Status**: IDENTIFIED

**Problem**:
Different endpoints and services handle ticker formatting inconsistently:

```python
# Some add .US conditionally:
backend/routers/technical.py:44
    ticker_with_exchange = ticker if "." in ticker else f"{ticker}.US"

backend/workflows/analyze.py:152
    ticker_with_exchange = ticker if "." in ticker else f"{ticker}.US"

# Some always add .US:
backend/services/cache_warming_service.py:84,114,166
    ticker=f"{ticker}.US"

# Some never add suffix:
backend/ingestion/incremental_news_ingestion.py:281
    ticker=company.ticker  # No .US suffix for news

# Some use it as-is:
backend/routers/historical.py (multiple endpoints)
```

**Recommended Fix**:
Create a utility function:
```python
def format_ticker_for_eodhd(ticker: str, company: Optional[Company] = None) -> str:
    """
    Format ticker with exchange suffix for EODHD API.

    Args:
        ticker: Base ticker symbol (e.g., 'AAPL')
        company: Optional Company model with exchange relationship

    Returns:
        Formatted ticker (e.g., 'AAPL.US')
    """
    # If ticker already has exchange suffix
    if "." in ticker:
        return ticker

    # If company object provided, use its exchange
    if company and company.exchange:
        return f"{ticker}.{company.exchange.code}"

    # Default to US for backward compatibility (temporary)
    # TODO: Remove default after migration
    return f"{ticker}.US"
```

---

### 3. **get_popular_tickers() Returns Bare Tickers**
**Severity**: P1 - HIGH
**Impact**: Cache warming and refresh services receive inconsistent ticker formats
**Status**: IDENTIFIED

**Problem**:
```python
# backend/services/cache_warming_service.py:59
def get_popular_tickers(self, limit: int = 50) -> List[str]:
    """Get list of popular tickers from database"""
    companies = self.db_queries.get_top_companies_by_market_cap(limit=limit)
    return [company.ticker for company in companies]  # Returns ['AAPL', 'MSFT', ...]
```

Then later:
```python
# Line 84
self.data_service.get_eod_data(ticker=f"{ticker}.US", ...)
```

**Issue**: The method returns bare tickers like `'AAPL'`, but callers then add `.US`, which breaks for non-US stocks.

**Fix**: Either:
1. Return formatted tickers: `f"{company.ticker}.{company.exchange.code}"`
2. Return company objects instead of strings
3. Accept ticker format parameter

---

## Medium Priority Bugs (P2)

### 4. **Inconsistent Status Field Naming**
**Severity**: P2 - MEDIUM
**Impact**: Confusion between `status` string and `is_running` boolean
**Status**: IDENTIFIED

**Problem**:
```python
# backend/services/data_refresh_pipeline.py
class DataRefreshPipeline:
    def __init__(self):
        self.is_running = False  # Boolean field

    def get_status(self) -> Dict[str, Any]:
        if not self.is_running:
            return {
                'status': 'stopped',  # String field with same semantic meaning
                'jobs': [],
                'last_refresh': self.last_refresh
            }

        return {
            'status': 'running',  # String overlaps with is_running boolean
            'jobs': [...],
            'last_refresh': {...}
        }
```

**Issue**:
- `self.is_running` is a boolean
- `return['status']` is a string with values 'running'/'stopped'
- Semantic overlap creates confusion
- Frontend checks `status.is_running` but API returns `status.status`

**Fix**:
Rename internal field to `self._running` or use consistent naming:
```python
def get_status(self) -> Dict[str, Any]:
    return {
        'is_running': self.is_running,  # Keep as boolean
        'jobs': [...],
        'last_refresh': {...}
    }
```

---

### 5. **Missing Exchange Validation in get_status()**
**Severity**: P2 - MEDIUM
**Impact**: Possible AttributeError if company.exchange is None
**Status**: IDENTIFIED

**Problem**:
```python
# When we fix bug #1, we'll do:
ticker = f"{company.ticker}.{company.exchange.code}"

# But if company.exchange is None, this crashes:
# AttributeError: 'NoneType' object has no attribute 'code'
```

**Current State**:
```python
# backend/database/models/company.py:72
exchange_id = Column(Integer, ForeignKey('exchanges.id', ondelete='SET NULL'), index=True)
```

The `ondelete='SET NULL'` means `exchange_id` can be NULL, so `company.exchange` can be None.

**Fix**:
```python
if company.exchange:
    ticker = f"{company.ticker}.{company.exchange.code}"
else:
    logger.warning(f"Company {company.ticker} has no exchange assigned")
    # Either skip, use default, or raise error depending on context
```

---

### 6. **News Ingestion Uses Bare Ticker**
**Severity**: P2 - MEDIUM
**Impact**: Inconsistent with other data sources
**Status**: IDENTIFIED

**Problem**:
```python
# backend/ingestion/incremental_news_ingestion.py:281
ticker=company.ticker,  # No .US suffix
```

**Comment in file**:
```python
# Line 366
ticker='AAPL',  # No .US suffix for news
```

**Question**: Does the EODHD news API require exchange suffix or not?

**Investigation Needed**:
- Check EODHD API documentation for news endpoint
- Verify if bare ticker works for all exchanges
- Ensure consistency with other endpoints

---

## Low Priority Issues (P3)

### 7. **Type Hints Missing on get_popular_tickers()**
**Severity**: P3 - LOW
**Impact**: Type safety, IDE autocomplete
**Status**: IDENTIFIED

**Current**:
```python
def get_popular_tickers(self, limit: int = 50) -> List[str]:
```

**If Fixed**:
```python
def get_popular_tickers(self, limit: int = 50) -> List[Company]:
    """Return Company objects instead of ticker strings"""
```

This would allow callers to access `company.exchange.code` directly.

---

### 8. **No Validation of Ticker Format in API Endpoints**
**Severity**: P3 - LOW
**Impact**: Poor error messages for invalid tickers
**Status**: IDENTIFIED

**Problem**:
Endpoints accept any ticker string without validation:
```python
@router.get("/live-price")
async def get_live_price(
    ticker: str = Query(..., description="Stock symbol (e.g., AAPL.US)")
):
```

**Issue**: No validation that ticker matches expected format.

**Suggested Fix**:
```python
import re

TICKER_PATTERN = re.compile(r'^[A-Z0-9]{1,10}(\.[A-Z]{2,4})?$')

def validate_ticker(ticker: str) -> str:
    """Validate ticker format"""
    if not TICKER_PATTERN.match(ticker.upper()):
        raise ValueError(f"Invalid ticker format: {ticker}")
    return ticker.upper()
```

---

## Summary

| Priority | Count | Status |
|----------|-------|--------|
| P0 (Critical) | 1 | Identified |
| P1 (High) | 3 | Identified |
| P2 (Medium) | 4 | Identified |
| P3 (Low) | 2 | Identified |
| **TOTAL** | **10** | **Pending Fixes** |

---

## Recommended Fix Order

1. **Fix P0**: Create `format_ticker_for_eodhd()` utility function
2. **Fix P0**: Update all hardcoded `.US` references to use utility function
3. **Fix P1**: Standardize ticker formatting across all endpoints
4. **Fix P2**: Add exchange validation/null checks
5. **Fix P2**: Rename status fields for clarity
6. **Test**: Verify all endpoints work with non-US tickers
7. **Commit**: Push functional bug fixes

---

## Testing Plan

After fixes, test with:
- US stock: `AAPL.US`
- European stock: `BMW.XETRA`
- Asian stock: `7203.T` (Toyota)
- Bare ticker: `AAPL` (should auto-add exchange)
- Invalid ticker: `INVALID!!!` (should error gracefully)

---
