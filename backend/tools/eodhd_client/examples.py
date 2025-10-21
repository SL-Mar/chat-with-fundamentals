"""
Example Usage of Comprehensive EODHD Client
Demonstrates all major endpoint categories
"""

import os
from datetime import datetime, timedelta
from eodhd_client import EODHDClient


def example_historical_data(client: EODHDClient):
    """Example: Historical price data"""
    print("\n" + "="*80)
    print("HISTORICAL DATA EXAMPLES")
    print("="*80)

    # EOD data for last 30 days
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)

    print("\n1. Get EOD data for AAPL (last 30 days)")
    eod = client.historical.get_eod(
        "AAPL.US",
        from_date=start_date.strftime("%Y-%m-%d"),
        to_date=end_date.strftime("%Y-%m-%d")
    )
    print(f"   Retrieved {len(eod)} days of data")
    if eod:
        latest = eod[-1]
        print(f"   Latest: {latest['date']} - Close: ${latest['close']:.2f}, Volume: {latest['volume']:,}")

    # Live price
    print("\n2. Get live price for TSLA")
    live = client.historical.get_live_price("TSLA.US")
    print(f"   Price: ${live['close']:.2f}, Change: {live.get('change_p', 0):.2f}%")

    # Multiple live prices
    print("\n3. Get live prices for multiple symbols")
    bulk_live = client.historical.get_live_prices_bulk(["AAPL", "TSLA", "MSFT"], "US")
    for stock in bulk_live[:3]:
        print(f"   {stock['code']}: ${stock['close']:.2f} ({stock.get('change_p', 0):+.2f}%)")


def example_fundamental_data(client: EODHDClient):
    """Example: Fundamental data"""
    print("\n" + "="*80)
    print("FUNDAMENTAL DATA EXAMPLES")
    print("="*80)

    print("\n1. Get key metrics for AAPL")
    fundamentals = client.fundamental.get_fundamentals(
        "AAPL.US",
        filter_param="Highlights,Valuation,General"
    )

    if "Highlights" in fundamentals:
        h = fundamentals["Highlights"]
        print(f"   Market Cap: ${h.get('MarketCapitalization', 0):,.0f}")
        print(f"   P/E Ratio: {h.get('PERatio', 0):.2f}")
        print(f"   Dividend Yield: {h.get('DividendYield', 0):.4f}")
        print(f"   52-Week High: ${h.get('52WeekHigh', 0):.2f}")
        print(f"   52-Week Low: ${h.get('52WeekLow', 0):.2f}")

    print("\n2. Get upcoming earnings")
    today = datetime.now()
    next_month = today + timedelta(days=30)
    earnings = client.fundamental.get_calendar_earnings(
        from_date=today.strftime("%Y-%m-%d"),
        to_date=next_month.strftime("%Y-%m-%d")
    )
    if earnings and "earnings" in earnings:
        print(f"   Found {len(earnings['earnings'])} upcoming earnings announcements")
        for i, e in enumerate(earnings["earnings"][:5], 1):
            print(f"   {i}. {e.get('code', 'N/A')} - {e.get('report_date', 'N/A')}")

    print("\n3. Get insider transactions for TSLA")
    insiders = client.fundamental.get_insider_transactions("TSLA.US", limit=5)
    if insiders:
        print(f"   Found {len(insiders)} recent insider transactions")
        for i, txn in enumerate(insiders[:3], 1):
            print(f"   {i}. {txn.get('name', 'N/A')}: {txn.get('transactionType', 'N/A')} - {txn.get('shares', 0):,} shares")


def example_exchange_data(client: EODHDClient):
    """Example: Exchange and symbol data"""
    print("\n" + "="*80)
    print("EXCHANGE & SYMBOL DATA EXAMPLES")
    print("="*80)

    print("\n1. Get all exchanges")
    exchanges = client.exchange.get_exchanges()
    us_exchanges = [e for e in exchanges if e.get('Country') == 'USA']
    print(f"   Total exchanges: {len(exchanges)}")
    print(f"   US exchanges: {len(us_exchanges)}")
    for ex in us_exchanges[:3]:
        print(f"   - {ex.get('Name', 'N/A')} ({ex.get('Code', 'N/A')})")

    print("\n2. Get all US ETFs")
    us_etfs = client.exchange.get_exchange_symbols("US", type_param="ETF")
    print(f"   Found {len(us_etfs)} US ETFs")
    for etf in us_etfs[:5]:
        print(f"   - {etf.get('Code', 'N/A')}: {etf.get('Name', 'N/A')}")

    print("\n3. Search for symbols")
    results = client.exchange.search_symbols("Tesla")
    print(f"   Search 'Tesla' found {len(results)} results")
    for r in results[:3]:
        print(f"   - {r.get('Code', 'N/A')}: {r.get('Name', 'N/A')}")


def example_corporate_actions(client: EODHDClient):
    """Example: Corporate actions"""
    print("\n" + "="*80)
    print("CORPORATE ACTIONS EXAMPLES")
    print("="*80)

    print("\n1. Get dividend history for AAPL (last 2 years)")
    two_years_ago = datetime.now() - timedelta(days=730)
    dividends = client.corporate.get_dividends(
        "AAPL.US",
        from_date=two_years_ago.strftime("%Y-%m-%d")
    )
    print(f"   Found {len(dividends)} dividend payments")
    if dividends:
        total = sum(d.get('dividend', 0) for d in dividends)
        print(f"   Total dividends (2 years): ${total:.2f}")
        for div in dividends[:3]:
            print(f"   - {div.get('date', 'N/A')}: ${div.get('dividend', 0):.4f}")

    print("\n2. Get split history for TSLA")
    splits = client.corporate.get_splits("TSLA.US", from_date="2020-01-01")
    print(f"   Found {len(splits)} stock splits since 2020")
    for split in splits:
        print(f"   - {split.get('date', 'N/A')}: {split.get('split', 'N/A')}")


def example_technical_analysis(client: EODHDClient):
    """Example: Technical indicators and screening"""
    print("\n" + "="*80)
    print("TECHNICAL ANALYSIS EXAMPLES")
    print("="*80)

    print("\n1. Get RSI for AAPL")
    rsi = client.technical.get_technical_indicator("AAPL.US", "rsi", period=14)
    if rsi:
        latest_rsi = list(rsi.values())[-1] if isinstance(rsi, dict) else None
        print(f"   Latest RSI(14): {latest_rsi}")

    print("\n2. Get MACD for AAPL")
    macd = client.technical.get_technical_indicator(
        "AAPL.US", "macd",
        fastperiod=12, slowperiod=26, signalperiod=9
    )
    print(f"   MACD calculated with standard parameters")

    print("\n3. Screen for tech stocks (Market Cap > $10B, P/E < 30)")
    try:
        results = client.technical.screen_stocks(
            filters=[
                "market_capitalization>10000000000",
                "pe_ratio<30",
                "sector=Technology",
                "code=US"
            ],
            sort="market_capitalization.desc",
            limit=10
        )
        if results and "data" in results:
            print(f"   Found {len(results['data'])} matching stocks")
            for stock in results["data"][:5]:
                print(f"   - {stock.get('code', 'N/A')}: Market Cap ${stock.get('market_capitalization', 0)/1e9:.1f}B, P/E {stock.get('pe_ratio', 0):.2f}")
    except Exception as e:
        print(f"   Screener error: {e}")


def example_news_sentiment(client: EODHDClient):
    """Example: News and sentiment"""
    print("\n" + "="*80)
    print("NEWS & SENTIMENT EXAMPLES")
    print("="*80)

    print("\n1. Get recent news for AAPL")
    news = client.news.get_news("AAPL", limit=5)
    print(f"   Found {len(news)} recent articles")
    for i, article in enumerate(news[:3], 1):
        print(f"   {i}. {article.get('title', 'N/A')[:80]}...")
        print(f"      Date: {article.get('date', 'N/A')}")

    print("\n2. Get general market news")
    market_news = client.news.get_news(limit=5)
    print(f"   Found {len(market_news)} general market articles")


def example_special_data(client: EODHDClient):
    """Example: Special data (ETF, ESG, etc.)"""
    print("\n" + "="*80)
    print("SPECIAL DATA EXAMPLES")
    print("="*80)

    print("\n1. Get ETF holdings for SPY")
    try:
        holdings = client.special.get_etf_holdings("SPY.US")
        if holdings and "ETF_Data" in holdings:
            etf_data = holdings["ETF_Data"]
            print(f"   Fund: {etf_data.get('General', {}).get('Name', 'SPY')}")
            print(f"   Total Assets: ${etf_data.get('Technicals', {}).get('TotalAssets', 0):,.0f}")
            if "Holdings" in etf_data:
                top_holdings = etf_data["Holdings"][:5]
                print(f"   Top 5 Holdings:")
                for h in top_holdings:
                    print(f"   - {h.get('Name', 'N/A')}: {h.get('PercentageOfAssets', 0):.2f}%")
    except Exception as e:
        print(f"   Error: {e}")

    print("\n2. Get S&P 500 constituents")
    try:
        sp500 = client.special.get_index_constituents("GSPC.INDX")
        if sp500 and "Components" in sp500:
            components = sp500["Components"]
            print(f"   Found {len(components)} components")
            for i, comp in enumerate(list(components.items())[:5], 1):
                code, data = comp
                print(f"   {i}. {code}: {data.get('Name', 'N/A')}")
    except Exception as e:
        print(f"   Error: {e}")

    print("\n3. Get ESG scores for AAPL")
    try:
        esg = client.special.get_esg_scores("AAPL.US")
        if esg and "ESGScores" in esg:
            scores = esg["ESGScores"]
            print(f"   Total Score: {scores.get('TotalESG', 'N/A')}")
            print(f"   Environment: {scores.get('EnvironmentScore', 'N/A')}")
            print(f"   Social: {scores.get('SocialScore', 'N/A')}")
            print(f"   Governance: {scores.get('GovernanceScore', 'N/A')}")
    except Exception as e:
        print(f"   Error: {e}")


def example_user_api(client: EODHDClient):
    """Example: User API and limits"""
    print("\n" + "="*80)
    print("USER API EXAMPLES")
    print("="*80)

    print("\n1. Check API usage and limits")
    try:
        info = client.user.get_user_info()
        print(f"   Plan: {info.get('subscriptionType', 'N/A')}")
        print(f"   Requests today: {info.get('apiRequests', 0)} / {info.get('apiRequestsLimit', 0)}")
        remaining = info.get('apiRequestsLimit', 0) - info.get('apiRequests', 0)
        print(f"   Remaining: {remaining}")
        print(f"   Subscription end: {info.get('endDate', 'N/A')}")
    except Exception as e:
        print(f"   Error: {e}")


def main():
    """Run all examples"""
    # Initialize client
    api_key = os.getenv("EODHD_API_KEY")
    if not api_key:
        print("ERROR: EODHD_API_KEY environment variable not set")
        print("Set it with: export EODHD_API_KEY=your_key_here")
        return

    client = EODHDClient(api_key=api_key)

    print("\n" + "="*80)
    print("COMPREHENSIVE EODHD API CLIENT - EXAMPLES")
    print("="*80)

    try:
        # Run all examples
        example_historical_data(client)
        example_fundamental_data(client)
        example_exchange_data(client)
        example_corporate_actions(client)
        example_technical_analysis(client)
        example_news_sentiment(client)
        example_special_data(client)
        example_user_api(client)

        print("\n" + "="*80)
        print("ALL EXAMPLES COMPLETED")
        print("="*80 + "\n")

    except KeyboardInterrupt:
        print("\n\nExamples interrupted by user")
    except Exception as e:
        print(f"\n\nError running examples: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
