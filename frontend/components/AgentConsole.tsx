// AgentConsole.tsx
// Real-time WebSocket logging for MarketSense AI agents

import React, { useEffect, useRef, useState } from 'react';

interface AgentLog {
  type: string;
  agent?: string;
  status?: 'running' | 'success' | 'error' | 'info';
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface AgentConsoleProps {
  autoScroll?: boolean;
  maxLogs?: number;
}

export const AgentConsole: React.FC<AgentConsoleProps> = ({
  autoScroll = true,
  maxLogs = 200
}) => {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/api/v2/ws/agent-console');
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const log: AgentLog = JSON.parse(event.data);

        // Filter out heartbeat pings
        if (event.data === 'pong') return;

        setLogs((prev) => {
          const updated = [...prev, log];
          // Limit log history to prevent memory issues
          if (updated.length > maxLogs) {
            return updated.slice(-maxLogs);
          }
          return updated;
        });
      } catch (error) {
        console.error('Failed to parse agent log:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('Agent Console WebSocket error:', error);
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
      setLogs((prev) => [...prev, {
        type: 'system',
        status: 'error',
        message: 'Agent Console disconnected',
        timestamp: new Date().toISOString()
      }]);
    };

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('ping');
      }
    }, 30000); // Every 30 seconds

    const cleanup = () => {
      clearInterval(heartbeat);
      ws.close();
    };
    window.addEventListener('beforeunload', cleanup);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', cleanup);
      ws.close();
    };
  }, [maxLogs]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const getStatusColor = (status?: string): string => {
    switch (status) {
      case 'running':
        return 'text-blue-400';
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'info':
        return 'text-gray-300';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status?: string): string => {
    switch (status) {
      case 'running':
        return '⟳';
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'info':
        return 'ℹ';
      default:
        return '•';
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-semibold">Agent Console</h3>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
               title={connected ? 'Connected' : 'Disconnected'} />
        </div>
        <button
          onClick={clearLogs}
          className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-800"
        >
          Clear
        </button>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center mt-8">
            {connected ? 'Waiting for agent activity...' : 'Connecting to Agent Console...'}
          </div>
        ) : (
          <>
            {logs.map((log, i) => (
              <div key={i} className="mb-2 flex gap-2">
                {/* Timestamp */}
                <span className="text-gray-600 text-xs whitespace-nowrap">
                  {formatTimestamp(log.timestamp)}
                </span>

                {/* Status Icon */}
                <span className={`${getStatusColor(log.status)} font-bold`}>
                  {getStatusIcon(log.status)}
                </span>

                {/* Agent Name */}
                {log.agent && (
                  <span className="text-yellow-400 font-semibold">
                    [{log.agent}]
                  </span>
                )}

                {/* Message */}
                <span className={getStatusColor(log.status)}>
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  );
};

export default AgentConsole;
