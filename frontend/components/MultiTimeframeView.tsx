// components/MultiTimeframeView.tsx - Multi-timeframe performance comparison
'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface MultiTimeframeViewProps {
  ticker: string;
}

type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y';

interface TimeframeData {
  timeframe: Timeframe;
  startPrice: number;
  endPrice: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  chartData: any[];
  loading: boolean;
  error: string | null;
}

export default function MultiTimeframeView({ ticker }: MultiTimeframeViewProps) {
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('1M');
  const [timeframeData, setTimeframeData] = useState<Map<Timeframe, TimeframeData>>(new Map());
  const [currentPrice, setCurrentPrice] = useState<number>(0);

  useEffect(() => {
    if (!ticker) return;
    fetchAllTimeframes();
  }, [ticker]);

  const getDateRange = (timeframe: Timeframe): { from_date: string; to_date: string; period: string } => {
    const now = new Date();
    const to_date = now.toISOString().split('T')[0];
    let from_date = new Date();
    let period = 'd'; // daily

    switch (timeframe) {
      case '1D':
        from_date.setDate(from_date.getDate() - 1);
        period = 'd';
        break;
      case '1W':
        from_date.setDate(from_date.getDate() - 7);
        period = 'd';
        break;
      case '1M':
        from_date.setMonth(from_date.getMonth() - 1);
        period = 'd';
        break;
      case '3M':
        from_date.setMonth(from_date.getMonth() - 3);
        period = 'd';
        break;
      case '1Y':
        from_date.setFullYear(from_date.getFullYear() - 1);
        period = 'w'; // weekly for 1Y
        break;
      case '5Y':
        from_date.setFullYear(from_date.getFullYear() - 5);
        period = 'm'; // monthly for 5Y
        break;
    }

    return { from_date: from_date.toISOString().split('T')[0], to_date, period };
  };

  const fetchAllTimeframes = async () => {
    const timeframes: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y', '5Y'];
    const newData = new Map<Timeframe, TimeframeData>();

    // Initialize with loading state
    timeframes.forEach((tf) => {
      newData.set(tf, {
        timeframe: tf,
        startPrice: 0,
        endPrice: 0,
        change: 0,
        changePercent: 0,
        high: 0,
        low: 0,
        chartData: [],
        loading: true,
        error: null,
      });
    });
    setTimeframeData(new Map(newData));

    // Fetch current price first
    try {
      const liveData = await api.fetchLivePrice(ticker);
      const price = liveData?.close || liveData?.price || 0;
      setCurrentPrice(price);
    } catch (err) {
      console.error('Failed to fetch current price:', err);
    }

    // Fetch each timeframe
    for (const tf of timeframes) {
      try {
        const { from_date, to_date, period } = getDateRange(tf);
        const data = await api.fetchEODExtended(ticker, period, from_date, to_date);

        // Data could be nested or an array
        const dataArray = Array.isArray(data) ? data : data?.data || [];

        if (dataArray.length > 0) {
          const sortedData = dataArray.sort((a: any, b: any) => {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          });

          const startPrice = sortedData[0]?.close || 0;
          const endPrice = sortedData[sortedData.length - 1]?.close || 0;
          const change = endPrice - startPrice;
          const changePercent = startPrice ? (change / startPrice) * 100 : 0;
          const high = Math.max(...sortedData.map((d: any) => d.high || 0));
          const low = Math.min(...sortedData.map((d: any) => d.low || Infinity));

          newData.set(tf, {
            timeframe: tf,
            startPrice,
            endPrice,
            change,
            changePercent,
            high,
            low,
            chartData: sortedData,
            loading: false,
            error: null,
          });
        } else {
          newData.set(tf, {
            ...newData.get(tf)!,
            loading: false,
            error: 'No data available',
          });
        }
      } catch (err: any) {
        console.error(`Failed to fetch ${tf} data:`, err);
        newData.set(tf, {
          ...newData.get(tf)!,
          loading: false,
          error: err.message,
        });
      }

      // Update state after each fetch
      setTimeframeData(new Map(newData));
    }
  };

  const formatPrice = (price: number) => {
    if (!price) return '$0.00';
    return `$${price.toFixed(2)}`;
  };

  const formatDate = (dateStr: string, timeframe: Timeframe) => {
    const date = new Date(dateStr);
    if (timeframe === '1D' || timeframe === '1W') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } else if (timeframe === '5Y') {
      return date.toLocaleDateString('en-US', { year: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const activeData = timeframeData.get(activeTimeframe);

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Multi-Timeframe Performance</h3>

      {/* Current Price Display */}
      {currentPrice > 0 && (
        <div className="mb-4 pb-4 border-b border-slate-700">
          <div className="text-sm text-slate-400">Current Price</div>
          <div className="text-2xl font-bold text-white">{formatPrice(currentPrice)}</div>
        </div>
      )}

      {/* Timeframe Selector */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['1D', '1W', '1M', '3M', '1Y', '5Y'] as Timeframe[]).map((tf) => {
          const data = timeframeData.get(tf);
          const isActive = activeTimeframe === tf;

          return (
            <button
              key={tf}
              onClick={() => setActiveTimeframe(tf)}
              disabled={data?.loading}
              className={`flex-1 min-w-[80px] px-3 py-2 rounded transition-colors ${
                isActive
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              } ${data?.loading ? 'opacity-50 cursor-wait' : ''}`}
            >
              <div className="text-xs font-semibold">{tf}</div>
              {data && !data.loading && !data.error && (
                <div className={`text-xs ${data.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
                </div>
              )}
              {data?.loading && <div className="text-xs text-slate-400">...</div>}
              {data?.error && <div className="text-xs text-red-400">-</div>}
            </button>
          );
        })}
      </div>

      {/* Active Timeframe Details */}
      {activeData && (
        <>
          {activeData.loading && (
            <div className="animate-pulse">
              <div className="h-48 bg-slate-700 rounded mb-4"></div>
              <div className="grid grid-cols-4 gap-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-700 rounded"></div>
                ))}
              </div>
            </div>
          )}

          {activeData.error && (
            <div className="text-sm text-red-400 py-8 text-center">
              Failed to load {activeTimeframe} data
            </div>
          )}

          {!activeData.loading && !activeData.error && activeData.chartData.length > 0 && (
            <>
              {/* Statistics */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-slate-700 rounded px-3 py-2 text-center">
                  <div className="text-xs text-slate-400">Start</div>
                  <div className="text-sm font-semibold text-white">
                    {formatPrice(activeData.startPrice)}
                  </div>
                </div>
                <div className="bg-slate-700 rounded px-3 py-2 text-center">
                  <div className="text-xs text-slate-400">End</div>
                  <div className="text-sm font-semibold text-white">
                    {formatPrice(activeData.endPrice)}
                  </div>
                </div>
                <div className="bg-slate-700 rounded px-3 py-2 text-center">
                  <div className="text-xs text-slate-400">High</div>
                  <div className="text-sm font-semibold text-green-400">
                    {formatPrice(activeData.high)}
                  </div>
                </div>
                <div className="bg-slate-700 rounded px-3 py-2 text-center">
                  <div className="text-xs text-slate-400">Low</div>
                  <div className="text-sm font-semibold text-red-400">
                    {formatPrice(activeData.low)}
                  </div>
                </div>
              </div>

              {/* Change Summary */}
              <div className="mb-4 text-center">
                <div className={`text-3xl font-bold ${activeData.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {activeData.change >= 0 ? '+' : ''}{formatPrice(Math.abs(activeData.change))}
                </div>
                <div className={`text-lg ${activeData.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ({activeData.changePercent >= 0 ? '+' : ''}{activeData.changePercent.toFixed(2)}%)
                </div>
              </div>

              {/* Line Chart */}
              <div className="mb-4">
                <div className="relative h-48 bg-slate-900 rounded p-2">
                  {/* Price axis */}
                  <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-slate-400 pr-1">
                    <span>{formatPrice(activeData.high)}</span>
                    <span>{formatPrice((activeData.high + activeData.low) / 2)}</span>
                    <span>{formatPrice(activeData.low)}</span>
                  </div>

                  {/* Chart area */}
                  <div className="ml-12 h-full relative">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="border-b border-slate-700/30"></div>
                      ))}
                    </div>

                    {/* Line chart with area fill */}
                    <svg className="absolute inset-0 w-full h-full">
                      <defs>
                        <linearGradient id={`gradient-${activeTimeframe}`} x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor={activeData.change >= 0 ? '#34d399' : '#f87171'} stopOpacity="0.3" />
                          <stop offset="100%" stopColor={activeData.change >= 0 ? '#34d399' : '#f87171'} stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Create path points */}
                      <polyline
                        fill={`url(#gradient-${activeTimeframe})`}
                        stroke={activeData.change >= 0 ? '#34d399' : '#f87171'}
                        strokeWidth="2"
                        points={activeData.chartData.map((d: any, idx: number) => {
                          const x = (idx / (activeData.chartData.length - 1)) * 100;
                          const priceRange = activeData.high - activeData.low;
                          const y = priceRange > 0 ? ((activeData.high - d.close) / priceRange) * 100 : 50;
                          return `${x}%,${y}%`;
                        }).join(' ') + ` 100%,100% 0%,100%`}
                      />
                      <polyline
                        fill="none"
                        stroke={activeData.change >= 0 ? '#34d399' : '#f87171'}
                        strokeWidth="2"
                        points={activeData.chartData.map((d: any, idx: number) => {
                          const x = (idx / (activeData.chartData.length - 1)) * 100;
                          const priceRange = activeData.high - activeData.low;
                          const y = priceRange > 0 ? ((activeData.high - d.close) / priceRange) * 100 : 50;
                          return `${x}%,${y}%`;
                        }).join(' ')}
                      />
                    </svg>
                  </div>
                </div>

                {/* Time axis */}
                <div className="ml-12 flex justify-between mt-2 text-xs text-slate-400">
                  <span>
                    {activeData.chartData[0] ? formatDate(activeData.chartData[0].date, activeTimeframe) : ''}
                  </span>
                  <span>
                    {activeData.chartData[activeData.chartData.length - 1]
                      ? formatDate(activeData.chartData[activeData.chartData.length - 1].date, activeTimeframe)
                      : ''}
                  </span>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-700 rounded px-3 py-2">
                  <div className="text-xs text-slate-400">Max Gain</div>
                  <div className="text-sm font-semibold text-green-400">
                    +{((activeData.high - activeData.startPrice) / activeData.startPrice * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="bg-slate-700 rounded px-3 py-2">
                  <div className="text-xs text-slate-400">Max Drawdown</div>
                  <div className="text-sm font-semibold text-red-400">
                    {((activeData.low - activeData.startPrice) / activeData.startPrice * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
