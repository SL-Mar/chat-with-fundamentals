# QuantCoder-FS Architecture Diagrams & Code Patterns

## 1. MULTI-AGENT WORKFLOW DIAGRAM

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      QuantCoder Multi-Agent Pipeline                        │
│                                                                              │
│  STAGE 1: DOCUMENT ANALYSIS                                                │
│  ┌────────────────────────────────────┐                                    │
│  │ PDFLoader                          │                                    │
│  │ - pdfplumber.open()               │                                    │
│  │ - Extract text per page           │                                    │
│  │ - Concatenate all pages           │                                    │
│  └──────────────┬─────────────────────┘                                    │
│                 │                                                           │
│                 ▼                                                           │
│  ┌────────────────────────────────────┐                                    │
│  │ TextPreprocessor                   │                                    │
│  │ - Regex: Remove URLs              │                                    │
│  │ - Remove headers/footers          │                                    │
│  │ - Normalize whitespace            │                                    │
│  │ - Reduce 5000+ chars              │                                    │
│  └──────────────┬─────────────────────┘                                    │
│                 │                                                           │
│  STAGE 2: STRUCTURE DETECTION (NLP)                                        │
│                 │                                                           │
│  ┌──────────────┴─────────────────────┐                                    │
│  │ HeadingDetector (SpaCy Pipeline)   │                                    │
│  │ - self.nlp(text) processing        │                                    │
│  │ - Sentence segmentation            │                                    │
│  │ - Title case detection             │                                    │
│  │ - Length heuristics (2-10 words)   │                                    │
│  └──────────────┬─────────────────────┘                                    │
│                 │                                                           │
│  STAGE 3: CONTENT ORGANIZATION                                             │
│                 │                                                           │
│  ┌──────────────┴─────────────────────┐                                    │
│  │ SectionSplitter                    │                                    │
│  │ - Map content to headings          │                                    │
│  │ - DefaultDict for sections         │                                    │
│  │ - Line-by-line mapping             │                                    │
│  └──────────────┬─────────────────────┘                                    │
│                 │                                                           │
│  STAGE 4: KNOWLEDGE EXTRACTION                                             │
│                 │                                                           │
│  ┌──────────────┴─────────────────────┐                                    │
│  │ KeywordAnalyzer                    │                                    │
│  │ - Trading Keywords: buy/sell/RSI   │                                    │
│  │ - Risk Keywords: stop-loss/hedge   │                                    │
│  │ - Regex filters (charts, figures)  │                                    │
│  │ - Deduplication & sorting          │                                    │
│  └──────────────┬─────────────────────┘                                    │
│                 │                                                           │
│                 ├─────────────────────┬─────────────────────┐             │
│                 ▼                     ▼                     ▼             │
│    [Trading Signals]     [Risk Management]      [Sentiment]              │
│    • Buy conditions      • Stop-loss rules      • Bullish/Bearish        │
│    • Sell triggers       • Position sizing      • Market outlook         │
│    • Indicators (MA)     • Leverage limits      • Economic factors       │
│                                                                          │
│  STAGE 5: LLM SYNTHESIS                                                 │
│  ┌────────────────────────────────────────────────────────┐            │
│  │ OpenAIHandler.generate_summary()                       │            │
│  │ Input: [Trading Signals] + [Risk Management]           │            │
│  │ Model: gpt-4o-2024-11-20                              │            │
│  │ Output: 300-word strategy summary                      │            │
│  │ ↓                                                       │            │
│  │ OpenAIHandler.generate_qc_code()                       │            │
│  │ Input: Summary                                         │            │
│  │ Model: gpt-4o-2024-11-20                              │            │
│  │ Output: QuantConnect Python algorithm                 │            │
│  └────────────────┬────────────────────────────────────┘            │
│                   │                                                   │
│  STAGE 6: CODE QUALITY ASSURANCE                                    │
│                   │                                                   │
│  ┌────────────────┴────────────────────────────────────┐            │
│  │ CodeValidator (AST parsing)                         │            │
│  │ - ast.parse(code)                                  │            │
│  │ - Catches SyntaxError                              │            │
│  │ - Boolean return: valid/invalid                    │            │
│  └────────────────┬────────────────────────────────────┘            │
│                   │                                                   │
│         ┌─────────┴─────────┐                                       │
│         │                   │                                       │
│      VALID              INVALID (max 6 attempts)                    │
│         │                   │                                       │
│         │            ┌──────┴──────┐                                │
│         │            │ CodeRefiner │                                │
│         │            │ LLM Refix   │                                │
│         │            └──────┬──────┘                                │
│         │                   │                                       │
│         │        ┌──────────┴─────────┐                             │
│         │        │                    │                             │
│         │     VALID              TIMEOUT/FAIL                       │
│         │        │                    │                             │
│         └────────┴────────┬───────────┘                             │
│                           │                                         │
│  STAGE 7: OUTPUT DISPLAY                                            │
│                           ▼                                         │
│  ┌────────────────────────────────────┐                            │
│  │ GUI.display_summary_and_code()     │                            │
│  │ - Summary (left pane)              │                            │
│  │ - Code (right pane, highlighted)   │                            │
│  │ - Copy/Save buttons                │                            │
│  └────────────────────────────────────┘                            │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

## 2. DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW ARCHITECTURE                      │
│                                                                     │
│  USER INTERACTION                                                   │
│  ┌──────────────────────────────────────────────────────┐          │
│  │ CLI or GUI Interface                                 │          │
│  │ search_query = "momentum trading"                    │          │
│  │ num_results = 5                                      │          │
│  └──────────────────────┬───────────────────────────────┘          │
│                         │                                           │
│                         ▼                                           │
│  ┌──────────────────────────────────────────────────────┐          │
│  │ CrossRef API (External Service)                      │          │
│  │ Endpoint: https://api.crossref.org/works            │          │
│  │ Returns: 5 articles with metadata                   │          │
│  └──────────────────────┬───────────────────────────────┘          │
│                         │                                           │
│                         ▼                                           │
│  ┌──────────────────────────────────────────────────────┐          │
│  │ articles.json (Cached on Disk)                       │          │
│  │ [                                                    │          │
│  │   {                                                  │          │
│  │     "id": "1",                                       │          │
│  │     "title": "Trading Range Breakout...",          │          │
│  │     "authors": "Uttam Sapate",                      │          │
│  │     "URL": "http://dx.doi.org/...",                │          │
│  │     "DOI": "10.2139/ssrn.3068852"                  │          │
│  │   }                                                  │          │
│  │ ]                                                    │          │
│  └──────────────────────┬───────────────────────────────┘          │
│                         │                                           │
│              ┌──────────┴──────────┐                               │
│              │                     │                               │
│      User selects article          │                               │
│              │                     │                               │
│              ▼                     │                               │
│  ┌──────────────────────┐         │                               │
│  │ Download PDF from    │         │                               │
│  │ article URL          │         │                               │
│  │ (or Unpaywall API)   │         │                               │
│  └──────────────┬───────┘         │                               │
│                 │                 │                               │
│                 ▼                 │                               │
│  ┌──────────────────────────────────────────────────────┐         │
│  │ downloads/article_1.pdf (In-Memory Processing)       │         │
│  │ 1. Load with pdfplumber → text (in RAM)             │         │
│  │ 2. Preprocess → cleaned_text (in RAM)               │         │
│  │ 3. Detect headings → headings[] (in RAM)            │         │
│  │ 4. Split sections → sections{} (in RAM)             │         │
│  │ 5. Analyze keywords → keyword_map{} (in RAM)        │         │
│  │                                                     │         │
│  │ NO INTERMEDIATE FILES WRITTEN                       │         │
│  └──────────────┬──────────────────────────────────────┘         │
│                 │                                                 │
│                 ▼                                                 │
│  ┌──────────────────────────────────────────────────────┐        │
│  │ OpenAI API Call #1: generate_summary()              │        │
│  │ Input: trading_signals + risk_management            │        │
│  │ Model: gpt-4o-2024-11-20                           │        │
│  │ Output: Strategy Summary (300 words)                │        │
│  │                                                     │        │
│  │ OPTIONAL: Save to disk as article_1_summary.txt    │        │
│  └──────────────┬──────────────────────────────────────┘        │
│                 │                                                │
│                 ▼                                                │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ OpenAI API Call #2: generate_qc_code()             │       │
│  │ Input: Strategy Summary                            │       │
│  │ Model: gpt-4o-2024-11-20                          │       │
│  │ Output: QuantConnect Python Code                  │       │
│  │                                                    │       │
│  │ Validation Loop:                                   │       │
│  │ - ast.parse(code) → syntax valid?                │       │
│  │ - If not: refine_code() via LLM (max 6 retries) │       │
│  └──────────────┬──────────────────────────────────┘       │
│                 │                                           │
│          ┌──────┴──────┐                                   │
│          │             │                                   │
│   SAVE TO DISK    DISPLAY IN GUI                           │
│          │             │                                   │
│          ▼             ▼                                   │
│  generated_code/   GUI Window                              │
│  algorithm_1.py    - Summary pane (left)                  │
│                    - Code pane (right)                    │
│                    - Copy/Save buttons                    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## 3. CLASS HIERARCHY DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    QuantCoder Class Structure               │
│                                                             │
│  DOCUMENT PROCESSING PIPELINE                              │
│  ┌─────────────────────────────────────┐                   │
│  │ PDFLoader                           │                   │
│  │ ─────────────────────────────────  │                   │
│  │ - __init__(self)                   │                   │
│  │ - load_pdf(pdf_path) → str        │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  ┌─────────────────────────────────────┐                   │
│  │ TextPreprocessor                    │                   │
│  │ ─────────────────────────────────  │                   │
│  │ - __init__(self)                   │                   │
│  │ - preprocess_text(text) → str      │                   │
│  │ Regex patterns:                    │                   │
│  │   url_pattern                      │                   │
│  │   header_footer_pattern            │                   │
│  │   multinew_pattern                 │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  ┌─────────────────────────────────────┐                   │
│  │ HeadingDetector                     │                   │
│  │ ─────────────────────────────────  │                   │
│  │ - __init__(model="en_core_web_sm")│                   │
│  │ - detect_headings(text) → List[str]│                   │
│  │ Uses: spacy.nlp pipeline           │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  ┌─────────────────────────────────────┐                   │
│  │ SectionSplitter                     │                   │
│  │ ─────────────────────────────────  │                   │
│  │ - split_into_sections(             │                   │
│  │     text, headings                 │                   │
│  │   ) → Dict[str, str]               │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  ┌─────────────────────────────────────┐                   │
│  │ KeywordAnalyzer                     │                   │
│  │ ─────────────────────────────────  │                   │
│  │ Keywords Sets:                     │                   │
│  │   - trading_signal_keywords        │                   │
│  │   - risk_management_keywords       │                   │
│  │ - keyword_analysis(sections)       │                   │
│  │   → Dict[str, List[str]]           │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  LLM & CODE GENERATION                                     │
│  ┌─────────────────────────────────────┐                   │
│  │ OpenAIHandler                       │                   │
│  │ ─────────────────────────────────  │                   │
│  │ - __init__(model="gpt-4o...")      │                   │
│  │ - generate_summary(                │                   │
│  │     extracted_data) → str          │                   │
│  │ - generate_qc_code(summary) → str  │                   │
│  │ - refine_code(code) → str          │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  CODE QUALITY ASSURANCE                                    │
│  ┌─────────────────────────────────────┐                   │
│  │ CodeValidator                       │                   │
│  │ ─────────────────────────────────  │                   │
│  │ - validate_code(code) → bool       │                   │
│  │ Uses: ast.parse(code)              │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  ┌─────────────────────────────────────┐                   │
│  │ CodeRefiner                         │                   │
│  │ ─────────────────────────────────  │                   │
│  │ - __init__(openai_handler)         │                   │
│  │ - refine_code(code) → str          │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  GUI DISPLAY                                               │
│  ┌─────────────────────────────────────┐                   │
│  │ GUI                                 │                   │
│  │ ─────────────────────────────────  │                   │
│  │ - display_summary_and_code(        │                   │
│  │     summary, code)                 │                   │
│  │ - apply_syntax_highlighting(code)  │                   │
│  │ - copy_to_clipboard(text)          │                   │
│  │ - save_code(code)                  │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  MAIN ORCHESTRATOR                                         │
│  ┌────────────────────────────────────────┐               │
│  │ ArticleProcessor                       │               │
│  │ ──────────────────────────────────    │               │
│  │ Composition:                           │               │
│  │ - pdf_loader: PDFLoader              │               │
│  │ - preprocessor: TextPreprocessor     │               │
│  │ - heading_detector: HeadingDetector  │               │
│  │ - section_splitter: SectionSplitter  │               │
│  │ - keyword_analyzer: KeywordAnalyzer  │               │
│  │ - openai_handler: OpenAIHandler      │               │
│  │ - code_validator: CodeValidator      │               │
│  │ - code_refiner: CodeRefiner          │               │
│  │ - gui: GUI                           │               │
│  │ - max_refine_attempts: int           │               │
│  │                                       │               │
│  │ Methods:                              │               │
│  │ - extract_structure(pdf_path)        │               │
│  │ - extract_structure_and_generate_code│               │
│  └────────────────────────────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 4. OPENAI API INTERACTION PATTERNS

### Pattern 1: Summary Generation

```python
# File: quantcli/processor.py (lines 219-263)
def generate_summary(self, extracted_data: Dict[str, List[str]]) -> Optional[str]:
    """
    Converts keyword-extracted trading signals and risk management into a narrative summary
    """
    trading_signals = '\n'.join(extracted_data.get('trading_signal', []))
    risk_management = '\n'.join(extracted_data.get('risk_management', []))
    
    prompt = f"""Provide a clear and concise summary of the following trading strategy 
    and its associated risk management rules...
    
    Trading signals: {trading_signals}
    Risk management: {risk_management}
    """
    
    response = openai.ChatCompletion.create(
        model=self.model,  # "gpt-4o-2024-11-20"
        messages=[
            {"role": "system", "content": "You are an algorithmic trading expert."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=1000,
        temperature=0.5  # Balanced creativity/consistency
    )
    
    return response.choices[0].message['content'].strip()
```

### Pattern 2: Code Generation

```python
# File: quantcli/processor.py (lines 265-319)
def generate_qc_code(self, summary: str) -> Optional[str]:
    """
    Takes strategy summary and generates executable QuantConnect Python code
    """
    prompt = f"""You are a QuantConnect algorithm developer. 
    Convert the following trading strategy into a complete, error-free QuantConnect algorithm.
    
    Strategy Summary:
    {summary}
    
    Requirements:
    1. Initialize Method: Set dates, cash, universe selection, indicators
    2. OnData Method: Implement buy/sell logic based on summary
    3. Risk Management: Apply position sizing and stop-loss rules
    4. Ensure Compliance: Use only QuantConnect supported methods
    """
    
    response = openai.ChatCompletion.create(
        model=self.model,
        messages=[
            {"role": "system", 
             "content": "You are a helpful assistant specialized in QuantConnect algorithms."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=1500,
        temperature=0.3  # Lower temp for more consistent code
    )
    
    return response.choices[0].message['content'].strip()
```

### Pattern 3: Code Refinement Loop

```python
# File: quantcli/processor.py (lines 603-641)
# In extract_structure_and_generate_code():

qc_code = self.openai_handler.generate_qc_code(summary)
attempt = 0

while qc_code and not self.code_validator.validate_code(qc_code) and attempt < self.max_refine_attempts:
    logger.info(f"Attempt {attempt + 1} to refine code.")
    
    # LLM-powered refinement
    qc_code = self.code_refiner.refine_code(qc_code)
    
    if qc_code:
        # Validate after refinement
        if self.code_validator.validate_code(qc_code):
            logger.info("Refined code is valid.")
            break
    
    attempt += 1
```

## 5. KEYWORD EXTRACTION ALGORITHM

```python
# File: quantcli/processor.py (lines 152-210)

trading_signal_keywords = {
    "buy", "sell", "signal", "indicator", "trend", "sma", 
    "moving average", "momentum", "rsi", "macd", "bollinger bands",
    "rachev ratio", "stay long", "exit", "market timing",
    "yield curve", "recession", "unemployment", "housing starts",
    "treasuries", "economic indicator"
}

risk_management_keywords = {
    "drawdown", "volatility", "reduce", "limit", "risk", "risk-adjusted",
    "maximal drawdown", "market volatility", "bear markets", "stability",
    "sidestep", "reduce drawdown", "stop-loss", "position sizing", "hedging"
}

irrelevant_patterns = [
    re.compile(r'figure \d+', re.IGNORECASE),
    re.compile(r'\[\d+\]'),
    re.compile(r'\(.*?\)'),
    re.compile(r'chart', re.IGNORECASE),
    re.compile(r'\d{4}-\d{4}'),
    re.compile(r'^\s*$')
]

def keyword_analysis(self, sections: Dict[str, str]) -> Dict[str, List[str]]:
    keyword_map = defaultdict(list)
    processed_sentences = set()
    
    for section, content in sections.items():
        for sent in content.split('. '):
            sent_text = sent.lower().strip()
            
            # Skip irrelevant sentences
            if any(pattern.search(sent_text) for pattern in self.irrelevant_patterns):
                continue
            
            # Skip duplicates
            if sent_text in processed_sentences:
                continue
            
            processed_sentences.add(sent_text)
            
            # Classify by keywords
            if any(kw in sent_text for kw in self.trading_signal_keywords):
                keyword_map['trading_signal'].append(sent.strip())
            elif any(kw in sent_text for kw in self.risk_management_keywords):
                keyword_map['risk_management'].append(sent.strip())
    
    # Deduplicate and sort
    for category, sentences in keyword_map.items():
        unique_sentences = sorted(set(sentences), key=lambda x: len(x))
        keyword_map[category] = unique_sentences
    
    return keyword_map
```

