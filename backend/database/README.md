# Database Layer - Chat with Fundamentals

Complete database architecture for storing years of OHLCV data, fundamental metrics, news, and more.

## 🏗️ Architecture

### Technology Stack
- **PostgreSQL 15+** - Primary relational database
- **TimescaleDB 2.11+** - Time-series extension for OHLCV data
- **Redis 7+** - Caching layer (1-hour TTL)
- **SQLAlchemy 2.0** - Python ORM
- **Alembic** - Database migrations

### Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│                     MASTER DATA                              │
├─────────────────────────────────────────────────────────────┤
│ exchanges        │ Stock exchanges (NYSE, NASDAQ, LSE...)   │
│ sectors          │ Industry sectors (Technology, Healthcare)│
│ industries       │ Industry sub-classifications             │
│ companies        │ Company/ticker master data               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     MARKET DATA                              │
├─────────────────────────────────────────────────────────────┤
│ ohlcv            │ Time-series price data (TimescaleDB)     │
│ fundamentals     │ Financial metrics (quarterly/annual)     │
│ technical_indicators │ Pre-calculated indicators (RSI, MACD)│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     DERIVED DATA                             │
├─────────────────────────────────────────────────────────────┤
│ news             │ Financial news articles with sentiment   │
│ analyst_ratings  │ Analyst recommendations & price targets  │
│ insider_transactions │ Insider buying/selling activity       │
│ dividends        │ Dividend payment history                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     MONITORING                               │
├─────────────────────────────────────────────────────────────┤
│ data_ingestion_logs │ Track data fetch jobs                │
│ api_rate_limits  │ Monitor API usage                        │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Start Database Services

```bash
# From project root
docker-compose -f docker-compose.db.yml up -d

# Verify services are running
docker-compose -f docker-compose.db.yml ps
```

Services:
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`
- **PgAdmin**: `http://localhost:5050` (admin@chatfundamentals.local / admin)
- **Redis Commander**: `http://localhost:8081`

### 2. Install Dependencies

```bash
cd backend
pip install -r requirements-database.txt
```

### 3. Initialize Database

```bash
# Test connections
python manage_db.py test

# Initialize schema
python manage_db.py init

# Seed initial data (exchanges, sectors, sample company)
python manage_db.py seed

# Check health
python manage_db.py health
```

## 📊 Database Management

### CLI Commands

```bash
# Initialize database with schema
python manage_db.py init

# Test all connections (DB, TimescaleDB, Redis)
python manage_db.py test

# Seed initial data (exchanges, sectors, AAPL sample)
python manage_db.py seed

# Check database health and statistics
python manage_db.py health

# Reset database (DROP ALL TABLES - use with caution!)
python manage_db.py reset
```

### Using in Code

```python
from database.models.base import get_db
from database.models.company import Company
from sqlalchemy.orm import Session

# FastAPI dependency injection
@app.get("/companies")
def list_companies(db: Session = Depends(get_db)):
    return db.query(Company).filter(Company.is_active == True).all()

# Direct usage
from database.models.base import SessionLocal

db = SessionLocal()
try:
    aapl = db.query(Company).filter(Company.ticker == 'AAPL.US').first()
    print(aapl.name)  # Apple Inc.
finally:
    db.close()
```

## 🗄️ Models Overview

### Company Models (`models/company.py`)
- `Exchange` - Stock exchanges
- `Sector` - Industry sectors
- `Industry` - Industry sub-classifications
- `Company` - Company/ticker master data

### Market Data Models (`models/market_data.py`)
- `OHLCV` - Time-series price data (TimescaleDB hypertable)
- `Fundamental` - Financial metrics (P/E, revenue, earnings, etc.)
- `TechnicalIndicator` - Pre-calculated technical indicators

### News Models (`models/news.py`)
- `News` - Financial news articles with sentiment
- `AnalystRating` - Analyst recommendations
- `InsiderTransaction` - Insider trading activity

### Other Models
- `Dividend` (`models/dividends.py`) - Dividend payment history
- `DataIngestionLog`, `APIRateLimit` (`models/monitoring.py`) - Monitoring

## 📈 Performance Features

### TimescaleDB Optimizations
```sql
-- Hypertable creation (automatic chunking)
SELECT create_hypertable('ohlcv', 'date', chunk_time_interval => INTERVAL '1 month');

-- Compression (10x storage reduction)
ALTER TABLE ohlcv SET (timescaledb.compress_segmentby = 'company_id');

-- Auto-compress data older than 7 days
SELECT add_compression_policy('ohlcv', INTERVAL '7 days');
```

### Query Examples

```python
# Fast range queries with TimescaleDB
from datetime import datetime, timedelta
from database.models.market_data import OHLCV

# Get last 90 days of OHLCV data
ninety_days_ago = datetime.now() - timedelta(days=90)
data = db.query(OHLCV).filter(
    OHLCV.company_id == company_id,
    OHLCV.date >= ninety_days_ago
).order_by(OHLCV.date.desc()).all()

# Get latest fundamentals
from database.models.market_data import Fundamental

latest = db.query(Fundamental).filter(
    Fundamental.company_id == company_id
).order_by(Fundamental.date.desc()).first()

# Search news by sentiment
from database.models.news import News

positive_news = db.query(News).filter(
    News.sentiment_score > 0.5,
    News.published_at >= ninety_days_ago
).order_by(News.published_at.desc()).limit(10).all()
```

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chat_fundamentals

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

### Connection Pooling

```python
from database.config import DatabaseConfig

config = DatabaseConfig()
engine = config.get_engine(echo=False)  # Set echo=True for SQL logging

# Pool settings (in models/base.py):
# - pool_size=10 (concurrent connections)
# - max_overflow=20 (additional connections)
# - pool_timeout=30 (seconds)
# - pool_recycle=3600 (recycle after 1 hour)
```

## 📦 Storage Estimates

### OHLCV Data
- **1 ticker, 1 year daily**: ~250 rows × 50 bytes = ~12.5 KB
- **1 ticker, 10 years daily**: ~2,500 rows × 50 bytes = ~125 KB
- **500 tickers, 10 years**: 500 × 125 KB = ~62.5 MB (compressed: ~6 MB)

### Fundamentals Data
- **1 ticker, 10 years quarterly**: ~40 rows × 2 KB = ~80 KB
- **500 tickers, 10 years**: 500 × 80 KB = ~40 MB

### Total Estimate (S&P 500, 10 years)
- OHLCV: ~6 MB (compressed)
- Fundamentals: ~40 MB
- News (1000 articles/ticker): ~500 MB
- **Total**: ~600 MB - **1 GB**

## 🔍 Monitoring

### Check Database Health

```bash
python manage_db.py health
```

Output:
```
==============================================================
DATABASE HEALTH STATUS
==============================================================
✅ DATABASE              HEALTHY
✅ TIMESCALEDB           HEALTHY
✅ REDIS                 HEALTHY
==============================================================

TABLE STATISTICS:
--------------------------------------------------------------
  companies                    1 records
  exchanges                    4 records
  sectors                     11 records
--------------------------------------------------------------
```

### PgAdmin Dashboard

Access: `http://localhost:5050`
- Email: `admin@chatfundamentals.local`
- Password: `admin`

### Redis Commander

Access: `http://localhost:8081`

## 🚨 Troubleshooting

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs chat-fundamentals-db

# Restart services
docker-compose -f docker-compose.db.yml restart
```

### TimescaleDB Extension Not Found

```bash
# Connect to PostgreSQL
docker exec -it chat-fundamentals-db psql -U postgres -d chat_fundamentals

# Enable extension manually
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
```

### Redis Connection Failed

```bash
# Check if Redis is running
docker ps | grep redis

# Test connection
docker exec -it chat-fundamentals-redis redis-cli ping
# Expected: PONG
```

## 📚 Next Steps

1. **Data Ingestion** - Build pipeline to fetch historical data from EODHD API
2. **Caching Layer** - Implement Redis caching for frequent queries
3. **Query Utilities** - Create helper functions for common queries
4. **Update FundamentalFlow** - Migrate from API-only to database-first
5. **Backtesting Engine** - Build strategy backtesting on historical data

## 🔗 Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TimescaleDB Documentation](https://docs.timescale.com/)
- [SQLAlchemy 2.0 Documentation](https://docs.sqlalchemy.org/en/20/)
- [Redis Documentation](https://redis.io/documentation)
