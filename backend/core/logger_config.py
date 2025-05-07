# File: core/logger_config.py

import logging
import asyncio
import threading
import sys
from queue import SimpleQueue
from logging.handlers import RotatingFileHandler, QueueHandler, QueueListener
from core.logstream import log_ws_manager

# thread-local flag to prevent recursion
_inside_emit = threading.local()

log_queue = SimpleQueue()
_main_event_loop = None
_listener = None  # keep listener alive

def set_main_event_loop(loop):
    global _main_event_loop
    _main_event_loop = loop

class WebSocketHandler(logging.Handler):
    def emit(self, record):
        # If we're already in emit(), bail out to avoid recursion
        if getattr(_inside_emit, "value", False):
            return

        try:
            _inside_emit.value = True

            log_entry = self.format(record)
            # write to the real stdout, bypassing intercept_stdout
            sys.__stdout__.write(f"[WebSocketHandler] EMIT: {log_entry}\n")

            if _main_event_loop and _main_event_loop.is_running():
                asyncio.run_coroutine_threadsafe(
                    log_ws_manager.broadcast(log_entry),
                    _main_event_loop
                )
            else:
                sys.__stdout__.write("⚠️ WS loop not ready\n")
        finally:
            _inside_emit.value = False

def setup_logger(name: str = "") -> logging.Logger:
    global _listener
    root = logging.getLogger()  # always configure the root logger
    root.setLevel(logging.INFO)
    root.propagate = False

    if _listener is None:
        queue_handler = QueueHandler(log_queue)
        root.addHandler(queue_handler)

        formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] %(message)s", "%H:%M:%S")

        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)

        file_handler = RotatingFileHandler("chatwithfundamentals.log", maxBytes=2_000_000, backupCount=3)
        file_handler.setFormatter(formatter)

        ws_handler = WebSocketHandler()
        ws_handler.setFormatter(formatter)

        _listener = QueueListener(log_queue, console_handler, file_handler, ws_handler)
        _listener.start()
        sys.__stdout__.write("QueueListener started with console, file, and WS handlers\n")

    return root
