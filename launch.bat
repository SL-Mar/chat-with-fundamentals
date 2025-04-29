@echo off
REM launch.bat – Start Full Stack (Frontend + Backend) on Windows
REM --------------------------------------------------------------

REM Set paths (edit these if needed)
set "BASE=%USERPROFILE%\projects"
set "ROOT=%BASE%\chat-with-fundamentals"
set "FRONTEND_DIR=%ROOT%\frontend"
set "BACKEND_DIR=%ROOT%\backend"

REM 1) Start Frontend in a new terminal
start "Frontend" cmd /k "cd /d %FRONTEND_DIR% && npm install && npm run dev"

REM 2) Start Backend in a new terminal
start "Backend" cmd /k "cd /d %BACKEND_DIR% && venv\Scripts\activate && pip install -r requirements.txt && uvicorn main:app --reload"

REM 3) Open in browser
timeout /t 2 > nul
start http://localhost:3000
start http://localhost:8000/docs
