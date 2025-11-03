// components/stocks/StockPeerComparisonTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface StockPeerComparisonTabProps {
  ticker: string;
}

interface Peer {
  ticker: string;
  name: string;
  sector: string;
  market_cap: number;
  exchange: string;
}

interface PriceDataPoint {
  date: string;
  close: number;
  normalized_close: number;
}

interface Metrics {
  return_1y: number;
  volatility: number;
  correlation?: number;
  beta?: number;
}

interface ComparisonData {
  price_data: Record<string, PriceDataPoint[]>;
  metrics: Record<string, Metrics>;
  sector_avg: { return_1y: number };
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
  '#14b8a6', // teal
];

export default function StockPeerComparisonTab({ ticker }: StockPeerComparisonTabProps) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [selectedPeers, setSelectedPeers] = useState<Set<string>>(new Set());
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loadingPeers, setLoadingPeers] = useState(false);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>('1y');

  // Auto-fetch peers on mount
  useEffect(() => {
    fetchPeers();
  }, [ticker]);

  const fetchPeers = async () => {
    try {
      setLoadingPeers(true);
      setError(null);
      const data = await api.fetchPeers(ticker, 15);
      setPeers(data);
    } catch (err: any) {
      console.error('Failed to fetch peers:', err);
      setError(err.message || 'Failed to fetch peers');
    } finally {
      setLoadingPeers(false);
    }
  };

  const togglePeer = (peerTicker: string) => {
    const newSelected = new Set(selectedPeers);
    if (newSelected.has(peerTicker)) {
      newSelected.delete(peerTicker);
    } else {
      if (newSelected.size >= 10) {
        setError('Maximum 10 peers can be selected');
        return;
      }
      newSelected.add(peerTicker);
    }
    setSelectedPeers(newSelected);
    setError(null);
  };

  const runComparison = async () => {
    if (selectedPeers.size === 0) {
      setError('Please select at least one peer to compare');
      return;
    }

    try {
      setLoadingComparison(true);
      setError(null);
      const data = await api.fetchPeerComparison(
        ticker,
        Array.from(selectedPeers),
        period,
        true
      );
      setComparisonData(data);
    } catch (err: any) {
      console.error('Failed to fetch comparison data:', err);
      setError(err.message || 'Failed to fetch comparison data');
    } finally {
      setLoadingComparison(false);
    }
  };

  const formatNumber = (num: number | undefined, suffix: string = ''): string => {
    if (num === undefined) return 'N/A';
    if (num >= 1_000_000_000_000) return `$${(num / 1_000_000_000_000).toFixed(2)}T`;
    if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B${suffix}`;
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M${suffix}`;
    return `${num.toFixed(2)}${suffix}`;
  };

  // Transform price data for Recharts
  const chartData = comparisonData
    ? (() => {
        const allDates = new Set<string>();
        Object.values(comparisonData.price_data).forEach((data) => {
          data.forEach((point) => allDates.add(point.date));
        });

        const sortedDates = Array.from(allDates).sort();
        return sortedDates.map((date) => {
          const dataPoint: any = { date };
          Object.entries(comparisonData.price_data).forEach(([t, points]) => {
            const point = points.find((p) => p.date === date);
            if (point) {
              dataPoint[t] = point.normalized_close;
            }
          });
          return dataPoint;
        });
      })()
    : [];

  const allTickers = comparisonData
    ? [ticker, ...Array.from(selectedPeers)]
    : [];

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-300">
          {error}
        </div>
      )}

      {/* Peer Selection */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-xl font-bold mb-4">Select Peers to Compare</h3>

        {loadingPeers ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-slate-400">Loading peers...</div>
          </div>
        ) : peers.length === 0 ? (
          <div className="text-slate-400">No peers found for this sector</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {peers.map((peer) => {
                const isSelected = selectedPeers.has(peer.ticker);
                return (
                  <div
                    key={peer.ticker}
                    onClick={() => togglePeer(peer.ticker)}
                    className={`
                      p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${
                        isSelected
                          ? 'border-blue-500 bg-blue-900/20'
                          : 'border-slate-700 bg-slate-700/50 hover:border-slate-600'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-bold text-lg">{peer.ticker}</div>
                        <div className="text-sm text-slate-400 truncate">
                          {peer.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {formatNumber(peer.market_cap)}
                        </div>
                      </div>
                      <div className="ml-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-5 h-5 rounded border-slate-600 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Period Selection and Compare Button */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold">Period:</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="px-3 py-2 bg-slate-700 rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="1m">1 Month</option>
                  <option value="3m">3 Months</option>
                  <option value="6m">6 Months</option>
                  <option value="1y">1 Year</option>
                  <option value="3y">3 Years</option>
                  <option value="5y">5 Years</option>
                </select>
              </div>

              <button
                onClick={runComparison}
                disabled={selectedPeers.size === 0 || loadingComparison}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded font-semibold transition-colors"
              >
                {loadingComparison ? 'Loading...' : `Compare (${selectedPeers.size} selected)`}
              </button>

              {selectedPeers.size > 0 && (
                <button
                  onClick={() => setSelectedPeers(new Set())}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition-colors"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Comparison Results */}
      {comparisonData && (
        <>
          {/* Price Chart */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-xl font-bold mb-4">Normalized Price Comparison (Base = 100)</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date) => {
                    const d = new Date(date);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#cbd5e1' }}
                  formatter={(value: any) => [value.toFixed(2), '']}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                {allTickers.map((t, idx) => (
                  <Line
                    key={t}
                    type="monotone"
                    dataKey={t}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={t === ticker ? 3 : 2}
                    dot={false}
                    name={t}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Metrics Table */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-6 py-4 text-left font-bold">Ticker</th>
                  <th className="px-6 py-4 text-right font-bold">Return ({period})</th>
                  <th className="px-6 py-4 text-right font-bold">Volatility</th>
                  <th className="px-6 py-4 text-right font-bold">Beta</th>
                  <th className="px-6 py-4 text-right font-bold">Correlation</th>
                </tr>
              </thead>
              <tbody>
                {allTickers.map((t) => {
                  const metrics = comparisonData.metrics[t];
                  if (!metrics) return null;

                  return (
                    <tr
                      key={t}
                      className={`border-b border-slate-700 ${
                        t === ticker ? 'bg-blue-900/20' : ''
                      }`}
                    >
                      <td className="px-6 py-4 font-bold">
                        {t}
                        {t === ticker && (
                          <span className="ml-2 text-xs text-blue-400">(Current)</span>
                        )}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-semibold ${
                          metrics.return_1y >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {metrics.return_1y >= 0 ? '+' : ''}
                        {metrics.return_1y.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 text-right">
                        {metrics.volatility.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 text-right">
                        {metrics.beta !== undefined ? metrics.beta.toFixed(3) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {metrics.correlation !== undefined
                          ? metrics.correlation.toFixed(3)
                          : 'N/A'}
                      </td>
                    </tr>
                  );
                })}

                {/* Sector Average Row */}
                {comparisonData.sector_avg && (
                  <tr className="bg-slate-700 font-semibold">
                    <td className="px-6 py-4">Sector Avg</td>
                    <td
                      className={`px-6 py-4 text-right ${
                        comparisonData.sector_avg.return_1y >= 0
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}
                    >
                      {comparisonData.sector_avg.return_1y >= 0 ? '+' : ''}
                      {comparisonData.sector_avg.return_1y.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-right">—</td>
                    <td className="px-6 py-4 text-right">—</td>
                    <td className="px-6 py-4 text-right">—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
