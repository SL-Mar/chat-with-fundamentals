# File: core/logstream.py

import sys
from fastapi import WebSocket
from typing import List

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        # Bypass intercept_stdout: write to real stdout
        sys.__stdout__.write(f"[Broadcasting] {message} → {len(self.active_connections)} client(s)\n")

        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception as e:
                sys.__stdout__.write(f"❌ WS send failed: {e}\n")
                self.disconnect(connection)

# single shared instance
log_ws_manager = WebSocketManager()
