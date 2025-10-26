// pages/stock-ai-analysis.tsx - Stock AI Analysis with MarketSense AI
'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import { api } from '../lib/api';
import AgentConsole from '../components/AgentConsole';
import CompanyHeader from '../components/CompanyHeader';

interface AgentOutput {
  agent_name: string;
  score: number;
  reasoning: string;
  weight: number;
  confidence: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface AnalysisResult {
  asset_type: string;
  asset_id: string;
  signal: 'BUY' | 'HOLD' | 'SELL' | 'STRONG_BUY' | 'STRONG_SELL';
  confidence: number;
  weighted_score: number;
  reasoning: string;
  agent_outputs: AgentOutput[];
  deep_research_summary?: string;
  execution_time_seconds: number;
}

export default function StockAIAnalysisPage() {
  const router = useRouter();
  const [ticker, setTicker] = useState('');
  const [deepResearch, setDeepResearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const runAnalysis = async () => {
    if (!ticker.trim()) {
      setError('Please enter a ticker symbol');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await api.analyzeStock(ticker.toUpperCase(), deepResearch);
      setResult(response);
    } catch (err: any) {
      console.error('AI analysis failed:', err);
      setError(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const getSignalColor = (signal: string): string => {
    switch (signal) {
      case 'STRONG_BUY':
        return 'bg-green-600 text-white';
      case 'BUY':
        return 'bg-green-500 text-white';
      case 'HOLD':
        return 'bg-yellow-500 text-gray-900';
      case 'SELL':
        return 'bg-red-500 text-white';
      case 'STRONG_SELL':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getSignalIcon = (signal: string): string => {
    switch (signal) {
      case 'STRONG_BUY':
        return '↑↑';
      case 'BUY':
        return '↑';
      case 'HOLD':
        return '→';
      case 'SELL':
        return '↓';
      case 'STRONG_SELL':
        return '↓↓';
      default:
        return '•';
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 8) return 'text-green-400';
    if (score >= 6.5) return 'text-green-300';
    if (score >= 3.5) return 'text-yellow-400';
    if (score >= 2) return 'text-red-300';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 text-sm text-slate-400 hover:text-white flex items-center gap-2"
          >
            <span>←</span> Back
          </button>
          <h1 className="text-3xl font-bold mb-2">MarketSense AI Analysis</h1>
          <p className="text-slate-400">
            Multi-agent AI analysis combining fundamentals, news, technicals, and macro environment
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-2">Stock Ticker</label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="e.g., AAPL.US, MSFT.US"
                className="w-full px-4 py-2 bg-slate-700 rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && runAnalysis()}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="deep-research"
                checked={deepResearch}
                onChange={(e) => setDeepResearch(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="deep-research" className="text-sm">
                Deep Research (Tavily)
              </label>
            </div>

            <button
              onClick={runAnalysis}
              disabled={loading || !ticker.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded font-semibold transition-colors"
            >
              {loading ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Agent Console */}
          <div className="h-[600px]">
            <AgentConsole autoScroll maxLogs={200} />
          </div>

          {/* Right Column: Analysis Results */}
          <div className="space-y-6">
            {result && (
              <>
                {/* Signal Card */}
                <div className="bg-slate-800 rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-4">Analysis Result</h2>

                  <div className="flex items-center gap-4 mb-4">
                    <div className={`px-6 py-3 rounded-lg font-bold text-lg ${getSignalColor(result.signal)}`}>
                      {getSignalIcon(result.signal)} {result.signal}
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Confidence</div>
                      <div className="text-xl font-bold">{(result.confidence * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Weighted Score</div>
                      <div className={`text-xl font-bold ${getScoreColor(result.weighted_score)}`}>
                        {result.weighted_score.toFixed(1)}/10
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm text-slate-400 mb-1">Reasoning</div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.reasoning}</p>
                  </div>

                  <div className="text-xs text-slate-500">
                    Execution time: {result.execution_time_seconds.toFixed(2)}s
                  </div>
                </div>

                {/* Deep Research Summary */}
                {result.deep_research_summary && (
                  <div className="bg-slate-800 rounded-lg p-6">
                    <h3 className="text-lg font-bold mb-3">Deep Research Summary</h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-300">
                      {result.deep_research_summary}
                    </p>
                  </div>
                )}

                {/* Agent Outputs */}
                <div className="bg-slate-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-4">Agent Breakdown</h3>
                  <div className="space-y-4">
                    {result.agent_outputs.map((output, i) => (
                      <div key={i} className="border-l-4 border-blue-500 pl-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold capitalize">
                            {output.agent_name.replace(/_/g, ' ')}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400">
                              Weight: {(output.weight * 100).toFixed(0)}%
                            </span>
                            <span className={`font-bold ${getScoreColor(output.score)}`}>
                              {output.score.toFixed(1)}/10
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {output.reasoning}
                        </p>
                        <div className="text-xs text-slate-500 mt-2">
                          Confidence: {(output.confidence * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {!result && !loading && (
              <div className="bg-slate-800 rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-xl font-bold mb-2">Ready to Analyze</h3>
                <p className="text-slate-400">
                  Enter a stock ticker and click "Run Analysis" to get started
                </p>
              </div>
            )}

            {loading && (
              <div className="bg-slate-800 rounded-lg p-12 text-center">
                <div className="animate-spin text-6xl mb-4">⟳</div>
                <h3 className="text-xl font-bold mb-2">Analyzing {ticker}</h3>
                <p className="text-slate-400">
                  Running {deepResearch ? '5 agents + deep research' : '5 agents'}...
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Watch the Agent Console for real-time progress
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
