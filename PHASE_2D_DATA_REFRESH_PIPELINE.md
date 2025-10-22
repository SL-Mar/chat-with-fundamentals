# Phase 2D: Incremental Data Refresh Pipeline

## Overview

The Data Refresh Pipeline is an automated background service that keeps the database fresh with minimal API calls through **incremental updates**. Instead of re-fetching entire historical datasets daily (wasteful), it only fetches NEW data since the last update.

## Problem Statement

### Before Data Refresh Pipeline
- **Cache warming** only keeps top 50 stocks fresh
- Remaining 50 stocks only update when users request them
- No systematic refresh for ALL companies
- Database can become stale over time

### Full Refresh Approach (Wasteful)
```
100 companies × 365 days of history = 36,500 API calls/day
Cost: $1,095/month (assuming $0.03 per call)
Time: ~6 hours to complete
```

### Incremental Refresh Approach (Efficient) ✅
```
100 companies × 1 new day = 100 API calls/day
Cost: $3/month
Time: ~10 minutes to complete
Savings: 99.7% reduction in API calls
```

## Architecture

### Components

#### 1. Incremental Ingestion Modules

**IncrementalOHLCVIngestion** (`backend/ingestion/incremental_ohlcv_ingestion.py`)
- Queries database for latest OHLCV date per company
- Only fetches from `(latest_date + 1 day)` to `today`
- Saves 99.7% of API calls vs full history refresh

**IncrementalFundamentalsIngestion** (`backend/ingestion/incremental_fundamentals_ingestion.py`)
- Checks if fundamentals data is stale (> 1 day old)
- Only refreshes stale companies
- Skips companies with fresh data
- Saves ~80-90% of API calls

**IncrementalNewsIngestion** (`backend/ingestion/incremental_news_ingestion.py`)
- Fetches news from last 7 days
- Uses UPSERT to deduplicate articles
- Only stores new articles
- Saves bandwidth and database space

#### 2. Data Refresh Pipeline Service

**DataRefreshPipeline** (`backend/services/data_refresh_pipeline.py`)
- Orchestrates all incremental ingestion modules
- Runs scheduled jobs via APScheduler
- Provides manual trigger endpoints
- Tracks last refresh times

### Scheduled Jobs

| Job | Schedule | Data Types | Frequency |
|-----|----------|-----------|-----------|
| **Daily Refresh** | 6:30 PM EST | OHLCV, Fundamentals, News | Daily |
| **Weekly Refresh** | Monday 9 PM EST | Dividends | Weekly |

### Daily Refresh Pipeline

Runs at 6:30 PM EST (after market close + cache warming)

```python
def run_daily_refresh():
    # 1. OHLCV incremental refresh (~100 API calls)
    refresh_ohlcv()  # Only fetch new days

    # 2. Fundamentals smart refresh (~10-20 API calls)
    refresh_fundamentals()  # Only refresh stale companies

    # 3. News incremental refresh (~100 API calls)
    refresh_news()  # Fetch last 7 days, deduplicate
```

**Total API Calls**: ~210-220 per day
**Total Cost**: ~$6/month
**Duration**: ~10-15 minutes

### Weekly Refresh Pipeline

Runs on Monday at 9 PM EST

```python
def run_weekly_refresh():
    # Dividends refresh (~100 API calls)
    refresh_dividends()
```

**Total API Calls**: ~100 per week (~14 per day)
**Total Cost**: ~$0.50/month
**Duration**: ~5 minutes

## How Incremental Refresh Works

### Example: OHLCV Incremental Refresh

#### First Run (No Data)
```python
# Database: No OHLCV data for AAPL
latest_date = None

# Fetch full year
from_date = (today - 365 days)
to_date = today

# API call: Fetch 365 days of history
api_data = client.get_eod('AAPL.US', from_date, to_date)

# Store in database
bulk_insert(api_data)  # 365 records inserted
```

#### Subsequent Runs (Incremental)
```python
# Database: Latest OHLCV date for AAPL = 2025-10-21
latest_date = 2025-10-21

# Fetch only NEW days
from_date = 2025-10-22  # latest_date + 1 day
to_date = 2025-10-22    # today

# API call: Fetch only 1 new day
api_data = client.get_eod('AAPL.US', from_date, to_date)

# Store in database
bulk_insert(api_data)  # 1 record inserted
```

**Result**:
- First run: 365 API calls worth of data
- Daily runs: 1 API call per company
- 99.7% reduction after initial load

## API Endpoints

### Status & Control

**GET /monitoring/refresh-pipeline/status**
```json
{
  "status": "running",
  "jobs": [
    {
      "id": "refresh_daily",
      "name": "Daily Data Refresh Pipeline",
      "next_run": "2025-10-22T18:30:00"
    }
  ],
  "last_refresh": {
    "ohlcv": "2025-10-22T18:45:00",
    "fundamentals": "2025-10-22T18:50:00",
    "news": "2025-10-22T18:55:00",
    "dividends": "2025-10-21T21:00:00"
  }
}
```

**POST /monitoring/refresh-pipeline/start**
- Starts the scheduled pipeline service
- Response: `{"status": "success", "message": "Data refresh pipeline started"}`

**POST /monitoring/refresh-pipeline/stop**
- Stops the scheduled pipeline service
- Response: `{"status": "success", "message": "Data refresh pipeline stopped"}`

### Manual Triggers

**POST /monitoring/refresh-pipeline/trigger-daily**
- Manually run daily refresh (OHLCV, fundamentals, news)
- Runs in background (doesn't block)
- Response: `{"status": "success", "message": "Daily data refresh triggered in background"}`

**POST /monitoring/refresh-pipeline/trigger-weekly**
- Manually run weekly refresh (dividends)
- Runs in background
- Response: `{"status": "success", "message": "Weekly data refresh triggered in background"}`

### Individual Data Type Triggers

**POST /monitoring/refresh-pipeline/trigger-ohlcv**
- Refresh OHLCV only (~100 API calls)

**POST /monitoring/refresh-pipeline/trigger-fundamentals**
- Refresh fundamentals only (~10-20 API calls)

**POST /monitoring/refresh-pipeline/trigger-news**
- Refresh news only (~100 API calls)

**POST /monitoring/refresh-pipeline/trigger-dividends**
- Refresh dividends only (~100 API calls)

## Performance Benefits

### API Call Reduction

| Approach | OHLCV | Fundamentals | News | Total/Day | Cost/Month |
|----------|-------|--------------|------|-----------|------------|
| **Full Refresh** | 36,500 | 3,000 | 10,000 | 49,500 | $1,485 |
| **Incremental Refresh** | 100 | 10-20 | 100 | 210-220 | $6.50 |
| **Savings** | 99.7% | 99.3% | 99.0% | 99.6% | 99.6% |

### Time Savings

| Approach | Duration | Frequency |
|----------|----------|-----------|
| **Full Refresh** | 6 hours | Daily |
| **Incremental Refresh** | 10-15 minutes | Daily |
| **Savings** | 96% faster | - |

### Database Benefits

- **Lower storage growth**: Only new data added daily
- **Faster queries**: Smaller database size over time
- **Better cache utilization**: Fresh data = cache hits
- **Reduced load**: Fewer concurrent API calls

## Usage Examples

### Start Pipeline (Automatic on App Startup)

The pipeline starts automatically when the FastAPI app starts:

```python
# backend/main.py
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    from services.data_refresh_pipeline import start_data_refresh_pipeline

    logging.info("🚀 Starting data refresh pipeline...")
    start_data_refresh_pipeline()

    yield

    # Shutdown
    from services.data_refresh_pipeline import stop_data_refresh_pipeline
    stop_data_refresh_pipeline()
```

### Manual Trigger via API

```bash
# Trigger daily refresh (OHLCV, fundamentals, news)
curl -X POST http://localhost:8000/monitoring/refresh-pipeline/trigger-daily

# Trigger specific data type
curl -X POST http://localhost:8000/monitoring/refresh-pipeline/trigger-ohlcv

# Check status
curl http://localhost:8000/monitoring/refresh-pipeline/status
```

### Manual Trigger via Python

```python
from services.data_refresh_pipeline import get_data_refresh_pipeline

pipeline = get_data_refresh_pipeline()

# Option 1: Run daily refresh once
summary = pipeline.run_daily_refresh()
print(f"Added {summary['ohlcv']['total_records_added']} OHLCV records")

# Option 2: Start scheduled service
pipeline.start()  # Runs at 6:30 PM daily automatically
```

### Test Individual Ingestion Module

```python
from ingestion.incremental_ohlcv_ingestion import IncrementalOHLCVIngestion
from database.models.base import SessionLocal

api_key = os.getenv('EODHD_API_KEY')
ingestion = IncrementalOHLCVIngestion(api_key)
db = SessionLocal()

# Refresh single company
records_added = ingestion.refresh_company_incremental(
    db=db,
    company_id=1,
    ticker='AAPL.US',
    max_lookback_days=365
)

print(f"Added {records_added} new records for AAPL")
db.commit()
db.close()
```

## Monitoring & Logging

### Log Output

```
======================================================================
🔄 STARTING DAILY DATA REFRESH PIPELINE
======================================================================

[1/3] OHLCV Refresh
======================================================================
[INCREMENTAL] Starting incremental OHLCV refresh for all companies
======================================================================
[INCREMENTAL] (1/100) AAPL - Latest date: 2025-10-21, fetching 1 new days
[INCREMENTAL] ✅ Added 1 new records for AAPL
...
======================================================================
[INCREMENTAL] ✅ Incremental OHLCV refresh complete!
📊 Statistics:
   - Total companies: 100
   - Successful: 100
   - Skipped (up to date): 0
   - Failed: 0
   - Total records added: 100
   - Duration: 2.5 minutes
======================================================================

[2/3] Fundamentals Refresh
...

[3/3] News Refresh
...

======================================================================
✅ DAILY DATA REFRESH PIPELINE COMPLETE!
⏱️  Total time: 12.3 minutes
======================================================================
📊 Summary:
   - OHLCV: 100 records added
   - Fundamentals: 15 companies updated
   - News: 347 articles added
======================================================================
```

### Error Handling

The pipeline is resilient:
- **Per-company errors**: Logged but don't stop pipeline
- **Full pipeline errors**: Logged and retried next scheduled run
- **Database rollback**: On critical errors
- **Graceful degradation**: Continues even if some data types fail

## Integration with Cache Warming

The two services work together:

| Service | Purpose | Timing | Coverage |
|---------|---------|--------|----------|
| **Cache Warming** | Pre-fetch popular stocks | Before user requests | Top 50 stocks |
| **Data Refresh Pipeline** | Keep ALL stocks fresh | Daily at 6:30 PM | ALL 100 stocks |

**Timing Coordination**:
```
6:00 PM - Market closes
6:00 PM - Cache warming: EOD data (top 50)
6:30 PM - Data refresh: OHLCV (all 100) ← Runs after cache warming
7:00 PM - Cache warming: Fundamentals (top 30)
7:05 PM - Data refresh: Fundamentals (stale companies)
```

**Result**:
- Top 50 stocks are warmed AND refreshed
- Remaining 50 stocks are refreshed
- No conflicts or duplicate API calls

## Cost Analysis

### Monthly API Call Breakdown

| Data Type | Daily Calls | Monthly Calls | Cost/Month |
|-----------|-------------|---------------|------------|
| OHLCV | 100 | 3,000 | $90 |
| Fundamentals | 15 | 450 | $13.50 |
| News | 100 | 3,000 | $90 |
| Dividends | 14 | 400 | $12 |
| **Total** | **229** | **6,850** | **$205.50** |

*Assuming $0.03 per API call*

### Comparison to Alternatives

| Approach | Monthly Cost | Savings |
|----------|--------------|---------|
| **No caching** (every request hits API) | $3,000+ | - |
| **Cache warming only** (top 50 stocks) | $300 | 90% |
| **Full refresh daily** (all stocks) | $1,485 | 50% |
| **Incremental refresh** (Phase 2D) | $205.50 | 93% ✅ |

## Deployment

### Requirements

Add to `requirements-database.txt`:
```txt
APScheduler==3.10.4  # Background task scheduling
```

### Environment Variables

```bash
# Required
EODHD_API_KEY=your_api_key_here

# Optional
DATABASE_URL=postgresql://user:pass@localhost/dbname
```

### Docker Configuration

If using Docker, ensure scheduler persists:
```yaml
services:
  backend:
    restart: unless-stopped  # Important: restart to resume scheduled jobs
    environment:
      - EODHD_API_KEY=${EODHD_API_KEY}
```

## Troubleshooting

### Pipeline Not Running

**Check status**:
```bash
curl http://localhost:8000/monitoring/refresh-pipeline/status
```

**Expected response**:
```json
{"status": "running", "jobs": [...]}
```

**If stopped**:
```bash
curl -X POST http://localhost:8000/monitoring/refresh-pipeline/start
```

### No New Data Added

**Check logs** for:
```
[INCREMENTAL] AAPL is up to date (latest: 2025-10-22)
```

This is normal! If database is already current, no new data is fetched.

**Force refresh** (for testing):
```python
# In incremental_ohlcv_ingestion.py
from_date = (today - timedelta(days=7))  # Force fetch last 7 days
```

### High API Call Count

**Check which data type**:
```bash
curl http://localhost:8000/monitoring/metrics/api-usage
```

**Expected**:
- OHLCV: ~100 calls/day
- Fundamentals: ~10-20 calls/day
- News: ~100 calls/day

**If higher**: Database might be missing data (initial load)

## Future Enhancements

### Potential Improvements

1. **Smart scheduling**: Adjust frequency based on market hours
2. **Priority companies**: Refresh most-queried stocks more frequently
3. **Partial updates**: Update only changed fields in fundamentals
4. **Compression**: Store older data in compressed format
5. **Async ingestion**: Use asyncio for parallel API calls

### Monitoring Enhancements

1. **Refresh metrics dashboard**: Show API call trends over time
2. **Email alerts**: Notify on refresh failures
3. **Performance tracking**: Monitor refresh duration trends
4. **Cost tracking**: Real-time API cost dashboard

## Summary

The Data Refresh Pipeline (Phase 2D) completes the database-first architecture by ensuring ALL companies stay fresh automatically with minimal API calls.

**Key Benefits**:
- ✅ 99.6% reduction in API calls
- ✅ $1,279/month cost savings vs full refresh
- ✅ 96% faster refresh times (10 min vs 6 hours)
- ✅ All 100 companies stay fresh daily
- ✅ Fully automated with manual override
- ✅ Comprehensive monitoring and logging

**Architecture Progression**:
- **Phase 2A**: Database layer (structure)
- **Phase 2B**: Cache-aside pattern (database-first API)
- **Phase 2C**: Cache warming (pre-fetch popular stocks)
- **Phase 2D**: Data refresh pipeline (keep ALL stocks fresh) ✅

**Result**: Production-ready, cost-efficient, high-performance financial data platform.
