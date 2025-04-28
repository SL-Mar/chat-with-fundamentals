import React, { useEffect, useRef, useState } from 'react';

export const LogConsole = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/logs');
    ws.onopen = () => setLogs((prev) => [...prev, '[CONNECTED ✅] Log stream established']);
    ws.onmessage = (event) => {
      console.log('[WS MSG]', event.data);
      setLogs((prev) => [...prev, event.data]);
    };
    ws.onerror = () => setLogs((prev) => [...prev, '[ERROR] Could not connect to logs']);
    ws.onclose = () => setLogs((prev) => [...prev, '[DISCONNECTED] Log stream closed']);
    return () => ws.close();
  }, []);

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
