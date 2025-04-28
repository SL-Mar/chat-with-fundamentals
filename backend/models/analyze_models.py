# models/analyse_models.py

from pydantic import BaseModel, Field
from typing import List, Optional

# === Chat with Fundamentals / Chat Entry ===

class UserQuery(BaseModel):
    user_query: str = Field(..., description="User's raw input.")

# === Chat with Fundamentals / Interpretation Models ===

class FundamentalsRequest(BaseModel):
    fetch: bool = Field(default=False)
    metrics: Optional[List[str]] = Field(default_factory=list)  # Exact API keys like "trailingPE", "roe"

class EODRequest(BaseModel):
    fetch: bool = Field(default=False)
    start_date: Optional[str] = None  # Format: YYYY-MM-DD
    end_date: Optional[str] = None

class DataFetchPlan(BaseModel):
    tickers: List[str] = Field(default_factory=list)
    fundamentals: FundamentalsRequest = Field(default_factory=FundamentalsRequest)
    eod: EODRequest = Field(default_factory=EODRequest)
    news: bool = Field(default=False)
    reasoning: Optional[str] = None  # Optional explanation for debugging or display

# === EOD / Quote Data ===

class OLHCV(BaseModel):
    Date: str = Field(alias="date")
    Open: float = Field(alias="open")
    High: float = Field(alias="high")
    Low: float = Field(alias="low")
    Close: float = Field(alias="close")
    AdjClose: float = Field(alias="adjusted_close")
    Volume: int = Field(alias="volume")

    class Config:
        populate_by_name = True

class EODResult(BaseModel):
    ticker: str
    data: List[OLHCV]

class DataSet_EOD(BaseModel):
    DataSet: List[EODResult] = Field(..., description="A list of EOD dataframes for each ticker.")


# === News Data ===

class Fin_News(BaseModel):
    Ticker: str
    Date: str
    Title: str
    Content: str
    Link: str

class Set_News(BaseModel):
    Ticker: str
    News: List[Fin_News]
    Present: str

class DataSet_News(BaseModel):
    DataSet: List[Set_News] = Field(..., description="A list of news for each ticker.")


# === Financial Metrics ===

class Fin_Metric(BaseModel):
    Ticker: str
    Metric: str
    Value: str

class Set_Metrics(BaseModel):
    Ticker: str
    Metrics: List[Fin_Metric]
    State: str

class DataSet_Metrics(BaseModel):
    DataSet: List[Set_Metrics] = Field(..., description="A list of metrics for each ticker.")


# === Final Consolidated Output ===

class Executive_Summary(BaseModel):
    Tickers: List[str] = Field(..., description="Companies tickers.")
    Ex_summary: str = Field(..., description="Executive summary.")
    Metrics: DataSet_Metrics
    News: DataSet_News
    Quote: DataSet_EOD
