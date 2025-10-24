// components/IntradayChart.tsx - Intraday price chart with interval selection
'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface IntradayChartProps {
  ticker: string;
  defaultInterval?: '1m' | '5m' | '15m' | '1h';
}

export default function IntradayChart({ ticker, defaultInterval = '5m' }: IntradayChartProps) {
  const [interval, setInterval] = useState<'1m' | '5m' | '15m' | '1h'>(defaultInterval);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    change: number;
    changePercent: number;
  } | null>(null);

  useEffect(() => {
    if (!ticker) return;
    fetchIntradayData();
  }, [ticker, interval]);

  const fetchIntradayData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[IntradayChart] Fetching intraday data for', ticker, 'interval:', interval);

      // Fetch intraday data for selected interval
      const data = await api.fetchIntradayData(ticker, interval);

      console.log('[IntradayChart] Raw API response:', data);

      // Data could be nested or an array - adjust based on actual response
      const dataArray = Array.isArray(data) ? data : data?.data || [];

      console.log('[IntradayChart] Extracted data array length:', dataArray.length);
      if (dataArray.length > 0) {
        console.log('[IntradayChart] First data point:', dataArray[0]);
        console.log('[IntradayChart] Last data point:', dataArray[dataArray.length - 1]);
      }

      // Sort by timestamp ascending
      const sortedData = dataArray.sort((a: any, b: any) => {
        const timeA = new Date(a.datetime || a.timestamp).getTime();
        const timeB = new Date(b.datetime || b.timestamp).getTime();
        return timeA - timeB;
      });

      setChartData(sortedData);

      // Calculate statistics
      if (sortedData.length > 0) {
        const first = sortedData[0];
        const last = sortedData[sortedData.length - 1];
        const high = Math.max(...sortedData.map((d: any) => d.high || 0));
        const low = Math.min(...sortedData.map((d: any) => d.low || Infinity));
        const totalVolume = sortedData.reduce((sum: number, d: any) => sum + (d.volume || 0), 0);
        const change = (last.close || 0) - (first.open || 0);
        const changePercent = first.open ? (change / first.open) * 100 : 0;

        const statsData = {
          open: first.open || 0,
          high,
          low,
          close: last.close || 0,
          volume: totalVolume,
          change,
          changePercent,
        };

        console.log('[IntradayChart] Calculated stats:', statsData);
        setStats(statsData);
      } else {
        console.warn('[IntradayChart] No data points to display');
      }
    } catch (err: any) {
      console.error('[IntradayChart] Failed to fetch intraday data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (!price) return '$0.00';
    return `$${price.toFixed(2)}`;
  };

  const formatVolume = (vol: number) => {
    if (!vol) return '0';
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
    return vol.toLocaleString();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Intraday Chart</h3>
        <div className="animate-pulse">
          <div className="h-64 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Intraday Chart</h3>
        <p className="text-sm text-red-400">Failed to load intraday data: {error}</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Intraday Chart</h3>
        <p className="text-sm text-slate-400">No intraday data available</p>
      </div>
    );
  }

  // Calculate chart dimensions
  const maxPrice = Math.max(...chartData.map((d: any) => d.high || 0));
  const minPrice = Math.min(...chartData.map((d: any) => d.low || Infinity));
  const priceRange = maxPrice - minPrice;
  const maxVolume = Math.max(...chartData.map((d: any) => d.volume || 0));

  const getPriceY = (price: number) => {
    if (priceRange === 0) return 50;
    return ((maxPrice - price) / priceRange) * 100;
  };

  const getVolumeHeight = (volume: number) => {
    if (maxVolume === 0) return 0;
    return (volume / maxVolume) * 100;
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      {/* Header with interval selector */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Intraday Chart</h3>
        <div className="flex gap-2">
          {(['1m', '5m', '15m', '1h'] as const).map((int) => (
            <button
              key={int}
              onClick={() => setInterval(int)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                interval === int
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {int}
            </button>
          ))}
        </div>
      </div>

      {/* Price Statistics */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-slate-700 rounded px-3 py-2">
            <div className="text-xs text-slate-400">Open</div>
            <div className="text-sm font-semibold text-white">{formatPrice(stats.open)}</div>
          </div>
          <div className="bg-slate-700 rounded px-3 py-2">
            <div className="text-xs text-slate-400">High</div>
            <div className="text-sm font-semibold text-green-400">{formatPrice(stats.high)}</div>
          </div>
          <div className="bg-slate-700 rounded px-3 py-2">
            <div className="text-xs text-slate-400">Low</div>
            <div className="text-sm font-semibold text-red-400">{formatPrice(stats.low)}</div>
          </div>
          <div className="bg-slate-700 rounded px-3 py-2">
            <div className="text-xs text-slate-400">Close</div>
            <div className={`text-sm font-semibold ${stats.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatPrice(stats.close)}
            </div>
          </div>
        </div>
      )}

      {/* Change Indicator */}
      {stats && (
        <div className="mb-4 flex items-center gap-2">
          <span className={`text-lg font-bold ${stats.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.change >= 0 ? '+' : ''}{formatPrice(Math.abs(stats.change))}
          </span>
          <span className={`text-sm ${stats.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ({stats.changePercent >= 0 ? '+' : ''}{stats.changePercent.toFixed(2)}%)
          </span>
          <span className="text-xs text-slate-400 ml-auto">
            Volume: {formatVolume(stats.volume)}
          </span>
        </div>
      )}

      {/* Candlestick Chart */}
      <div className="mb-4">
        <div className="relative h-64 bg-slate-900 rounded p-2">
          {/* Price axis labels */}
          <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-slate-400 pr-1">
            <span>{formatPrice(maxPrice)}</span>
            <span>{formatPrice((maxPrice + minPrice) / 2)}</span>
            <span>{formatPrice(minPrice)}</span>
          </div>

          {/* Chart area */}
          <div className="ml-12 h-full relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="border-b border-slate-700/30"></div>
              ))}
            </div>

            {/* Candlesticks */}
            <div className="absolute inset-0 flex items-stretch gap-px">
              {chartData.map((candle: any, idx: number) => {
                const open = candle.open || 0;
                const close = candle.close || 0;
                const high = candle.high || 0;
                const low = candle.low || 0;
                const isGreen = close >= open;

                const highY = getPriceY(high);
                const lowY = getPriceY(low);
                const openY = getPriceY(open);
                const closeY = getPriceY(close);

                const bodyTop = Math.min(openY, closeY);
                const bodyHeight = Math.abs(closeY - openY) || 1;

                return (
                  <div
                    key={idx}
                    className="flex-1 relative group"
                    title={`${formatTime(candle.datetime || candle.timestamp)}\nO: ${formatPrice(open)} H: ${formatPrice(high)}\nL: ${formatPrice(low)} C: ${formatPrice(close)}`}
                  >
                    {/* Wick (high-low line) */}
                    <div
                      className={`absolute left-1/2 transform -translate-x-1/2 w-px ${isGreen ? 'bg-green-400' : 'bg-red-400'}`}
                      style={{
                        top: `${highY}%`,
                        height: `${lowY - highY}%`,
                      }}
                    ></div>

                    {/* Body (open-close rectangle) */}
                    <div
                      className={`absolute left-0 right-0 ${isGreen ? 'bg-green-400' : 'bg-red-400'} opacity-80 hover:opacity-100 transition-opacity`}
                      style={{
                        top: `${bodyTop}%`,
                        height: `${bodyHeight}%`,
                      }}
                    ></div>

                    {/* Tooltip on hover */}
                    <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 rounded text-xs whitespace-nowrap z-10 border border-slate-700">
                      <div className="text-slate-300">{formatTime(candle.datetime || candle.timestamp)}</div>
                      <div className="text-white">O: {formatPrice(open)}</div>
                      <div className="text-green-400">H: {formatPrice(high)}</div>
                      <div className="text-red-400">L: {formatPrice(low)}</div>
                      <div className="text-white">C: {formatPrice(close)}</div>
                      <div className="text-slate-400">Vol: {formatVolume(candle.volume)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Time axis */}
        <div className="ml-12 flex justify-between mt-2 text-xs text-slate-400">
          <span>{chartData[0] ? formatTime(chartData[0].datetime || chartData[0].timestamp) : ''}</span>
          <span>{chartData[Math.floor(chartData.length / 2)] ? formatTime(chartData[Math.floor(chartData.length / 2)].datetime || chartData[Math.floor(chartData.length / 2)].timestamp) : ''}</span>
          <span>{chartData[chartData.length - 1] ? formatTime(chartData[chartData.length - 1].datetime || chartData[chartData.length - 1].timestamp) : ''}</span>
        </div>
      </div>

      {/* Volume Chart */}
      <div>
        <div className="text-xs text-slate-400 mb-2">Volume</div>
        <div className="relative h-16 bg-slate-900 rounded p-2">
          <div className="ml-12 h-full flex items-end gap-px">
            {chartData.map((candle: any, idx: number) => {
              const volume = candle.volume || 0;
              const height = getVolumeHeight(volume);
              const isGreen = (candle.close || 0) >= (candle.open || 0);

              return (
                <div
                  key={idx}
                  className={`flex-1 ${isGreen ? 'bg-green-400/50' : 'bg-red-400/50'} hover:opacity-100 transition-opacity`}
                  style={{ height: `${height}%` }}
                  title={`Volume: ${formatVolume(volume)}`}
                ></div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
