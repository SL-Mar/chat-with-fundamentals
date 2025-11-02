# Portfolio Persistence Architecture

## Overview

All portfolio data is **fully persisted** in PostgreSQL database with proper relational schema and data integrity.

## Database Configuration

- **Database Type**: PostgreSQL
- **Database Name**: `chat_fundamentals`
- **Connection**: `postgresql://postgres:postgres@localhost:5432/chat_fundamentals`
- **ORM**: SQLAlchemy with relationship management
- **Connection Pool**: QueuePool (10 connections + 20 overflow)
- **Cache Layer**: Redis for performance optimization

## Database Schema

### 1. `portfolios` Table

**Purpose**: Stores user portfolios

| Column        | Type      | Constraints              | Description                          |
|---------------|-----------|--------------------------|--------------------------------------|
| `id`          | Integer   | PRIMARY KEY, AUTOINCREMENT | Unique portfolio identifier         |
| `name`        | String    | NOT NULL                 | Portfolio name                       |
| `description` | Text      | NULLABLE                 | Optional portfolio description       |
| `created_at`  | DateTime  | NOT NULL, DEFAULT NOW    | Creation timestamp                   |
| `updated_at`  | DateTime  | NOT NULL, AUTO UPDATE    | Last modification timestamp          |

**SQLAlchemy Model**: `backend/database/models/portfolio.py::Portfolio`

**Example Record**:
```json
{
  "id": 1,
  "name": "Tech Portfolio",
  "description": "FAANG stocks",
  "created_at": "2025-11-02T08:10:04.744470",
  "updated_at": "2025-11-02T08:10:04.744477"
}
```

---

### 2. `portfolio_stocks` Table

**Purpose**: Stores individual stocks within portfolios

| Column        | Type      | Constraints                       | Description                          |
|---------------|-----------|-----------------------------------|--------------------------------------|
| `id`          | Integer   | PRIMARY KEY, AUTOINCREMENT        | Unique stock entry identifier        |
| `portfolio_id`| Integer   | FOREIGN KEY → portfolios(id)      | Reference to parent portfolio        |
| `ticker`      | String    | NOT NULL                          | Stock ticker symbol (e.g., AAPL)     |
| `weight`      | Float     | NULLABLE                          | Stock weight (0-1), null = equal weight |
| `shares`      | Float     | NULLABLE                          | Optional number of shares held       |
| `added_at`    | DateTime  | NOT NULL, DEFAULT NOW             | When stock was added to portfolio    |

**SQLAlchemy Model**: `backend/database/models/portfolio.py::PortfolioStock`

**Foreign Key Relationship**:
- `portfolio_id` → `portfolios.id`
- **Cascade Delete**: When portfolio is deleted, all associated stocks are automatically deleted

**Example Record**:
```json
{
  "id": 1,
  "portfolio_id": 1,
  "ticker": "AAPL",
  "weight": null,  // null means equal weight
  "shares": null,
  "added_at": "2025-11-02T08:10:11.329772"
}
```

---

## ORM Relationships

### Portfolio ↔ PortfolioStock

**In `Portfolio` Model**:
```python
stocks = relationship(
    "PortfolioStock",
    back_populates="portfolio",
    cascade="all, delete-orphan"
)
```

**In `PortfolioStock` Model**:
```python
portfolio = relationship(
    "Portfolio",
    back_populates="stocks"
)
```

**Benefits**:
- **Automatic Joins**: Fetch portfolio with stocks in single query
- **Cascade Delete**: Deleting portfolio automatically removes all stocks
- **Referential Integrity**: Database enforces foreign key constraints

---

## Current Data

### Portfolios in Database (as of 2025-11-02)

```bash
curl http://localhost:8000/api/portfolios
```

**Results**:
- **Portfolio 1**: "Tech Portfolio" (AAPL, TSLA, MSFT)
- **Portfolio 2**: "IB Positions" (NBIS, MU, RKLB)
- **Portfolio 3**: "IB one" (MU, NBIS, RKLB)
- **Portfolio 4**: "IB One" (AAPL, MSFT)

Total: **4 portfolios** with **11 stock entries**

---

## API Endpoints (CRUD)

All endpoints are **database-backed** with persistence:

### Create Portfolio
```bash
POST /api/portfolios
Body: {"name": "My Portfolio", "description": "Optional description"}
→ Inserts into `portfolios` table
→ Returns created portfolio with ID
```

### Get All Portfolios
```bash
GET /api/portfolios
→ SELECT * FROM portfolios LEFT JOIN portfolio_stocks
→ Returns all portfolios with stocks
```

### Get Single Portfolio
```bash
GET /api/portfolios/{id}
→ SELECT * FROM portfolios WHERE id = {id}
→ Joins with portfolio_stocks
→ Returns 404 if not found
```

### Update Portfolio
```bash
PUT /api/portfolios/{id}
Body: {"name": "Updated Name", "description": "New description"}
→ UPDATE portfolios SET ... WHERE id = {id}
→ Updates `updated_at` timestamp
```

### Delete Portfolio
```bash
DELETE /api/portfolios/{id}
→ DELETE FROM portfolios WHERE id = {id}
→ CASCADE deletes all portfolio_stocks entries
```

### Add Stock to Portfolio
```bash
POST /api/portfolios/{id}/stocks
Body: {"ticker": "AAPL", "weight": null, "shares": null}
→ INSERT INTO portfolio_stocks (portfolio_id, ticker, weight, shares)
→ Returns updated portfolio
```

### Remove Stock from Portfolio
```bash
DELETE /api/portfolios/{portfolio_id}/stocks/{stock_id}
→ DELETE FROM portfolio_stocks WHERE id = {stock_id}
→ Returns updated portfolio
```

---

## Data Persistence Flow

### 1. Create Portfolio Flow

```
Frontend                Backend                     Database
   |                       |                            |
   |-- POST /api/portfolios -->                         |
   |                       |-- INSERT INTO portfolios --|
   |                       |<-- Returns portfolio ID ---|
   |<-- Returns JSON -------|                           |
   |                       |                            |
```

**SQLAlchemy Code** (`backend/routers/portfolios.py`):
```python
@router.post("/api/portfolios")
def create_portfolio(name: str, description: str = None, db: Session = Depends(get_db)):
    portfolio = Portfolio(name=name, description=description)
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)  # Get ID from database
    return portfolio
```

### 2. Add Stock Flow

```
Frontend                Backend                     Database
   |                       |                            |
   |-- POST /api/portfolios/1/stocks -->               |
   |                       |-- INSERT INTO portfolio_stocks --|
   |                       |-- UPDATE portfolios.updated_at --|
   |<-- Returns updated portfolio ---|                 |
   |                       |                            |
```

**SQLAlchemy Code**:
```python
@router.post("/api/portfolios/{portfolio_id}/stocks")
def add_stock(portfolio_id: int, ticker: str, db: Session = Depends(get_db)):
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    stock = PortfolioStock(portfolio_id=portfolio_id, ticker=ticker)
    db.add(stock)
    portfolio.updated_at = datetime.utcnow()  # Trigger update
    db.commit()
    db.refresh(portfolio)
    return portfolio
```

### 3. Retrieve Portfolio Flow

```
Frontend                Backend                     Database
   |                       |                            |
   |-- GET /api/portfolios/1 -->                       |
   |                       |-- SELECT * FROM portfolios WHERE id=1 --|
   |                       |-- SELECT * FROM portfolio_stocks WHERE portfolio_id=1 --|
   |<-- Returns JSON with stocks ---|                  |
   |                       |                            |
```

**SQLAlchemy Code** (with automatic relationship loading):
```python
@router.get("/api/portfolios/{portfolio_id}")
def get_portfolio(portfolio_id: int, db: Session = Depends(get_db)):
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    # portfolio.stocks is automatically loaded via relationship
    return portfolio
```

---

## Data Integrity Features

### 1. Foreign Key Constraints
- `portfolio_stocks.portfolio_id` **MUST** reference valid `portfolios.id`
- Cannot add stock to non-existent portfolio
- Database enforces referential integrity

### 2. Cascade Delete
- Deleting portfolio automatically removes all associated stocks
- No orphaned stock records
- Configured via SQLAlchemy: `cascade="all, delete-orphan"`

### 3. Automatic Timestamps
- `created_at`: Set once on creation
- `updated_at`: Automatically updates on modification
- Configured via SQLAlchemy: `onupdate=datetime.utcnow`

### 4. Transaction Safety
- All operations wrapped in database transactions
- **Commit**: Changes saved permanently
- **Rollback**: On error, all changes reverted
- Example:
  ```python
  try:
      db.add(portfolio)
      db.commit()  # Persist to database
  except Exception as e:
      db.rollback()  # Revert changes
      raise
  ```

---

## Performance Optimization

### 1. Connection Pooling
- **Pool Size**: 10 persistent connections
- **Max Overflow**: 20 additional connections on demand
- **Pool Recycle**: Connections recycled every hour
- **Benefits**: Reduced connection overhead, improved throughput

### 2. Redis Caching
- **Cache Layer**: Redis stores frequently accessed data
- **TTL**: Time-to-live for cached entries
- **Invalidation**: Cache cleared on updates
- **Used For**:
  - Portfolio metadata
  - Stock price data
  - Analysis results (MVO, VaR, Monte Carlo)

### 3. Eager Loading
- **Relationships**: Stocks loaded with portfolio in single query
- **No N+1 Queries**: Avoids multiple round trips to database
- **SQLAlchemy**: Automatic via `relationship()` configuration

---

## Backup & Recovery

### Database Backup
```bash
# Backup all portfolios
pg_dump -U postgres -d chat_fundamentals -t portfolios -t portfolio_stocks > portfolios_backup.sql

# Restore from backup
psql -U postgres -d chat_fundamentals < portfolios_backup.sql
```

### Export Portfolio Data (JSON)
```bash
# Export all portfolios
curl http://localhost:8000/api/portfolios > portfolios_export.json

# Export single portfolio
curl http://localhost:8000/api/portfolios/1 > portfolio_1.json
```

---

## Migration Management

Migrations are managed via **Alembic** (SQLAlchemy migration tool).

### Create Migration
```bash
cd backend
alembic revision --autogenerate -m "Add portfolio tables"
```

### Apply Migration
```bash
alembic upgrade head
```

### Migration History
```bash
alembic history
```

---

## Monitoring & Health Checks

### Database Health Check
```bash
curl http://localhost:8000/health
```

**Response**:
```json
{
  "status": "healthy",
  "database": true,
  "redis": true,
  "timescaledb": true
}
```

### Check Portfolio Count
```bash
curl http://localhost:8000/api/portfolios | jq 'length'
# Output: 4
```

---

## Summary

✅ **Full Persistence**: All portfolios stored in PostgreSQL
✅ **Relational Integrity**: Foreign keys enforce consistency
✅ **ACID Transactions**: Data safety guaranteed
✅ **Cascade Operations**: Automatic cleanup on delete
✅ **Connection Pooling**: Optimized for performance
✅ **Redis Caching**: Fast retrieval for frequent queries
✅ **Migration Support**: Schema evolution via Alembic
✅ **Backup Ready**: Standard PostgreSQL tools work

**Current Status**: 4 portfolios with 11 stock entries fully persisted in database.
