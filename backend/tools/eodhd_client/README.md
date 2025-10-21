# Comprehensive EODHD API Client

A complete Python client for all 50+ EODHD (End of Day Historical Data) API endpoints.

## Features

✅ **Complete Coverage**: All EODHD API endpoints implemented
✅ **Type Hints**: Full type annotations for better IDE support
✅ **Error Handling**: Robust error handling and logging
✅ **Clean API**: Organized by category for easy discovery
✅ **Well Documented**: Comprehensive docstrings with examples

## Installation

```python
from backend.tools.eodhd_client import EODHDClient

# Initialize with API key
client = EODHDClient(api_key="your_eodhd_api_key")

# Or use environment variable EODHD_API_KEY
client = EODHDClient()
```

## API Categories

### 1. Historical Data (`client.historical`)

End-of-Day, Intraday, Live, and Tick data.

```python
# Get EOD data
eod = client.historical.get_eod("AAPL.US", from_date="2024-01-01")

# Get intraday data (5-minute intervals)
intraday = client.historical.get_intraday("TSLA.US", interval="5m")

# Get live price
live = client.historical.get_live_price("MSFT.US")

# Get multiple live prices at once
bulk_live = client.historical.get_live_prices_bulk(["AAPL", "TSLA", "MSFT"])

# Get tick data (premium)
ticks = client.historical.get_tick_data("AAPL.US", from_timestamp=1640000000, to_timestamp=1640100000)

# Get options data
options = client.historical.get_options_data("AAPL.US", from_date="2024-01-01")
```

### 2. Fundamental Data (`client.fundamental`)

Comprehensive fundamental data for stocks, bonds, crypto, and calendar events.

```python
# Get full fundamentals
fundamentals = client.fundamental.get_fundamentals("AAPL.US")

# Get specific sections only
highlights = client.fundamental.get_fundamentals("AAPL.US", filter_param="Highlights,Valuation")

# Get bulk fundamentals for entire exchange
bulk = client.fundamental.get_bulk_fundamentals("US", type_param="ETF", limit=100)

# Earnings calendar
earnings = client.fundamental.get_calendar_earnings(from_date="2024-01-01", to_date="2024-01-31")

# IPO calendar
ipos = client.fundamental.get_calendar_ipos(from_date="2024-01-01")

# Splits calendar
splits = client.fundamental.get_calendar_splits(from_date="2024-01-01")

# Insider transactions
insiders = client.fundamental.get_insider_transactions("AAPL.US", limit=50)

# Bond fundamentals
bonds = client.fundamental.get_bond_fundamentals("US0378331005")

# Crypto fundamentals
crypto = client.fundamental.get_crypto_fundamentals("BTC-USD")
```

### 3. Exchange & Symbol Data (`client.exchange`)

Exchange information, ticker lists, and symbol search.

```python
# Get all exchanges
exchanges = client.exchange.get_exchanges()

# Get all US stocks
us_stocks = client.exchange.get_exchange_symbols("US", type_param="Common Stock")

# Get all US ETFs
us_etfs = client.exchange.get_exchange_symbols("US", type_param="ETF")

# Get trading hours
hours = client.exchange.get_trading_hours("US")

# Search symbols
results = client.exchange.search_symbols("Apple")
results = client.exchange.search_symbols("AAPL", exchange="US")

# Get delisted symbols
delisted = client.exchange.get_delisted_symbols("US", from_date="2024-01-01")
```

### 4. Corporate Actions (`client.corporate`)

Dividends, splits, and bulk data downloads.

```python
# Get dividend history
dividends = client.corporate.get_dividends("AAPL.US", from_date="2023-01-01")

# Get split history
splits = client.corporate.get_splits("TSLA.US", from_date="2020-01-01")

# Get bulk EOD data for entire exchange
bulk_eod = client.corporate.get_bulk_eod("US", date_param="2024-01-15")

# Get bulk ETF data only
etf_data = client.corporate.get_bulk_eod("US", date_param="2024-01-15", type_param="ETF")

# Get bulk splits for exchange
bulk_splits = client.corporate.get_bulk_splits("US", "2024-01-15")

# Get bulk dividends for exchange
bulk_divs = client.corporate.get_bulk_dividends("US", "2024-01-15")
```

### 5. Technical Analysis (`client.technical`)

Technical indicators and stock screener.

```python
# Simple Moving Average
sma = client.technical.get_technical_indicator("AAPL.US", "sma", period=50)

# RSI
rsi = client.technical.get_technical_indicator("AAPL.US", "rsi", period=14)

# MACD
macd = client.technical.get_technical_indicator(
    "AAPL.US", "macd",
    fastperiod=12, slowperiod=26, signalperiod=9
)

# Bollinger Bands
bbands = client.technical.get_technical_indicator("AAPL.US", "bbands", period=20)

# Stock Screener - Find tech stocks with market cap > $100B and P/E < 30
results = client.technical.screen_stocks(
    filters=[
        "market_capitalization>100000000000",
        "pe_ratio<30",
        "sector=Technology",
        "code=US"
    ],
    sort="market_capitalization.desc",
    limit=20
)

# Find stocks at 52-week high
high_stocks = client.technical.screen_stocks(signals="50d_new_hi", limit=30)
```

### 6. News & Sentiment (`client.news`)

Financial news and sentiment analysis.

```python
# Get news for specific symbol
news = client.news.get_news("AAPL", limit=10)

# Get all market news
market_news = client.news.get_news(limit=50)

# Get earnings-related news
earnings_news = client.news.get_news(tag="earnings", limit=20)

# Get sentiment analysis
sentiment = client.news.get_sentiment("AAPL.US")

# Get Twitter mentions
mentions = client.news.get_twitter_mentions("TSLA")
```

### 7. Special Data (`client.special`)

ETF holdings, index constituents, ESG, logos, and more.

```python
# Get ETF holdings
holdings = client.special.get_etf_holdings("SPY.US")

# Get index constituents
sp500 = client.special.get_index_constituents("GSPC.INDX")
dow = client.special.get_index_constituents("DJI.INDX")

# Get historical constituents
historical = client.special.get_index_historical_constituents("GSPC.INDX", "2020-01-01")

# Get ESG scores
esg = client.special.get_esg_scores("AAPL.US")

# Get company logo URL
logo_url = client.special.get_logo("AAPL.US")

# Get market cap history
market_cap = client.special.get_market_cap_history("AAPL.US", from_date="2020-01-01")

# Get analyst ratings
ratings = client.special.get_analyst_ratings("TSLA.US")

# Get major shareholders
institutions = client.special.get_shareholders("AAPL.US", "institutions")
funds = client.special.get_shareholders("AAPL.US", "funds")
```

### 8. Macro & Economic Data (`client.macro`)

Macroeconomic indicators and economic calendar.

```python
# Get US GDP data
gdp = client.macro.get_macro_indicator("USA", "gdp_current_usd")

# Get inflation data
inflation = client.macro.get_macro_indicator("USA", "inflation_consumer_prices_annual")

# Get economic calendar events
events = client.macro.get_economic_events(
    from_date="2024-01-01",
    to_date="2024-01-31",
    country="US"
)
```

### 9. User & Account API (`client.user`)

Check API usage and limits.

```python
# Get user info and API usage
info = client.user.get_user_info()
print(f"Used: {info['apiRequests']} / {info['apiRequestsLimit']}")
print(f"Plan: {info['subscriptionType']}")

# Check remaining requests
usage = client.user.check_api_limit()
remaining = usage['apiRequestsLimit'] - usage['apiRequests']
print(f"Remaining requests today: {remaining}")
```

## Complete Endpoint List

| Category | Endpoints | Count |
|----------|-----------|-------|
| **Historical Data** | EOD, Intraday, Live, Bulk Live, Tick, Options | 6 |
| **Fundamental Data** | Fundamentals, Bulk Fundamentals, Calendar (Earnings, Trends, IPOs, Splits), Insider Transactions, Bonds, Crypto | 9 |
| **Exchange Data** | Exchanges List, Exchange Symbols, Trading Hours, Symbol Search, Delisted Symbols | 5 |
| **Corporate Actions** | Dividends, Splits, Bulk EOD, Bulk Splits, Bulk Dividends | 5 |
| **Technical Analysis** | Technical Indicators (30+ types), Stock Screener | 2 |
| **News & Sentiment** | News, Sentiment, Twitter Mentions | 3 |
| **Special Data** | ETF Holdings, Index Constituents, Historical Constituents, ESG, Logos, Market Cap History, Analyst Ratings, Shareholders | 8 |
| **Macro & Economic** | Macro Indicators, Economic Events | 2 |
| **User API** | User Info, API Limits | 1 |
| **TOTAL** | | **41+ primary endpoints** |

*Note: Some endpoints support multiple data types (stocks, ETFs, funds, bonds, crypto), effectively providing 50+ unique data access points.*

## Available Technical Indicators

```python
# Moving Averages
"sma", "ema", "wma", "dema", "tema", "trima", "kama", "mama", "t3"

# Momentum Indicators
"rsi", "macd", "stochastic", "stochrsi", "williams", "momentum", "roc"

# Volatility Indicators
"bbands", "atr", "stddev", "var"

# Trend Indicators
"adx", "aroon", "cci"

# Regression
"linearreg", "linearregslope", "linearregintercept"
```

## Error Handling

```python
import requests

try:
    data = client.historical.get_eod("INVALID.US")
except requests.HTTPError as e:
    print(f"HTTP Error: {e.response.status_code}")
except requests.RequestException as e:
    print(f"Request failed: {e}")
```

## Best Practices

1. **Cache Responses**: Store frequently accessed data locally
2. **Monitor API Limits**: Check `client.user.get_user_info()` regularly
3. **Use Bulk Endpoints**: When fetching multiple symbols, use bulk endpoints
4. **Filter Fundamentals**: Request only needed sections with `filter_param`
5. **Handle Rate Limits**: Implement exponential backoff for retries

## Migration from Old Client

```python
# OLD (limited)
from backend.tools.EODHDTool import EODHDTool
tool = EODHDTool()
data = tool._run("AAPL")

# NEW (comprehensive)
from backend.tools.eodhd_client import EODHDClient
client = EODHDClient()
fundamentals = client.fundamental.get_fundamentals("AAPL.US")
eod = client.historical.get_eod("AAPL.US", from_date="2024-01-01")
news = client.news.get_news("AAPL", limit=10)
```

## License

Part of Chat with Fundamentals project. See main LICENSE for details.
