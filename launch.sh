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

# Check for .env file
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}Warning: backend/.env not found${NC}"
    echo "Creating sample .env file..."
    cat > backend/.env << 'ENVEOF'
# API Keys
EODHD_API_KEY=your_eodhd_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fundamentals
REDIS_URL=redis://localhost:6379/0

# Server Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
FRONTEND_PORT=3000

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000

# Optional: Logging
LOG_LEVEL=INFO
ENVEOF
    echo -e "${YELLOW}Please edit backend/.env with your API keys${NC}"
fi

# Install backend dependencies if needed
if [ ! -d "backend/venv" ]; then
    echo -e "${BLUE}Creating Python virtual environment...${NC}"
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    echo -e "${BLUE}Installing Python dependencies...${NC}"
    pip install -r requirements.txt
    cd ..
fi

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${BLUE}Installing Node.js dependencies...${NC}"
    cd frontend
    npm install
    cd ..
fi

echo ""
echo -e "${GREEN}Environment ready!${NC}"
echo ""

# Kill any existing processes on ports 8000 and 3000
echo -e "${BLUE}Checking for existing processes...${NC}"
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Create logs directory
mkdir -p logs

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}Servers stopped${NC}"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Start backend server
echo -e "${BLUE}Starting backend server...${NC}"
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo -e "${YELLOW}Waiting for backend to start...${NC}"
sleep 3

# Check if backend is running
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${RED}Error: Backend failed to start. Check logs/backend.log${NC}"
    tail -20 logs/backend.log
    cleanup
fi

echo -e "${GREEN}✓ Backend running on http://localhost:8000${NC}"

# Start frontend server
echo -e "${BLUE}Starting frontend server...${NC}"
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
echo -e "${YELLOW}Waiting for frontend to start...${NC}"
sleep 5

echo -e "${GREEN}✓ Frontend running on http://localhost:3000${NC}"

echo ""
echo "========================================="
echo -e "${GREEN}Application is running!${NC}"
echo "========================================="
echo ""
echo -e "Frontend:     ${BLUE}http://localhost:3000${NC}"
echo -e "Backend API:  ${BLUE}http://localhost:8000${NC}"
echo -e "API Docs:     ${BLUE}http://localhost:8000/docs${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# Show logs in real-time
tail -f logs/backend.log logs/frontend.log

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
