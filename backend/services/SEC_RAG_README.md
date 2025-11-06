# SEC Filings RAG System

A Retrieval-Augmented Generation (RAG) system for semantic search and Q&A over SEC filings (10-K, 10-Q, 8-K).

## Features

- **Automatic Downloading**: Download SEC filings directly from EDGAR
- **Document Processing**: Parse and clean HTML/text filings
- **Vector Embeddings**: Create semantic embeddings using OpenAI
- **Semantic Search**: Query filings using natural language
- **Q&A**: Ask questions and get answers with citations

## Architecture

```
SEC EDGAR → Download → Parse → Chunk → Embed → ChromaDB → Search → LLM Q&A
```

### Components

1. **SEC Downloader**: Uses `sec-edgar-downloader` to fetch filings from EDGAR
2. **Document Parser**: BeautifulSoup + regex for HTML and text parsing
3. **Text Splitter**: LangChain's RecursiveCharacterTextSplitter (1000 char chunks, 200 overlap)
4. **Embeddings**: OpenAI embeddings via `langchain-openai`
5. **Vector Store**: ChromaDB for persistent storage and similarity search
6. **LLM**: OpenAI for question-answering

## API Endpoints

### POST /sec-filings/index

Index SEC filings for a company (runs in background).

**Request:**
```json
{
  "ticker": "AAPL",
  "filing_types": ["10-K", "10-Q"],
  "limit_per_type": 3
}
```

**Response:**
```json
{
  "ticker": "AAPL",
  "status": "indexing_started",
  "chunks_indexed": {},
  "message": "Indexing started for AAPL. This may take a few minutes."
}
```

### POST /sec-filings/search

Semantic search over indexed filings.

**Request:**
```json
{
  "ticker": "AAPL",
  "query": "What are the main revenue sources?",
  "k": 5,
  "filing_type": "10-K"
}
```

**Response:**
```json
[
  {
    "content": "Revenue from iPhone sales...",
    "metadata": {
      "ticker": "AAPL",
      "filing_type": "10-K",
      "filing_date": "2023-10-27",
      "source": "..."
    },
    "relevance_score": null
  }
]
```

### POST /sec-filings/qa

Question-answering with LLM and source citations.

**Request:**
```json
{
  "ticker": "AAPL",
  "query": "What are the key risk factors mentioned?",
  "k": 5
}
```

**Response:**
```json
{
  "answer": "Based on the 10-K filing from 2023-10-27, Apple's key risk factors include...",
  "sources": [
    {
      "filing_type": "10-K",
      "filing_date": "2023-10-27",
      "excerpt": "Risk factors include..."
    }
  ],
  "ticker": "AAPL",
  "query": "What are the key risk factors mentioned?"
}
```

### GET /sec-filings/stats/{ticker}

Get indexing statistics for a company.

**Response:**
```json
{
  "ticker": "AAPL",
  "total_chunks": 1247,
  "collection_name": "sec_filings_aapl"
}
```

### GET /sec-filings/indexed-companies

List all companies with indexed filings.

**Response:**
```json
{
  "companies": ["AAPL", "MSFT", "GOOGL"],
  "count": 3
}
```

## Usage Example

### 1. Index a Company

```bash
curl -X POST http://localhost:8000/sec-filings/index \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "ticker": "AAPL",
    "filing_types": ["10-K", "10-Q"],
    "limit_per_type": 2
  }'
```

Wait a few minutes for indexing to complete.

### 2. Search Filings

```bash
curl -X POST http://localhost:8000/sec-filings/search \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "ticker": "AAPL",
    "query": "revenue breakdown by product",
    "k": 5
  }'
```

### 3. Ask Questions

```bash
curl -X POST http://localhost:8000/sec-filings/qa \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "ticker": "AAPL",
    "query": "What were the main factors affecting revenue in the last fiscal year?",
    "k": 5
  }'
```

## Filing Types

- **10-K**: Annual report with comprehensive financial information
- **10-Q**: Quarterly report with unaudited financial statements
- **8-K**: Current report for major events (mergers, leadership changes, etc.)

## Storage

- **SEC Filings**: `./sec_filings_data/sec-edgar-filings/`
- **Vector Database**: `./chroma_db/`

## Requirements

```python
chromadb==0.5.5
sentence-transformers==3.0.1
sec-edgar-downloader==5.0.2
beautifulsoup4==4.12.3
lxml==5.3.0
tiktoken==0.7.0
langchain-community==0.2.11
```

## Configuration

Set in `.env`:
```bash
OPENAI_API_KEY=sk-...
```

## Limitations

- SEC EDGAR rate limits: Be respectful, don't hammer the API
- ChromaDB is local (no distributed setup)
- Embeddings cost: OpenAI charges per token
- Processing time: Large filings (10-K) can take 2-5 minutes to index

## Tips

1. **Start small**: Index 1-2 filings first to test
2. **Use specific queries**: Better results with focused questions
3. **Filter by filing type**: Use `filing_type` parameter to narrow results
4. **Check stats**: Use `/stats/{ticker}` to verify indexing completed
5. **Citations matter**: Always check the `sources` in Q&A responses

## Troubleshooting

### "No indexed filings found"
- Wait for indexing to complete (check logs)
- Verify ticker symbol is correct
- Check storage path exists

### Empty search results
- Filings may not contain relevant information
- Try broader queries
- Check if indexing succeeded

### Slow indexing
- Normal for large 10-K filings
- Background task doesn't block API
- Check logs for progress

## Future Enhancements

- [ ] Support for more filing types (S-1, DEF 14A, etc.)
- [ ] Batch indexing for multiple companies
- [ ] Re-ranking for better search results
- [ ] Caching for frequently asked questions
- [ ] Export to PDF/markdown
- [ ] Comparison across companies
