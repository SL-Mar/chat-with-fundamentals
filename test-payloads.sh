#!/bin/bash
# Comprehensive payload testing for all backend endpoints

BASE_URL="http://localhost:8000"
OUTPUT_DIR="/tmp/payload-tests"
mkdir -p "$OUTPUT_DIR"

echo "=== Backend Payload Testing ==="
echo "Output directory: $OUTPUT_DIR"
echo ""

# Test 1: Macro Indicators
echo "1. Testing Macro Indicators..."
curl -s "${BASE_URL}/macro/indicator?country=USA&indicator=government_bond_10y&from_date=2024-01-01" \
  > "${OUTPUT_DIR}/macro-indicator.json"
echo "   Response size: $(wc -c < "${OUTPUT_DIR}/macro-indicator.json") bytes"
echo "   Data points: $(jq '.data | length' "${OUTPUT_DIR}/macro-indicator.json" 2>/dev/null || echo "N/A")"
echo "   Sample data: $(jq '.data[0]' "${OUTPUT_DIR}/macro-indicator.json" 2>/dev/null | head -3)"
echo ""

# Test 2: Economic Events
echo "2. Testing Economic Events..."
curl -s "${BASE_URL}/macro/economic-events?from_date=2025-10-21&to_date=2025-10-25&limit=10" \
  > "${OUTPUT_DIR}/economic-events.json"
echo "   Response size: $(wc -c < "${OUTPUT_DIR}/economic-events.json") bytes"
echo "   Event count: $(jq '.count' "${OUTPUT_DIR}/economic-events.json" 2>/dev/null || echo "N/A")"
echo "   Sample event: $(jq '.events[0]' "${OUTPUT_DIR}/economic-events.json" 2>/dev/null | head -5)"
echo ""

# Test 3: Index Constituents
echo "3. Testing Index Constituents..."
curl -s "${BASE_URL}/special/index-constituents?index=GSPC.INDX" \
  > "${OUTPUT_DIR}/index-constituents.json"
echo "   Response size: $(wc -c < "${OUTPUT_DIR}/index-constituents.json") bytes"
echo "   Constituents: $(jq '.constituents | length' "${OUTPUT_DIR}/index-constituents.json" 2>/dev/null || echo "N/A")"
echo "   Sample constituent: $(jq '.constituents[0]' "${OUTPUT_DIR}/index-constituents.json" 2>/dev/null)"
echo ""

# Test 4: ETF Holdings
echo "4. Testing ETF Holdings..."
curl -s "${BASE_URL}/special/etf-holdings?symbol=SPY" \
  > "${OUTPUT_DIR}/etf-holdings.json"
echo "   Response size: $(wc -c < "${OUTPUT_DIR}/etf-holdings.json") bytes"
echo "   Holdings: $(jq '.holdings | length' "${OUTPUT_DIR}/etf-holdings.json" 2>/dev/null || echo "N/A")"
echo "   ETF info: $(jq '.etf_info' "${OUTPUT_DIR}/etf-holdings.json" 2>/dev/null | head -5)"
echo ""

# Test 5: Stock Screener
echo "5. Testing Stock Screener..."
curl -s "${BASE_URL}/screener/search" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": [
      ["market_capitalization", ">", 1000000000],
      ["market_capitalization", "<", 10000000000]
    ],
    "limit": 5
  }' \
  > "${OUTPUT_DIR}/screener.json"
echo "   Response size: $(wc -c < "${OUTPUT_DIR}/screener.json") bytes"
echo "   Results: $(jq '.count' "${OUTPUT_DIR}/screener.json" 2>/dev/null || echo "N/A")"
echo "   Sample result: $(jq '.data[0]' "${OUTPUT_DIR}/screener.json" 2>/dev/null | head -8)"
echo ""

# Test 6: Intraday Data
echo "6. Testing Intraday Data..."
curl -s "${BASE_URL}/stock/intraday?ticker=AAPL&interval=5m" \
  > "${OUTPUT_DIR}/intraday.json"
echo "   Response size: $(wc -c < "${OUTPUT_DIR}/intraday.json") bytes"
echo "   Data points: $(jq '.data | length' "${OUTPUT_DIR}/intraday.json" 2>/dev/null || echo "N/A")"
echo "   Sample: $(jq '.data[0]' "${OUTPUT_DIR}/intraday.json" 2>/dev/null)"
echo ""

# Test 7: Technical Indicators
echo "7. Testing Technical Indicators..."
curl -s "${BASE_URL}/stock/technical?ticker=AAPL&function=sma&period=20" \
  > "${OUTPUT_DIR}/technical.json"
echo "   Response size: $(wc -c < "${OUTPUT_DIR}/technical.json") bytes"
echo "   Data points: $(jq '.data | length' "${OUTPUT_DIR}/technical.json" 2>/dev/null || echo "N/A")"
echo "   Sample: $(jq '.data[0]' "${OUTPUT_DIR}/technical.json" 2>/dev/null)"
echo ""

# Test 8: Earnings Calendar
echo "8. Testing Earnings Calendar..."
curl -s "${BASE_URL}/calendar/earnings?from_date=2025-10-21&to_date=2025-10-22" \
  > "${OUTPUT_DIR}/earnings.json"
echo "   Response size: $(wc -c < "${OUTPUT_DIR}/earnings.json") bytes"
echo "   Events: $(jq '.count' "${OUTPUT_DIR}/earnings.json" 2>/dev/null || echo "N/A")"
echo "   Sample: $(jq '.events[0]' "${OUTPUT_DIR}/earnings.json" 2>/dev/null | head -5)"
echo ""

# Test 9: News
echo "9. Testing News..."
curl -s "${BASE_URL}/stock/news?ticker=AAPL&limit=5" \
  > "${OUTPUT_DIR}/news.json"
echo "   Response size: $(wc -c < "${OUTPUT_DIR}/news.json") bytes"
echo "   Articles: $(jq '. | length' "${OUTPUT_DIR}/news.json" 2>/dev/null || echo "N/A")"
echo "   Sample: $(jq '.[0] | {title, date, sentiment}' "${OUTPUT_DIR}/news.json" 2>/dev/null)"
echo ""

# Test 10: Chat with Fundamentals (main endpoint)
echo "10. Testing Chat with Fundamentals..."
curl -s "${BASE_URL}/chat/fundamentals" \
  -H "Content-Type: application/json" \
  -d '{"user_query": "analyze AAPL"}' \
  > "${OUTPUT_DIR}/chat-fundamentals.json"
echo "   Response size: $(wc -c < "${OUTPUT_DIR}/chat-fundamentals.json") bytes"
echo "   Has Ex_summary: $(jq 'has("Ex_summary")' "${OUTPUT_DIR}/chat-fundamentals.json" 2>/dev/null)"
echo "   Has Metrics: $(jq 'has("Metrics")' "${OUTPUT_DIR}/chat-fundamentals.json" 2>/dev/null)"
echo "   Has Quote: $(jq 'has("Quote")' "${OUTPUT_DIR}/chat-fundamentals.json" 2>/dev/null)"
echo "   Has News: $(jq 'has("News")' "${OUTPUT_DIR}/chat-fundamentals.json" 2>/dev/null)"
echo ""

echo "=== Summary ==="
echo "All test results saved to: $OUTPUT_DIR"
echo ""
echo "Check for missing data:"
for file in "$OUTPUT_DIR"/*.json; do
  name=$(basename "$file" .json)
  size=$(wc -c < "$file")
  if [ "$size" -lt 100 ]; then
    echo "  ⚠️  $name - Very small response ($size bytes)"
  elif grep -q "error\|Error\|ERROR" "$file" 2>/dev/null; then
    echo "  ❌ $name - Contains error"
    jq '.detail // .error // .' "$file" 2>/dev/null | head -3
  else
    echo "  ✅ $name - OK ($size bytes)"
  fi
done
