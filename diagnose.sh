#!/bin/bash

# Diagnostic Script for Chat with Fundamentals
# Checks backend status and configuration

echo "========================================="
echo "  Diagnostics - Chat with Fundamentals"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if backend is running
echo -e "${BLUE}1. Checking if backend is running...${NC}"
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running on port 8000${NC}"
else
    echo -e "${RED}✗ Backend is NOT running on port 8000${NC}"
    echo -e "${YELLOW}  Check logs/backend.log for errors${NC}"
fi

echo ""

# Check if frontend is running
echo -e "${BLUE}2. Checking if frontend is running...${NC}"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running on port 3000${NC}"
else
    echo -e "${RED}✗ Frontend is NOT running on port 3000${NC}"
fi

echo ""

# Check .env file
echo -e "${BLUE}3. Checking .env configuration...${NC}"
if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✓ backend/.env exists${NC}"

    # Check for required keys
    if grep -q "EODHD_API_KEY=" backend/.env; then
        API_KEY=$(grep "EODHD_API_KEY=" backend/.env | cut -d'=' -f2)
        if [ -z "$API_KEY" ] || [ "$API_KEY" = "your_eodhd_api_key_here" ]; then
            echo -e "${RED}✗ EODHD_API_KEY is not set or is placeholder${NC}"
            echo -e "${YELLOW}  Edit backend/.env and add your EODHD API key${NC}"
        else
            echo -e "${GREEN}✓ EODHD_API_KEY is configured${NC}"
        fi
    else
        echo -e "${RED}✗ EODHD_API_KEY not found in .env${NC}"
    fi

    if grep -q "OPENAI_API_KEY=" backend/.env; then
        OPENAI_KEY=$(grep "OPENAI_API_KEY=" backend/.env | cut -d'=' -f2)
        if [ -z "$OPENAI_KEY" ] || [ "$OPENAI_KEY" = "your_openai_api_key_here" ]; then
            echo -e "${YELLOW}⚠ OPENAI_API_KEY is not set (optional for some features)${NC}"
        else
            echo -e "${GREEN}✓ OPENAI_API_KEY is configured${NC}"
        fi
    fi
else
    echo -e "${RED}✗ backend/.env does NOT exist${NC}"
    echo -e "${YELLOW}  Run ./launch.sh to create a template${NC}"
fi

echo ""

# Check database
echo -e "${BLUE}4. Checking database connection...${NC}"
if command -v psql &> /dev/null; then
    if psql -h localhost -U postgres -d fundamentals -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Database 'fundamentals' is accessible${NC}"
    else
        echo -e "${YELLOW}⚠ Database connection failed (optional - app can work without it)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ psql not installed - skipping database check${NC}"
fi

echo ""

# Check Redis
echo -e "${BLUE}5. Checking Redis connection...${NC}"
if command -v redis-cli &> /dev/null; then
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis is running${NC}"
    else
        echo -e "${YELLOW}⚠ Redis not running (optional - app can work without it)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ redis-cli not installed - skipping Redis check${NC}"
fi

echo ""

# Test a simple endpoint
echo -e "${BLUE}6. Testing API endpoint...${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>&1)
if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ API is responding (HTTP 200)${NC}"

    # Test a real endpoint
    echo -e "${BLUE}7. Testing equity endpoint...${NC}"
    EQUITY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000/equity/simulate?ticker=AAPL.US&horizon=20" 2>&1)
    if [ "$EQUITY_RESPONSE" = "200" ]; then
        echo -e "${GREEN}✓ Equity endpoint working${NC}"
    else
        echo -e "${RED}✗ Equity endpoint returned HTTP $EQUITY_RESPONSE${NC}"
        echo -e "${YELLOW}  This may be due to missing EODHD_API_KEY${NC}"
    fi
else
    echo -e "${RED}✗ API not responding (HTTP $RESPONSE)${NC}"
fi

echo ""

# Check recent backend logs
echo -e "${BLUE}8. Recent backend logs (last 10 lines):${NC}"
if [ -f "logs/backend.log" ]; then
    tail -10 logs/backend.log
else
    echo -e "${YELLOW}⚠ logs/backend.log not found${NC}"
fi

echo ""
echo "========================================="
echo -e "${BLUE}Diagnostic complete!${NC}"
echo "========================================="
echo ""
echo "Common fixes:"
echo "1. If backend not running: Check logs/backend.log for errors"
echo "2. If API key missing: Edit backend/.env and add EODHD_API_KEY"
echo "3. If fetch errors: Make sure both backend AND frontend are running"
echo "4. Restart: Ctrl+C then run ./launch.sh again"
