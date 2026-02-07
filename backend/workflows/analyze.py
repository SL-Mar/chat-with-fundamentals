# File: workflows/analyze.py
# Analyze workflow v1.0
# 15 April 2025
# Only one AI workflow / Deterministic flows are coded directly in the router quantanalyzer and simulater


import json
import pprint
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import httpx
from dateutil.relativedelta import relativedelta
from pydantic import BaseModel, ValidationError

from crewai.flow.flow import Flow, start, listen
from crewai import Crew, Task, Agent
from crewai.knowledge.source.string_knowledge_source import StringKnowledgeSource

from models.analyze_models import (
    Executive_Summary, Fin_Metric, Set_Metrics, DataSet_Metrics,
    Set_News, DataSet_News, Fin_News, OLHCV, EODResult, DataSet_EOD,
    DataFetchPlan
)
from agents.analyze_agents import fundamental_interpreter
from utils.helper_functions import generate_eodhd_filter_schema
from core.config import settings
from core.llm_provider import get_llm

# ──────────────────────────────────────────────────────────────────────────────
# HTTP client creation function (creates fresh client with current API key)
# ──────────────────────────────────────────────────────────────────────────────
def _get_http_client():
    """Create HTTP client with current API key from settings"""
    return httpx.Client(
        base_url="https://eodhd.com/api",
        params={"api_token": settings.eodhd_api_key, "fmt": "json"},
        timeout=10.0,
    )

class FundamentalState(BaseModel):
    plan: Optional[DataFetchPlan] = None
    summary: Optional[Executive_Summary] = None


class FundamentalFlow(Flow[FundamentalState]):
    """Full Flow: Crew, Planning, API Fetching and Structured Analysis"""

    @start()
    def run_crew(self):
        # initialize logger
        self.logger = logging.getLogger("analyzer")
        self.logger.setLevel(logging.INFO)
        self.logger.propagate = True

        user_query = self.inputs.get("user_query")
        if not user_query:
            raise ValueError("Missing 'user_query' input")
        self.logger.info(f"[FLOW] Starting for user query: {user_query}")

        # load schema for metric filtering
        schema_path = Path(__file__).parent / "AAPL.US.json"
        with open(schema_path, "r") as f:
            full_json = json.load(f)
        schema_map = generate_eodhd_filter_schema(full_json)
        schema_str = json.dumps(schema_map, indent=2)
        schema_knowledge = StringKnowledgeSource(content=schema_str)

        current_date_str = datetime.now().strftime("%Y-%m-%d")
        task_prompt = f"""
You are given a user query for financial analysis: {user_query}

Instructions:
1. Identify company tickers in the query.
2. ALWAYS fetch fundamental data unless explicitly told not to. Return a list of dicts with "path" and "label" for at least these key metrics:
   - General::Name
   - Highlights::MarketCapitalization
   - Highlights::PERatio
   - Valuation::TrailingPE
   - Highlights::DividendYield
3. ALWAYS fetch EOD price data. Today is {current_date_str}. Default to the last 3 months if no date is specified.
4. ALWAYS fetch news data unless explicitly told not to.
5. Return a full JSON conforming to the DataFetchPlan model with fetch=True for fundamentals and news.
"""
        task = Task(
            description=task_prompt,
            agent=fundamental_interpreter,
            expected_output="Structured DataFetchPlan",
            output_pydantic=DataFetchPlan,
            async_execution=False,
        )
        crew = Crew(
            agents=[fundamental_interpreter],
            tasks=[task],
            manager_llm=get_llm("analyze", role="manager"),
            verbose=False,
            memory=False,
            knowledge_sources=[schema_knowledge],
        )

        self.logger.info("[CREW] Running CrewAI to create DataFetchPlan")
        result = crew.kickoff(inputs={"user_query": user_query})
        self.logger.debug("[CREW] Raw result:\n" + result.raw)

        try:
            self.state.plan = DataFetchPlan.model_validate_json(result.raw)
            self.logger.info("[RESULT] DataFetchPlan parsed successfully")
            self.logger.info(f"[PLAN] Tickers: {self.state.plan.tickers}")
            self.logger.info(f"[PLAN] Fundamentals.fetch: {self.state.plan.fundamentals.fetch}")
            self.logger.info(f"[PLAN] Fundamentals.metrics: {self.state.plan.fundamentals.metrics}")
            self.logger.info(f"[PLAN] EOD.fetch: {self.state.plan.eod.fetch}")
            self.logger.info(f"[PLAN] News: {self.state.plan.news}")
        except ValidationError as ve:
            self.logger.error("[ERROR] Failed to parse DataFetchPlan", exc_info=True)
            raise

        # initialize empty executive summary container
        self.state.summary = Executive_Summary(
            Tickers=self.state.plan.tickers,
            Ex_summary="",
            Metrics=DataSet_Metrics(DataSet=[]),
            News=DataSet_News(DataSet=[]),
            Quote=DataSet_EOD(DataSet=[]),
        )

    @listen(run_crew)
    def fetch_fundamentals(self):
        if not self.state.plan.fundamentals.fetch:
            self.logger.warning("[FETCH] No fundamentals requested.")
            return

        metrics: List[Set_Metrics] = []
        for ticker in self.state.plan.tickers:
            self.logger.info(f"[FETCH] 🔍 Fundamentals for {ticker}...")
            fetched: List[Fin_Metric] = []

            for metric in self.state.plan.fundamentals.metrics:
                if isinstance(metric, str):
                    filter_path = metric
                    label = metric.split("::")[-1]
                elif isinstance(metric, dict):
                    filter_path = metric.get("path", "")
                    label = metric.get("label", filter_path.split("::")[-1])
                else:
                    continue

                try:
                    # Don't append .US if ticker already has a suffix
                    ticker_with_exchange = ticker if "." in ticker else f"{ticker}.US"
                    with _get_http_client() as client:
                        resp = client.get(
                            f"/fundamentals/{ticker_with_exchange}",
                            params={"filter": filter_path, "fmt": "json"}
                        )
                    resp.raise_for_status()
                    val = resp.json()
                    self.logger.debug(f"[FETCH] {ticker}::{label} = {val!r}")

                    if val in (None, "", "None", "N/A"):
                        value_str = "NA"
                    elif isinstance(val, (str, int, float)):
                        value_str = str(val)
                    else:
                        value_str = json.dumps(val)

                except Exception as e:
                    self.logger.warning(f"[FETCH] {label} failed for {ticker}: {e}")
                    value_str = str(e)

                fetched.append(Fin_Metric(Ticker=ticker, Metric=label, Value=value_str))

            self.logger.info(f"[FETCH] Collected {len(fetched)} metrics for {ticker}")
            metrics.append(Set_Metrics(Ticker=ticker, Metrics=fetched, State="ok"))

        self.state.summary.Metrics = DataSet_Metrics(DataSet=metrics)
        self.logger.info("[FETCH] Finished collecting fundamental metrics.")

    @listen(run_crew)
    def fetch_eod(self):
        if not self.state.plan.eod.fetch:
            self.logger.warning("[EOD] Skipping EOD fetch — not requested.")
            return

        quotes: List[EODResult] = []
        for ticker in self.state.plan.tickers:
            try:
                with _get_http_client() as client:
                    resp = client.get(
                        f"/eod/{ticker}",
                        params={
                            "from": self.state.plan.eod.start_date,
                            "to":   self.state.plan.eod.end_date,
                            "fmt":  "json"
                        }
                    )
                resp.raise_for_status()
                json_data = resp.json()

                records: List[OLHCV] = []
                for row in json_data:
                    try:
                        records.append(OLHCV(
                            Date=row["date"],
                            Open=row["open"],
                            High=row["high"],
                            Low=row["low"],
                            Close=row["close"],
                            AdjClose=row["adjusted_close"],
                            Volume=row["volume"]
                        ))
                    except KeyError as e:
                        self.logger.warning(f"[EOD] Missing field in {ticker} row: {e}")

                if records:
                    quotes.append(EODResult(ticker=ticker, data=records))

            except Exception as e:
                self.logger.error(f"[EOD] Error fetching for {ticker}: {e}")
        
        self.state.summary.Quote = DataSet_EOD(DataSet=quotes)
        self.logger.info("[EOD] EOD data fetched and structured.")

    @listen(run_crew)
    def fetch_news(self):
        if not self.state.plan.news:
            self.logger.info("[NEWS] News fetch not requested.")
            return

        news_sets: List[Set_News] = []
        for ticker in self.state.plan.tickers:
            try:
                with _get_http_client() as client:
                    resp = client.get(
                        "/news",
                        params={"s": ticker, "offset": 0, "limit": 10, "fmt": "json"}
                    )
                resp.raise_for_status()
                json_data = resp.json()
                items = [
                    Fin_News(
                        Ticker=ticker,
                        Date=i.get("date", ""),
                        Title=i.get("title", ""),
                        Content=i.get("content", ""),
                        Link=i.get("link", ""),
                    )
                    for i in json_data
                ]
            except Exception as e:
                self.logger.warning(f"[NEWS] Error fetching news for {ticker}: {e}")
                items = []

            news_sets.append(Set_News(Ticker=ticker, News=items, Present="ok"))

        self.state.summary.News = DataSet_News(DataSet=news_sets)
        self.logger.info("[NEWS] News data collected.")

    @listen(run_crew)
    def analyze_data(self):
        self.logger.info("[ANALYSIS] Running final summary generation...")

        analysis_agent = Agent(
            role="Equity Research Analyst",
            goal="Write a concise executive summary",
            backstory="You're a senior analyst specialized in fundamental equity research.",
            allow_delegation=False,
        )

        prompt = f'''
Based on the following financial metrics, EOD prices, and recent news, write a detailed executive summary for the tickers: {', '.join(self.state.plan.tickers)}.

Financial Metrics:
{self.state.summary.Metrics.model_dump_json(indent=2)}

EOD Quotes:
{self.state.summary.Quote.model_dump_json(indent=2)}

News:
{self.state.summary.News.model_dump_json(indent=2)}

Return only the executive summary text.
'''
        task = Task(
            description=prompt,
            agent=analysis_agent,
            expected_output="Executive summary only.",
        )
        crew = Crew(
            agents=[analysis_agent],
            tasks=[task],
            manager_llm=get_llm("analyze", role="manager"),
            verbose=True,
        )

        result = crew.kickoff()
        # Strip any "Executive Summary:" prefix from the LLM output to avoid duplication in frontend
        summary_text = result.raw.strip()
        if summary_text.startswith("Executive Summary:"):
            summary_text = summary_text[len("Executive Summary:"):].strip()
        elif summary_text.startswith("Executive Summary"):
            summary_text = summary_text[len("Executive Summary"):].strip()

        self.state.summary.Ex_summary = summary_text
        self.logger.info("[ANALYSIS] Executive summary generated.")

    @listen(analyze_data)
    def return_data(self):
        self.logger.info("[RESULT] Returning final ExecutiveSummary")
        # self.logger.debug(pprint.pformat(self.state.summary.model_dump())) - for debugging only
        return self.state.summary

    def finalize(self) -> Executive_Summary:
        if not self.state.summary:
            raise ValueError("Final Executive_Summary is missing.")
        self.logger.info("[FINALIZE] Final result prepared")
        # self.logger.debug(pprint.pformat(self.state.summary.model_dump())) - for debugging only
        return self.state.summary
