"""
Quant Research RAG API Router
Endpoints for indexing and querying quantitative finance research
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional
import logging
from pathlib import Path
import shutil

from services.quant_research_rag_service import quant_research_rag

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quant-research", tags=["quant-research"])


# Request/Response Models
class SearchRequest(BaseModel):
    """Request to search research documents"""
    query: str = Field(..., description="Search query")
    k: int = Field(default=5, ge=1, le=20, description="Number of results")
    category: Optional[str] = Field(default=None, description="Filter by category")
    year_min: Optional[int] = Field(default=None, description="Minimum year")
    year_max: Optional[int] = Field(default=None, description="Maximum year")


class SearchResult(BaseModel):
    """Search result from research documents"""
    content: str
    metadata: dict


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    authors: Optional[str] = Form(None),
    year: Optional[int] = Form(None),
    category: str = Form("general"),
    tags: Optional[str] = Form(None)
):
    """
    Upload and index a research PDF.

    Categories: strategy, risk, portfolio, general
    Tags: comma-separated list
    """
    logger.info(f"Upload request received: filename={file.filename}, title={title}")
    try:
        # Validate file type (case-insensitive)
        if not file.filename or not file.filename.lower().endswith('.pdf'):
            logger.error(f"File validation failed: filename={file.filename}")
            raise HTTPException(status_code=400, detail="Only PDF files are supported")

        # Save uploaded file
        file_path = Path("./quant_research_data") / file.filename
        file_path.parent.mkdir(parents=True, exist_ok=True)

        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(f"Uploaded file: {file.filename}")

        # Parse tags
        tag_list = [t.strip() for t in tags.split(",")] if tags else None

        # Index in background
        def index_task():
            try:
                chunks = quant_research_rag.index_document(
                    file_path=file_path,
                    title=title,
                    authors=authors,
                    year=year,
                    category=category,
                    tags=tag_list
                )
                logger.info(f"Indexed {chunks} chunks from {title}")
            except Exception as e:
                logger.error(f"Background indexing failed for {title}: {e}")

        background_tasks.add_task(index_task)

        return {
            "message": "Upload successful, indexing started",
            "filename": file.filename,
            "title": title
        }

    except Exception as e:
        logger.error(f"Failed to upload document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search", response_model=List[SearchResult])
async def search_research(request: SearchRequest):
    """
    Search indexed research documents.

    Returns relevant chunks with metadata.
    """
    try:
        results = quant_research_rag.search(
            query=request.query,
            k=request.k,
            category=request.category,
            year_min=request.year_min,
            year_max=request.year_max
        )

        return [
            SearchResult(
                content=doc.page_content,
                metadata=doc.metadata
            )
            for doc in results
        ]

    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/qa")
async def qa_research(request: SearchRequest):
    """
    Question-answering over research documents.

    Uses RAG to generate answers based on indexed research.
    """
    try:
        from core.llm_provider import get_llm

        # Search for relevant documents
        results = quant_research_rag.search(
            query=request.query,
            k=request.k,
            category=request.category,
            year_min=request.year_min,
            year_max=request.year_max
        )

        if not results:
            return {
                "answer": "No relevant research found.",
                "sources": []
            }

        # Build context
        context = "\n\n".join([
            f"[{doc.metadata.get('title', 'Unknown')} - {doc.metadata.get('year', 'Unknown')}]\n{doc.page_content}"
            for doc in results
        ])

        # Generate answer
        llm = get_llm(flow="quant_research", role="store")

        prompt = f"""You are a quantitative finance research assistant. Answer the question based ONLY on the provided research papers.

Question: {request.query}

Research Papers Context:
{context}

Instructions:
- Provide a clear, concise answer
- Cite specific papers and years when relevant
- If the context doesn't contain enough information, say so
- Do not make up information

Answer:"""

        response = llm.invoke(prompt)
        answer = response.content if hasattr(response, 'content') else str(response)

        return {
            "answer": answer,
            "sources": [
                {
                    "title": doc.metadata.get("title"),
                    "authors": doc.metadata.get("authors"),
                    "year": doc.metadata.get("year"),
                    "category": doc.metadata.get("category"),
                    "excerpt": doc.page_content[:200] + "..."
                }
                for doc in results
            ],
            "query": request.query
        }

    except Exception as e:
        logger.error(f"Q&A failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_stats():
    """Get statistics about indexed research"""
    return quant_research_rag.get_collection_stats()


@router.get("/documents")
async def list_documents():
    """List all indexed research documents"""
    return {
        "documents": quant_research_rag.list_documents()
    }
