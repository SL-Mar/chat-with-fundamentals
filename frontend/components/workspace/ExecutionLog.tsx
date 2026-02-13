import { useEffect, useRef } from 'react';

interface Props {
  logs: string[];
}

export default function ExecutionLog({ logs }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (logs.length === 0) {
    return (
      <div className="text-xs text-gray-500 p-3">
        Execution logs will appear here...
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-3 max-h-64 overflow-y-auto font-mono text-xs">
      {logs.map((log, i) => (
        <div key={i} className="text-gray-400 py-0.5">
          <span className="text-gray-600 mr-2">[{String(i + 1).padStart(2, '0')}]</span>
          {log}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
