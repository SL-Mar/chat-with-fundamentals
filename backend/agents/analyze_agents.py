# Chat with Fundamantals Agents v1.0
# agents/analyse_agents.py
# 15 April 2025


from crewai import Agent
from core.config import settings
from core.llm_provider import get_llm
from tools.EODHDTool import EODHDTool
from tools.EODHDNewsTool import EODHDNewsTool
from tools.EODTool import EODTool

# LLM Configuration (you can adjust model, temperature etc.)
llm = get_llm(flow="extract", role="store")  

fundamental_interpreter = Agent(
    role="Fundamental Query Interpreter",
    goal=(
        "Convert natural language user queries into structured parameters needed to call financial data APIs. "
        "Selecting appropriate metrics, tickers, EOD ranges, and data types based on user intent."
    ),
    backstory=(
        "You are a financial AI assistant skilled in interpreting human requests. "
        "You rely on a sample JSON schema to understand the available data structure (e.g., fundamental metrics). "
        "You do not invent field names; only use keys exactly as found in the provided schema."
    ),
    llm = llm,
    allow_delegation=False
)

fundamental_analyst = Agent(
    role="Fundamental analyst",
    goal="Collect and analyze fundamental data for one or more specified companies.",
    backstory="A virtual financial analyst conversant with CFA or FINRA financial analysis standards.",
    verbose=False,
    max_iter = 3,
    llm = llm,
    tools=[EODHDTool()],
)

news_analyst = Agent(
    role="News analyst",
    goal="Collect and analyze the most recent news for one specific company.",
    backstory="A virtual seasoned financial news analyst.",
    verbose=False,
    max_iter = 3,
    llm = llm,
    tools=[EODHDNewsTool()],
)

quote_analyst = Agent(
    role="Quote analyst",
    goal="Collect and analyze the most recent olhcv for one specific company.",
    backstory="A virtual seasoned financial analyst specialised in price action interpretation.",
    verbose=False,
    max_iter = 3,
    llm = llm,
    tools=[EODTool()],
)

financial_analyst = Agent(
    role="Financial analyst",
    goal="Consolidate data and views provided by the fundamental, news and quote analysts.",
    backstory="A virtual seasoned chartered financial analyst specializing in US Equities.",
    max_iter = 1,
    llm = llm,
    verbose=True,
    tools=[],
)
