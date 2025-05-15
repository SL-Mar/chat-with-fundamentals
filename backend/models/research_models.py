# models/research_models.py

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl

class Paper(BaseModel):
    source: str = Field(..., description="The tool or platform that provided the source.")
    title: str
    authors: Optional[List[str]] = []
    published: Optional[datetime] = None
    summary: Optional[str] = None
    url: Optional[HttpUrl] = None
    image_url: Optional[HttpUrl] = None  # If available from GPT-Researcher

class AcademicResponse(BaseModel):
    papers: List[Paper]
    full_report: Optional[str] = None
    metadata: Optional[dict] = None

class ReportInput(BaseModel):
    report_md: str
