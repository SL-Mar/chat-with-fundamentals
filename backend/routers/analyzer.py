# routers/analyzer.py

from fastapi import APIRouter, HTTPException
from models.analyze_models import UserQuery, Executive_Summary
from workflows.analyze import FundamentalFlow
from core.logger_config import setup_logger
import time
import asyncio

router = APIRouter(
    prefix="/analyzer",      
    tags=["Fundamental analysis with EODHD"],       
)

logger = setup_logger().getChild("analyzer")

@router.post("/chat", response_model=Executive_Summary)
async def fundamentals_chat(request: UserQuery, user: str = "dev"):
    logger.info(f"👤 Authenticated as: {user}")

    try:
        user_query = request.user_query
        logger.info(f"[REQUEST] User query: {user_query}")

        start_time = time.time()

        logger.info("[FLOW] Starting FundamentalFlow...")
        flow = FundamentalFlow()
        flow.inputs = {"user_query": user_query}
        result = await asyncio.to_thread(flow.kickoff)

        elapsed = time.time() - start_time
        logger.info(f"[FLOW] FundamentalFlow completed in {elapsed:.2f}s")

        logger.info(f"[RESULT] Executive Summary: {result}")
        return result

    except Exception as e:
        logger.error("Error in /analyze/chat endpoint", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

