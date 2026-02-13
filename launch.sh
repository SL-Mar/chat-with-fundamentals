#!/bin/bash
# Chat with Fundamentals v2 — Launch Script
# Usage: ./launch.sh [start|stop|status]

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT=8001
FRONTEND_PORT=3006

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

start() {
    echo -e "${GREEN}Starting Chat with Fundamentals v2...${NC}"

    # 1. Docker services
    echo -e "${YELLOW}Starting Docker services...${NC}"
    cd "$PROJECT_DIR"
    docker compose up -d
    sleep 2

    # 2. Backend
    echo -e "${YELLOW}Starting backend on port $BACKEND_PORT...${NC}"
    cd "$PROJECT_DIR/backend"
    source venv/bin/activate
    nohup uvicorn main:app --host 0.0.0.0 --port $BACKEND_PORT --reload > /tmp/cwf-backend.log 2>&1 &
    echo $! > /tmp/cwf-backend.pid
    sleep 2

    # Wait for backend health
    for i in {1..10}; do
        if curl -s http://localhost:$BACKEND_PORT/api/health > /dev/null 2>&1; then
            echo -e "${GREEN}Backend healthy${NC}"
            break
        fi
        sleep 1
    done

    # 3. Frontend
    echo -e "${YELLOW}Starting frontend on port $FRONTEND_PORT...${NC}"
    cd "$PROJECT_DIR/frontend"
    nohup npx next dev -p $FRONTEND_PORT > /tmp/cwf-frontend.log 2>&1 &
    echo $! > /tmp/cwf-frontend.pid
    sleep 3

    echo ""
    echo -e "${GREEN}=== Chat with Fundamentals v2 ===${NC}"
    echo -e "Frontend: ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
    echo -e "Backend:  ${GREEN}http://localhost:$BACKEND_PORT${NC}"
    echo -e "Health:   ${GREEN}http://localhost:$BACKEND_PORT/api/health${NC}"
    echo ""
}

stop() {
    echo -e "${RED}Stopping Chat with Fundamentals v2...${NC}"

    # Stop frontend
    if [ -f /tmp/cwf-frontend.pid ]; then
        kill $(cat /tmp/cwf-frontend.pid) 2>/dev/null
        rm /tmp/cwf-frontend.pid
        echo "Frontend stopped"
    fi

    # Stop backend
    if [ -f /tmp/cwf-backend.pid ]; then
        kill $(cat /tmp/cwf-backend.pid) 2>/dev/null
        rm /tmp/cwf-backend.pid
        echo "Backend stopped"
    fi

    # Stop Docker services
    cd "$PROJECT_DIR"
    docker compose down
    echo "Docker services stopped"
}

status() {
    echo -e "${YELLOW}=== Chat with Fundamentals v2 Status ===${NC}"
    echo ""

    # Docker
    echo "Docker services:"
    docker compose -f "$PROJECT_DIR/docker-compose.yml" ps --format "  {{.Name}}: {{.Status}}" 2>/dev/null

    echo ""

    # Backend
    if curl -s http://localhost:$BACKEND_PORT/api/health > /dev/null 2>&1; then
        HEALTH=$(curl -s http://localhost:$BACKEND_PORT/api/health)
        echo -e "Backend:  ${GREEN}Running${NC} (port $BACKEND_PORT)"
        echo "  $HEALTH"
    else
        echo -e "Backend:  ${RED}Not running${NC}"
    fi

    # Frontend
    if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
        echo -e "Frontend: ${GREEN}Running${NC} (port $FRONTEND_PORT)"
    else
        echo -e "Frontend: ${RED}Not running${NC}"
    fi
}

case "${1:-start}" in
    start)  start ;;
    stop)   stop ;;
    status) status ;;
    *)      echo "Usage: $0 {start|stop|status}" ;;
esac
