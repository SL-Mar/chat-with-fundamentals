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
  const [history, setHistory] = useState<AnalysisResult[]>([]);

  // Use shared AI analysis hook (deep research disabled - not needed)
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
    await runAnalysis(ticker, true); // Enable deep research by default
    fetchHistory(); // Refresh history after analysis
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[calc(100vh-300px)]">
        {/* Left Column - Agent Console with integrated Run button */}
        <AgentConsole
          autoScroll
          maxLogs={200}
          onRunAnalysis={handleRunAnalysis}
          loading={loading}
          error={error}
        />

        {/* Right Column - Results */}
        <div className="flex flex-col gap-6 overflow-y-auto min-h-0">
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

              {/* Agent Breakdown */}
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 flex-1">
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
                Running 4 specialized agents...
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
