# routers/researcher.py

from fastapi import APIRouter, HTTPException, Response
from models.analyze_models import UserQuery
from models.research_models import AcademicResponse, ReportInput
from workflows.research import run_research_flow_async
from core.logger_config import setup_logger
import time
import asyncio
from md2pdf.core import md2pdf
import tempfile
import os
import uuid


router = APIRouter(
    prefix="/researcher",
    tags=["Deep Research with GPT‑Researcher"],
)

logger = setup_logger().getChild("researcher")

@router.post("/report", response_model=AcademicResponse)
async def deep_research_chat(request: UserQuery, user: str = "dev"):
    logger.info(f"👤 Authenticated as: {user}")  # Authentication logic neutralized here

    try:
        user_query = request.user_query
        logger.info(f"[REQUEST] User query: {user_query}")

        start_time = time.time()
        logger.info("[FLOW] Starting GPT‑Researcher flow...")

        result = await run_research_flow_async(user_query)

        elapsed = time.time() - start_time
        logger.info(f"[FLOW] Research flow completed in {elapsed:.2f}s")

        return result

    except Exception as e:
        logger.error("Error in /researcher/report endpoint", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export-pdf")
async def export_pdf_report(request: ReportInput):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".md") as md_file:
        md_file.write(request.report_md.encode("utf-8"))
        md_path = md_file.name

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        pdf_path = tmp.name
        md2pdf(pdf_path, md_file_path=md_path)

        with open(pdf_path, "rb") as f:
            pdf_data = f.read()

        os.unlink(pdf_path)
        os.unlink(md_path)

    file_id = str(uuid.uuid4())[:8]
    filename = f"gpt_research_{file_id}.pdf"

    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
