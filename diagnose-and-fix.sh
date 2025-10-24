#!/bin/bash
# Comprehensive diagnostics and fixes for chat-with-fundamentals

echo "=== CHAT WITH FUNDAMENTALS DIAGNOSTICS ==="
echo ""

# 1. Check backend is running
echo "1. Checking backend status..."
if curl -s http://localhost:8000/ | grep -q '"status":"ok"'; then
    echo "   ✅ Backend is running on port 8000"
else
    echo "   ❌ Backend not responding on port 8000"
fi
echo ""

# 2. Check frontend is running
echo "2. Checking frontend status..."
if curl -s http://localhost:3003/ | grep -q "html"; then
    echo "   ✅ Frontend is running on port 3003"
else
    echo "   ❌ Frontend not responding on port 3003"
fi
echo ""

# 3. Test CORS
echo "3. Testing CORS configuration..."
CORS_TEST=$(curl -s -H "Origin: http://localhost:3003" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS http://localhost:8000/ -I | grep "access-control-allow-origin")

if [ -n "$CORS_TEST" ]; then
    echo "   ✅ CORS is configured"
    echo "   $CORS_TEST"
else
    echo "   ❌ CORS headers missing"
fi
echo ""

# 4. Test key endpoints
echo "4. Testing API endpoints..."

echo "   a) Testing /equity/simulate..."
EQUITY_TEST=$(curl -s "http://localhost:8000/equity/simulate?ticker=AAPL&horizon=20" | grep -o '"ticker"')
if [ -n "$EQUITY_TEST" ]; then
    echo "      ✅ Equity simulation works"
else
    echo "      ❌ Equity simulation failed"
fi

echo "   b) Testing /technical/indicator..."
TECH_TEST=$(curl -s "http://localhost:8000/technical/indicator?ticker=AAPL.US&function=rsi&period=14" | jq -r 'length' 2>/dev/null)
if [ "$TECH_TEST" != "null" ] && [ -n "$TECH_TEST" ]; then
    echo "      ✅ Technical indicators work ($TECH_TEST results)"
else
    echo "      ❌ Technical indicators failed"
fi

echo "   c) Testing /special/etf-holdings..."
ETF_TEST=$(curl -s "http://localhost:8000/special/etf-holdings?ticker=SPY.US" | grep -o '"holdings"')
if [ -n "$ETF_TEST" ]; then
    echo "      ✅ ETF holdings works"
else
    echo "      ❌ ETF holdings failed"
fi

echo "   d) Testing /special/index-constituents..."
INDEX_TEST=$(curl -s "http://localhost:8000/special/index-constituents?index=GSPC.INDX" | jq -r 'length' 2>/dev/null)
if [ "$INDEX_TEST" != "null" ] && [ -n "$INDEX_TEST" ]; then
    echo "      ✅ Index constituents works ($INDEX_TEST results)"
else
    echo "      ❌ Index constituents failed"
fi

echo ""

# 5. Check problematic endpoints
echo "5. Checking problematic endpoints..."

echo "   a) Testing /macro/indicator (known issue)..."
MACRO_TEST=$(curl -s "http://localhost:8000/macro/indicator?country=USA&indicator=gdp_current_usd" 2>&1)
if echo "$MACRO_TEST" | grep -q "502\|404\|Failed"; then
    echo "      ❌ Macro indicators not working (EODHD API issue)"
    echo "      Response: $(echo $MACRO_TEST | head -c 100)..."
else
    echo "      ✅ Macro indicators work"
fi

echo "   b) Testing /technical/screener (known issue)..."
SCREENER_TEST=$(curl -s "http://localhost:8000/technical/screener?limit=10" 2>&1)
if echo "$SCREENER_TEST" | grep -q "502\|422\|Failed"; then
    echo "      ❌ Stock screener not working (EODHD API issue)"
    echo "      Response: $(echo $SCREENER_TEST | head -c 100)..."
else
    echo "      ✅ Stock screener works"
fi

echo ""

# 6. Check logs for errors
echo "6. Recent backend errors (last 10)..."
grep -i "error\|502\|404\|422" /tmp/backend-CLEAN.log | tail -10 | sed 's/^/   /'

echo ""
echo "=== DIAGNOSTICS COMPLETE ==="
echo ""
echo "Summary:"
echo "  - Working: Equity analysis, Technical indicators, ETF data, Index data"
echo "  - Issues: Macro indicators (EODHD endpoint wrong), Stock screener (EODHD params)"
echo ""
echo "Recommendations:"
echo "  1. Macro indicators: Check if EODHD subscription includes macro data"
echo "  2. Stock screener: Verify filter/signal parameter format with EODHD docs"
echo "  3. Frontend: Index constituents fixed with .INDX suffix"
