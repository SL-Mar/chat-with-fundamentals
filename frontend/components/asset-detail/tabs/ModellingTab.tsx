// components/asset-detail/tabs/ModellingTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { ReturnsResponse } from '../../../types/equity';
import BetaScatterChart from '../../BetaScatterChart';

interface ModellingTabProps {
  ticker: string;
}

export default function ModellingTab({ ticker }: ModellingTabProps) {
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
      console.error('[ModellingTab] Failed to fetch returns data:', err);
      setError(err.message || 'Failed to load modelling data');
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
            <div className="h-96 bg-slate-700 rounded"></div>
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
            <h3 className="text-red-300 font-semibold mb-2">Failed to Load Modelling Data</h3>
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
            No modelling data available
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
              <h2 className="text-2xl font-bold text-slate-200">Beta Regression Model</h2>
              <p className="text-sm text-slate-400 mt-1">
                Market sensitivity analysis and correlation modeling
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
              <div className="text-xs text-slate-400">Beta (β)</div>
              <div className="text-lg font-bold text-blue-400">
                {returnsData.scatter.beta.toFixed(2)}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400">Alpha (α)</div>
              <div className={`text-lg font-bold ${returnsData.scatter.alpha >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(returnsData.scatter.alpha * 100).toFixed(2)}%
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400">R-Squared</div>
              <div className="text-lg font-bold text-slate-200">
                {(returnsData.scatter.r2 * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Beta Scatter Chart */}
        <BetaScatterChart data={returnsData} />
      </div>
    </div>
  );
}
