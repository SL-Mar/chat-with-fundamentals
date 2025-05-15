[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

<p align="center">
  <img src="frontend/public/logocwf.png" alt="Chat with Fundamentals Logo" width="100"/>
</p>

<h1 align="center">Chat with Fundamentals</h1>
<h3 align="center">AI-powered Fundamental Analysis and Stock Research</h3>


**Chat with Fundamentals** is an application that generates executive summaries about stocks using fundamental data fetched via EODHD APIs.
It integrates financial metrics, historical stock prices, recent company news, and AI-written executive summaries into a single orchestrated workflow — designed to streamline the fundamental analysis of securities.

Built with **CrewAI**, **LangChain**, **FastAPI**, and **EODHD APIs** market data.

<p align="center">
  <img src="frontend/public/CWF_demo8.png" alt="Application Overview" width="800"/>
</p>

---

## Project Philosophy

Chat with Fundamentals is not intended to be a SaaS platform.
It is a **research engine** designed to explore how autonomous agents and AI can automate and enhance financial analysis.
It is built to be **self-hosted** and **tailored to user needs** through the refinement and upgrade of AI and quantitative workflows.
All LLM interactions are logged and saved for reproducibility.

<p align="center">
  <img src="frontend/public/CWF_demoi1.png" alt="Demo view" width="800"/>
</p>

**Key principles:**

* **Modularity** – Workflows and agents are designed independently
* **Reproducibility** – All steps (query, fetch, summarize) are transparent and testable
* **Minimal Overhead** – Lightweight backend with no complex infrastructure
* **User Ownership** – Users bring their own API keys (OpenAI, EODHD, Tavily)

---

## Project Structure

### Backend (Python + FastAPI)

```
backend/
├── agents/           # CrewAI agents (e.g., fundamental interpreter)
├── core/             # Configuration, logging, LLM settings
├── models/           # Pydantic models for finance data
├── routers/          # API routes (analyzer, simulater, quantanalyzer)
├── tools/            # EODHD API tools (data, news fetching)
├── utils/            # Helper functions (e.g., schema generation)
├── workflows/        # CrewAI-based orchestration (e.g., analyze.py)
├── venv/             # Virtual environment (optional)
├── .env              # Environment variables (API keys, model names)
├── .gitignore
└── chatwithfundamentals.log
```

### Frontend (Next.js + Tailwind CSS + TypeScript)

```
frontend/
├── components/         # Reusable React components (UI, layout, forms)
├── Icons/              # Custom icon components
├── lib/                # Client-side utilities and API routes
├── pages/              # Next.js pages 
├── public/             # Static assets (images, fonts)
├── styles/             # Global and modular CSS/Tailwind styles
├── types/              # TypeScript type declarations
├── LICENSE.md          # Project license information
├── NOTICE.txt          # Legal and attribution notices
├── next.config.js      # Next.js configuration
├── next-env.d.ts       # Next.js environment type definitions
├── package.json        # Project metadata and dependencies
├── package-lock.json   # Exact dependency tree
├── postcss.config.js   # PostCSS configuration (used with Tailwind)
├── tailwind.config.js  # Tailwind CSS configuration
└── tsconfig.json       # TypeScript compiler configuration
```

---

## Deployment

Chat with Fundamentals can be run locally on Linux/macOS or Windows. Setup scripts are included for convenience.

### Linux/macOS

```bash
bash deploy.sh
```

### Windows

```bat
deploy.bat
```

These scripts will:

* Create a Python virtual environment
* Install Python and frontend (Node.js) dependencies
* Copy `.env.model` to `.env` if it does not exist

---

## Launch

Once installed, launch the full application stack with a single command.

### Linux/macOS

```bash
bash launch.sh
```

### Windows

```bat
launch.bat
```

These launch scripts will:

* Open the project in VS Code
* Start the frontend (Next.js) at [http://localhost:3000](http://localhost:3000)
* Start the backend (FastAPI) at [http://localhost:8000](http://localhost:8000)
* Open both interfaces in the default browser

**Required file: `AAPL.US.json`**
Do not delete or rename this file. It is used as a reference knowledge base for agents.
You may duplicate and modify it for other tickers — but the original must remain.

---

## Use Cases

### Single-Ticker Research

Example Query: "Is TSLA a good buy?"

Workflow:

* Parses the query and identifies TSLA as the target ticker
* Fetches OHLCV, fundamentals, and news via EODHD APIs
* Generates a concise LLM-written executive summary
* Saves raw data in structured JSON
* Provides extended analytics:

  * TradingView-style chart
  * Monte Carlo simulation
  * VaR estimation
  * Returns histogram
  * Beta and correlation vs benchmark
  * 3-year cumulative return comparison

<p align="center">
  <img src="frontend/public/CWF_demoi1.png" alt="Single Ticker Analysis Example" width="800"/>
</p>

⚠️ Important Note

As of version 1.0.1, all tickers must include their market suffix (e.g., .US, .PA).
For example, use AAPL.US instead of AAPL, or AIR.PA instead of AIR.

---

### Comparative Research

Example Query: "Compare TSLA and AMZN"

Workflow:

* Recognizes both tickers
* Fetches data and news for each
* Constructs comparative summary:

  * Financial performance
  * Price and sentiment
* Displays side-by-side analytics

<p align="center">
  <img src="frontend/public/CWF_demo9.png" alt="Comparative Analysis Example" width="800"/>
</p>

⚠️ Important Note

As of version 1.0.1, all tickers must include their market suffix (e.g., .US, .PA).
For example, use AAPL.US instead of AAPL, or AIR.PA instead of AIR.

---

### Deep Research with GPT-Researcher

Example Query: "What are the last articles about AI and Quant Finance from ArXiv"

Workflow:

* Performs recursive search with GPT-Researcher
* Builds a structured research report
* Provides source links

<p align="center">
  <img src="frontend/public/CWF_DR.png" alt="Deep Research" width="800"/>
</p>

---

## Quantitative Analytics

* Monte Carlo Simulation
* Value at Risk (VaR) and Expected Shortfall
* Daily return histograms
* Beta and R² plots
* 3-year cumulative return comparison

<p align="center">
  <img src="frontend/public/CWF_demo3.png" alt="Quant Analysis Example" width="800"/>
</p>

Planned features include:

* Rolling Sharpe ratios
* Calendar heatmaps
* ACF/PACF plots
* Volatility cones
* Drawdown visualizations

---

## Getting Started

### Install requirements

```bash
pip install -r requirements.txt
```

### Set environment variables

```env
OPENAI_API_KEY='your_openai_key_here'
EODHD_API_KEY='your_eodhd_key_here'
TAVILY_API_KEY='your_tavily_key_here' (optional)
```

### Run FastAPI server

```bash
uvicorn main:app --reload
```

### Programmatic use

```python
from backend.workflows.analyze import FundamentalFlow

flow = FundamentalFlow()
result = flow.invoke(inputs={"user_query": "Analyze AAPL and TSLA fundamentals and forecast returns"})
print(result.model_dump_json(indent=2))
```

---

## Future Enhancements

* Intraday data support
* Alphalens integration
* News sentiment analytics

---

## License

This project is intended for research and personal development use. Commercial deployments must comply with **OpenAI**,**EODHD** and **GPT-Researcher** licensing.


---

## Changelog

Current Version: v1.0.1

* Added GPT-Researcher support
* Volatility and performance ratios
* In development branch

Baseline Version: v1.0

* Agentic workflow foundation
* Multi-ticker comparison
* Includes 4 of 10 planned quant modules
* Stock scanner to be added in QuantAgents

---

## Disclaimer

This application and its associated research outputs are provided solely for informational and educational purposes. Nothing contained within this repository, its documentation, or its outputs should be construed as financial advice, or as an offer, recommendation, or solicitation to buy or sell any security, product, or service.

Users are solely responsible for their own investment and trading decisions.  
The author(s) make no representations or warranties as to the accuracy, completeness, or suitability of the content for any purpose.  
By using this application, you acknowledge that you must exercise independent judgment, conduct your own due diligence, and refer to the Terms of Use and Disclaimer pages provided within the application.


---

## Author

<p align="center">
  <strong>S.M. Laignel</strong><br>
  Founder of SL MAR consultancy<br>
  AI and Quantitative Finance<br><br>
  GitHub: <a href="https://github.com/sl-mar/chat-with-fundamentals">sl-mar/chat-with-fundamentals</a>
</p>
