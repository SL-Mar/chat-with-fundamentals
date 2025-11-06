"""
SEC Filings API Router
Endpoints for downloading, indexing, and querying SEC filings
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import Response, HTMLResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import logging
from pathlib import Path

from services.sec_rag_service import SECFilingsRAG, FilingType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sec-filings", tags=["sec-filings"])

# Initialize RAG service (singleton)
sec_rag = SECFilingsRAG()


# Request/Response models
class IndexFilingRequest(BaseModel):
    """Request to index SEC filings for a company"""
    ticker: str = Field(..., description="Stock ticker symbol")
    filing_types: List[FilingType] = Field(
        default=["10-K", "10-Q"],
        description="Types of filings to index"
    )
    limit_per_type: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Number of each filing type to index"
    )


class SearchRequest(BaseModel):
    """Request to search indexed filings"""
    ticker: str = Field(..., description="Stock ticker symbol")
    query: str = Field(..., description="Search query")
    k: int = Field(default=5, ge=1, le=20, description="Number of results")
    filing_type: Optional[FilingType] = Field(
        default=None,
        description="Optional filter by filing type"
    )


class SearchResult(BaseModel):
    """Search result from SEC filings"""
    content: str
    metadata: dict
    relevance_score: Optional[float] = None


class IndexStatus(BaseModel):
    """Status of indexing operation"""
    ticker: str
    status: str
    chunks_indexed: dict
    message: str


# Endpoints
@router.post("/index", response_model=IndexStatus)
async def index_filings(request: IndexFilingRequest, background_tasks: BackgroundTasks):
    """
    Download and index SEC filings for a company

    This endpoint will:
    1. Download the specified SEC filings from EDGAR
    2. Parse and chunk the documents
    3. Create vector embeddings
    4. Store in ChromaDB for semantic search

    Note: Indexing happens in the background. The endpoint returns immediately.
    """
    try:
        logger.info(f"Indexing request for {request.ticker}: {request.filing_types}")

        # Check if already indexed (TEMPORARILY DISABLED for re-indexing)
        # stats = sec_rag.get_collection_stats(request.ticker)
        #
        # if stats.get("total_chunks", 0) > 0:
        #     return IndexStatus(
        #         ticker=request.ticker,
        #         status="already_indexed",
        #         chunks_indexed={},
        #         message=f"Already indexed {stats['total_chunks']} chunks for {request.ticker}"
        #     )

        # Start indexing in background
        def index_task():
            try:
                results = sec_rag.index_company(
                    ticker=request.ticker,
                    filing_types=request.filing_types,
                    limit_per_type=request.limit_per_type
                )
                logger.info(f"Indexing completed for {request.ticker}: {results}")
            except Exception as e:
                logger.error(f"Background indexing failed for {request.ticker}: {e}")

        background_tasks.add_task(index_task)

        return IndexStatus(
            ticker=request.ticker,
            status="indexing_started",
            chunks_indexed={},
            message=f"Indexing started for {request.ticker}. This may take a few minutes."
        )

    except Exception as e:
        logger.error(f"Failed to start indexing for {request.ticker}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search", response_model=List[SearchResult])
async def search_filings(request: SearchRequest):
    """
    Search indexed SEC filings using semantic search

    Returns relevant chunks from the company's SEC filings based on your query.
    """
    try:
        logger.info(f"Search request for {request.ticker}: {request.query[:100]}")

        # Check if indexed
        stats = sec_rag.get_collection_stats(request.ticker)

        if stats.get("total_chunks", 0) == 0:
            raise HTTPException(
                status_code=404,
                detail=f"No indexed filings found for {request.ticker}. Please index first."
            )

        # Perform search
        results = sec_rag.search(
            ticker=request.ticker,
            query=request.query,
            k=request.k,
            filing_type=request.filing_type
        )

        # Format results
        search_results = [
            SearchResult(
                content=doc.page_content,
                metadata=doc.metadata,
                relevance_score=None  # ChromaDB doesn't return scores by default
            )
            for doc in results
        ]

        return search_results

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Search failed for {request.ticker}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/{ticker}")
async def get_filing_stats(ticker: str):
    """Get statistics about indexed filings for a company"""
    try:
        stats = sec_rag.get_collection_stats(ticker)

        if stats.get("total_chunks", 0) == 0:
            raise HTTPException(
                status_code=404,
                detail=f"No indexed filings found for {ticker}"
            )

        return stats

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get stats for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/indexed-companies")
async def list_indexed_companies():
    """List all companies with indexed SEC filings"""
    try:
        companies = sec_rag.list_indexed_companies()

        return {
            "companies": companies,
            "count": len(companies)
        }

    except Exception as e:
        logger.error(f"Failed to list indexed companies: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/qa")
async def qa_filings(request: SearchRequest):
    """
    Question-answering over SEC filings using RAG

    This endpoint:
    1. Searches for relevant chunks from SEC filings
    2. Uses LLM to generate an answer based on the retrieved context
    """
    try:
        from core.llm_provider import get_llm

        logger.info(f"Q&A request for {request.ticker}: {request.query[:100]}")

        # Check if indexed
        stats = sec_rag.get_collection_stats(request.ticker)

        if stats.get("total_chunks", 0) == 0:
            raise HTTPException(
                status_code=404,
                detail=f"No indexed filings found for {request.ticker}. Please index first."
            )

        # Perform search
        results = sec_rag.search(
            ticker=request.ticker,
            query=request.query,
            k=request.k,
            filing_type=request.filing_type
        )

        if not results:
            return {
                "answer": "No relevant information found in SEC filings.",
                "sources": []
            }

        # Build context from search results
        context = "\n\n".join([
            f"[{doc.metadata.get('filing_type', 'Unknown')} - {doc.metadata.get('filing_date', 'Unknown date')}]\n{doc.page_content}"
            for doc in results
        ])

        # Generate answer using LLM
        llm = get_llm(flow="sec_filings", role="store")

        prompt = f"""You are a financial analyst assistant. Answer the question based ONLY on the provided context from SEC filings.

Question: {request.query}

Context from SEC filings for {request.ticker}:
{context}

Instructions:
- Provide a clear, concise answer
- Cite specific filing types and dates when relevant
- If the context doesn't contain enough information, say so
- Do not make up information

Answer:"""

        response = llm.invoke(prompt)
        answer = response.content if hasattr(response, 'content') else str(response)

        return {
            "answer": answer,
            "sources": [
                {
                    "filing_type": doc.metadata.get("filing_type"),
                    "filing_date": doc.metadata.get("filing_date"),
                    "excerpt": doc.page_content[:200] + "..."
                }
                for doc in results
            ],
            "ticker": request.ticker,
            "query": request.query
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Q&A failed for {request.ticker}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/view/{ticker}/{filing_type}/{filing_date}")
async def view_filing(ticker: str, filing_type: str, filing_date: str):
    """
    Serve SEC filing HTML for viewing

    Args:
        ticker: Stock ticker symbol
        filing_type: Type of filing (10-K, 10-Q, 8-K)
        filing_date: Filing date (YYYY-MM-DD or YYYYMMDD format)

    Returns:
        HTML content of the filing
    """
    try:
        # Normalize filing date (remove hyphens if present)
        filing_date_clean = filing_date.replace("-", "")

        # Locate filing directory
        filing_base = Path("./sec_filings_data/sec-edgar-filings") / ticker / filing_type

        if not filing_base.exists():
            raise HTTPException(
                status_code=404,
                detail=f"No {filing_type} filings found for {ticker}"
            )

        # Find the matching filing folder by date
        matching_filing = None
        for filing_folder in filing_base.iterdir():
            if filing_folder.is_dir():
                # Read full-submission.txt to get filing date
                submission_file = filing_folder / "full-submission.txt"
                if submission_file.exists():
                    with open(submission_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read(2000)  # Read first 2000 chars to find date

                        # Look for FILED AS OF DATE
                        if f"FILED AS OF DATE:\t\t{filing_date_clean}" in content:
                            matching_filing = submission_file
                            break

        if not matching_filing:
            raise HTTPException(
                status_code=404,
                detail=f"No {filing_type} filing found for {ticker} on {filing_date}"
            )

        # Extract HTML from full-submission.txt
        with open(matching_filing, 'r', encoding='utf-8', errors='ignore') as f:
            full_content = f.read()

        # Find the main HTML document (usually <TYPE>8-K, 10-K, or 10-Q)
        # The HTML is between <TEXT> and </TEXT> tags
        start_marker = f"<TYPE>{filing_type}\n"
        if start_marker in full_content:
            doc_start = full_content.find(start_marker)
            text_start = full_content.find("<TEXT>", doc_start)
            text_end = full_content.find("</TEXT>", text_start)

            if text_start != -1 and text_end != -1:
                html_content = full_content[text_start + 6:text_end].strip()
                return HTMLResponse(content=html_content)

        # Fallback: return the whole file as text
        raise HTTPException(
            status_code=500,
            detail="Could not extract HTML from filing"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to serve filing {ticker}/{filing_type}/{filing_date}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
