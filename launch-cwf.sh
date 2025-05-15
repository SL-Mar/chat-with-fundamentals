#!/usr/bin/env bash
# launch-cwf.sh – Start Chat with Fundamentals (Frontend + Backend)

BASE="$HOME/projects"
ROOT="$BASE/chat-with-fundamentals"
VSCODE_BIN="/usr/share/code/code"
FRONTEND_DIR="$ROOT/frontend"
BACKEND_DIR="$ROOT/backend"

[[ -x "$VSCODE_BIN" ]] && "$VSCODE_BIN" -n "$ROOT" &

# 1) Start Frontend (Next.js app on :3001)
gnome-terminal \
  --title="CWF Frontend" \
  -- bash -ic "\
    cd \"$FRONTEND_DIR\" && \
    if [ ! -d node_modules ]; then echo 'Installing frontend dependencies...'; npm install; fi && \
    PORT=3001 npm run dev; exec bash"

# 2) Start Backend (FastAPI app on :8001)
gnome-terminal \
  --title="CWF Backend" \
  -- bash -ic "\
    cd \"$BACKEND_DIR\" && \
    if [ ! -d venv ]; then echo 'Missing virtual environment. Please create venv manually!'; exit 1; fi && \
    source venv/bin/activate && \
    uvicorn main:app --reload --port 8001; exec bash"

# 3) Open local URLs in browser
( sleep 2 && xdg-open http://localhost:3001 ) &
( sleep 2 && xdg-open http://localhost:8001/docs ) &

