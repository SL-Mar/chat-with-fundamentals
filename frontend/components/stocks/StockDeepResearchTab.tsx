// components/stocks/StockDeepResearchTab.tsx
'use client';

import { useState } from 'react';

interface StockDeepResearchTabProps {
  ticker: string;
}

export default function StockDeepResearchTab({ ticker }: StockDeepResearchTabProps) {
  const [query, setQuery] = useState(`Latest news and analysis for ${ticker}`);
  const [depth, setDepth] = useState<'basic' | 'comprehensive'>('basic');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runResearch = async () => {
    try {
      setLoading(true);
      setError(null);
      setResults(null);

      // Note: This would call a Tavily research endpoint
      // For now, we'll simulate the response
      await new Promise(resolve => setTimeout(resolve, 2000));

      setResults({
        query,
        summary: `Comprehensive research summary for ${ticker}. This would contain AI-generated insights from multiple sources including recent news, financial reports, analyst opinions, and market trends. The Tavily API would provide deep contextual analysis combining information from various reliable sources.`,
        results: [
          {
            title: `${ticker} Q4 Earnings Beat Expectations`,
            url: 'https://example.com/article1',
            content: 'The company reported strong quarterly results...',
            score: 0.95
          },
          {
            title: `Industry Analysis: ${ticker.split('.')[0]} Sector Trends`,
            url: 'https://example.com/article2',
            content: 'Market dynamics show positive momentum...',
            score: 0.89
          },
          {
            title: `Analyst Upgrades ${ticker} to Buy`,
            url: 'https://example.com/article3',
            content: 'Leading analysts revised their outlook...',
            score: 0.87
          }
        ]
      });
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
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What would you like to research?"
              className="w-full px-4 py-2 bg-slate-700 rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Research Depth</label>
            <div className="flex gap-3">
              <button
                onClick={() => setDepth('basic')}
                className={`px-4 py-2 rounded font-semibold transition-colors ${
                  depth === 'basic'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Basic (Fast)
              </button>
              <button
                onClick={() => setDepth('comprehensive')}
                className={`px-4 py-2 rounded font-semibold transition-colors ${
                  depth === 'comprehensive'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Comprehensive (Thorough)
              </button>
            </div>
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
            Analyzing multiple sources with {depth} depth
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

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">ℹ️</div>
          <div>
            <h4 className="font-semibold mb-1">About Deep Research</h4>
            <p className="text-sm text-slate-300">
              Deep Research uses Tavily AI to search and analyze information from across the web.
              It combines multiple sources to provide comprehensive, unbiased insights on your research topic.
              Results are ranked by relevance and reliability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
