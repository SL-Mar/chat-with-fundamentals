"""Universe CRUD router — create, list, get, delete, data access."""

import logging
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from pydantic import BaseModel
from datetime import date

from services import universe_service
from ingestion.universe_populator import populate_universe

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/universes", tags=["universes"])


class CreateUniverseRequest(BaseModel):
    name: str
    source_type: str = "sector"  # "sector" or "etf"
    sector: Optional[str] = None
    etf_symbol: Optional[str] = None
    start_date: date
    end_date: date
    granularities: list[str] = ["d"]


@router.post("", status_code=202)
async def create_universe(req: CreateUniverseRequest, background_tasks: BackgroundTasks):
    if req.source_type == "etf" and not req.etf_symbol:
        raise HTTPException(status_code=400, detail="etf_symbol required for ETF universe")
    if req.source_type == "sector" and not req.sector:
        raise HTTPException(status_code=400, detail="sector required for sector universe")

    universe = await universe_service.create_universe(
        name=req.name,
        start_date=req.start_date,
        end_date=req.end_date,
        granularities=req.granularities,
        sector=req.sector,
        etf_symbol=req.etf_symbol,
        source_type=req.source_type,
    )
    background_tasks.add_task(populate_universe, universe)
    return {"id": str(universe.id), "status": "creating", "db_name": universe.db_name}


@router.get("")
async def list_universes():
    return await universe_service.list_universes()


@router.get("/{universe_id}")
async def get_universe(universe_id: str):
    result = await universe_service.get_universe(universe_id)
    if not result:
        raise HTTPException(status_code=404, detail="Universe not found")
    return result


@router.delete("/{universe_id}")
async def delete_universe(universe_id: str):
    deleted = await universe_service.delete_universe(universe_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Universe not found")
    return {"status": "deleted"}


@router.post("/{universe_id}/refresh", status_code=202)
async def refresh_universe(universe_id: str, background_tasks: BackgroundTasks):
    universe_data = await universe_service.get_universe(universe_id)
    if not universe_data:
        raise HTTPException(status_code=404, detail="Universe not found")

    # Re-fetch from registry to get ORM object
    from database.universe_db_manager import db_manager
    from database.models.universe_registry import Universe, UniverseStatus
    from sqlalchemy import select
    import uuid

    async with db_manager.get_registry_session() as session:
        result = await session.execute(
            select(Universe).where(Universe.id == uuid.UUID(universe_id))
        )
        universe = result.scalar_one_or_none()
        if not universe:
            raise HTTPException(status_code=404, detail="Universe not found")
        universe.status = UniverseStatus.REFRESHING
        universe.tickers_completed = 0

    background_tasks.add_task(populate_universe, universe)
    return {"status": "refreshing"}


@router.get("/{universe_id}/progress")
async def get_progress(universe_id: str):
    result = await universe_service.get_universe_progress(universe_id)
    if not result:
        raise HTTPException(status_code=404, detail="Universe not found")
    return result


@router.get("/{universe_id}/data/ohlcv")
async def get_ohlcv(
    universe_id: str,
    ticker: Optional[str] = Query(None),
    granularity: str = Query("d"),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    limit: int = Query(1000, le=10000),
):
    universe = await universe_service.get_universe(universe_id)
    if not universe:
        raise HTTPException(status_code=404, detail="Universe not found")

    return await universe_service.query_ohlcv(
        db_name=universe["db_name"],
        ticker=ticker,
        granularity=granularity,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
    )


@router.get("/{universe_id}/data/fundamentals")
async def get_fundamentals(
    universe_id: str,
    ticker: Optional[str] = Query(None),
    fields: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, le=200),
):
    universe = await universe_service.get_universe(universe_id)
    if not universe:
        raise HTTPException(status_code=404, detail="Universe not found")

    field_list = fields.split(",") if fields else None
    return await universe_service.query_fundamentals(
        db_name=universe["db_name"],
        ticker=ticker,
        fields=field_list,
        page=page,
        page_size=page_size,
    )


@router.get("/{universe_id}/data/tickers")
async def get_tickers(universe_id: str):
    return await universe_service.list_universe_tickers(universe_id)
