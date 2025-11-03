// components/stocks/StockDeepResearchTab.tsx
'use client';

import { useState } from 'react';

interface StockDeepResearchTabProps {
  ticker: string;
}

export default function StockDeepResearchTab({ ticker }: StockDeepResearchTabProps) {
  const [query, setQuery] = useState(`Latest news and analysis for ${ticker}`);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runResearch = async () => {
    try {
      setLoading(true);
      setError(null);
      setResults(null);

      // Call the Tavily research endpoint (single comprehensive mode)
      const apiKey = localStorage.getItem('apiKey');
      const response = await fetch(
        `http://localhost:8000/api/v2/deep-research?query=${encodeURIComponent(query)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey || '',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Research failed');
      }

      const data = await response.json();
      setResults(data);
    } catch (err: any) {
      console.error('Research failed:', err);
      setError(err.message || 'Research failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Research Controls */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-xl font-bold mb-4">Deep Research Query</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Research Topic</label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`e.g., "Provide a comprehensive analysis of ${ticker} including financial performance, competitive positioning, and growth prospects"`}
              className="w-full h-24 px-4 py-2 bg-slate-700 rounded border border-slate-600 focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          <button
            onClick={runResearch}
            disabled={loading || !query.trim()}
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
          >
            {loading ? 'Researching...' : 'Start Deep Research'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* Research Results */}
      {loading && (
        <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
          <div className="animate-spin text-6xl mb-4">🔬</div>
          <h3 className="text-xl font-bold mb-2">Researching...</h3>
          <p className="text-slate-400">
            Analyzing multiple sources with comprehensive depth
          </p>
        </div>
      )}

      {results && (
        <>
          {/* AI Summary */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-xl font-bold mb-4">🤖 AI-Generated Summary</h3>
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
              {results.summary}
            </p>
          </div>

          {/* Source Articles */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-xl font-bold mb-4">📚 Source Articles</h3>
            <div className="space-y-4">
              {results.results.map((article: any, i: number) => (
                <div key={i} className="p-4 bg-slate-700 rounded border border-slate-600">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-lg text-blue-400">{article.title}</h4>
                    <div className="flex items-center gap-1 text-sm text-green-400">
                      <span>⭐</span>
                      <span>{(article.score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 mb-3">{article.content}</p>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    Read full article <span>→</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!results && !loading && (
        <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
          <div className="text-6xl mb-4">🔬</div>
          <h3 className="text-xl font-bold mb-2">Deep Research with Tavily AI</h3>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Leverage AI-powered research to get comprehensive insights from multiple sources.
            Tavily analyzes news, reports, and market data to provide actionable intelligence.
          </p>
        </div>
      )}
    </div>
  );
}
