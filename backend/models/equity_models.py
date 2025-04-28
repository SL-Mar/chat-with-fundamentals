from pydantic import BaseModel
from typing import List

class Candle(BaseModel):
    datetime: str
    open: float
    high: float
    low: float
    close: float
    volume: int

class IntradayDataResponse(BaseModel):
    ticker: str
    interval: str
    candles: List[Candle]
