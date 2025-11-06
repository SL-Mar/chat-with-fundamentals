"""
SEC Filings RAG Service
Downloads, processes, and provides semantic search over SEC filings (10-K, 10-Q, 8-K)
"""

import os
import re
import asyncio
from pathlib import Path
from typing import List, Dict, Optional, Literal
from datetime import datetime
import logging

from bs4 import BeautifulSoup
from sec_edgar_downloader import Downloader
import chromadb
from chromadb.config import Settings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
from langchain_community.vectorstores import Chroma

logger = logging.getLogger(__name__)

# Import agent console manager for WebSocket broadcasting
try:
    from core.agent_console_manager import agent_console_manager
    AGENT_CONSOLE_AVAILABLE = True
except ImportError:
    AGENT_CONSOLE_AVAILABLE = False
    logger.warning("Agent console manager not available - live logging disabled")

FilingType = Literal["10-K", "10-Q", "8-K"]


def _broadcast_log(agent: str, status: str, message: str, metadata: Optional[Dict] = None):
    """
    Broadcast log message to Agent Console WebSocket clients.

    Args:
        agent: Agent name (e.g., "SEC Indexer")
        status: Status type (running, success, error, info)
        message: Log message
        metadata: Optional additional metadata
    """
    if not AGENT_CONSOLE_AVAILABLE:
        return

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(agent_console_manager.broadcast({
                "type": "agent_log",
                "agent": agent,
                "status": status,
                "message": message,
                "timestamp": datetime.now().isoformat(),
                "metadata": metadata or {}
            }))
    except Exception as e:
        logger.debug(f"Failed to broadcast log: {e}")


class SECFilingsRAG:
    """RAG system for SEC filings analysis"""

    def __init__(
        self,
        storage_path: str = "./sec_filings_data",
        chroma_path: str = "./chroma_db",
        openai_api_key: Optional[str] = None
    ):
        """
        Initialize SEC RAG system

        Args:
            storage_path: Directory to store downloaded SEC filings
            chroma_path: Directory for ChromaDB vector store
            openai_api_key: OpenAI API key (uses env var if not provided)
        """
        self.storage_path = Path(storage_path)
        self.chroma_path = Path(chroma_path)

        # Create directories
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self.chroma_path.mkdir(parents=True, exist_ok=True)

        # Initialize SEC downloader (requires user agent)
        self.downloader = Downloader(
            "Chat with Fundamentals",
            "admin@example.com",
            str(self.storage_path)
        )

        # Initialize embeddings
        self.embeddings = OpenAIEmbeddings(
            openai_api_key=openai_api_key or os.getenv("OPENAI_API_KEY")
        )

        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

        # Initialize ChromaDB client
        self.chroma_client = chromadb.PersistentClient(
            path=str(self.chroma_path),
            settings=Settings(anonymized_telemetry=False)
        )

        logger.info(f"SEC RAG initialized - storage: {storage_path}, chroma: {chroma_path}")

    def download_filing(
        self,
        ticker: str,
        filing_type: FilingType,
        limit: int = 1,
        after_date: Optional[str] = None,
        before_date: Optional[str] = None
    ) -> List[Path]:
        """
        Download SEC filings for a company

        Args:
            ticker: Stock ticker symbol
            filing_type: Type of filing (10-K, 10-Q, 8-K)
            limit: Maximum number of filings to download
            after_date: Only download filings after this date (YYYY-MM-DD)
            before_date: Only download filings before this date (YYYY-MM-DD)

        Returns:
            List of paths to downloaded filing files
        """
        try:
            logger.info(f"Downloading {filing_type} for {ticker} (limit={limit})")
            _broadcast_log("SEC Indexer", "running", f"Downloading {limit} {filing_type} filing(s) for {ticker}",
                          {"ticker": ticker, "filing_type": filing_type, "limit": limit})

            # Download filings
            self.downloader.get(
                filing_type,
                ticker,
                limit=limit,
                after=after_date,
                before=before_date
            )

            # Find downloaded files
            filing_dir = self.storage_path / "sec-edgar-filings" / ticker / filing_type
            filing_files = []

            if filing_dir.exists():
                for filing_folder in sorted(filing_dir.iterdir(), reverse=True):
                    if filing_folder.is_dir():
                        # Look for full-submission.txt or primary-document.html
                        txt_file = filing_folder / "full-submission.txt"
                        html_file = filing_folder / "primary-document.html"

                        if txt_file.exists():
                            filing_files.append(txt_file)
                        elif html_file.exists():
                            filing_files.append(html_file)

            logger.info(f"Downloaded {len(filing_files)} {filing_type} filings for {ticker}")
            return filing_files[:limit]

        except Exception as e:
            logger.error(f"Failed to download {filing_type} for {ticker}: {e}")
            return []

    def parse_filing(self, filing_path: Path) -> str:
        """
        Parse and extract text from SEC filing

        Args:
            filing_path: Path to filing file

        Returns:
            Extracted text content
        """
        try:
            with open(filing_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            # If HTML file, parse with BeautifulSoup
            if filing_path.suffix == '.html':
                soup = BeautifulSoup(content, 'lxml')

                # Remove script and style elements
                for script in soup(["script", "style"]):
                    script.decompose()

                # Get text
                text = soup.get_text()
            else:
                # Plain text or SGML format
                text = content

            # Clean up text
            text = self._clean_text(text)

            return text

        except Exception as e:
            logger.error(f"Failed to parse {filing_path}: {e}")
            return ""

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)

        # Remove SGML tags
        text = re.sub(r'<[^>]+>', '', text)

        # Remove page markers
        text = re.sub(r'Page \d+ of \d+', '', text)

        # Normalize line breaks
        text = text.replace('\r\n', '\n').replace('\r', '\n')

        return text.strip()

    def index_filing(
        self,
        ticker: str,
        filing_path: Path,
        filing_type: FilingType,
        filing_date: Optional[str] = None
    ) -> int:
        """
        Index a filing into the vector database

        Args:
            ticker: Stock ticker symbol
            filing_path: Path to filing file
            filing_type: Type of filing
            filing_date: Filing date (YYYY-MM-DD)

        Returns:
            Number of chunks indexed
        """
        try:
            # Parse filing text
            text = self.parse_filing(filing_path)

            if not text:
                logger.warning(f"No text extracted from {filing_path}")
                return 0

            # Split into chunks
            documents = self.text_splitter.create_documents(
                texts=[text],
                metadatas=[{
                    "ticker": ticker,
                    "filing_type": filing_type,
                    "filing_date": filing_date or "unknown",
                    "source": str(filing_path),
                    "indexed_at": datetime.now().isoformat()
                }]
            )

            # Get or create collection
            collection_name = f"sec_filings_{ticker}".lower().replace(".", "_")

            # Create vector store
            vectorstore = Chroma(
                collection_name=collection_name,
                embedding_function=self.embeddings,
                client=self.chroma_client
            )

            # Add documents in batches to avoid token limits
            # OpenAI embedding API has 300K token limit per request
            # Process in batches of 50 chunks (safer than all at once)
            batch_size = 50
            total_added = 0

            for i in range(0, len(documents), batch_size):
                batch = documents[i:i + batch_size]
                batch_num = i//batch_size + 1
                total_batches = (len(documents) + batch_size - 1) // batch_size

                try:
                    _broadcast_log("SEC Indexer", "running",
                                  f"Creating embeddings for batch {batch_num}/{total_batches} ({len(batch)} chunks)",
                                  {"ticker": ticker, "filing_type": filing_type, "batch": batch_num, "total_batches": total_batches})

                    vectorstore.add_documents(batch)
                    total_added += len(batch)
                    logger.info(f"Indexed batch {batch_num}: {len(batch)} chunks for {ticker}")

                    _broadcast_log("SEC Indexer", "success",
                                  f"Batch {batch_num}/{total_batches} indexed successfully",
                                  {"ticker": ticker, "chunks": len(batch)})

                except Exception as batch_error:
                    logger.error(f"Failed to index batch {batch_num} for {ticker}: {batch_error}")
                    _broadcast_log("SEC Indexer", "error",
                                  f"Failed to index batch {batch_num}: {str(batch_error)}",
                                  {"ticker": ticker, "batch": batch_num})
                    # Continue with next batch even if this one fails
                    continue

            logger.info(f"Indexed {total_added}/{len(documents)} chunks from {filing_type} for {ticker}")
            _broadcast_log("SEC Indexer", "success",
                          f"Completed indexing {filing_type}: {total_added} chunks stored",
                          {"ticker": ticker, "filing_type": filing_type, "total_chunks": total_added})

            return total_added

        except Exception as e:
            logger.error(f"Failed to index {filing_path}: {e}")
            return 0

    def index_company(
        self,
        ticker: str,
        filing_types: List[FilingType] = ["10-K", "10-Q"],
        limit_per_type: int = 3
    ) -> Dict[str, int]:
        """
        Download and index multiple filings for a company

        Args:
            ticker: Stock ticker symbol
            filing_types: List of filing types to download
            limit_per_type: Number of each filing type to download

        Returns:
            Dictionary with filing type -> number of chunks indexed
        """
        results = {}

        for filing_type in filing_types:
            # Download filings
            filing_files = self.download_filing(ticker, filing_type, limit=limit_per_type)

            # Index each filing
            total_chunks = 0
            for filing_path in filing_files:
                # Extract filing date from the file
                filing_date = self._extract_filing_date(filing_path)
                chunks = self.index_filing(ticker, filing_path, filing_type, filing_date)
                total_chunks += chunks

            results[filing_type] = total_chunks

        return results

    def _extract_filing_date(self, filing_path: Path) -> str:
        """Extract filing date from the submission file"""
        try:
            with open(filing_path, 'r', encoding='utf-8', errors='ignore') as f:
                # Read first 2000 chars to find the filing date
                content = f.read(2000)

                # Look for FILED AS OF DATE in the header
                import re
                match = re.search(r'FILED AS OF DATE:\s+(\d{8})', content)
                if match:
                    date_str = match.group(1)
                    # Convert YYYYMMDD to YYYY-MM-DD
                    return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"

                # Fallback: try to get from ACCEPTANCE-DATETIME
                match = re.search(r'ACCEPTANCE-DATETIME:(\d{8})\d+', content)
                if match:
                    date_str = match.group(1)
                    return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"

        except Exception as e:
            logger.warning(f"Failed to extract filing date from {filing_path}: {e}")

        return "unknown"

    def search(
        self,
        ticker: str,
        query: str,
        k: int = 5,
        filing_type: Optional[FilingType] = None
    ) -> List[Document]:
        """
        Semantic search across indexed filings

        Args:
            ticker: Stock ticker symbol
            query: Search query
            k: Number of results to return
            filing_type: Optional filter by filing type

        Returns:
            List of relevant document chunks
        """
        try:
            collection_name = f"sec_filings_{ticker}".lower().replace(".", "_")

            vectorstore = Chroma(
                collection_name=collection_name,
                embedding_function=self.embeddings,
                client=self.chroma_client
            )

            # Build filter
            filter_dict = {}
            if filing_type:
                filter_dict["filing_type"] = filing_type

            # Search
            if filter_dict:
                results = vectorstore.similarity_search(query, k=k, filter=filter_dict)
            else:
                results = vectorstore.similarity_search(query, k=k)

            return results

        except Exception as e:
            logger.error(f"Search failed for {ticker}: {e}")
            return []

    def get_collection_stats(self, ticker: str) -> Dict:
        """Get statistics about indexed filings for a ticker"""
        try:
            collection_name = f"sec_filings_{ticker}".lower().replace(".", "_")
            collection = self.chroma_client.get_collection(collection_name)

            return {
                "ticker": ticker,
                "total_chunks": collection.count(),
                "collection_name": collection_name
            }
        except Exception as e:
            logger.warning(f"Collection not found for {ticker}: {e}")
            return {"ticker": ticker, "total_chunks": 0, "error": str(e)}

    def list_indexed_companies(self) -> List[str]:
        """List all companies with indexed filings"""
        try:
            collections = self.chroma_client.list_collections()
            tickers = []

            for collection in collections:
                if collection.name.startswith("sec_filings_"):
                    ticker = collection.name.replace("sec_filings_", "").replace("_", ".").upper()
                    tickers.append(ticker)

            return sorted(tickers)
        except Exception as e:
            logger.error(f"Failed to list indexed companies: {e}")
            return []
