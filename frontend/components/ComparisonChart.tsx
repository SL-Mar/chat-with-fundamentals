// components/ComparisonChart.tsx - Multi-ticker performance comparison
'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface ComparisonChartProps {
  initialTickers?: string[];
  timeframe?: '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y';
}

interface TickerData {
  ticker: string;
  data: any[];
  color: string;
  currentPrice: number;
  startPrice: number;
  changePercent: number;
  loading: boolean;
  error: string | null;
}

const COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // green-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
];

export default function ComparisonChart({ initialTickers = [], timeframe = '1Y' }: ComparisonChartProps) {
  const [tickers, setTickers] = useState<string[]>(initialTickers.length > 0 ? initialTickers : ['AAPL.US', 'MSFT.US', 'GOOGL.US']);
  const [tickerData, setTickerData] = useState<Map<string, TickerData>>(new Map());
  const [newTicker, setNewTicker] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y'>(timeframe);

  useEffect(() => {
    fetchAllTickers();
  }, [tickers, selectedTimeframe]);

  const getDateRange = (tf: typeof selectedTimeframe): { from_date: string; to_date: string } => {
    const now = new Date();
    const to_date = now.toISOString().split('T')[0];
    let from_date = new Date();

    switch (tf) {
      case '1M':
        from_date.setMonth(from_date.getMonth() - 1);
        break;
      case '3M':
        from_date.setMonth(from_date.getMonth() - 3);
        break;
      case '6M':
        from_date.setMonth(from_date.getMonth() - 6);
        break;
      case '1Y':
        from_date.setFullYear(from_date.getFullYear() - 1);
        break;
      case '3Y':
        from_date.setFullYear(from_date.getFullYear() - 3);
        break;
      case '5Y':
        from_date.setFullYear(from_date.getFullYear() - 5);
        break;
    }

    return { from_date: from_date.toISOString().split('T')[0], to_date };
  };

  const fetchAllTickers = async () => {
    const newData = new Map<string, TickerData>();

    // Initialize with loading state
    tickers.forEach((ticker, idx) => {
      newData.set(ticker, {
        ticker,
        data: [],
        color: COLORS[idx % COLORS.length],
        currentPrice: 0,
        startPrice: 0,
        changePercent: 0,
        loading: true,
        error: null,
      });
    });
    setTickerData(new Map(newData));

    // Fetch data for each ticker
    for (let idx = 0; idx < tickers.length; idx++) {
      const ticker = tickers[idx];
      try {
        const { from_date, to_date } = getDateRange(selectedTimeframe);
        const period = selectedTimeframe === '5Y' || selectedTimeframe === '3Y' ? 'w' : 'd';
        const data = await api.fetchEODExtended(ticker, period, from_date, to_date);

        const dataArray = Array.isArray(data) ? data : data?.data || [];

        if (dataArray.length > 0) {
          const sortedData = dataArray.sort((a: any, b: any) => {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          });

          const startPrice = sortedData[0]?.close || 0;
          const currentPrice = sortedData[sortedData.length - 1]?.close || 0;
          const changePercent = startPrice ? ((currentPrice - startPrice) / startPrice) * 100 : 0;

          newData.set(ticker, {
            ticker,
            data: sortedData,
            color: COLORS[idx % COLORS.length],
            currentPrice,
            startPrice,
            changePercent,
            loading: false,
            error: null,
          });
        } else {
          newData.set(ticker, {
            ...newData.get(ticker)!,
            loading: false,
            error: 'No data available',
          });
        }
      } catch (err: any) {
        console.error(`Failed to fetch ${ticker} data:`, err);
        newData.set(ticker, {
          ...newData.get(ticker)!,
          loading: false,
          error: err.message,
        });
      }

      setTickerData(new Map(newData));
    }
  };

  const addTicker = () => {
    if (!newTicker.trim()) return;
    const ticker = newTicker.trim().toUpperCase();
    if (!ticker.includes('.')) {
      // Auto-add .US if no exchange specified
      setTickers([...tickers, `${ticker}.US`]);
    } else {
      setTickers([...tickers, ticker]);
    }
    setNewTicker('');
  };

  const removeTicker = (ticker: string) => {
    setTickers(tickers.filter((t) => t !== ticker));
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  // Normalize all data to percentage change from start (for comparison)
  const getNormalizedY = (tickerInfo: TickerData, dataPoint: any): number => {
    if (!tickerInfo.startPrice || tickerInfo.startPrice === 0) return 0;
    const price = dataPoint.close || 0;
    return ((price - tickerInfo.startPrice) / tickerInfo.startPrice) * 100;
  };

  // Find min/max for Y axis
  const allNormalizedValues: number[] = [];
  tickerData.forEach((tickerInfo) => {
    if (!tickerInfo.loading && !tickerInfo.error && tickerInfo.data.length > 0) {
      tickerInfo.data.forEach((d) => {
        allNormalizedValues.push(getNormalizedY(tickerInfo, d));
      });
    }
  });

  const maxY = Math.max(...allNormalizedValues, 10);
  const minY = Math.min(...allNormalizedValues, -10);
  const yRange = maxY - minY;

  const getY = (normalizedPercent: number): number => {
    if (yRange === 0) return 50;
    return ((maxY - normalizedPercent) / yRange) * 100;
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Ticker Comparison</h3>

      {/* Timeframe Selector */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['1M', '3M', '6M', '1Y', '3Y', '5Y'] as const).map((tf) => (
          <button
            key={tf}
            onClick={() => setSelectedTimeframe(tf)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              selectedTimeframe === tf
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Add Ticker Input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTicker()}
          placeholder="Add ticker (e.g., TSLA, NVDA.US)"
          className="flex-1 px-3 py-2 bg-slate-700 text-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addTicker}
          className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
        >
          Add
        </button>
      </div>

      {/* Legend with Performance */}
      <div className="mb-4 flex flex-wrap gap-2">
        {Array.from(tickerData.values()).map((tickerInfo) => (
          <div
            key={tickerInfo.ticker}
            className="flex items-center gap-2 bg-slate-700 rounded px-3 py-2"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: tickerInfo.color }}
            ></div>
            <span className="text-sm font-semibold text-white">{tickerInfo.ticker}</span>
            {!tickerInfo.loading && !tickerInfo.error && (
              <span
                className={`text-xs font-semibold ${
                  tickerInfo.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {formatPercent(tickerInfo.changePercent)}
              </span>
            )}
            {tickerInfo.loading && (
              <span className="text-xs text-slate-400">Loading...</span>
            )}
            {tickerInfo.error && (
              <span className="text-xs text-red-400">Error</span>
            )}
            <button
              onClick={() => removeTicker(tickerInfo.ticker)}
              className="ml-2 text-slate-400 hover:text-red-400 transition-colors"
              title="Remove ticker"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Comparison Chart */}
      {tickerData.size > 0 && (
        <div className="mb-4">
          <div className="relative h-64 bg-slate-900 rounded p-2">
            {/* Y-axis (percentage) */}
            <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-slate-400 pr-1">
              <span>{formatPercent(maxY)}</span>
              <span>{formatPercent((maxY + minY) / 2)}</span>
              <span>{formatPercent(minY)}</span>
            </div>

            {/* Chart area */}
            <div className="ml-12 h-full relative">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="border-b border-slate-700/30"></div>
                ))}
              </div>

              {/* Zero line (baseline) */}
              <div
                className="absolute left-0 right-0 border-b border-slate-500/50"
                style={{ top: `${getY(0)}%` }}
              ></div>

              {/* SVG for all ticker lines */}
              <svg className="absolute inset-0 w-full h-full">
                {Array.from(tickerData.values()).map((tickerInfo) => {
                  if (tickerInfo.loading || tickerInfo.error || tickerInfo.data.length === 0) {
                    return null;
                  }

                  const points = tickerInfo.data.map((d: any, idx: number) => {
                    const x = (idx / (tickerInfo.data.length - 1)) * 100;
                    const normalizedY = getNormalizedY(tickerInfo, d);
                    const y = getY(normalizedY);
                    return `${x}%,${y}%`;
                  }).join(' ');

                  return (
                    <polyline
                      key={tickerInfo.ticker}
                      fill="none"
                      stroke={tickerInfo.color}
                      strokeWidth="2"
                      points={points}
                      opacity="0.9"
                    />
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Time axis */}
          {tickerData.size > 0 && Array.from(tickerData.values())[0]?.data.length > 0 && (
            <div className="ml-12 flex justify-between mt-2 text-xs text-slate-400">
              <span>
                {new Date(Array.from(tickerData.values())[0].data[0].date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
              <span>
                {new Date(Array.from(tickerData.values())[0].data[Array.from(tickerData.values())[0].data.length - 1].date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Performance Table */}
      {tickerData.size > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 px-2 text-xs text-slate-400">Ticker</th>
                <th className="text-right py-2 px-2 text-xs text-slate-400">Start</th>
                <th className="text-right py-2 px-2 text-xs text-slate-400">Current</th>
                <th className="text-right py-2 px-2 text-xs text-slate-400">Change</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(tickerData.values())
                .sort((a, b) => b.changePercent - a.changePercent)
                .map((tickerInfo) => (
                  <tr key={tickerInfo.ticker} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-2 px-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: tickerInfo.color }}
                        ></div>
                        <span className="text-white font-semibold">{tickerInfo.ticker}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-sm text-right text-slate-300">
                      {tickerInfo.loading ? '...' : tickerInfo.error ? '-' : formatPrice(tickerInfo.startPrice)}
                    </td>
                    <td className="py-2 px-2 text-sm text-right text-white">
                      {tickerInfo.loading ? '...' : tickerInfo.error ? '-' : formatPrice(tickerInfo.currentPrice)}
                    </td>
                    <td className="py-2 px-2 text-sm text-right">
                      {tickerInfo.loading ? (
                        <span className="text-slate-400">Loading...</span>
                      ) : tickerInfo.error ? (
                        <span className="text-red-400">Error</span>
                      ) : (
                        <span
                          className={`font-semibold ${
                            tickerInfo.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {formatPercent(tickerInfo.changePercent)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tickerData.size === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm">
          Add tickers above to start comparing
        </div>
      )}
    </div>
  );
}
