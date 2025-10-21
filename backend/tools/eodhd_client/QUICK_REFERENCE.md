# EODHD Client - Quick Reference

## Initialization

```python
from backend.tools.eodhd_client import EODHDClient
client = EODHDClient()  # Uses EODHD_API_KEY env var
```

## Most Common Operations

### Price Data

```python
# EOD historical
client.historical.get_eod("AAPL.US", from_date="2024-01-01")

# Live price
client.historical.get_live_price("TSLA.US")

# Multiple live prices
client.historical.get_live_prices_bulk(["AAPL", "TSLA", "MSFT"])

# Intraday (5-min)
client.historical.get_intraday("AAPL.US", interval="5m")
```

### Fundamentals

```python
# All fundamentals
client.fundamental.get_fundamentals("AAPL.US")

# Specific sections
client.fundamental.get_fundamentals("AAPL.US",
    filter_param="Highlights,Valuation,General")

# Earnings calendar
client.fundamental.get_calendar_earnings(
    from_date="2024-01-01", to_date="2024-01-31")
```

### News

```python
# Company news
client.news.get_news("AAPL", limit=10)

# All market news
client.news.get_news(limit=50)

# Sentiment
client.news.get_sentiment("AAPL.US")
```

### Exchange & Symbols

```python
# All exchanges
client.exchange.get_exchanges()

# US stocks
client.exchange.get_exchange_symbols("US", type_param="Common Stock")

# US ETFs
client.exchange.get_exchange_symbols("US", type_param="ETF")

# Search
client.exchange.search_symbols("Tesla")
```

### Corporate Actions

```python
# Dividends
client.corporate.get_dividends("AAPL.US", from_date="2023-01-01")

# Splits
client.corporate.get_splits("TSLA.US", from_date="2020-01-01")

# Bulk EOD for entire exchange
client.corporate.get_bulk_eod("US", "2024-01-15")
```

### Technical Analysis

```python
# RSI
client.technical.get_technical_indicator("AAPL.US", "rsi", period=14)

# MACD
client.technical.get_technical_indicator("AAPL.US", "macd",
    fastperiod=12, slowperiod=26, signalperiod=9)

# Moving Average
client.technical.get_technical_indicator("AAPL.US", "sma", period=50)

# Bollinger Bands
client.technical.get_technical_indicator("AAPL.US", "bbands", period=20)

# Stock Screener
client.technical.screen_stocks(
    filters=["market_capitalization>10000000000", "pe_ratio<30"],
    sort="market_capitalization.desc", limit=20)
```

### Special Data

```python
# ETF holdings
client.special.get_etf_holdings("SPY.US")

# S&P 500 constituents
client.special.get_index_constituents("GSPC.INDX")

# ESG scores
client.special.get_esg_scores("AAPL.US")

# Company logo
client.special.get_logo("AAPL.US")

# Analyst ratings
client.special.get_analyst_ratings("TSLA.US")
```

### Usage Tracking

```python
# Check API usage
info = client.user.get_user_info()
print(f"Used: {info['apiRequests']} / {info['apiRequestsLimit']}")
```

## All Available Indicators

```python
# Moving Averages
"sma", "ema", "wma", "dema", "tema", "trima", "kama", "mama", "t3"

# Momentum
"rsi", "macd", "stochastic", "stochrsi", "williams", "momentum", "roc"

# Volatility
"bbands", "atr", "stddev", "var"

# Trend
"adx", "aroon", "cci"

# Regression
"linearreg", "linearregslope", "linearregintercept"
```

## Common Filters

### Fundamentals Filter

```python
# Sections: General, Highlights, Valuation, SharesStats, Technicals,
#           SplitsDividends, AnalystRatings, Holders, InsiderTransactions,
#           ESGScores, Earnings, Financials

filter_param = "Highlights,Valuation,General"
```

### Screener Filters

```python
filters = [
    "market_capitalization>1000000000",  # Market cap > $1B
    "pe_ratio<30",                       # P/E < 30
    "dividend_yield>0.03",               # Dividend yield > 3%
    "sector=Technology",                 # Tech sector
    "code=US",                          # US stocks only
    "exchange=NYSE"                      # NYSE only
]
```

### Screener Signals

```python
"50d_new_hi"    # 50-day high
"50d_new_lo"    # 50-day low
"200d_new_hi"   # 200-day high
"200d_new_lo"   # 200-day low
```

## Error Handling

```python
import requests

try:
    data = client.historical.get_eod("SYMBOL.US")
except requests.HTTPError as e:
    print(f"HTTP {e.response.status_code}: {e.response.text}")
except requests.RequestException as e:
    print(f"Request failed: {e}")
```

## Symbol Format

```python
# Always use: SYMBOL.EXCHANGE
"AAPL.US"      # Apple on US exchanges
"TSLA.US"      # Tesla on US exchanges
"MSFT.US"      # Microsoft on US exchanges
"VOD.LSE"      # Vodafone on London Stock Exchange
"SAP.XETRA"    # SAP on XETRA
"BTC-USD"      # Bitcoin
"ETH-USD"      # Ethereum
"GSPC.INDX"    # S&P 500 Index
"DJI.INDX"     # Dow Jones Index
```

## Complete API Structure

```python
client.historical.*     # Price data (EOD, Intraday, Live, Tick)
client.fundamental.*    # Fundamentals, Calendar, Insiders
client.exchange.*       # Exchanges, Symbols, Search
client.corporate.*      # Dividends, Splits, Bulk data
client.technical.*      # Indicators, Screener
client.news.*          # News, Sentiment
client.special.*       # ETF, ESG, Logos, Analysts
client.macro.*         # Economic indicators, Events
client.user.*          # Usage & limits
```

---

**For full documentation**: See `README.md`
**For examples**: Run `examples.py`
