"""
Agent Console WebSocket Manager

Manages WebSocket connections for real-time agent logging in the Agent Console.
Broadcasts agent execution logs to all connected clients for transparency.
"""

import sys
import logging
from fastapi import WebSocket
from typing import List, Dict, Any
import json
from datetime import datetime

logger = logging.getLogger(__name__)


class AgentConsoleManager:
    """
    WebSocket manager for Agent Console real-time logging.

    Handles multiple WebSocket connections and broadcasts agent execution
    logs to all connected clients for full transparency.
    """

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """
        Accept and register new WebSocket connection.

        Args:
            websocket: FastAPI WebSocket connection
        """
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Agent Console client connected. Total clients: {len(self.active_connections)}")

        # Send welcome message
        await self.send_to_client(websocket, {
            "type": "connection",
            "status": "connected",
            "message": "Connected to Agent Console",
            "timestamp": datetime.now().isoformat(),
            "client_count": len(self.active_connections)
        })

    def disconnect(self, websocket: WebSocket):
        """
        Unregister WebSocket connection.

        Args:
            websocket: FastAPI WebSocket connection to disconnect
        """
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"Agent Console client disconnected. Remaining: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """
        Broadcast message to all connected clients.

        Args:
            message: Dictionary message to broadcast (will be JSON-encoded)

        Message format:
            {
                "type": "agent_log",
                "agent": "fundamentals",
                "status": "running" | "success" | "error",
                "message": "Analyzing AAPL.US...",
                "timestamp": "2025-10-25T10:00:00Z",
                "metadata": {...}
            }
        """
        # Log to console for debugging
        agent = message.get("agent", "unknown")
        status = message.get("status", "unknown")
        msg_text = message.get("message", "")
        sys.__stdout__.write(f"[AgentConsole] {agent} [{status}]: {msg_text}\n")

        # Ensure message has timestamp
        if "timestamp" not in message:
            message["timestamp"] = datetime.now().isoformat()

        # Broadcast to all clients
        message_json = json.dumps(message)
        disconnected_clients = []

        for connection in self.active_connections:
            try:
                await connection.send_text(message_json)
            except Exception as e:
                logger.error(f"Failed to send to client: {e}")
                disconnected_clients.append(connection)

        # Remove disconnected clients
        for connection in disconnected_clients:
            self.disconnect(connection)

    async def send_to_client(self, websocket: WebSocket, message: Dict[str, Any]):
        """
        Send message to specific client.

        Args:
            websocket: Target WebSocket connection
            message: Dictionary message to send
        """
        try:
            # Ensure timestamp
            if "timestamp" not in message:
                message["timestamp"] = datetime.now().isoformat()

            message_json = json.dumps(message)
            await websocket.send_text(message_json)
        except Exception as e:
            logger.error(f"Failed to send to client: {e}")
            self.disconnect(websocket)


# Singleton instance for agent console
agent_console_manager = AgentConsoleManager()
