// pages/demo.tsx - Demo page for dynamic panel rendering
import { useState } from 'react';
import { api } from '../lib/api';
import { renderPanel } from '../lib/panelRegistry';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  panels?: Array<{ type: string; props: any }>;
}

export default function DemoPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    setLoading(true);

    // Add user message
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Get LLM response with panels
      const response = await api.chatWithPanels(input, []);

      // Add assistant message with panels
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.message,
        panels: response.panels
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      // Error handling
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to get response'}`,
        panels: []
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setInput('');
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 bg-slate-800">
        <h1 className="text-2xl font-bold text-white">💬 Chat with Dynamic Panels</h1>
        <p className="text-sm text-slate-400 mt-1">
          Try: "Show me dividends for AAPL" | "MSFT price chart" | "Analyst ratings for TSLA"
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 mt-20">
            <p className="text-lg mb-4">👋 Welcome! Ask me about stocks</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setInput('Show me dividends for AAPL')}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
              >
                AAPL Dividends
              </button>
              <button
                onClick={() => setInput('MSFT price chart')}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
              >
                MSFT Chart
              </button>
              <button
                onClick={() => setInput('Analyst ratings for TSLA')}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
              >
                TSLA Ratings
              </button>
              <button
                onClick={() => setInput('Insider transactions for NVDA')}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
              >
                NVDA Insiders
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className="max-w-4xl w-full">
              {/* Text Message */}
              <div
                className={`p-4 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white ml-auto max-w-2xl'
                    : 'bg-slate-800 text-slate-100'
                }`}
              >
                {msg.content}
              </div>

              {/* Dynamic Panels */}
              {msg.panels && msg.panels.length > 0 && (
                <div className="mt-4 space-y-4">
                  {msg.panels.map((panel, pIdx) => (
                    <div key={pIdx} className="bg-slate-800 rounded-lg shadow-xl overflow-hidden">
                      {renderPanel(panel.type, panel.props)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700 bg-slate-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about stocks... (e.g., 'Show me dividends for AAPL')"
            className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
