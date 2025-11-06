"""
Quant Research RAG Service
RAG system for quantitative finance research papers, articles, and strategy documents
"""

import os
import re
import asyncio
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime
import logging

import chromadb
from chromadb.config import Settings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
from langchain_community.vectorstores import Chroma
import PyPDF2

logger = logging.getLogger(__name__)

# Import agent console manager for WebSocket broadcasting
try:
    from core.agent_console_manager import agent_console_manager
    AGENT_CONSOLE_AVAILABLE = True
except ImportError:
    AGENT_CONSOLE_AVAILABLE = False
    logger.warning("Agent console manager not available - live logging disabled")


def _broadcast_log(agent: str, status: str, message: str, metadata: Optional[Dict] = None):
    """
    Broadcast log message to Agent Console WebSocket clients.

    Args:
        agent: Agent name (e.g., "Quant Research Indexer")
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


class QuantResearchRAG:
    """RAG system for quant finance research papers and articles"""

    def __init__(
        self,
        storage_path: str = "./quant_research_data",
        chroma_path: str = "./chroma_db",
        openai_api_key: Optional[str] = None
    ):
        """
        Initialize Quant Research RAG system

        Args:
            storage_path: Directory to store uploaded research papers
            chroma_path: Directory for ChromaDB vector store
            openai_api_key: OpenAI API key (uses env var if not provided)
        """
        self.storage_path = Path(storage_path)
        self.chroma_path = Path(chroma_path)

        # Create directories
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self.chroma_path.mkdir(parents=True, exist_ok=True)

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

        logger.info(f"Quant Research RAG initialized - storage: {storage_path}, chroma: {chroma_path}")

    def parse_pdf(self, pdf_path: Path) -> str:
        """
        Extract text from PDF file.

        Args:
            pdf_path: Path to PDF file

        Returns:
            Extracted text content
        """
        try:
            text = ""
            with open(pdf_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"

            # Clean up text
            text = self._clean_text(text)
            return text

        except Exception as e:
            logger.error(f"Failed to parse PDF {pdf_path}: {e}")
            return ""

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)

        # Normalize line breaks
        text = text.replace('\r\n', '\n').replace('\r', '\n')

        return text.strip()

    def index_document(
        self,
        file_path: Path,
        title: str,
        authors: Optional[str] = None,
        year: Optional[int] = None,
        category: str = "general",
        tags: Optional[List[str]] = None
    ) -> int:
        """
        Index a research document into the vector database

        Args:
            file_path: Path to PDF file
            title: Document title
            authors: Authors (comma-separated)
            year: Publication year
            category: Document category (strategy, risk, portfolio, general)
            tags: List of tags

        Returns:
            Number of chunks indexed
        """
        try:
            logger.info(f"Indexing document: {title}")
            _broadcast_log("Quant Research Indexer", "running",
                          f"Indexing document: {title}",
                          {"title": title, "category": category})

            # Parse PDF text
            text = self.parse_pdf(file_path)

            if not text:
                logger.warning(f"No text extracted from {file_path}")
                return 0

            # Split into chunks
            documents = self.text_splitter.create_documents(
                texts=[text],
                metadatas=[{
                    "title": title,
                    "authors": authors or "Unknown",
                    "year": year or datetime.now().year,
                    "category": category,
                    "tags": ",".join(tags) if tags else "",
                    "source": str(file_path),
                    "indexed_at": datetime.now().isoformat()
                }]
            )

            # Get or create collection
            collection_name = "quant_research"

            # Create vector store
            vectorstore = Chroma(
                collection_name=collection_name,
                embedding_function=self.embeddings,
                client=self.chroma_client
            )

            # Add documents in batches to avoid token limits
            batch_size = 50
            total_added = 0

            for i in range(0, len(documents), batch_size):
                batch = documents[i:i + batch_size]
                batch_num = i//batch_size + 1
                total_batches = (len(documents) + batch_size - 1) // batch_size

                try:
                    _broadcast_log("Quant Research Indexer", "running",
                                  f"Creating embeddings for batch {batch_num}/{total_batches} ({len(batch)} chunks)",
                                  {"title": title, "batch": batch_num, "total_batches": total_batches})

                    vectorstore.add_documents(batch)
                    total_added += len(batch)
                    logger.info(f"Indexed batch {batch_num}: {len(batch)} chunks for {title}")

                    _broadcast_log("Quant Research Indexer", "success",
                                  f"Batch {batch_num}/{total_batches} indexed successfully",
                                  {"title": title, "chunks": len(batch)})

                except Exception as batch_error:
                    logger.error(f"Failed to index batch {batch_num} for {title}: {batch_error}")
                    _broadcast_log("Quant Research Indexer", "error",
                                  f"Failed to index batch {batch_num}: {str(batch_error)}",
                                  {"title": title, "batch": batch_num})
                    continue

            logger.info(f"Indexed {total_added}/{len(documents)} chunks from {title}")
            _broadcast_log("Quant Research Indexer", "success",
                          f"Completed indexing: {total_added} chunks stored",
                          {"title": title, "total_chunks": total_added})

            return total_added

        except Exception as e:
            logger.error(f"Failed to index {file_path}: {e}")
            _broadcast_log("Quant Research Indexer", "error",
                          f"Failed to index document: {str(e)}",
                          {"title": title})
            return 0

    def search(
        self,
        query: str,
        k: int = 5,
        category: Optional[str] = None,
        year_min: Optional[int] = None,
        year_max: Optional[int] = None
    ) -> List[Document]:
        """
        Semantic search across indexed research

        Args:
            query: Search query
            k: Number of results to return
            category: Optional filter by category
            year_min: Optional minimum year filter
            year_max: Optional maximum year filter

        Returns:
            List of relevant document chunks
        """
        try:
            collection_name = "quant_research"

            vectorstore = Chroma(
                collection_name=collection_name,
                embedding_function=self.embeddings,
                client=self.chroma_client
            )

            # Build filter
            filter_dict = {}
            if category:
                filter_dict["category"] = category

            # Note: ChromaDB doesn't support range queries directly
            # We'll need to filter year in post-processing if needed

            # Search
            if filter_dict:
                results = vectorstore.similarity_search(query, k=k*2, filter=filter_dict)
            else:
                results = vectorstore.similarity_search(query, k=k*2)

            # Post-process for year filtering
            if year_min or year_max:
                filtered_results = []
                for doc in results:
                    year = doc.metadata.get('year', 0)
                    if year_min and year < year_min:
                        continue
                    if year_max and year > year_max:
                        continue
                    filtered_results.append(doc)
                results = filtered_results[:k]
            else:
                results = results[:k]

            return results

        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []

    def get_collection_stats(self) -> Dict:
        """Get statistics about indexed documents"""
        try:
            collection_name = "quant_research"
            collection = self.chroma_client.get_collection(collection_name)

            return {
                "total_chunks": collection.count(),
                "collection_name": collection_name
            }
        except Exception as e:
            logger.warning(f"Collection not found: {e}")
            return {"total_chunks": 0, "error": str(e)}

    def list_documents(self) -> List[Dict]:
        """List all indexed documents with metadata"""
        try:
            collection_name = "quant_research"
            collection = self.chroma_client.get_collection(collection_name)

            # Get all metadatas
            results = collection.get(include=["metadatas"])

            # Extract unique documents
            docs_dict = {}
            for metadata in results['metadatas']:
                title = metadata.get('title', 'Unknown')
                if title not in docs_dict:
                    docs_dict[title] = {
                        "title": title,
                        "authors": metadata.get('authors', 'Unknown'),
                        "year": metadata.get('year', None),
                        "category": metadata.get('category', 'general'),
                        "tags": metadata.get('tags', ''),
                        "indexed_at": metadata.get('indexed_at', None)
                    }

            return list(docs_dict.values())

        except Exception as e:
            logger.error(f"Failed to list documents: {e}")
            return []


# Singleton instance
quant_research_rag = QuantResearchRAG()
