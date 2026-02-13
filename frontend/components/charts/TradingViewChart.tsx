import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import * as api from '../../lib/api';

interface TradingViewChartProps {
  universeId: string;
  ticker: string;
}

export default function TradingViewChart({ universeId, ticker }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | 'MAX'>('1Y');
  const [dataInfo, setDataInfo] = useState<{ count: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1f2937' },
        textColor: '#e5e7eb',
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' },
      },
      width: containerRef.current.clientWidth,
      height: 400,
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#374151' },
      rightPriceScale: { borderColor: '#374151' },
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981', downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981', wickDownColor: '#ef4444',
    });
    volumeSeriesRef.current = chart.addSeries(HistogramSeries, {
      color: '#6366f1', priceFormat: { type: 'volume' }, priceScaleId: '',
    });
    chart.priceScale('').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) chart.resize(e.contentRect.width, 400);
    });
    ro.observe(containerRef.current);

    return () => { chart.remove(); chartRef.current = null; ro.disconnect(); };
  }, []);

  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || !chartRef.current) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const today = new Date();
        let from = new Date(today);
        if (timeframe === '1M') from.setMonth(today.getMonth() - 1);
        else if (timeframe === '3M') from.setMonth(today.getMonth() - 3);
        else if (timeframe === '6M') from.setMonth(today.getMonth() - 6);
        else if (timeframe === '1Y') from.setFullYear(today.getFullYear() - 1);
        else from = new Date('1990-01-01');

        const data = await api.getOHLCV(
          universeId, ticker, 'd',
          from.toISOString().split('T')[0],
          today.toISOString().split('T')[0],
          5000,
        );

        if (!data?.length) {
          setError(`No data for ${ticker}`);
          setLoading(false);
          return;
        }

        const candles = data.map((d) => ({
          time: d.timestamp.split('T')[0],
          open: d.open, high: d.high, low: d.low, close: d.close,
        }));
        const volumes = data.map((d) => ({
          time: d.timestamp.split('T')[0],
          value: d.volume,
          color: d.close >= d.open ? '#10b98180' : '#ef444480',
        }));

        candlestickSeriesRef.current!.setData(candles);
        volumeSeriesRef.current!.setData(volumes);
        chartRef.current!.timeScale().fitContent();
        setDataInfo({ count: candles.length });
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [universeId, ticker, timeframe]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        {(['1M', '3M', '6M', '1Y', 'MAX'] as const).map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              timeframe === tf ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {tf}
          </button>
        ))}
        {dataInfo && (
          <span className="ml-auto text-xs text-indigo-400">
            {dataInfo.count.toLocaleString()} candles
          </span>
        )}
      </div>

      <div className="relative border border-gray-700 rounded-lg bg-gray-800">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 z-20 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 z-20 rounded-lg">
            <p className="text-red-400 text-sm px-4 text-center">{error}</p>
          </div>
        )}
        <div ref={containerRef} className="rounded-lg" style={{ width: '100%', height: '400px' }} />
      </div>
    </div>
  );
}
