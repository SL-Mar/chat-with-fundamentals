// components/stocks/StockLiveDataTab.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import IntradayChart from '../IntradayChart';

interface StockLiveDataTabProps {
  ticker: string;
}

export default function StockLiveDataTab({ ticker }: StockLiveDataTabProps) {
  const [liveData, setLiveData] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchLiveData();

    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchLiveData();
      }, refreshInterval * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [ticker, autoRefresh, refreshInterval]);

  const fetchLiveData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await api.fetchLivePrice(ticker);
      setLiveData(data);
      setLastUpdate(new Date());
    } catch (err: any) {
      console.error('Failed to fetch live data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const getPriceChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  return (
    <div className="space-y-6">
      {/* Auto-refresh Controls */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={toggleAutoRefresh}
                className="w-4 h-4"
              />
              <span className="font-semibold">Auto-refresh</span>
            </label>

            {autoRefresh && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Every</span>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="px-3 py-1 bg-slate-700 rounded border border-slate-600 text-sm"
                >
                  <option value={1}>1s</option>
                  <option value={5}>5s</option>
                  <option value={10}>10s</option>
                  <option value={30}>30s</option>
                  <option value={60}>1m</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-400">
              Last update: {lastUpdate.toLocaleTimeString()}
            </div>
            <button
              onClick={fetchLiveData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded font-semibold transition-colors text-sm"
            >
              {loading ? 'Refreshing...' : 'Refresh Now'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-300">
          {error}
        </div>
      )}

      {/* Live Price Display */}
      {liveData && (
        <>
          {/* Main Price Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-8 border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-sm text-slate-400 mb-1">Current Price</div>
                <div className="text-5xl font-bold">
                  ${liveData.price?.toFixed(2) || 'N/A'}
                </div>
              </div>
              {liveData.change !== undefined && (
                <div className="text-right">
                  <div className={`text-3xl font-bold ${getPriceChangeColor(liveData.change)}`}>
                    {liveData.change >= 0 ? '+' : ''}{liveData.change.toFixed(2)}
                  </div>
                  <div className={`text-xl ${getPriceChangeColor(liveData.change)}`}>
                    ({liveData.change >= 0 ? '+' : ''}{liveData.change_p?.toFixed(2)}%)
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 gap-4 pt-6 border-t border-slate-700">
              <div>
                <div className="text-sm text-slate-400 mb-1">Open</div>
                <div className="text-xl font-bold">${liveData.open?.toFixed(2) || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-slate-400 mb-1">High</div>
                <div className="text-xl font-bold text-green-400">
                  ${liveData.high?.toFixed(2) || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-400 mb-1">Low</div>
                <div className="text-xl font-bold text-red-400">
                  ${liveData.low?.toFixed(2) || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-400 mb-1">Volume</div>
                <div className="text-xl font-bold">
                  {liveData.volume ? (liveData.volume / 1_000_000).toFixed(2) + 'M' : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Previous Close</div>
              <div className="text-2xl font-bold">
                ${liveData.previousClose?.toFixed(2) || 'N/A'}
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Bid / Ask</div>
              <div className="text-lg font-bold">
                {liveData.bid?.toFixed(2) || 'N/A'} / {liveData.ask?.toFixed(2) || 'N/A'}
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Day Range</div>
              <div className="text-lg font-bold">
                {liveData.low?.toFixed(2)} - {liveData.high?.toFixed(2)}
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Avg Volume</div>
              <div className="text-2xl font-bold">
                {liveData.avgVolume ? (liveData.avgVolume / 1_000_000).toFixed(2) + 'M' : 'N/A'}
              </div>
            </div>
          </div>

          {/* Extended Metrics */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-xl font-bold mb-4">Extended Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-slate-400 mb-1">Market Cap</div>
                <div className="text-lg font-semibold">
                  {liveData.marketCap
                    ? `$${(liveData.marketCap / 1_000_000_000).toFixed(2)}B`
                    : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-400 mb-1">P/E Ratio</div>
                <div className="text-lg font-semibold">{liveData.peRatio?.toFixed(2) || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-slate-400 mb-1">EPS</div>
                <div className="text-lg font-semibold">${liveData.eps?.toFixed(2) || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-slate-400 mb-1">Dividend Yield</div>
                <div className="text-lg font-semibold">
                  {liveData.dividendYield ? `${liveData.dividendYield.toFixed(2)}%` : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-400 mb-1">52 Week High</div>
                <div className="text-lg font-semibold text-green-400">
                  ${liveData['52WeekHigh']?.toFixed(2) || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-400 mb-1">52 Week Low</div>
                <div className="text-lg font-semibold text-red-400">
                  ${liveData['52WeekLow']?.toFixed(2) || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Intraday Chart */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-xl font-bold mb-4">Intraday Chart (5-minute)</h3>
        <IntradayChart ticker={ticker} interval="5m" />
      </div>

      {/* Market Status */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="font-semibold">Market Status: Open</span>
          </div>
          <div className="text-sm text-slate-400">
            Real-time data streamed every {refreshInterval}s
          </div>
        </div>
      </div>
    </div>
  );
}
