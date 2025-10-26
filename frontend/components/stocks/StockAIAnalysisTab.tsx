// components/stocks/StockAIAnalysisTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import AgentConsole from '../AgentConsole';
import { useAIAnalysis } from '../../hooks/useAIAnalysis';
import { getSignalColor, getSignalIcon, getScoreColor } from '../../utils/formatting';

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

interface StockAIAnalysisTabProps {
  ticker: string;
}

export default function StockAIAnalysisTab({ ticker }: StockAIAnalysisTabProps) {
  const [deepResearch, setDeepResearch] = useState(false);
  const [history, setHistory] = useState<AnalysisResult[]>([]);

  // Use shared AI analysis hook
  const { result, loading, error, runAnalysis } = useAIAnalysis('stock');

  useEffect(() => {
    fetchHistory();
  }, [ticker]);

  const fetchHistory = async () => {
    try {
      const historyData = await api.fetchStockAnalysisHistory(ticker, 5);
      setHistory(historyData.results || []);
    } catch (err) {
      console.warn('Failed to fetch analysis history:', err);
    }
  };

  const handleRunAnalysis = async () => {
    await runAnalysis(ticker, deepResearch);
    fetchHistory(); // Refresh history after analysis
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={deepResearch}
                onChange={(e) => setDeepResearch(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-semibold">Enable Deep Research (Tavily)</span>
            </label>
          </div>

          <button
            onClick={handleRunAnalysis}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded font-semibold transition-colors"
          >
            {loading ? 'Analyzing...' : 'Run AI Analysis'}
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
        {/* Left: Agent Console */}
        <div className="h-[600px]">
          <AgentConsole autoScroll maxLogs={200} />
        </div>

        {/* Right: Results */}
        <div className="space-y-6">
          {result && (
            <>
              {/* Signal Card */}
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-xl font-bold mb-4">Analysis Result</h3>

                <div className="flex items-center gap-4 mb-4">
                  <div className={`px-6 py-3 rounded-lg font-bold text-lg ${getSignalColor(result.signal)}`}>
                    {getSignalIcon(result.signal)} {result.signal}
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Confidence</div>
                    <div className="text-xl font-bold">{(result.confidence * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Score</div>
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
                  Execution: {result.execution_time_seconds.toFixed(2)}s
                </div>
              </div>

              {/* Deep Research */}
              {result.deep_research_summary && (
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <h3 className="text-lg font-bold mb-3">Deep Research Summary</h3>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-300">
                    {result.deep_research_summary}
                  </p>
                </div>
              )}

              {/* Agent Breakdown */}
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
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
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!result && !loading && (
            <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-xl font-bold mb-2">Ready to Analyze</h3>
              <p className="text-slate-400">
                Click "Run AI Analysis" to start MarketSense AI
              </p>
            </div>
          )}

          {loading && (
            <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
              <div className="animate-spin text-6xl mb-4">⟳</div>
              <h3 className="text-xl font-bold mb-2">Analyzing {ticker}</h3>
              <p className="text-slate-400">
                Running {deepResearch ? '5 agents + deep research' : '5 agents'}...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Analysis History */}
      {history.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-xl font-bold mb-4">Recent Analyses</h3>
          <div className="space-y-2">
            {history.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-700 rounded">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded text-sm font-bold ${getSignalColor(item.signal)}`}>
                    {item.signal}
                  </div>
                  <div className="text-sm text-slate-400">
                    {new Date(item.agent_outputs[0]?.timestamp || Date.now()).toLocaleString()}
                  </div>
                </div>
                <div className={`font-bold ${getScoreColor(item.weighted_score)}`}>
                  {item.weighted_score.toFixed(1)}/10
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
