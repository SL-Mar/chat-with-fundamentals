#!/bin/bash
# Force restart backend to pick up macro indicator changes

echo "=== Restarting Backend with New Changes ==="

# Kill existing backend process
echo "1. Killing existing backend on port 8000..."
sudo fuser -k 8000/tcp 2>/dev/null
sleep 2

# Clear Python cache to ensure new code is loaded
echo "2. Clearing Python cache..."
cd /home/slmar/projects/chat-with-fundamentals/backend
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -type f -name "*.pyc" -delete 2>/dev/null

# Start backend with updated code
echo "3. Starting backend with new macro indicator implementation..."
EODHD_API_KEY="68f135cae489e2.33089696" \
  /home/slmar/projects/chat-with-fundamentals/backend/venv/bin/python main.py \
  > /tmp/backend-CLEAN.log 2>&1 &

BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
sleep 3

# Check if started successfully
echo "4. Checking backend status..."
if curl -s http://localhost:8000/ | grep -q '"status":"ok"'; then
    echo "   ✅ Backend started successfully"

    echo ""
    echo "5. Testing macro indicator endpoint..."
    MACRO_TEST=$(curl -s "http://localhost:8000/macro/indicator?country=USA&indicator=government_bond_10y&from_date=2024-01-01")

    if echo "$MACRO_TEST" | grep -q "data"; then
        echo "   ✅ Macro indicators working!"
        echo "   Sample response: $(echo $MACRO_TEST | head -c 200)..."
    else
        echo "   ❌ Macro indicators still failing"
        echo "   Response: $MACRO_TEST"
    fi
else
    echo "   ❌ Backend failed to start"
    echo "   Check logs: tail -f /tmp/backend-CLEAN.log"
fi

echo ""
echo "=== Restart Complete ==="
