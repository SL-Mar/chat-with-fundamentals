// LogConsole.tsx

import React, { useEffect, useRef, useState } from 'react';

export const LogConsole = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);  // Keep socket stable

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/logs');
    wsRef.current = ws;

    ws.onopen = () =>
      setLogs((prev) => [...prev, '[CONNECTED ✅] Log stream established']);

    ws.onmessage = (event) => {
      const msg = event.data;
      if (msg === 'Connection alive') return; // Filter pings
      setLogs((prev) => [...prev, msg]);
    };

    ws.onerror = () =>
      setLogs((prev) => [...prev, '[ERROR] Could not connect to logs']);

    ws.onclose = () =>
      setLogs((prev) => [...prev, '[DISCONNECTED] Log stream closed']);

    const cleanup = () => ws.close();
    window.addEventListener('beforeunload', cleanup);

    return () => window.removeEventListener('beforeunload', cleanup);
  }, []); // empty deps = run once only

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-black text-green-400 font-mono text-sm p-4 rounded h-full overflow-y-auto">
      {logs.map((log, i) => (
        <div key={i} className="whitespace-pre-wrap">{log}</div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};
