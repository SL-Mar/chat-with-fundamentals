#!/usr/bin/env bash
# launch.sh – Start Full App Stack (Frontend + Backend)
# ────────────────────────────────────────────────────────────────

# Adjust these paths as needed
BASE="$HOME/projects"
ROOT="$BASE/chat-with-fundamentals"
VSCODE_BIN="/usr/share/code/code"
FRONTEND_DIR="$ROOT/frontend"
BACKEND_DIR="$ROOT/backend"

# ────────────────────────────────────────────────────────────────

# 1) Start Frontend (Next.js) on :3000
gnome-terminal \
  --title="Frontend" \
  -- bash -ic "\
    cd \"$FRONTEND_DIR\" && \
    npm install && \
    npm run dev || (echo '❌ Frontend crashed. Press Enter to exit.'; read)"

# 2) Start Backend (FastAPI) on :8000
gnome-terminal \
  --title="Backend" \
  -- bash -ic "\
    cd \"$BACKEND_DIR\" && \
    source venv/bin/activate && \
    pip install -r requirements.txt && \
    uvicorn main:app --reload || (echo '❌ Backend crashed. Press Enter to exit.'; read)"

# 3) Open in browser
( sleep 2 && xdg-open http://localhost:3000 ) &
( sleep 2 && xdg-open http://localhost:8000/docs ) &
