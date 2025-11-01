#!/bin/bash

# Chat with Fundamentals - Launch Script
# Starts both backend (FastAPI) and frontend (Next.js) servers

set -e  # Exit on error

echo "========================================="
echo "  Chat with Fundamentals - Launch Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

echo -e "${BLUE}Checking environment...${NC}"

# Check for backend .env file
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}Warning: backend/.env not found${NC}"
    echo "Creating sample .env file..."
    cat > backend/.env << 'ENVEOF'
# EODHD API (required for data)
EODHD_API_KEY=your_eodhd_api_key_here

# OpenAI API (required for AI features)
OPENAI_API_KEY=your_openai_api_key_here

# Application API Key (optional - dev mode if not set)
APP_API_KEY=your_secure_key

# Tavily API (optional - for Deep Research)
TAVILY_API_KEY=your_tavily_api_key_here

# Database
DATABASE_URL=sqlite:///./chat_with_fundamentals.db

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3004

# Server Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# Optional: Logging
LOG_LEVEL=INFO
ENVEOF
    echo -e "${YELLOW}Please edit backend/.env with your API keys${NC}"
    echo -e "${YELLOW}Minimum required: EODHD_API_KEY and OPENAI_API_KEY${NC}"
fi

# Check for frontend .env.local file
if [ ! -f "frontend/.env.local" ]; then
    echo -e "${YELLOW}Creating frontend/.env.local...${NC}"
    cat > frontend/.env.local << 'ENVEOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
ENVEOF
fi

# Install backend dependencies if needed
if [ ! -d "backend/venv" ]; then
    echo -e "${BLUE}Creating Python virtual environment...${NC}"
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    echo -e "${BLUE}Installing Python dependencies...${NC}"
    pip install --upgrade pip
    pip install -r requirements.txt
    cd ..
else
    echo -e "${GREEN}✓ Python virtual environment exists${NC}"
fi

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${BLUE}Installing Node.js dependencies...${NC}"
    cd frontend
    npm install
    cd ..
else
    echo -e "${GREEN}✓ Node.js dependencies installed${NC}"
fi

echo ""
echo -e "${GREEN}Environment ready!${NC}"
echo ""

# Kill any existing processes on ports 8000 and 3004
echo -e "${BLUE}Checking for existing processes...${NC}"
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:3004 | xargs kill -9 2>/dev/null || true
sleep 1

# Create logs directory
mkdir -p logs

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    lsof -ti:3004 | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}Servers stopped${NC}"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Start backend server
echo -e "${BLUE}Starting backend server...${NC}"
cd backend
source venv/bin/activate
python main.py > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo -e "${YELLOW}Waiting for backend to start...${NC}"
for i in {1..15}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend running on http://localhost:8000${NC}"
        break
    fi
    if [ $i -eq 15 ]; then
        echo -e "${RED}Error: Backend failed to start. Check logs/backend.log${NC}"
        echo -e "${YELLOW}Last 30 lines of backend log:${NC}"
        tail -30 logs/backend.log
        cleanup
    fi
    sleep 1
done

# Start frontend server
echo -e "${BLUE}Starting frontend server...${NC}"
cd frontend
PORT=3004 npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
echo -e "${YELLOW}Waiting for frontend to start...${NC}"
for i in {1..20}; do
    if curl -s http://localhost:3004 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend running on http://localhost:3004${NC}"
        break
    fi
    if [ $i -eq 20 ]; then
        echo -e "${YELLOW}Frontend may still be starting (Next.js can take time)${NC}"
        echo -e "${YELLOW}Check logs/frontend.log for details${NC}"
    fi
    sleep 1
done

echo ""
echo "========================================="
echo -e "${GREEN}Application is running!${NC}"
echo "========================================="
echo ""
echo -e "Frontend:        ${BLUE}http://localhost:3004${NC}"
echo -e "Backend API:     ${BLUE}http://localhost:8000${NC}"
echo -e "API Docs:        ${BLUE}http://localhost:8000/docs${NC}"
echo -e "Health Check:    ${BLUE}http://localhost:8000/health${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""
echo -e "${BLUE}Tailing logs (Ctrl+C to exit)...${NC}"
echo ""

# Show logs in real-time
tail -f logs/backend.log logs/frontend.log

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
