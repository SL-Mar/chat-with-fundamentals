# routers/portfolios.py - Portfolio management endpoints

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import sqlite3
import os
from pathlib import Path

router = APIRouter(
    prefix="/portfolios",
    tags=["Portfolio Management"]
)

# Database path
DB_PATH = Path(__file__).parent.parent / "portfolios.db"

# === Models ===

class Portfolio(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    created_at: Optional[str] = None

class Holding(BaseModel):
    id: Optional[int] = None
    portfolio_id: int
    symbol: str
    quantity: float
    avg_cost: float
    added_at: Optional[str] = None

class HoldingWithPrice(BaseModel):
    id: int
    portfolio_id: int
    symbol: str
    name: str
    quantity: float
    avg_cost: float
    current_price: float
    value: float
    gain_loss: float
    gain_loss_percent: float
    weight: float
    added_at: str

# === Database Initialization ===

def init_db():
    """Initialize SQLite database with portfolios and holdings tables"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Portfolios table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS portfolios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Holdings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS holdings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            portfolio_id INTEGER NOT NULL,
            symbol TEXT NOT NULL,
            quantity REAL NOT NULL,
            avg_cost REAL NOT NULL,
            added_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
        )
    ''')

    conn.commit()
    conn.close()

# Initialize database on module load
init_db()

# === Helper Functions ===

def get_db():
    """Get database connection"""
    return sqlite3.connect(DB_PATH)

async def get_current_price(symbol: str) -> float:
    """Get current price for a symbol from EODHD API"""
    from core.config import settings
    import httpx

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://eodhd.com/api/real-time/{symbol}",
                params={"api_token": settings.eodhd_api_key, "fmt": "json"},
                timeout=10
            )
            resp.raise_for_status()
            data = resp.json()
            return float(data.get("close", 0))
    except:
        return 0.0

# === Endpoints ===

@router.get("/", response_model=List[Portfolio])
async def list_portfolios():
    """List all portfolios"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, description, created_at FROM portfolios ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()

    return [
        Portfolio(id=row[0], name=row[1], description=row[2], created_at=row[3])
        for row in rows
    ]

@router.post("/", response_model=Portfolio)
async def create_portfolio(portfolio: Portfolio):
    """Create a new portfolio"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO portfolios (name, description) VALUES (?, ?)",
        (portfolio.name, portfolio.description)
    )
    conn.commit()
    portfolio_id = cursor.lastrowid

    cursor.execute("SELECT id, name, description, created_at FROM portfolios WHERE id = ?", (portfolio_id,))
    row = cursor.fetchone()
    conn.close()

    return Portfolio(id=row[0], name=row[1], description=row[2], created_at=row[3])

@router.get("/{portfolio_id}", response_model=Portfolio)
async def get_portfolio(portfolio_id: int):
    """Get portfolio details"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, description, created_at FROM portfolios WHERE id = ?", (portfolio_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(404, "Portfolio not found")

    return Portfolio(id=row[0], name=row[1], description=row[2], created_at=row[3])

@router.delete("/{portfolio_id}")
async def delete_portfolio(portfolio_id: int):
    """Delete a portfolio"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM portfolios WHERE id = ?", (portfolio_id,))
    conn.commit()
    affected = cursor.rowcount
    conn.close()

    if affected == 0:
        raise HTTPException(404, "Portfolio not found")

    return {"message": "Portfolio deleted"}

@router.get("/{portfolio_id}/holdings", response_model=List[HoldingWithPrice])
async def get_holdings(portfolio_id: int):
    """Get all holdings for a portfolio with current prices"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, portfolio_id, symbol, quantity, avg_cost, added_at FROM holdings WHERE portfolio_id = ?",
        (portfolio_id,)
    )
    rows = cursor.fetchall()
    conn.close()

    holdings_with_prices = []
    total_value = 0.0

    # Fetch current prices for all holdings
    for row in rows:
        holding_id, pf_id, symbol, quantity, avg_cost, added_at = row
        current_price = await get_current_price(symbol)
        value = quantity * current_price
        total_value += value

        holdings_with_prices.append({
            "id": holding_id,
            "portfolio_id": pf_id,
            "symbol": symbol,
            "quantity": quantity,
            "avg_cost": avg_cost,
            "current_price": current_price,
            "value": value,
            "gain_loss": (current_price - avg_cost) * quantity,
            "gain_loss_percent": ((current_price - avg_cost) / avg_cost * 100) if avg_cost > 0 else 0,
            "weight": 0,  # Will calculate after total_value is known
            "added_at": added_at,
            "name": symbol.split(".")[0]  # Placeholder - could fetch from API
        })

    # Calculate weights
    for holding in holdings_with_prices:
        holding["weight"] = (holding["value"] / total_value * 100) if total_value > 0 else 0

    return holdings_with_prices

@router.post("/{portfolio_id}/holdings", response_model=Holding)
async def add_holding(portfolio_id: int, holding: Holding):
    """Add a holding to a portfolio"""
    # Verify portfolio exists
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM portfolios WHERE id = ?", (portfolio_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(404, "Portfolio not found")

    # Insert holding
    cursor.execute(
        "INSERT INTO holdings (portfolio_id, symbol, quantity, avg_cost) VALUES (?, ?, ?, ?)",
        (portfolio_id, holding.symbol.upper(), holding.quantity, holding.avg_cost)
    )
    conn.commit()
    holding_id = cursor.lastrowid

    cursor.execute(
        "SELECT id, portfolio_id, symbol, quantity, avg_cost, added_at FROM holdings WHERE id = ?",
        (holding_id,)
    )
    row = cursor.fetchone()
    conn.close()

    return Holding(
        id=row[0],
        portfolio_id=row[1],
        symbol=row[2],
        quantity=row[3],
        avg_cost=row[4],
        added_at=row[5]
    )

@router.put("/{portfolio_id}/holdings/{holding_id}", response_model=Holding)
async def update_holding(portfolio_id: int, holding_id: int, holding: Holding):
    """Update a holding"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE holdings SET symbol = ?, quantity = ?, avg_cost = ? WHERE id = ? AND portfolio_id = ?",
        (holding.symbol.upper(), holding.quantity, holding.avg_cost, holding_id, portfolio_id)
    )
    conn.commit()
    affected = cursor.rowcount

    if affected == 0:
        conn.close()
        raise HTTPException(404, "Holding not found")

    cursor.execute(
        "SELECT id, portfolio_id, symbol, quantity, avg_cost, added_at FROM holdings WHERE id = ?",
        (holding_id,)
    )
    row = cursor.fetchone()
    conn.close()

    return Holding(
        id=row[0],
        portfolio_id=row[1],
        symbol=row[2],
        quantity=row[3],
        avg_cost=row[4],
        added_at=row[5]
    )

@router.delete("/{portfolio_id}/holdings/{holding_id}")
async def delete_holding(portfolio_id: int, holding_id: int):
    """Delete a holding"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM holdings WHERE id = ? AND portfolio_id = ?", (holding_id, portfolio_id))
    conn.commit()
    affected = cursor.rowcount
    conn.close()

    if affected == 0:
        raise HTTPException(404, "Holding not found")

    return {"message": "Holding deleted"}
