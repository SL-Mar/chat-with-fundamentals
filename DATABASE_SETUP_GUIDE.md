# Database Setup & Testing Guide

## ✅ Status: All Database Files Ready

All database layer files have been created and verified:
- ✅ SQL schema with TimescaleDB optimizations
- ✅ SQLAlchemy ORM models (13 tables)
- ✅ Docker Compose configuration
- ✅ Management CLI (`manage_db.py`)
- ✅ Connection pooling and configuration
- ✅ Python syntax validated

## 🚀 Local Testing Instructions

### Prerequisites

Ensure you have installed:
- Docker Desktop (or Docker Engine + Docker Compose)
- Python 3.10+
- Git (to pull the latest changes)

### Step 1: Pull Latest Changes

```bash
cd /path/to/chat-with-fundamentals
git pull origin claude/code-review-011CULXMkGpoFpPQ3FQGco1T
```

### Step 2: Start Database Services

```bash
# Start all database services (PostgreSQL + Redis + Management UIs)
docker compose -f docker-compose.db.yml up -d

# Verify services are running
docker compose -f docker-compose.db.yml ps

# Expected output:
# NAME                              STATUS    PORTS
# chat-fundamentals-db              Up        0.0.0.0:5432->5432/tcp
# chat-fundamentals-redis           Up        0.0.0.0:6379->6379/tcp
# chat-fundamentals-pgadmin         Up        0.0.0.0:5050->80/tcp
# chat-fundamentals-redis-commander Up        0.0.0.0:8081->8081/tcp
```

**Service URLs:**
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`
- **PgAdmin**: http://localhost:5050 (admin@chatfundamentals.local / admin)
- **Redis Commander**: http://localhost:8081

### Step 3: Install Python Dependencies

```bash
cd backend

# Install database dependencies
pip install -r requirements-database.txt

# Expected packages:
# - psycopg2-binary (PostgreSQL adapter)
# - SQLAlchemy (ORM)
# - alembic (migrations)
# - redis (caching)
```

### Step 4: Test Database Connections

```bash
# Test all connections (PostgreSQL, TimescaleDB, Redis)
python manage_db.py test

# Expected output:
# ✅ Database connection successful
# ✅ TimescaleDB extension is installed
# ✅ Redis connection successful
```

**If any service fails:**
```bash
# Check Docker logs
docker logs chat-fundamentals-db      # PostgreSQL logs
docker logs chat-fundamentals-redis   # Redis logs

# Restart services
docker compose -f docker-compose.db.yml restart
```

### Step 5: Initialize Database Schema

```bash
# Create all tables
python manage_db.py init

# Expected output:
# 🚀 Initializing database...
# ✅ Database tables created successfully
# ✅ TimescaleDB extension is active
```

**What this does:**
- Creates all 13 tables (companies, ohlcv, fundamentals, news, etc.)
- Sets up TimescaleDB hypertable for OHLCV
- Configures compression policies
- Creates indexes for fast queries
- Sets up triggers for timestamp updates

### Step 6: Seed Initial Data

```bash
# Seed exchanges, sectors, and sample company (AAPL)
python manage_db.py seed

# Expected output:
# 🌱 Seeding initial data...
# ✓ Added exchange: US
# ✓ Added exchange: NASDAQ
# ✓ Added exchange: LSE
# ✓ Added exchange: JPX
# ✅ Exchanges seeded
# ✓ Added sector: Technology
# ✓ Added sector: Healthcare
# ... (11 sectors total)
# ✅ Sectors seeded
# ✓ Added sample company: AAPL.US
# ✅ Initial data seeded successfully
```

### Step 7: Verify Database Health

```bash
# Check health and view statistics
python manage_db.py health

# Expected output:
# ==============================================================
# DATABASE HEALTH STATUS
# ==============================================================
# ✅ DATABASE              HEALTHY
# ✅ TIMESCALEDB           HEALTHY
# ✅ REDIS                 HEALTHY
# ==============================================================
#
# TABLE STATISTICS:
# --------------------------------------------------------------
#   companies                    1 records
#   exchanges                    4 records
#   sectors                     11 records
# --------------------------------------------------------------
```

## 🧪 Advanced Testing

### Test Database Queries (Python)

Create a test script `test_db_queries.py`:

```python
from database.models.base import SessionLocal
from database.models.company import Company, Exchange, Sector

# Create session
db = SessionLocal()

try:
    # Query companies
    companies = db.query(Company).all()
    print(f"✅ Found {len(companies)} companies")

    # Query AAPL
    aapl = db.query(Company).filter(Company.ticker == 'AAPL.US').first()
    if aapl:
        print(f"✅ Found: {aapl.name} ({aapl.ticker})")
        print(f"   Sector: {aapl.sector.name if aapl.sector else 'N/A'}")
        print(f"   Exchange: {aapl.exchange.code if aapl.exchange else 'N/A'}")

    # Query exchanges
    exchanges = db.query(Exchange).all()
    print(f"✅ Found {len(exchanges)} exchanges:")
    for ex in exchanges:
        print(f"   - {ex.code}: {ex.name}")

    # Query sectors
    sectors = db.query(Sector).all()
    print(f"✅ Found {len(sectors)} sectors:")
    for sector in sectors:
        print(f"   - {sector.name}")

finally:
    db.close()

print("\n✅ All queries successful!")
```

Run it:
```bash
python test_db_queries.py
```

### Test Redis Connection

```python
from database.config import get_config
import json

config = get_config()
redis_client = config.get_redis_client()

# Test set/get
redis_client.set('test_key', 'test_value')
value = redis_client.get('test_key')
print(f"✅ Redis test: {value}")

# Test JSON caching
data = {'ticker': 'AAPL.US', 'price': 150.25}
redis_client.setex('aapl_cache', 3600, json.dumps(data))  # 1 hour TTL
cached = json.loads(redis_client.get('aapl_cache'))
print(f"✅ Redis JSON cache: {cached}")

redis_client.delete('test_key', 'aapl_cache')
print("✅ Redis cleanup successful")
```

### Access PgAdmin (Database Management UI)

1. Open http://localhost:5050
2. Login:
   - Email: `admin@chatfundamentals.local`
   - Password: `admin`
3. Add server:
   - Name: `Chat Fundamentals`
   - Host: `postgres` (or `chat-fundamentals-db`)
   - Port: `5432`
   - Database: `chat_fundamentals`
   - Username: `postgres`
   - Password: `postgres`
4. Browse tables, run queries, view data

### Access Redis Commander (Cache Management UI)

1. Open http://localhost:8081
2. No login required
3. View cached keys, inspect values, clear cache

## 🐛 Troubleshooting

### Issue: "Connection refused" when testing database

**Solution:**
```bash
# Wait for services to fully start (can take 10-30 seconds)
docker compose -f docker-compose.db.yml ps

# Check if PostgreSQL is ready
docker logs chat-fundamentals-db | grep "ready to accept connections"

# If not ready, wait and retry
sleep 10
python manage_db.py test
```

### Issue: "TimescaleDB extension not found"

**Solution:**
```bash
# Connect to PostgreSQL
docker exec -it chat-fundamentals-db psql -U postgres -d chat_fundamentals

# Enable extension manually
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

# Verify
SELECT extname FROM pg_extension WHERE extname = 'timescaledb';

# Exit
\q
```

### Issue: Port already in use (5432 or 6379)

**Solution:**
```bash
# Check what's using the port
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# Option 1: Stop conflicting service
# Option 2: Change ports in docker-compose.db.yml:
#   ports:
#     - "5433:5432"  # Use 5433 instead
```

### Issue: Docker Compose command not found

**Solution:**
```bash
# Try with hyphen (older syntax)
docker-compose -f docker-compose.db.yml up -d

# Or install Docker Desktop which includes Compose v2
```

## 🧹 Cleanup Commands

```bash
# Stop services (keep data)
docker compose -f docker-compose.db.yml stop

# Stop and remove containers (keep data)
docker compose -f docker-compose.db.yml down

# Stop and remove everything including volumes (DELETES ALL DATA!)
docker compose -f docker-compose.db.yml down -v

# Restart services
docker compose -f docker-compose.db.yml restart

# View logs
docker compose -f docker-compose.db.yml logs -f postgres  # Follow PostgreSQL logs
docker compose -f docker-compose.db.yml logs -f redis     # Follow Redis logs
```

## 📊 Verify TimescaleDB Features

```bash
# Connect to database
docker exec -it chat-fundamentals-db psql -U postgres -d chat_fundamentals

# Check hypertables
SELECT * FROM timescaledb_information.hypertables;

# Check compression settings
SELECT * FROM timescaledb_information.compression_settings;

# Check chunks
SELECT * FROM timescaledb_information.chunks LIMIT 5;

# Exit
\q
```

## ✅ Success Criteria

You know everything is working when:
1. ✅ `docker compose ps` shows all 4 services as "Up"
2. ✅ `python manage_db.py test` shows all services as HEALTHY
3. ✅ `python manage_db.py health` shows at least 1 company, 4 exchanges, 11 sectors
4. ✅ PgAdmin can connect and browse tables
5. ✅ Redis Commander shows Redis is running

## 🎯 Next Steps After Verification

Once database is verified:
1. **Build Data Ingestion Pipeline** - Fetch historical OHLCV and fundamentals from EODHD
2. **Implement Caching Layer** - Add Redis caching with TTL policies
3. **Create Query Utilities** - Helper functions for common queries
4. **Migrate FundamentalFlow** - Update to use database-first approach
5. **Build Backtesting Engine** - Strategy backtesting on historical data

## 📞 Support

If you encounter issues:
1. Check Docker logs: `docker compose -f docker-compose.db.yml logs`
2. Verify Docker Desktop is running
3. Ensure ports 5432, 6379, 5050, 8081 are available
4. Review `backend/database/README.md` for detailed documentation

---

**Status**: Ready for testing on your local machine! 🚀

All files have been committed and pushed to: `claude/code-review-011CULXMkGpoFpPQ3FQGco1T`
