import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';

interface TradingViewChartProps {
  ticker: string;
  interval?: string;
}

interface OHLCVData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export default function TradingViewChart({ ticker, interval = '1d' }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | '5Y' | 'MAX'>('1Y');

  // Resizing state
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  // Initialize chart once on mount
  useEffect(() => {
    if (!containerRef.current) return;
    if (chartRef.current) return; // Already initialized

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1f2937' },
        textColor: '#e5e7eb',
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' },
      },
      width: dimensions.width,
      height: dimensions.height,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#374151',
      },
      rightPriceScale: {
        borderColor: '#374151',
      },
    });

    chartRef.current = chart;

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Create volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#6366f1',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });
    volumeSeriesRef.current = volumeSeries;

    // Set volume scale margins
    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  // Update chart size when dimensions change
  useEffect(() => {
    if (!chartRef.current) return;

    chartRef.current.applyOptions({
      width: dimensions.width,
      height: dimensions.height,
    });
  }, [dimensions.width, dimensions.height]);

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent, direction: 'corner' | 'bottom' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = dimensions.width;
    const startHeight = dimensions.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;

      if (direction === 'corner' || direction === 'right') {
        newWidth = Math.max(400, Math.min(1200, startWidth + deltaX));
      }
      if (direction === 'corner' || direction === 'bottom') {
        newHeight = Math.max(300, Math.min(800, startHeight + deltaY));
      }

      setDimensions({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Fetch data when ticker or timeframe changes
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || !chartRef.current) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        // Calculate date range based on timeframe
        const today = new Date();
        const toDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
        let fromDate: string;

        switch (timeframe) {
          case '1M':
            const oneMonthAgo = new Date(today);
            oneMonthAgo.setMonth(today.getMonth() - 1);
            fromDate = oneMonthAgo.toISOString().split('T')[0];
            break;
          case '3M':
            const threeMonthsAgo = new Date(today);
            threeMonthsAgo.setMonth(today.getMonth() - 3);
            fromDate = threeMonthsAgo.toISOString().split('T')[0];
            break;
          case '6M':
            const sixMonthsAgo = new Date(today);
            sixMonthsAgo.setMonth(today.getMonth() - 6);
            fromDate = sixMonthsAgo.toISOString().split('T')[0];
            break;
          case '1Y':
            const oneYearAgo = new Date(today);
            oneYearAgo.setFullYear(today.getFullYear() - 1);
            fromDate = oneYearAgo.toISOString().split('T')[0];
            break;
          case '5Y':
            const fiveYearsAgo = new Date(today);
            fiveYearsAgo.setFullYear(today.getFullYear() - 5);
            fromDate = fiveYearsAgo.toISOString().split('T')[0];
            break;
          case 'MAX':
            // Get all available data (database has 30+ years)
            fromDate = '1990-01-01'; // Far enough back to get all data
            break;
          default:
            fromDate = new Date(today.setFullYear(today.getFullYear() - 1)).toISOString().split('T')[0];
        }

        // Fetch EOD data from database-first endpoint
        const response = await fetch(
          `${apiUrl}/historical/eod-extended?ticker=${ticker}&period=d&from_date=${fromDate}&to_date=${toDate}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch ${ticker} data`);
        }

        const data: OHLCVData[] = await response.json();

        if (!data || data.length === 0) {
          setError(`No historical data available for ${ticker}. This symbol may not be supported.`);
          setLoading(false);
          return;
        }

        // Transform data for TradingView format
        // For EOD data, use date strings in YYYY-MM-DD format (lightweight-charts handles this)
        const candleData = data.map((d) => ({
          time: d.date, // Use date string directly for EOD data
          open: parseFloat(String(d.open)),
          high: parseFloat(String(d.high)),
          low: parseFloat(String(d.low)),
          close: parseFloat(String(d.close)),
        }));

        const volumeData = data.map((d) => ({
          time: d.date, // Use date string directly for EOD data
          value: parseFloat(String(d.volume)),
          color: d.close >= d.open ? '#10b98180' : '#ef444480',
        }));

        // Set data
        candlestickSeriesRef.current.setData(candleData);
        volumeSeriesRef.current.setData(volumeData);

        // Fit content to show all data
        chartRef.current.timeScale().fitContent();

        setLoading(false);
      } catch (err: any) {
        console.error('Failed to render chart:', err);
        setError(err.message || 'Failed to load chart');
        setLoading(false);
      }
    };

    fetchData();
  }, [ticker, timeframe]);

  return (
    <div className="space-y-3">
      {/* Timeframe Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setTimeframe('1M')}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            timeframe === '1M'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          1M
        </button>
        <button
          onClick={() => setTimeframe('3M')}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            timeframe === '3M'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          3M
        </button>
        <button
          onClick={() => setTimeframe('6M')}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            timeframe === '6M'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          6M
        </button>
        <button
          onClick={() => setTimeframe('1Y')}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            timeframe === '1Y'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          1Y
        </button>
        <button
          onClick={() => setTimeframe('5Y')}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            timeframe === '5Y'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          5Y
        </button>
        <button
          onClick={() => setTimeframe('MAX')}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            timeframe === 'MAX'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          MAX
        </button>
        <div className="ml-auto text-xs text-gray-400 flex items-center">
          {dimensions.width} × {dimensions.height}px
        </div>
      </div>

      {/* Resizable Chart Container */}
      <div
        className="relative border border-gray-700 rounded-lg bg-gray-800"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          userSelect: isResizing ? 'none' : 'auto',
        }}
      >
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 z-20 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 z-20 rounded-lg">
            <p className="text-red-400 text-sm px-4 text-center">{error}</p>
          </div>
        )}

        {/* Chart Container - lightweight-charts will create its own sized canvas here */}
        <div
          ref={containerRef}
          className="rounded-lg"
          style={{
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            position: 'relative'
          }}
        />

        {/* Resize Handles */}
        {/* Bottom Edge */}
        <div
          className={`absolute bottom-0 left-0 right-8 h-2 cursor-ns-resize hover:bg-indigo-500/30 transition-colors z-30 ${
            isResizing ? 'bg-indigo-500/50' : ''
          }`}
          onMouseDown={(e) => handleResizeStart(e, 'bottom')}
          style={{ pointerEvents: 'auto' }}
        >
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-1 bg-gray-600 rounded-full" />
        </div>

        {/* Right Edge */}
        <div
          className={`absolute top-0 right-0 bottom-8 w-2 cursor-ew-resize hover:bg-indigo-500/30 transition-colors z-30 ${
            isResizing ? 'bg-indigo-500/50' : ''
          }`}
          onMouseDown={(e) => handleResizeStart(e, 'right')}
          style={{ pointerEvents: 'auto' }}
        >
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-gray-600 rounded-full" />
        </div>

        {/* Corner Handle */}
        <div
          className={`absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize hover:bg-indigo-500/40 transition-colors z-30 ${
            isResizing ? 'bg-indigo-500/60' : ''
          } flex items-center justify-center group`}
          onMouseDown={(e) => handleResizeStart(e, 'corner')}
          style={{ pointerEvents: 'auto' }}
        >
          <svg
            className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 transition-colors"
            fill="currentColor"
            viewBox="0 0 16 16"
          >
            <path d="M14 14V6l-1 1v6H7l-1 1h8z" />
            <path d="M10 10V2l-1 1v6H3l-1 1h8z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
