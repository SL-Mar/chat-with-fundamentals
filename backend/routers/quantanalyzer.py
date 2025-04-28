# backend/routers/quantanalyzer.py

from fastapi import APIRouter, HTTPException, Query
from models.analyze_models import EODResult, OLHCV
from core.logger_config import setup_logger
from core.config import settings
import httpx

router = APIRouter(
    prefix="/quantanalyzer",
    tags=["Quantitative Analysis"]
)

router = APIRouter(prefix="/quantanalyzer", tags=["Quantitative Analysis"])
logger = setup_logger().getChild("quantanalyzer")

@router.get("/eod", response_model=EODResult)
async def get_eod_data(
    ticker: str = Query(..., description="Ticker symbol, e.g., TSLA"),
    limit:  int  = Query(100,  description="Number of recent rows to return (max 5 000)"),
):
    url = (
        f"https://eodhd.com/api/eod/{ticker}.US"
        f"?api_token={settings.eodhd_api_key}"
        f"&fmt=json"       # ← JSON, not CSV
        f"&order=d"        # ← newest → oldest
    )

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=20)
            resp.raise_for_status()
            raw: list[dict] = resp.json()          # already a list of dicts
    except Exception as e:
        # never log the full URL (would expose the api_token)
        logger.error("EODHD fetch failed for %s (%s)", ticker, e.__class__.__name__)
        raise HTTPException(502, "Data provider error")
    
    # keep <limit> newest bars, then put them back in chronological order
    rows = raw[:limit][::-1]                       # reverse in-place

    data = [OLHCV(**row) for row in rows]          # pydantic validation

    logger.info(f"[EOD] ✅ {len(data)} candles for {ticker} (latest first in feed)")

    # by_alias=True ensures keys are lower-case as expected by the React code
    return EODResult(ticker=ticker, data=data).model_dump(by_alias=True)


    # ➍  send camel-case keys because the React code expects them
    return EODResult(ticker=ticker, data=data).model_dump(by_alias=True)
