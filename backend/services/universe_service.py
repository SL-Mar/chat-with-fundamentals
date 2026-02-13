"""Universe lifecycle management — CRUD + data access."""

import logging
import uuid
from datetime import date, datetime
from typing import Optional
from sqlalchemy import select, func, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database.models.universe_registry import (
    Universe, UniverseTicker, UniverseStatus, TickerStatus, SourceType,
)
from database.models.universe_data import UniverseOHLCV, UniverseFundamental
from database.universe_db_manager import db_manager

logger = logging.getLogger(__name__)


async def create_universe(
    name: str,
    start_date: date,
    end_date: date,
    granularities: list[str],
    sector: str = None,
    etf_symbol: str = None,
    source_type: str = "sector",
) -> Universe:
    db_name = f"universe_{uuid.uuid4().hex[:12]}"
    universe = Universe(
        name=name,
        source_type=source_type,
        sector=sector,
        etf_symbol=etf_symbol.upper() if etf_symbol else None,
        start_date=start_date,
        end_date=end_date,
        granularities=granularities,
        db_name=db_name,
        status=UniverseStatus.CREATING,
    )
    async with db_manager.get_registry_session() as session:
        session.add(universe)
        await session.flush()
        universe_id = universe.id
    source = etf_symbol if source_type == "etf" else sector
    logger.info(f"Created universe {universe_id}: {name} ({source_type}: {source})")
    return universe


async def list_universes() -> list[dict]:
    async with db_manager.get_registry_session() as session:
        result = await session.execute(
            select(Universe).order_by(Universe.created_at.desc())
        )
        universes = result.scalars().all()
        return [
            {
                "id": str(u.id),
                "name": u.name,
                "source_type": u.source_type or "sector",
                "sector": u.sector,
                "etf_symbol": u.etf_symbol,
                "start_date": u.start_date.isoformat(),
                "end_date": u.end_date.isoformat(),
                "granularities": u.granularities,
                "status": u.status.value,
                "total_tickers": u.total_tickers,
                "tickers_completed": u.tickers_completed,
                "error_message": u.error_message,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in universes
        ]


async def get_universe(universe_id: str) -> Optional[dict]:
    async with db_manager.get_registry_session() as session:
        result = await session.execute(
            select(Universe)
            .options(selectinload(Universe.tickers))
            .where(Universe.id == uuid.UUID(universe_id))
        )
        u = result.scalar_one_or_none()
        if not u:
            return None
        return {
            "id": str(u.id),
            "name": u.name,
            "source_type": u.source_type or "sector",
            "sector": u.sector,
            "etf_symbol": u.etf_symbol,
            "start_date": u.start_date.isoformat(),
            "end_date": u.end_date.isoformat(),
            "granularities": u.granularities,
            "db_name": u.db_name,
            "status": u.status.value,
            "total_tickers": u.total_tickers,
            "tickers_completed": u.tickers_completed,
            "error_message": u.error_message,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "tickers": [
                {
                    "ticker": t.ticker,
                    "company_name": t.company_name,
                    "ohlcv_status": t.ohlcv_status.value,
                    "fundamentals_status": t.fundamentals_status.value,
                }
                for t in u.tickers
            ],
        }


async def delete_universe(universe_id: str) -> bool:
    async with db_manager.get_registry_session() as session:
        result = await session.execute(
            select(Universe).where(Universe.id == uuid.UUID(universe_id))
        )
        universe = result.scalar_one_or_none()
        if not universe:
            return False

        db_name = universe.db_name

        # Delete from registry
        await session.execute(
            delete(UniverseTicker).where(UniverseTicker.universe_id == universe.id)
        )
        await session.execute(
            delete(Universe).where(Universe.id == universe.id)
        )

    # Drop the universe database
    try:
        await db_manager.drop_universe_database(db_name)
    except Exception as e:
        logger.error(f"Failed to drop database {db_name}: {e}")

    logger.info(f"Deleted universe {universe_id}")
    return True


async def get_universe_progress(universe_id: str) -> Optional[dict]:
    async with db_manager.get_registry_session() as session:
        result = await session.execute(
            select(Universe).where(Universe.id == uuid.UUID(universe_id))
        )
        u = result.scalar_one_or_none()
        if not u:
            return None
        return {
            "status": u.status.value,
            "total_tickers": u.total_tickers,
            "tickers_completed": u.tickers_completed,
            "progress_pct": round(
                (u.tickers_completed / u.total_tickers * 100) if u.total_tickers > 0 else 0, 1
            ),
            "error_message": u.error_message,
        }


async def update_universe_status(
    universe_id: uuid.UUID,
    status: UniverseStatus,
    error_message: str = None,
    total_tickers: int = None,
    tickers_completed: int = None,
) -> None:
    async with db_manager.get_registry_session() as session:
        values = {"status": status}
        if error_message is not None:
            values["error_message"] = error_message
        if total_tickers is not None:
            values["total_tickers"] = total_tickers
        if tickers_completed is not None:
            values["tickers_completed"] = tickers_completed
        await session.execute(
            update(Universe).where(Universe.id == universe_id).values(**values)
        )


async def query_ohlcv(
    db_name: str,
    ticker: str = None,
    granularity: str = "d",
    from_date: str = None,
    to_date: str = None,
    limit: int = 1000,
) -> list[dict]:
    async with db_manager.get_universe_session(db_name) as session:
        stmt = select(UniverseOHLCV)
        if ticker:
            stmt = stmt.where(UniverseOHLCV.ticker == ticker.upper())
        if granularity:
            stmt = stmt.where(UniverseOHLCV.granularity == granularity)
        if from_date:
            stmt = stmt.where(UniverseOHLCV.timestamp >= datetime.strptime(from_date, "%Y-%m-%d"))
        if to_date:
            stmt = stmt.where(UniverseOHLCV.timestamp <= datetime.strptime(to_date, "%Y-%m-%d"))
        stmt = stmt.order_by(UniverseOHLCV.timestamp.asc()).limit(limit)

        result = await session.execute(stmt)
        rows = result.scalars().all()
        return [
            {
                "ticker": r.ticker,
                "granularity": r.granularity,
                "timestamp": r.timestamp.isoformat(),
                "open": r.open,
                "high": r.high,
                "low": r.low,
                "close": r.close,
                "volume": r.volume,
                "adjusted_close": r.adjusted_close,
            }
            for r in rows
        ]


async def query_fundamentals(
    db_name: str,
    ticker: str = None,
    fields: list[str] = None,
    page: int = 1,
    page_size: int = 50,
) -> dict:
    async with db_manager.get_universe_session(db_name) as session:
        stmt = select(UniverseFundamental)
        if ticker:
            stmt = stmt.where(UniverseFundamental.ticker == ticker.upper())
        stmt = stmt.order_by(
            UniverseFundamental.ticker, UniverseFundamental.date.desc()
        )

        # Count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await session.execute(count_stmt)).scalar()

        # Paginate
        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)
        result = await session.execute(stmt)
        rows = result.scalars().all()

        data = []
        for r in rows:
            row_dict = {
                "ticker": r.ticker,
                "date": r.date.isoformat(),
                "period_type": r.period_type,
            }
            if fields:
                for f in fields:
                    if hasattr(r, f):
                        row_dict[f] = getattr(r, f)
            else:
                # Return all non-null fields
                for col in UniverseFundamental.__table__.columns:
                    if col.name not in ("id", "raw_data"):
                        val = getattr(r, col.name)
                        if val is not None:
                            row_dict[col.name] = val if not isinstance(val, date) else val.isoformat()
            data.append(row_dict)

        return {"total": total, "page": page, "page_size": page_size, "data": data}


async def list_universe_tickers(universe_id: str) -> list[dict]:
    async with db_manager.get_registry_session() as session:
        result = await session.execute(
            select(UniverseTicker).where(
                UniverseTicker.universe_id == uuid.UUID(universe_id)
            )
        )
        tickers = result.scalars().all()
        return [
            {
                "ticker": t.ticker,
                "company_name": t.company_name,
                "ohlcv_status": t.ohlcv_status.value,
                "fundamentals_status": t.fundamentals_status.value,
            }
            for t in tickers
        ]
