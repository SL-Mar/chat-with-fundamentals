// components/asset-detail/tabs/ReturnsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { ReturnsResponse } from '../../../types/equity';
import ReturnsAnalytics from '../../ReturnsAnalytics';

interface ReturnsTabProps {
  ticker: string;
}

export default function ReturnsTab({ ticker }: ReturnsTabProps) {
  const [returnsData, setReturnsData] = useState<ReturnsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [years, setYears] = useState(3);
  const [benchmark, setBenchmark] = useState('SPY');

  useEffect(() => {
    fetchReturnsData();
  }, [ticker, years, benchmark]);

  const fetchReturnsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await api.fetchReturns(ticker, years, benchmark);
      setReturnsData(data);
    } catch (err: any) {
      console.error('[ReturnsTab] Failed to fetch returns data:', err);
      setError(err.message || 'Failed to load returns analysis');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-700 rounded w-64 mb-6"></div>
            <div className="space-y-4">
              <div className="h-64 bg-slate-700 rounded"></div>
              <div className="h-64 bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
            <h3 className="text-red-300 font-semibold mb-2">Failed to Load Returns Analysis</h3>
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <button
              onClick={() => fetchReturnsData()}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded text-white font-semibold text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!returnsData) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-slate-400">
            No returns data available
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header with controls */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-200">Returns Distribution & Beta Analysis</h2>
              <p className="text-sm text-slate-400 mt-1">
                Statistical analysis of daily returns and correlation with benchmark
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 bg-slate-800 rounded-lg p-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Time Period</label>
              <select
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
              >
                <option value={1}>1 Year</option>
                <option value={2}>2 Years</option>
                <option value={3}>3 Years</option>
                <option value={5}>5 Years</option>
                <option value={10}>10 Years</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Benchmark</label>
              <select
                value={benchmark}
                onChange={(e) => setBenchmark(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
              >
                <option value="SPY">S&P 500 (SPY)</option>
                <option value="QQQ">Nasdaq 100 (QQQ)</option>
                <option value="DIA">Dow Jones (DIA)</option>
                <option value="IWM">Russell 2000 (IWM)</option>
              </select>
            </div>

            <div className="ml-auto text-right">
              <div className="text-xs text-slate-400">Mean Return</div>
              <div className={`text-lg font-bold ${returnsData.returns.mean >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(returnsData.returns.mean * 100).toFixed(2)}%
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400">Volatility (σ)</div>
              <div className="text-lg font-bold text-slate-200">
                {(returnsData.returns.std * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* Returns Analytics Component */}
        <ReturnsAnalytics data={returnsData} />

        {/* Additional Info */}
        <div className="mt-6 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-300 mb-2">📊 Understanding These Metrics</h3>
          <div className="text-xs text-blue-200 space-y-1">
            <p>
              <strong>Returns Distribution:</strong> Shows the frequency of daily returns. A normal distribution
              suggests predictable behavior, while fat tails indicate extreme events.
            </p>
            <p>
              <strong>Beta (β):</strong> Measures sensitivity to market movements. β &gt; 1 means more volatile than
              market, β &lt; 1 means less volatile, β = 1 moves with market.
            </p>
            <p>
              <strong>R² (R-squared):</strong> Shows how much of the stock's movement is explained by the benchmark.
              Higher R² means stronger correlation with the market.
            </p>
            <p>
              <strong>Alpha (α):</strong> The y-intercept of the regression line. Positive alpha suggests outperformance
              independent of market movements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
