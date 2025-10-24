# QuantCoder-FS Codebase Analysis Report

## Executive Summary

QuantCoder-FS is a **legacy CLI-based tool** (not a full-stack platform) that converts research articles (PDFs) into QuantConnect trading algorithms using LLM-powered code generation. It's NOT a data storage or backtesting system, but rather an **article-to-code generator** with a sophisticated NLP preprocessing pipeline.

---

## 1. DATA STORAGE ARCHITECTURE

### Important: This Project Does NOT Store OHLCV Data

QuantCoder is **NOT a market data storage system**. It does not:
- Store OHLCV (Open, High, Low, Close, Volume) data
- Use CSV, Parquet, or other data formats for time series
- Have a database for historical market data
- Implement data pipelines for stock data

### Actual Storage Pattern: File-Based

The project uses simple **file-based storage** for:
1. **articles.json** - Search results from CrossRef API
2. **PDF downloads/** - Downloaded research articles
3. **generated_code/** - Generated Python algorithms
4. **Text summaries** - Generated article summaries (.txt files)

### Directory Structure
```
QuantCoder-FS/
├── quantcli/                 # Main package
│   ├── __init__.py
│   ├── cli.py               # Click CLI commands
│   ├── gui.py               # Tkinter GUI interface
│   ├── processor.py         # Core processing pipeline
│   ├── search.py            # CrossRef API search
│   └── utils.py             # Utility functions
├── articles.json            # Cached search results
├── downloads/               # Downloaded PDFs
├── generated_code/          # Generated algorithms
└── setup.py                 # Package configuration
```

### Data Flow: File-Based Storage
```
User Input (Search Query)
    ↓
CrossRef API → articles.json
    ↓
User Download → downloads/article_{id}.pdf
    ↓
PDF Processing → extracted_data (in-memory)
    ↓
LLM Processing → Summary (text file)
    ↓
LLM Code Generation → generated_code/algorithm_{id}.py
```

---

## 2. ARCHITECTURE OVERVIEW

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     QuantCoder Frontend                      │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐         ┌──────────────────────┐     │
│  │   CLI Interface  │         │   Tkinter GUI        │     │
│  │   (Click)        │         │   (Interactive)      │     │
│  └────────┬─────────┘         └──────────┬───────────┘     │
│           │                              │                  │
└───────────┼──────────────────────────────┼──────────────────┘
            │                              │
            └──────────────┬───────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│              QuantCoder Core Pipeline                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Search Module (search.py)                               │
│     └─> CrossRef API Integration                           │
│                                                              │
│  2. Article Processor (processor.py) - MULTI-STAGE PIPELINE │
│     ├─> PDFLoader: Extract text from PDF                   │
│     ├─> TextPreprocessor: Clean & normalize                │
│     ├─> HeadingDetector: NLP-based structure detection    │
│     ├─> SectionSplitter: Organize content                  │
│     ├─> KeywordAnalyzer: Extract trading signals & risks   │
│     └─> CodeValidator: Python syntax checking             │
│                                                              │
│  3. OpenAI Handler (processor.py)                           │
│     ├─> generate_summary(): Extract strategy summary       │
│     ├─> generate_qc_code(): Generate QuantConnect code    │
│     └─> refine_code(): Fix syntax errors                   │
│                                                              │
│  4. Code Refinement Loop                                    │
│     └─> CodeRefiner: Iterative error fixing (max 6 loops) │
│                                                              │
└──────────────────────────────────────────────────────────────┘
            │
            ↓
    ┌──────────────────┐
    │  Output Files    │
    ├──────────────────┤
    │ • Algorithm code │
    │ • Summaries      │
    │ • HTML results   │
    └──────────────────┘
```

### Processing Pipeline Flow (Detailed)

```
PDF Article
    ↓
[PDFLoader]
Extract raw text using pdfplumber
    ↓
[TextPreprocessor]
- Remove URLs, headers, footers
- Clean up whitespace
- Reduce noise
    ↓
[HeadingDetector] (SpaCy NLP)
- Identify document structure
- Extract headings using linguistic analysis
    ↓
[SectionSplitter]
- Organize content into sections
- Map content to detected headings
    ↓
[KeywordAnalyzer]
- Extract trading signals (buy/sell, indicators)
- Extract risk management (stop-loss, hedging)
- Filter irrelevant patterns
    ↓
    ├─→ Trading Signals List
    └─→ Risk Management List
    ↓
[OpenAIHandler.generate_summary()]
- Create strategy summary (LLM)
    ↓
[OpenAIHandler.generate_qc_code()]
- Generate QuantConnect Python code (LLM)
    ↓
[CodeValidator]
- Check Python syntax correctness
    ↓
    ├─→ Valid?  → Output generated_code/algorithm.py
    └─→ Invalid? → [CodeRefiner] → Max 6 attempts
```

---

## 3. ARTICLE PROCESSING WORKFLOW (The "AI Workflow")

While not explicitly agentic, the system follows a **multi-agent pipeline pattern**:

### Agent 1: Document Analyzer
**File**: `processor.py` - Classes: `PDFLoader`, `TextPreprocessor`, `HeadingDetector`

```python
class PDFLoader:
    """Extracts text from PDF files"""
    def load_pdf(self, pdf_path: str) -> str:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text()
        return text

class HeadingDetector:
    """NLP-based structure extraction using SpaCy"""
    def detect_headings(self, text: str) -> List[str]:
        doc = self.nlp(text)  # SpaCy pipeline
        for sent in doc.sents:
            if 2 <= len(sent.split()) <= 10 and sent.istitle():
                headings.append(sent.text)
        return headings
```

### Agent 2: Content Analyzer
**File**: `processor.py` - Classes: `SectionSplitter`, `KeywordAnalyzer`

```python
class KeywordAnalyzer:
    """Extracts trading knowledge from content"""
    
    trading_signal_keywords = {
        "buy", "sell", "signal", "indicator", "trend", "sma",
        "momentum", "rsi", "macd", "bollinger bands"
    }
    risk_management_keywords = {
        "drawdown", "volatility", "stop-loss", "position sizing",
        "maximal drawdown", "hedging"
    }
    
    def keyword_analysis(self, sections: Dict) -> Dict[str, List[str]]:
        keyword_map = defaultdict(list)
        for section, content in sections.items():
            for sent in content.split('. '):
                if any(kw in sent.lower() for kw in self.trading_signal_keywords):
                    keyword_map['trading_signal'].append(sent)
                elif any(kw in sent.lower() for kw in self.risk_management_keywords):
                    keyword_map['risk_management'].append(sent)
        return keyword_map
```

### Agent 3: LLM Code Generator
**File**: `processor.py` - Class: `OpenAIHandler`

```python
class OpenAIHandler:
    """LLM-based code generation engine"""
    
    def generate_summary(self, extracted_data: Dict) -> str:
        prompt = f"""Provide a summary of trading strategy and risk management:
        
        Trading Signals:
        {'\n'.join(extracted_data['trading_signal'])}
        
        Risk Management:
        {'\n'.join(extracted_data['risk_management'])}
        """
        response = openai.ChatCompletion.create(
            model="gpt-4o-2024-11-20",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000
        )
        return response.choices[0].message['content']
    
    def generate_qc_code(self, summary: str) -> str:
        prompt = f"""Generate QuantConnect Python code:
        {summary}"""
        return openai.ChatCompletion.create(...).choices[0].message['content']
```

### Agent 4: Code Quality Controller
**File**: `processor.py` - Classes: `CodeValidator`, `CodeRefiner`

```python
class CodeValidator:
    """Validates generated code syntax"""
    def validate_code(self, code: str) -> bool:
        try:
            ast.parse(code)  # Python AST parsing
            return True
        except SyntaxError:
            return False

class CodeRefiner:
    """Fixes invalid code with LLM"""
    def refine_code(self, code: str) -> str:
        prompt = f"Fix syntax errors:\n{code}"
        return openai_handler.refine_code(code)
```

### Workflow Orchestration
**File**: `processor.py` - Class: `ArticleProcessor`

```python
class ArticleProcessor:
    """Main orchestrator for the entire workflow"""
    
    def __init__(self, max_refine_attempts: int = 6):
        self.pdf_loader = PDFLoader()
        self.preprocessor = TextPreprocessor()
        self.heading_detector = HeadingDetector()
        self.section_splitter = SectionSplitter()
        self.keyword_analyzer = KeywordAnalyzer()
        self.openai_handler = OpenAIHandler(model="gpt-4o-2024-11-20")
        self.code_validator = CodeValidator()
        self.code_refiner = CodeRefiner(self.openai_handler)
        self.max_refine_attempts = 6
    
    def extract_structure_and_generate_code(self, pdf_path: str):
        """Orchestrates the entire workflow"""
        # Stage 1: Extract structure
        extracted_data = self.extract_structure(pdf_path)
        
        # Stage 2: Generate summary
        summary = self.openai_handler.generate_summary(extracted_data)
        
        # Stage 3: Generate code with validation & refinement loop
        qc_code = self.openai_handler.generate_qc_code(summary)
        attempt = 0
        while not self.code_validator.validate_code(qc_code) and attempt < 6:
            qc_code = self.code_refiner.refine_code(qc_code)
            attempt += 1
        
        # Stage 4: Display results
        self.gui.display_summary_and_code(summary, qc_code)
```

---

## 4. KEY TECHNOLOGIES & DEPENDENCIES

### Core Dependencies

```
Framework/CLI:
  - Click (8.1.8) - CLI command framework
  - Tkinter - GUI framework (built-in)
  - InquirerPy (0.3.4) - Interactive prompts

LLM & AI:
  - OpenAI (0.28.0) - GPT-4o-2024-11-20 model
  - spaCy (3.8.4) - NLP for heading detection
  - en_core_web_sm (3.8.0) - English language model for spaCy

Document Processing:
  - pdfplumber (0.11.5) - PDF text extraction
  - pdfminer.six (20231228) - Low-level PDF processing
  - pypdfium2 (4.30.1) - PDF rendering

Code Quality:
  - Pygments (2.19.1) - Code syntax highlighting
  - Python ast module - Code validation

API Integration:
  - requests (2.32.3) - HTTP requests for CrossRef API
  - Unpaywall API - Free PDF retrieval

Environment:
  - python-dotenv (1.0.1) - Environment variable management
```

### LLM Model Configuration
- **Default Model**: `gpt-4o-2024-11-20`
- **Configured in**: `processor.py` line 215
- **API Version**: OpenAI SDK v0.28 (legacy)

---

## 5. COMMAND-LINE INTERFACE (CLI)

### CLI Commands Structure
**File**: `quantcli/cli.py`

```bash
quantcli search <query> [--num N]          # Search CrossRef for articles
quantcli list                               # List cached articles
quantcli download <article_id>             # Download PDF
quantcli summarize <article_id>            # Summarize article
quantcli generate-code <article_id>        # Generate QuantConnect code
quantcli open-article <article_id>         # Open in browser
quantcli interactive                       # Launch GUI
quantcli --verbose                         # Enable debug logging
```

### Data Persistence
- **articles.json**: Caches search results
- **downloads/**: Stores downloaded PDFs
- **generated_code/**: Stores generated algorithms
- **quantcli.log**: Application logs

---

## 6. GUI IMPLEMENTATION

**File**: `quantcli/gui.py` - Class: `QuantCLIGUI`

```python
class QuantCLIGUI:
    """Tkinter-based interactive GUI"""
    
    GUI Components:
    ├─ Search Frame
    │  ├─ Search query input
    │  └─ Number of results selector
    ├─ Results Frame
    │  └─ Treeview (sortable table)
    ├─ Action Buttons
    │  ├─ Open Article (browser)
    │  ├─ Summarize Article (LLM)
    │  └─ Generate Code (LLM)
    └─ Display Windows
       ├─ Summary display (syntax highlighting)
       └─ Code display (Pygments highlighting)
```

**Features**:
- Double-click articles to open in browser
- Live syntax highlighting for code
- Copy to clipboard functionality
- Save code to file

---

## 7. RESEARCH ARTICLE SEARCH

**File**: `quantcli/search.py`

### API Integration: CrossRef
```python
def search_crossref(query: str, rows: int = 5):
    """Query CrossRef API for academic articles"""
    api_url = "https://api.crossref.org/works"
    params = {"query": query, "rows": rows}
    response = requests.get(api_url, params=params)
    
    # Returns:
    # - Article title
    # - Authors
    # - Publication date
    # - DOI
    # - URL
    # - Abstract
```

### PDF Download
```python
def download_pdf(article_url, save_path, doi):
    """Download PDF with fallback to Unpaywall API"""
    # 1. Try direct download from article URL
    # 2. If fails, use Unpaywall API (get_pdf_url_via_unpaywall)
    # 3. Save to downloads/ directory
```

---

## 8. LOGGING & DEBUGGING

**File**: `quantcli/utils.py`

```python
def setup_logging(verbose: bool = False):
    """Configure logging for the application"""
    log_level = logging.DEBUG if verbose else logging.INFO
    # Logs to:
    #  - quantcli.log (file)
    #  - Console output (stream)
```

**Usage**:
```bash
quantcli --verbose  # Enable DEBUG logging
```

---

## 9. IMPORTANT LIMITATIONS & INSIGHTS

### What QuantCoder Does NOT Have:

❌ **No OHLCV Data Storage**
  - This is a code generator, not a data platform
  - Uses research articles as input, not market data

❌ **No Backtesting Engine**
  - Generates QuantConnect code for users to backtest themselves
  - No integrated testing/validation of strategies

❌ **No Real-Time Data**
  - No market data API integration
  - No streaming price feeds

❌ **No Database**
  - Simple file-based storage only
  - No SQL or NoSQL capabilities

❌ **No Portfolio Management**
  - Focuses only on single-algorithm generation
  - No position tracking or risk management

### Key Strengths:

✅ **Sophisticated NLP Pipeline**
  - SpaCy-based heading detection
  - Keyword extraction for trading concepts
  - Intelligent document structure analysis

✅ **Multi-Step Code Generation**
  - Initial code generation + iterative refinement
  - Up to 6 attempts to fix syntax errors
  - AST-based validation

✅ **Flexible Interface**
  - CLI for automation
  - GUI for interactive exploration
  - Programmatic API for integration

✅ **Research-Driven**
  - Converts academic research to executable code
  - Preserves context through multi-stage processing

---

## 10. APPLICABILITY TO chat-with-fundamentals

### What chat-with-fundamentals Can Learn:

1. **Multi-Stage NLP Pipeline**
   - Use HeadingDetector + SectionSplitter pattern for document parsing
   - Implement keyword extraction for financial concepts
   - Apply TextPreprocessor for cleaning input data

2. **LLM Orchestration Pattern**
   - ArticleProcessor pattern for multi-stage workflows
   - Code refinement loop for iterative improvement
   - Separate concern layers (analysis → generation → validation)

3. **GUI Framework**
   - Tkinter patterns for financial data display
   - Syntax highlighting for code/formula output
   - Tree views for hierarchical data

4. **File Organization**
   - JSON for cached data structures
   - Directory segregation for different output types
   - Logging patterns for debugging

5. **API Integration**
   - Requests library patterns for external APIs
   - Error handling for network operations
   - Fallback strategies (like Unpaywall example)

### What chat-with-fundamentals Should Build Differently:

1. **Data Storage**
   - Need actual OHLCV database (Parquet/DuckDB/PostgreSQL)
   - Consider time-series optimized storage
   - Implement caching strategies

2. **Real-Time Data**
   - Add market data streaming (WebSocket, polling)
   - Implement efficient quote caching
   - Build data validation pipeline

3. **Backtesting**
   - Implement proper backtest engine (or integrate existing one)
   - Add performance metrics calculation
   - Build visualization for results

4. **State Management**
   - User session management
   - Portfolio persistence
   - Watchlist/analysis history

---

## File Mapping Summary

```
/home/user/QuantCoder-FS/
├── quantcli/cli.py                  (CLI entry point, command routing)
├── quantcli/gui.py                  (Tkinter GUI interface)
├── quantcli/processor.py            (CORE: Multi-stage processing pipeline)
│                                    (PDFLoader, TextPreprocessor, 
│                                     HeadingDetector, SectionSplitter,
│                                     KeywordAnalyzer, OpenAIHandler,
│                                     CodeValidator, CodeRefiner, GUI,
│                                     ArticleProcessor orchestrator)
├── quantcli/search.py               (CrossRef API, PDF download)
├── quantcli/utils.py                (Logging, API key management)
├── setup.py                         (Package configuration, entry points)
├── requirements-legacy.txt          (Frozen dependencies)
├── articles.json                    (Cached search results)
└── README.md                        (Project documentation)
```

---

## Architecture Pattern Summary

```
Pattern: Multi-Agent Pipeline with LLM Orchestration
├─ Agent 1: Document Analyzer (PDFLoader, Preprocessor, NLP)
├─ Agent 2: Content Analyzer (SectionSplitter, KeywordAnalyzer)  
├─ Agent 3: LLM Generator (OpenAIHandler - summary + code)
├─ Agent 4: Quality Controller (CodeValidator, CodeRefiner)
└─ Orchestrator: ArticleProcessor (coordinates all stages)

Interface Layer:
├─ CLI: Click framework with command routing
└─ GUI: Tkinter with interactive workflow

Data Layer:
└─ File-based: JSON + directories (no database)

External Services:
├─ OpenAI API (GPT-4o-2024-11-20)
├─ CrossRef API (academic article search)
└─ Unpaywall API (free PDF retrieval)
```

