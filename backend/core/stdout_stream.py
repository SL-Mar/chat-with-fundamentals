# core/stdout_stream.py

import sys
import asyncio
from core.logstream import log_ws_manager

class StdoutInterceptor:
    def __init__(self):
        self._original_stdout = sys.stdout

    def write(self, message):
        if message.strip():  # avoid empty lines
            try:
                asyncio.run(log_ws_manager.broadcast(message.strip()))
            except RuntimeError:
                # In case there's no event loop
                loop = asyncio.get_event_loop()
                loop.create_task(log_ws_manager.broadcast(message.strip()))
        self._original_stdout.write(message)

    def flush(self):
        self._original_stdout.flush()

    def isatty(self):
        """Required by gpt-researcher logger to check if stdout is a terminal."""
        return self._original_stdout.isatty()

def intercept_stdout():
    sys.stdout = StdoutInterceptor()
