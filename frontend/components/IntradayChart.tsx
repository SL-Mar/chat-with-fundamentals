// components/IntradayChart.tsx - Intraday price chart with zoom/pan support
'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { api } from '../lib/api';
import {
  createChart,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  LogicalRange,
} from 'lightweight-charts';

interface IntradayChartProps {
  ticker: string;
  defaultInterval?: '1m' | '5m' | '15m' | '30m' | '1h';
  theme?: 'light' | 'dark';
}

export default function IntradayChart({
  ticker,
  defaultInterval = '5m',
  theme = 'dark',
}: IntradayChartProps) {
  const [interval, setInterval] = useState<'1m' | '5m' | '15m' | '30m' | '1h'>(defaultInterval);
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

  const priceRef = useRef<HTMLDivElement | null>(null);
  const volumeRef = useRef<HTMLDivElement | null>(null);

  const priceChart = useRef<IChartApi | null>(null);
  const volumeChart = useRef<IChartApi | null>(null);

  const candleSeries = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeries = useRef<ISeriesApi<'Histogram'> | null>(null);

  const isDark = theme === 'dark';
  const background = isDark ? '#0f172a' : '#ffffff';
  const textColor = isDark ? '#cbd5e1' : '#111111';
  const gridColor = isDark ? '#1e293b' : '#e0e0e0';
  const borderColor = isDark ? '#475569' : '#999999';

  useEffect(() => {
    if (!ticker) return;
    fetchIntradayData();
  }, [ticker, interval]);

  const fetchIntradayData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[IntradayChart] Fetching intraday data for', ticker, 'interval:', interval);

      // Fetch intraday data for selected interval (~3000 candles)
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

  // Initialize charts with lightweight-charts
  useLayoutEffect(() => {
    if (!priceRef.current || !volumeRef.current) {
      console.log('[IntradayChart] Refs not ready:', { priceRef: !!priceRef.current, volumeRef: !!volumeRef.current });
      return;
    }

    // Wait for container to have non-zero width
    const priceWidth = priceRef.current.clientWidth;
    const volumeWidth = volumeRef.current.clientWidth;

    if (priceWidth === 0 || volumeWidth === 0) {
      console.log('[IntradayChart] Container width is 0, waiting...', { priceWidth, volumeWidth });
      return;
    }

    console.log('[IntradayChart] Initializing charts with width:', priceWidth);

    const price = createChart(priceRef.current, {
      width: priceWidth,
      height: 320,
      layout: { background: { color: background }, textColor },
      crosshair: { mode: CrosshairMode.Normal },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      timeScale: { borderColor, timeVisible: true },
      rightPriceScale: { borderColor, scaleMargins: { top: 0.1, bottom: 0.3 } },
    });

    const volume = createChart(volumeRef.current, {
      width: volumeWidth,
      height: 120,
      layout: { background: { color: background }, textColor },
      crosshair: { mode: CrosshairMode.Normal },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      timeScale: { borderColor, timeVisible: true },
      rightPriceScale: { borderColor, scaleMargins: { top: 0.6, bottom: 0 } },
    });

    priceChart.current = price;
    volumeChart.current = volume;

    candleSeries.current = price.addCandlestickSeries({
      upColor: '#4ade80',
      downColor: '#f87171',
      wickUpColor: '#4ade80',
      wickDownColor: '#f87171',
      borderVisible: false,
    });

    volumeSeries.current = volume.addHistogramSeries({
      priceFormat: { type: 'volume' },
      color: '#8884d8',
    });

    requestAnimationFrame(() => {
      price.resize(priceRef.current!.clientWidth, 320);
      volume.resize(volumeRef.current!.clientWidth, 120);
    });

    return () => {
      price.remove();
      volume.remove();
    };
  }, [theme, chartData.length]);

  // Update chart data and set initial viewport (last ~50 candles)
  useEffect(() => {
    if (!priceChart.current || !volumeChart.current || !candleSeries.current || !volumeSeries.current) {
      console.log('[IntradayChart] Chart refs not ready for data update');
      return;
    }
    if (chartData.length === 0) {
      console.log('[IntradayChart] No chart data to display');
      return;
    }

    console.log('[IntradayChart] Preparing chart data from', chartData.length, 'records');

    const candleData = chartData.map((d, i) => {
      const timestamp = d.datetime || d.timestamp;
      const time = Math.floor(new Date(timestamp).getTime() / 1000) as UTCTimestamp;

      if (i === 0 || i === chartData.length - 1) {
        console.log(`[IntradayChart] Candle ${i}: timestamp=${timestamp}, time=${time}, OHLC=${d.open}/${d.high}/${d.low}/${d.close}`);
      }

      return {
        time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      };
    });

    const volumeData = chartData.map((d) => ({
      time: Math.floor(new Date(d.datetime || d.timestamp).getTime() / 1000) as UTCTimestamp,
      value: d.volume / 1_000_000,
      color: d.close >= d.open ? '#4ade80' : '#f87171',
    }));

    console.log('[IntradayChart] Setting candle data:', candleData.length, 'candles');
    candleSeries.current.setData(candleData);
    volumeSeries.current.setData(volumeData);

    const priceTime = priceChart.current.timeScale();
    const volumeTime = volumeChart.current.timeScale();

    // Synchronize zoom/pan between price and volume charts
    priceTime.subscribeVisibleLogicalRangeChange((range: LogicalRange | null) => {
      if (range) volumeTime.setVisibleLogicalRange(range);
    });

    // Set initial viewport to show last ~50 candles (about 5 days of 1h data)
    // This allows users to see recent data while having full history available for panning
    if (candleData.length > 50) {
      const lastIndex = candleData.length - 1;
      const firstVisibleIndex = Math.max(0, lastIndex - 50);

      const initialRange: LogicalRange = {
        from: firstVisibleIndex,
        to: lastIndex,
      };

      priceTime.setVisibleLogicalRange(initialRange);
      volumeTime.setVisibleLogicalRange(initialRange);

      console.log(`[IntradayChart] Set initial viewport to show last 50 of ${candleData.length} candles`);
    } else {
      // If less than 50 candles, show all
      priceTime.fitContent();
      volumeTime.fitContent();
    }
  }, [chartData]);

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

  if (loading) {
    return (
      <div className="w-full max-w-[1400px] mx-auto border border-slate-700 rounded-xl overflow-hidden p-4">
        <h3 className="text-lg font-semibold mb-4">Intraday Chart</h3>
        <div className="animate-pulse">
          <div className="h-64 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-[1400px] mx-auto border border-slate-700 rounded-xl overflow-hidden p-4">
        <h3 className="text-lg font-semibold mb-4">Intraday Chart</h3>
        <p className="text-sm text-red-400">Failed to load intraday data: {error}</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="w-full max-w-[1400px] mx-auto border border-slate-700 rounded-xl overflow-hidden p-4">
        <h3 className="text-lg font-semibold mb-4">Intraday Chart</h3>
        <p className="text-sm text-slate-400">No intraday data available</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto border border-slate-700 rounded-xl overflow-hidden p-4">
      {/* Header with interval selector */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-slate-200">{ticker} - Intraday ({interval})</h3>
        <div className="flex gap-2">
          {(['1m', '5m', '15m', '30m', '1h'] as const).map((int) => (
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
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div>
            <span className="text-slate-400">O:</span>{' '}
            <span className="text-white">{formatPrice(stats.open)}</span>
          </div>
          <div>
            <span className="text-slate-400">H:</span>{' '}
            <span className="text-green-400">{formatPrice(stats.high)}</span>
          </div>
          <div>
            <span className="text-slate-400">L:</span>{' '}
            <span className="text-red-400">{formatPrice(stats.low)}</span>
          </div>
          <div>
            <span className="text-slate-400">C:</span>{' '}
            <span className={stats.change >= 0 ? 'text-green-400' : 'text-red-400'}>
              {formatPrice(stats.close)}
            </span>
          </div>
          <div>
            <span className={`font-semibold ${stats.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.change >= 0 ? '+' : ''}
              {formatPrice(Math.abs(stats.change))} ({stats.changePercent >= 0 ? '+' : ''}
              {stats.changePercent.toFixed(2)}%)
            </span>
          </div>
          <div className="ml-auto">
            <span className="text-slate-400">Vol:</span>{' '}
            <span className="text-white">{formatVolume(stats.volume)}</span>
          </div>
          <div className="text-xs text-slate-500">
            {chartData.length} candles
          </div>
        </div>
      )}

      <div ref={priceRef} style={{ width: '100%', height: 320 }} />
      <div ref={volumeRef} style={{ width: '100%', height: 120 }} />

      <div className="mt-2 text-xs text-slate-500 text-center">
        💡 Use mouse wheel to zoom, drag to pan through {chartData.length} candles
      </div>
    </div>
  );
}
