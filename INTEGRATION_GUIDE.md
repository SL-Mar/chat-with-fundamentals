# Full Stack Integration Guide

**Date**: 2025-10-22
**Status**: Ready for Testing
**Stack**: Next.js Frontend + FastAPI Backend + PostgreSQL + Redis

---

## Overview

This guide walks you through setting up and testing the complete full-stack application with the database-first architecture implemented in Phase 2 (A, B, C).

### Architecture

```
Frontend (Next.js 15.5.4)
    ↓ HTTP/WebSocket
Backend (FastAPI)
    ↓ SQLAlchemy
Database (PostgreSQL 15 + TimescaleDB + Redis 7)
    ↓ EODHD API (fallback)
External API (EODHD)
```

---

## Prerequisites

Before starting, ensure you have:

✅ **Docker Desktop** installed and running
✅ **Node.js 18+** installed
✅ **Python 3.11+** installed
✅ **EODHD API key** (from https://eodhd.com/)
✅ **Git** repository cloned

---

## Step 1: Set Up Environment Variables

### Backend (.env)

Create `backend/.env`:

```bash
# Database Configuration
DATABASE_URL=postgresql://chatfund:chatfund123@localhost:5432/chatwithfund
REDIS_URL=redis://localhost:6379/0

# EODHD API Key (REQUIRED)
EODHD_API_KEY=your_eodhd_api_key_here

# Optional: OpenAI for chat features
OPENAI_API_KEY=your_openai_key_here

# Optional: Backend API Key for production (leave empty for dev mode)
APP_API_KEY=

# Database Pool Configuration
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=40
DB_STATEMENT_TIMEOUT=30000
```

### Frontend (.env.local)

Create `frontend/.env.local`:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Optional: API Key for production (leave empty for dev mode)
NEXT_PUBLIC_APP_API_KEY=
```

---

## Step 2: Start Database Services

### Option A: Using Docker Compose (Recommended)

```bash
cd backend

# Start PostgreSQL + TimescaleDB + Redis
docker-compose -f docker-compose.db.yml up -d

# Verify services are running
docker-compose -f docker-compose.db.yml ps

# Expected output:
# NAME                IMAGE                  STATUS
# postgres-chatfund   timescale/timescaledb  Up
# redis-chatfund      redis:7-alpine         Up
```

### Option B: Manual Setup

If you prefer to install PostgreSQL and Redis manually:

1. Install PostgreSQL 15+ with TimescaleDB extension
2. Install Redis 7+
3. Create database: `createdb chatwithfund`
4. Create user: `CREATE USER chatfund WITH PASSWORD 'chatfund123';`
5. Grant privileges: `GRANT ALL PRIVILEGES ON DATABASE chatwithfund TO chatfund;`

---

## Step 3: Initialize Database Schema

```bash
cd backend

# Install Python dependencies
pip install -r requirements-database.txt

# Initialize database schema
python manage_db.py init

# Expected output:
# ✅ Database schema initialized
# ✅ TimescaleDB extension enabled
# ✅ 13 tables created
# ✅ Indexes created
# ✅ Triggers created
```

---

## Step 4: Pre-Populate Database

```bash
# Set EODHD API key
export EODHD_API_KEY="your_key_here"

# Run population script
python scripts/populate_companies.py

# Expected output:
# 🚀 STARTING DATABASE POPULATION
# ✅ Inserted 5 exchanges
# ✅ Inserted 11 sectors
# ✅ Inserted 16 industries
# ✅ Inserted 100 companies
# ⏱️  Total time: ~45 seconds
```

This populates:
- **5 exchanges** (US, NYSE, NASDAQ, AMEX, BATS)
- **11 sectors** (GICS standard sectors)
- **16 industries** (common industries)
- **100 companies** (top US stocks)

---

## Step 5: Start Backend API

```bash
cd backend

# Make sure environment variables are set
export EODHD_API_KEY="your_key_here"

# Start FastAPI backend
uvicorn main:app --reload --port 8000

# Expected output:
# INFO:     Uvicorn running on http://127.0.0.1:8000
# INFO:     Application startup complete
# ✅ CACHE WARMING SERVICE STARTED (if APScheduler installed)
```

### Verify Backend is Running

Open browser to:
- **Health Check**: http://localhost:8000/
- **API Docs**: http://localhost:8000/docs
- **Monitoring Dashboard**: http://localhost:8000/monitoring/dashboard

---

## Step 6: Start Frontend

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start Next.js development server
npm run dev

# Expected output:
# ready - started server on 0.0.0.0:3000, url: http://localhost:3000
# ✓ Ready in 2.5s
```

### Verify Frontend is Running

Open browser to:
- **Home Page**: http://localhost:3000
- **Monitoring Page**: http://localhost:3000/monitoring

---

## Step 7: Integration Tests

### Test 1: Database-First EOD Data

**Objective**: Verify cache-aside pattern works (database-first, API fallback)

```bash
# First request (cache MISS - should hit API and store in DB)
curl -H "X-API-Key: " http://localhost:8000/historical/eod-extended?ticker=AAPL.US&period=d

# Check logs - should see:
# [DATA_SERVICE] Cache MISS: AAPL.US EOD data
# [DATA_SERVICE] Stored 365 records for AAPL.US in database

# Second request (cache HIT - should return from DB instantly)
curl -H "X-API-Key: " http://localhost:8000/historical/eod-extended?ticker=AAPL.US&period=d

# Check logs - should see:
# [DATA_SERVICE] Cache HIT: AAPL.US EOD data from database (365 records)
```

**Expected Performance**:
- First request: ~500ms (API call + DB storage)
- Second request: ~10ms (DB only) - **50x faster!**

---

### Test 2: Live Price Data

```bash
# First request (cache MISS)
curl -H "X-API-Key: " http://localhost:8000/historical/live-price?ticker=AAPL.US

# Within 15 seconds, request again (cache HIT)
curl -H "X-API-Key: " http://localhost:8000/historical/live-price?ticker=AAPL.US
```

**Expected**: Second request within 15s should be from cache (faster)

---

### Test 3: News Data

```bash
# First request for AAPL news
curl -H "X-API-Key: " http://localhost:8000/news/articles?symbol=AAPL&limit=10

# Check logs for cache MISS/HIT

# Request again within 1 hour (cache HIT)
curl -H "X-API-Key: " http://localhost:8000/news/articles?symbol=AAPL&limit=10
```

---

### Test 4: Dividends

```bash
# Fetch dividends (should cache for 7 days)
curl -H "X-API-Key: " http://localhost:8000/corporate/dividends?ticker=AAPL.US

# Request again immediately (cache HIT)
curl -H "X-API-Key: " http://localhost:8000/corporate/dividends?ticker=AAPL.US
```

---

### Test 5: Monitoring Dashboard

```bash
# Get full dashboard
curl http://localhost:8000/monitoring/dashboard

# Should return:
# {
#   "overall_status": "healthy",
#   "quick_stats": {
#     "companies": 100,
#     "ohlcv_records": 365,  # (from AAPL data we fetched)
#     ...
#   }
# }
```

---

### Test 6: Cache Warming Trigger

```bash
# Manually trigger cache warming
curl -X POST http://localhost:8000/monitoring/cache-warming/trigger

# Response:
# {"status": "success", "message": "Cache warming triggered in background"}

# Check backend logs - should see cache warming progress
```

---

### Test 7: Frontend Integration

**Test historical chart on frontend**:

1. Open http://localhost:3000
2. Enter ticker "AAPL"
3. Click analyze
4. Should see charts load from backend

**Test monitoring dashboard**:

1. Open http://localhost:3000/monitoring
2. Should see:
   - System health: Healthy
   - Database metrics: 100 companies, OHLCV records count
   - Cache metrics: Redis status, cache warming jobs
   - System resources: CPU, memory, disk usage
   - Auto-refresh every 30 seconds

---

## Step 8: Verify Database Contents

```bash
# Connect to PostgreSQL
psql -h localhost -U chatfund -d chatwithfund

# Check companies
SELECT COUNT(*) FROM companies;
-- Should return: 100

# Check OHLCV records (after fetching AAPL data)
SELECT COUNT(*) FROM ohlcv;
-- Should return: 365+ (one year of AAPL data)

# Check latest OHLCV record
SELECT c.ticker, o.date, o.close, o.volume
FROM ohlcv o
JOIN companies c ON c.id = o.company_id
ORDER BY o.date DESC
LIMIT 5;

# Check cache warming is working
SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name)))
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC;
```

---

## Step 9: Performance Benchmarking

### Benchmark Cache Hit vs Miss

```bash
# Install hyperfine (benchmarking tool)
# macOS: brew install hyperfine
# Linux: apt install hyperfine

# Benchmark cache MISS (clear database first)
psql -h localhost -U chatfund -d chatwithfund -c "DELETE FROM ohlcv WHERE company_id IN (SELECT id FROM companies WHERE ticker = 'AAPL');"

time curl -H "X-API-Key: " http://localhost:8000/historical/eod-extended?ticker=AAPL.US

# Result: ~500ms (API call)

# Benchmark cache HIT (data now in database)
time curl -H "X-API-Key: " http://localhost:8000/historical/eod-extended?ticker=AAPL.US

# Result: ~10ms (database) - 50x faster!
```

---

## Troubleshooting

### Backend won't start

**Error**: `ModuleNotFoundError: No module named 'X'`
**Fix**: Install dependencies
```bash
pip install -r requirements-database.txt
```

**Error**: `psycopg2.OperationalError: could not connect to server`
**Fix**: Ensure PostgreSQL is running
```bash
docker-compose -f docker-compose.db.yml up -d
docker-compose -f docker-compose.db.yml ps
```

---

### Frontend API calls fail

**Error**: `TypeError: Failed to fetch`
**Fix**: Ensure backend is running on port 8000
```bash
curl http://localhost:8000/
```

**Error**: `401 Unauthorized`
**Fix**: Check API key configuration
- For dev mode, leave `APP_API_KEY` empty in backend `.env`
- Frontend `.env.local` should match

---

### Database connection errors

**Error**: `database "chatwithfund" does not exist`
**Fix**: Create database
```bash
docker exec -it postgres-chatfund psql -U chatfund -c "CREATE DATABASE chatwithfund;"
python manage_db.py init
```

---

### Cache not working

**Error**: Data always fetched from API (no cache hits)
**Fix**: Check if companies are in database
```bash
psql -h localhost -U chatfund -d chatwithfund -c "SELECT COUNT(*) FROM companies;"
```

If count is 0, run:
```bash
python scripts/populate_companies.py
```

---

## Next Steps

Once everything is working:

1. **Deploy to Production**
   - Set up cloud database (AWS RDS, GCP Cloud SQL, etc.)
   - Deploy backend (AWS EC2, GCP Compute, Heroku, etc.)
   - Deploy frontend (Vercel, Netlify, etc.)
   - Configure environment variables

2. **Enable Cache Warming**
   - Ensure APScheduler is installed
   - Cache warming starts automatically with backend
   - Monitor scheduled jobs in dashboard

3. **Monitor Performance**
   - Check `/monitoring/dashboard` regularly
   - Track cache hit rate (should be >90%)
   - Monitor API costs
   - Set up alerts for health checks

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js on localhost:3000)                       │
│  - React components                                          │
│  - API client (lib/api.ts)                                   │
│  - Monitoring dashboard (/monitoring)                        │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP Requests
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  BACKEND (FastAPI on localhost:8000)                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Data Service Layer (Phase 2B)                           ││
│  │ - Cache-aside pattern                                   ││
│  │ - Database-first queries                                ││
│  │ - Automatic API fallback                                ││
│  └────────┬────────────────────────────────┬───────────────┘│
│           │                                 │                 │
│           ↓                                 ↓                 │
│  ┌────────────────┐              ┌────────────────────────┐ │
│  │ Database Query │              │ EODHD API Call         │ │
│  │ (if data fresh)│              │ (if cache miss/stale)  │ │
│  └────────┬───────┘              └──────────┬─────────────┘ │
│           │                                  │                │
└───────────┼──────────────────────────────────┼───────────────┘
            │                                  │
            ↓                                  ↓
┌─────────────────────────────────────────────────────────────┐
│  DATABASE LAYER                                              │
│  ┌──────────────────────┐  ┌──────────────────────────────┐│
│  │ PostgreSQL + TimescaleDB  │  Redis 7 (Session Cache)  ││
│  │ - 13 tables            │  │ - TTL: 15s - 7 days       ││
│  │ - 100 companies        │  │ - Graceful degradation    ││
│  │ - OHLCV, fundamentals  │  └──────────────────────────────┘│
│  │ - News, dividends      │                                  │
│  └──────────────────────┘                                  │
└─────────────────────────────────────────────────────────────┘
            ↑
            │ Cache Warming (Background)
            │
┌─────────────────────────────────────────────────────────────┐
│  CACHE WARMING SERVICE (APScheduler)                         │
│  - EOD data: Daily 6 PM                                      │
│  - Fundamentals: Daily 7 PM                                  │
│  - News: Every 2 hours (9:30-16:30)                          │
│  - Dividends: Weekly Monday 8 PM                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Success Criteria

✅ Backend starts successfully on port 8000
✅ Frontend starts successfully on port 3000
✅ Database has 100 companies pre-populated
✅ First API request for AAPL takes ~500ms (cache MISS)
✅ Second API request for AAPL takes ~10ms (cache HIT)
✅ Monitoring dashboard shows healthy status
✅ Cache warming service is running with 4 scheduled jobs
✅ Frontend can display charts from backend API

---

## Support

If you encounter issues:

1. Check backend logs in terminal
2. Check frontend browser console (F12)
3. Check database connection: `docker-compose -f docker-compose.db.yml ps`
4. Verify environment variables are set correctly
5. Ensure EODHD API key is valid and has credits

---

**Last Updated**: 2025-10-22
**Version**: Phase 2C Complete
