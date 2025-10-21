# routers/quantanalyzer.py

from fastapi import APIRouter, HTTPException, Query
from models.analyze_models import EODResult, OLHCV
from core.logger_config import setup_logger
from core.config import settings
import httpx

router = APIRouter(
    prefix="/quantanalyzer",
    tags=["Quantitative Analysis"]
)

logger = setup_logger().getChild("quantanalyzer")

@router.get("/eod", response_model=EODResult)
async def get_eod_data(
    ticker: str = Query(..., description="Ticker symbol, e.g., TSLA"),
    limit:  int  = Query(100,  description="Number of recent rows to return (max 5 000)"),
):
    url = f"https://eodhd.com/api/eod/{ticker}.US"
    params = {
      "fmt":   "json",   # ← JSON, not CSV
      "order": "d",      # ← newest → oldest
      "api_token": settings.eodhd_api_key,  # Use query parameter instead of Bearer auth
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=20)
            resp.raise_for_status()
            raw: list[dict] = resp.json()
    except Exception as e:
        # note: we never log the URL or the token,
        # only the ticker and the exception type
        logger.error("EODHD fetch failed for %s (%s)", ticker, e.__class__.__name__)
        raise HTTPException(502, "Data provider error")

    # take <limit> newest bars, then reverse into chronological order
    rows = raw[:limit][::-1]
    data = [OLHCV(**row) for row in rows]

    logger.info("[EOD] fetched %d candles for %s", len(data), ticker)
    return EODResult(ticker=ticker, data=data).model_dump(by_alias=True)
