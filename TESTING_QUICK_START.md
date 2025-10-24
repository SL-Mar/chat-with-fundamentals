# 10-Point Testing Quick Start Guide

**Branch**: `claude/investigate-typo-011CURVZy781EuJJwfpGT6i5`
**Status**: Database-First Architecture with Full Stack Integration

---

## 1️⃣ Install Dependencies

### Backend Dependencies
```bash
cd /home/user/chat-with-fundamentals/backend

# Core dependencies
pip install -r ../requirements.txt

# Database dependencies (PostgreSQL, SQLAlchemy, Redis)
pip install -r requirements-database.txt

# Testing dependencies (pytest, mocks)
pip install -r requirements-test.txt
```

### Frontend Dependencies
```bash
cd /home/user/chat-with-fundamentals/frontend

# Install Node dependencies
npm install
```

**Expected Output**: All packages installed without errors

---

## 2️⃣ Start Database Infrastructure (Docker)

```bash
cd /home/user/chat-with-fundamentals

# Start PostgreSQL + TimescaleDB + Redis + Admin UIs
docker compose -f docker-compose.db.yml up -d

# Verify all services are running
docker compose -f docker-compose.db.yml ps
```

**Expected Services**:
- ✅ `chat-fundamentals-db` (PostgreSQL + TimescaleDB) - Port 5432
- ✅ `chat-fundamentals-redis` (Redis) - Port 6379
- ✅ `chat-fundamentals-pgadmin` (PgAdmin UI) - Port 5050
- ✅ `chat-fundamentals-redis-commander` (Redis UI) - Port 8081

**Management UIs**:
- **PgAdmin**: http://localhost:5050 (admin@chatfundamentals.local / admin)
- **Redis Commander**: http://localhost:8081

---

## 3️⃣ Test Database Connections

```bash
cd /home/user/chat-with-fundamentals/backend

# Test PostgreSQL and Redis connections
python manage_db.py test
```

**Expected Output**:
```
✅ Database connection successful
✅ TimescaleDB extension is installed (version X.X.X)
✅ Redis connection successful
```

**If Failed**:
```bash
# Check Docker logs
docker logs chat-fundamentals-db
docker logs chat-fundamentals-redis

# Restart services
docker compose -f docker-compose.db.yml restart
```

---

## 4️⃣ Initialize Database Schema

```bash
cd /home/user/chat-with-fundamentals/backend

# Create all tables and TimescaleDB hypertables
python manage_db.py init
```

**Expected Output**:
```
🚀 Initializing database...
✅ Database tables created successfully
✅ TimescaleDB extension is active
```

**Tables Created** (13 total):
- `companies`, `exchanges`, `sectors`, `industries`
- `ohlcv_data` (TimescaleDB hypertable)
- `fundamental_data`, `news_articles`, `sentiment_scores`
- `dividends`, `splits`, `insider_transactions`
- `api_request_log`, `cache_metrics`

---

## 5️⃣ Configure Environment Variables

```bash
cd /home/user/chat-with-fundamentals

# Check if .env exists
ls -la .env

# Required variables for testing:
cat > .env << 'EOF'
# API Keys
OPENAI_API_KEY=your_openai_key_here
EODHD_API_KEY=your_eodhd_key_here

# Database (matches docker-compose.db.yml)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chat_fundamentals

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Optional
SERPER_API_KEY=optional
MISTRAL_API_KEY=optional
NOTION_API_KEY=optional
NOTION_DATABASE_ID=optional

# LLM Config
MODEL_NAME=gpt-4o
LOCAL_MODE=true
EOF
```

**Minimum Required for Testing**:
- `EODHD_API_KEY` - Get free key at https://eodhd.com/register
- `OPENAI_API_KEY` - Optional (some features work without it)

---

## 6️⃣ Start Backend Server

```bash
cd /home/user/chat-with-fundamentals/backend

# Start FastAPI server
python main.py

# Or with uvicorn for hot reload:
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Expected Output**:
```
INFO:     Started server process [PID]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Test Health Check**:
```bash
curl http://localhost:8000/
```

**Expected Response**:
```json
{
  "message": "Chat with Fundamentals API is running",
  "version": "2.0-database-first",
  "database": "connected",
  "redis": "connected"
}
```

---

## 7️⃣ Test Backend API Endpoints

### Manual API Testing
```bash
# Test historical data endpoint
curl "http://localhost:8000/historical/eod-extended?symbol=AAPL.US&from_date=2024-01-01&to_date=2024-12-31"

# Test live price
curl "http://localhost:8000/historical/live-price?symbol=AAPL.US"

# Test news
curl "http://localhost:8000/news/articles?symbol=AAPL&limit=10"

# Test dividends
curl "http://localhost:8000/corporate/dividends?symbol=AAPL.US"

# Test technical indicator
curl "http://localhost:8000/technical/indicator?symbol=AAPL.US&function=rsi&period=14"
```

### Automated API Testing
```bash
cd /home/user/chat-with-fundamentals/backend

# Run all endpoint tests (with mocked EODHD API)
pytest tests/test_api_endpoints_corrected.py -v

# Run with coverage report
pytest tests/ --cov=. --cov-report=html

# View coverage report
open htmlcov/index.html  # or xdg-open on Linux
```

**Expected Result**: 13+ tests passing

---

## 8️⃣ Test Data Ingestion Pipeline

### Seed Sample Companies
```bash
cd /home/user/chat-with-fundamentals/backend

# Populate companies table with S&P 500 stocks
python scripts/populate_companies.py

# Or seed manually
python manage_db.py seed
```

### Test OHLCV Ingestion
```bash
# Run ingestion unit tests
pytest tests/test_ingestion/test_ohlcv_ingestion.py -v
```

### Manual Ingestion Test
```python
# In Python shell
from ingestion.ohlcv_ingestion import OHLCVIngestion
from tools.eodhd_client import EODHDClient

client = EODHDClient()
ingestion = OHLCVIngestion(client)

# Ingest AAPL data for last 30 days
ingestion.ingest_ohlcv_batch(
    symbols=["AAPL.US"],
    start_date="2024-10-01",
    end_date="2024-10-24"
)
```

**Verify in Database**:
```sql
-- Connect to database via PgAdmin (localhost:5050) or psql:
SELECT COUNT(*) FROM ohlcv_data WHERE symbol = 'AAPL.US';
SELECT * FROM ohlcv_data WHERE symbol = 'AAPL.US' ORDER BY timestamp DESC LIMIT 10;
```

---

## 9️⃣ Test Caching & Monitoring

### Test Redis Cache
```bash
# Check Redis is caching API responses
redis-cli
> KEYS *
> GET "historical:eod:AAPL.US:2024-01-01:2024-12-31"
> TTL "historical:eod:AAPL.US:2024-01-01:2024-12-31"
> exit
```

**Or use Redis Commander**: http://localhost:8081

### Test Cache Warming
```python
# In Python shell
from services.cache_warming_service import CacheWarmingService

service = CacheWarmingService()
service.warm_popular_symbols(["AAPL.US", "MSFT.US", "TSLA.US"])
```

### Test Monitoring Dashboard
```bash
# Visit monitoring endpoint
curl http://localhost:8000/monitoring/health
curl http://localhost:8000/monitoring/cache-stats
curl http://localhost:8000/monitoring/database-stats
```

**Or visit UI**: http://localhost:3000/monitoring (after starting frontend)

---

## 🔟 Start Frontend & End-to-End Testing

### Start Next.js Frontend
```bash
cd /home/user/chat-with-fundamentals/frontend

# Development mode with hot reload
npm run dev

# Or production build
npm run build
npm start
```

**Expected Output**:
```
ready - started server on 0.0.0.0:3000
```

### Test Frontend Pages
Visit these URLs in your browser:

1. **Homepage**: http://localhost:3000
2. **Stock Detail**: http://localhost:3000/stock-detail?symbol=AAPL
3. **Advanced Charts**: http://localhost:3000/advanced-charts
4. **Economic Dashboard**: http://localhost:3000/economic-dashboard
5. **ETF Analyzer**: http://localhost:3000/etf-analyzer
6. **Stock Screener**: http://localhost:3000/screener
7. **Monitoring Dashboard**: http://localhost:3000/monitoring
8. **Demo (Chat Panels)**: http://localhost:3000/demo

### End-to-End Test Scenarios

**Scenario 1: View Stock Data**
1. Go to http://localhost:3000/stock-detail?symbol=AAPL
2. Verify intraday chart loads
3. Check analyst ratings display
4. View insider transactions
5. Verify sentiment analysis shows

**Scenario 2: Use Stock Screener**
1. Go to http://localhost:3000/screener
2. Set filters (e.g., Market Cap > 1B)
3. Click "Screen Stocks"
4. Verify results display

**Scenario 3: Test Data Refresh**
1. Query stock data (caches response)
2. Check Redis has cached data
3. Query again (should hit cache, faster)
4. Verify monitoring shows cache hit rate

---

## 📊 Success Checklist

After completing all 10 points, verify:

- [ ] PostgreSQL running and accessible (port 5432)
- [ ] Redis running and accessible (port 6379)
- [ ] Database schema initialized (13 tables)
- [ ] Backend server running (port 8000)
- [ ] API endpoints responding correctly
- [ ] Sample data ingested successfully
- [ ] Redis caching API responses
- [ ] Frontend running (port 3000)
- [ ] Frontend pages loading without errors
- [ ] Monitoring dashboard showing metrics

---

## 🐛 Common Issues & Solutions

### Issue: Docker services won't start
```bash
# Check ports are free
lsof -i :5432
lsof -i :6379

# Stop conflicting services
sudo systemctl stop postgresql
sudo systemctl stop redis

# Restart Docker
docker compose -f docker-compose.db.yml down
docker compose -f docker-compose.db.yml up -d
```

### Issue: Database connection failed
```bash
# Check DATABASE_URL in .env matches docker-compose.db.yml
# Default: postgresql://postgres:postgres@localhost:5432/chat_fundamentals

# Test direct connection
psql -h localhost -U postgres -d chat_fundamentals
# Password: postgres
```

### Issue: EODHD API returns 403/401
- Check your EODHD_API_KEY in .env
- Verify key is active at https://eodhd.com/cp/settings
- Free tier has rate limits (20 requests/sec)

### Issue: Frontend can't reach backend
```bash
# Check backend is running on port 8000
curl http://localhost:8000/

# Check CORS is configured
# backend/main.py should have:
# origins = ["http://localhost:3000", "http://localhost:3005"]
```

### Issue: Redis cache not working
```bash
# Test Redis connection
redis-cli ping
# Should return: PONG

# Check cache TTL in backend/cache/redis_cache.py
# Default: 300 seconds (5 minutes)
```

---

## 🚀 Next Steps After Testing

1. **Set up incremental data refresh**:
   ```bash
   python -c "from services.data_refresh_pipeline import DataRefreshPipeline; DataRefreshPipeline().run_daily_refresh()"
   ```

2. **Configure scheduled tasks** (cron or systemd):
   ```bash
   # Add to crontab for daily refresh at 2 AM
   0 2 * * * cd /path/to/backend && python -c "from services.data_refresh_pipeline import DataRefreshPipeline; DataRefreshPipeline().run_daily_refresh()"
   ```

3. **Set up production database**:
   - Use managed PostgreSQL (AWS RDS, DigitalOcean, Render)
   - Use managed Redis (AWS ElastiCache, Redis Cloud)
   - Update DATABASE_URL and REDIS_HOST in .env

4. **Deploy application**:
   - Backend: Deploy to Render, Railway, or AWS
   - Frontend: Deploy to Vercel, Netlify, or AWS Amplify

---

## 📚 Additional Documentation

- **Database Setup**: DATABASE_SETUP_GUIDE.md
- **API Testing**: backend/tests/ENDPOINT_TEST_REPORT.md
- **Security Audit**: SECURITY_AUDIT.md
- **Architecture**: ARCHITECTURE_DIAGRAMS.md
- **Phase 2 Completion**: PHASE_2A_COMPLETE.md through PHASE_2D_DATA_REFRESH_PIPELINE.md

---

**Questions or Issues?** Check the main README.md or create a GitHub issue.
