import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore';
import CodeBlock from './CodeBlock';
import ExecutionResult from './ExecutionResult';
import ExecutionLog from './ExecutionLog';

interface Props {
  universeId: string;
}

export default function ChatTab({ universeId }: Props) {
  const { messages, loading, logs, sendMessage, clearChat } = useChatStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage(universeId, input.trim());
    setInput('');
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-280px)]">
      {/* Chat messages — 70% */}
      <div className="flex-[7] flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
          {messages.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg mb-2">Ask anything about your data</p>
              <p className="text-sm">Examples:</p>
              <div className="mt-3 space-y-1 text-sm text-gray-400">
                <p>&quot;What is the average P/E ratio across all stocks?&quot;</p>
                <p>&quot;Generate a momentum factor for all tickers&quot;</p>
                <p>&quot;Train a random forest to predict next-day returns&quot;</p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-lg p-4 ${
                msg.role === 'user'
                  ? 'bg-indigo-600/20 border border-indigo-500/30 ml-12'
                  : 'bg-gray-800 border border-gray-700 mr-4'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500">
                  {msg.role === 'user' ? 'You' : 'Agent'}
                </span>
                {msg.intent && (
                  <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">
                    {msg.intent}
                  </span>
                )}
                {msg.llm_provider && (
                  <span className="text-xs text-gray-600">
                    {msg.llm_provider}/{msg.llm_model}
                  </span>
                )}
              </div>

              {msg.error && (
                <p className="text-sm text-red-400 mb-2">{msg.error}</p>
              )}

              {msg.content && (
                <p className="text-sm text-gray-300 mb-2">{msg.content}</p>
              )}

              {msg.code && <CodeBlock code={msg.code} />}

              {(msg.stdout || msg.artifacts?.length || msg.formatted_output) && (
                <div className="mt-3">
                  <ExecutionResult
                    stdout={msg.stdout}
                    stderr={msg.stderr}
                    artifacts={msg.artifacts}
                    executionTimeMs={msg.execution_time_ms}
                    formattedOutput={msg.formatted_output}
                  />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your data..."
            disabled={loading}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {loading ? 'Running...' : 'Send'}
          </button>
          <button
            type="button"
            onClick={clearChat}
            className="px-3 py-2.5 bg-gray-700 text-gray-400 rounded-lg hover:bg-gray-600 hover:text-white transition-colors text-sm"
          >
            Clear
          </button>
        </form>
      </div>

      {/* Execution logs — 30% */}
      <div className="flex-[3] border-l border-gray-700 pl-4">
        <h3 className="text-xs font-medium text-gray-500 mb-2">Execution Logs</h3>
        <ExecutionLog logs={logs} />
      </div>
    </div>
  );
}
