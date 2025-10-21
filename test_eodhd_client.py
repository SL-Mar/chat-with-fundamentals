#!/usr/bin/env python3
"""
Quick Test Script for New EODHD Client
Tests all major endpoint categories
"""

import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from tools.eodhd_client import EODHDClient


def test_client():
    """Quick test of new EODHD client"""

    print("\n" + "="*80)
    print("🚀 TESTING NEW EODHD CLIENT")
    print("="*80)

    # Check API key
    api_key = os.getenv("EODHD_API_KEY")
    if not api_key:
        print("\n❌ ERROR: EODHD_API_KEY environment variable not set!")
        print("\nSet it with:")
        print("  export EODHD_API_KEY=your_key_here")
        print("\nOr create a .env file in the backend directory with:")
        print("  EODHD_API_KEY=your_key_here")
        return False

    print(f"\n✅ API Key found: {api_key[:10]}...")

    # Initialize client
    try:
        client = EODHDClient(api_key=api_key)
        print("✅ Client initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize client: {e}")
        return False

    # Test 1: User API (check account)
    print("\n" + "-"*80)
    print("TEST 1: Check API Usage & Account")
    print("-"*80)
    try:
        info = client.user.get_user_info()
        print(f"✅ Plan: {info.get('subscriptionType', 'N/A')}")
        print(f"✅ Requests today: {info.get('apiRequests', 0)} / {info.get('apiRequestsLimit', 0)}")
        remaining = info.get('apiRequestsLimit', 0) - info.get('apiRequests', 0)
        print(f"✅ Remaining: {remaining}")
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

    # Test 2: Live Price
    print("\n" + "-"*80)
    print("TEST 2: Get Live Price for AAPL")
    print("-"*80)
    try:
        live = client.historical.get_live_price("AAPL.US")
        print(f"✅ Price: ${live.get('close', 0):.2f}")
        print(f"✅ Change: {live.get('change_p', 0):+.2f}%")
        print(f"✅ Volume: {live.get('volume', 0):,}")
    except Exception as e:
        print(f"⚠️  Error: {e}")

    # Test 3: Fundamentals
    print("\n" + "-"*80)
    print("TEST 3: Get Fundamentals for AAPL")
    print("-"*80)
    try:
        fundamentals = client.fundamental.get_fundamentals(
            "AAPL.US",
            filter_param="Highlights,General"
        )
        if "Highlights" in fundamentals:
            h = fundamentals["Highlights"]
            print(f"✅ Market Cap: ${h.get('MarketCapitalization', 0):,.0f}")
            print(f"✅ P/E Ratio: {h.get('PERatio', 0):.2f}")
            print(f"✅ Dividend Yield: {h.get('DividendYield', 0):.4f}")
        if "General" in fundamentals:
            g = fundamentals["General"]
            print(f"✅ Company: {g.get('Name', 'N/A')}")
            print(f"✅ Sector: {g.get('Sector', 'N/A')}")
    except Exception as e:
        print(f"⚠️  Error: {e}")

    # Test 4: News
    print("\n" + "-"*80)
    print("TEST 4: Get Recent News for AAPL")
    print("-"*80)
    try:
        news = client.news.get_news("AAPL", limit=3)
        print(f"✅ Found {len(news)} articles")
        for i, article in enumerate(news[:3], 1):
            title = article.get('title', 'N/A')[:60]
            print(f"   {i}. {title}...")
    except Exception as e:
        print(f"⚠️  Error: {e}")

    # Test 5: Exchanges
    print("\n" + "-"*80)
    print("TEST 5: Get Exchange Information")
    print("-"*80)
    try:
        exchanges = client.exchange.get_exchanges()
        us_exchanges = [e for e in exchanges if e.get('Country') == 'USA']
        print(f"✅ Total exchanges: {len(exchanges)}")
        print(f"✅ US exchanges: {len(us_exchanges)}")
    except Exception as e:
        print(f"⚠️  Error: {e}")

    # Test 6: Technical Indicator
    print("\n" + "-"*80)
    print("TEST 6: Get RSI Indicator for AAPL")
    print("-"*80)
    try:
        rsi = client.technical.get_technical_indicator("AAPL.US", "rsi", period=14)
        print(f"✅ RSI data retrieved successfully")
    except Exception as e:
        print(f"⚠️  Error: {e}")

    # Summary
    print("\n" + "="*80)
    print("✅ NEW EODHD CLIENT TESTS COMPLETED!")
    print("="*80)
    print("\n📚 Available endpoint categories:")
    print("   • client.historical   - EOD, Intraday, Live, Tick (6 endpoints)")
    print("   • client.fundamental  - Fundamentals, Calendar, Insiders (9 endpoints)")
    print("   • client.exchange     - Exchanges, Symbols, Search (5 endpoints)")
    print("   • client.corporate    - Dividends, Splits, Bulk (5 endpoints)")
    print("   • client.technical    - 30+ Indicators, Screener (2 endpoints)")
    print("   • client.news         - News, Sentiment, Twitter (3 endpoints)")
    print("   • client.special      - ETF, ESG, Logos, Analysts (8 endpoints)")
    print("   • client.macro        - Economic indicators, Events (2 endpoints)")
    print("   • client.user         - Usage & limits (1 endpoint)")
    print("\n📖 Documentation:")
    print("   • backend/tools/eodhd_client/README.md")
    print("   • backend/tools/eodhd_client/QUICK_REFERENCE.md")
    print("\n🔍 Full examples:")
    print("   python backend/tools/eodhd_client/examples.py")
    print("\n" + "="*80 + "\n")

    return True


if __name__ == "__main__":
    success = test_client()
    sys.exit(0 if success else 1)
