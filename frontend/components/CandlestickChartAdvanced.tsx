// components/CandlestickChartAdvanced.tsx
'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  createChart,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  LineStyle,
  UTCTimestamp,
  LogicalRange,
} from 'lightweight-charts';

interface ChartData {
  datetime?: string;
  timestamp?: string;
  date?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartAdvancedProps {
  data: ChartData[];
  ticker: string;
  interval?: string;
  height?: number;
}

const BB_PERIOD = 20;
const BB_MULTIPLIER = 2;
const RSI_PERIOD = 14;

export default function CandlestickChartAdvanced({
  data,
  ticker,
  interval = '5m',
  height = 500,
}: CandlestickChartAdvancedProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const rsiChartRef = useRef<HTMLDivElement | null>(null);
  const chartApi = useRef<IChartApi | null>(null);
  const rsiChartApi = useRef<IChartApi | null>(null);

  const candleSeries = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeries = useRef<ISeriesApi<'Histogram'> | null>(null);
  const sma20 = useRef<ISeriesApi<'Line'> | null>(null);
  const sma50 = useRef<ISeriesApi<'Line'> | null>(null);
  const sma200 = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpper = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLower = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiSeries = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiOverbought = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiOversold = useRef<ISeriesApi<'Line'> | null>(null);

  const [lastReturn, setLastReturn] = useState<number | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<any>(null);
  const [showRSI, setShowRSI] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [showSMA, setShowSMA] = useState(true);
  const [showBB, setShowBB] = useState(true);

  // Initialize charts
  useLayoutEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height,
      layout: { background: { color: '#0d1117' }, textColor: '#cbd5e1' },
      crosshair: { mode: CrosshairMode.Normal },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      timeScale: { borderColor: '#475569', timeVisible: true },
      rightPriceScale: {
        borderColor: '#475569',
        scaleMargins: { top: 0.1, bottom: 0.3 },
      },
    });

    chartApi.current = chart;

    candleSeries.current = chart.addCandlestickSeries({
      upColor: '#4ade80',
      downColor: '#f87171',
      wickUpColor: '#4ade80',
      wickDownColor: '#f87171',
      borderVisible: false,
    });

    volumeSeries.current = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      color: '#8884d8',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
      borderVisible: false,
    });

    sma20.current = chart.addLineSeries({ color: '#f43f5e', lineWidth: 2 });
    sma50.current = chart.addLineSeries({ color: '#f97316', lineWidth: 2 });
    sma200.current = chart.addLineSeries({ color: '#facc15', lineWidth: 2 });

    bbUpper.current = chart.addLineSeries({
      color: '#60a5fa',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
    });
    bbLower.current = chart.addLineSeries({
      color: '#60a5fa',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
    });

    // Create RSI chart
    if (rsiChartRef.current) {
      const rsiChart = createChart(rsiChartRef.current, {
        width: rsiChartRef.current.clientWidth,
        height: 120,
        layout: { background: { color: '#0d1117' }, textColor: '#cbd5e1' },
        crosshair: { mode: CrosshairMode.Normal },
        grid: {
          vertLines: { color: '#1e293b' },
          horzLines: { color: '#1e293b' },
        },
        timeScale: { borderColor: '#475569', timeVisible: true },
        rightPriceScale: {
          borderColor: '#475569',
        },
      });

      rsiChartApi.current = rsiChart;

      rsiSeries.current = rsiChart.addLineSeries({
        color: '#a855f7',
        lineWidth: 2,
      });

      rsiOverbought.current = rsiChart.addLineSeries({
        color: '#ef4444',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
      });

      rsiOversold.current = rsiChart.addLineSeries({
        color: '#22c55e',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
      });
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.resize(entry.contentRect.width, height);
        if (rsiChartApi.current && rsiChartRef.current) {
          rsiChartApi.current.resize(entry.contentRect.width, 120);
        }
      }
    });
    if (wrapperRef.current) resizeObserver.observe(wrapperRef.current);

    return () => {
      chart.remove();
      if (rsiChartApi.current) {
        rsiChartApi.current.remove();
      }
      resizeObserver.disconnect();
    };
  }, [height]);

  // Update chart data
  useEffect(() => {
    if (!candleSeries.current || !volumeSeries.current || !chartApi.current) return;
    if (!data?.length) return;

    const parsedData = data
      .map((d) => {
        const dateStr = d.datetime || d.timestamp || d.date;
        const ts = Date.parse(dateStr);
        return isNaN(ts)
          ? null
          : {
              time: Math.floor(ts / 1000) as UTCTimestamp,
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close,
              volume: d.volume / 1_000_000,
            };
      })
      .filter(Boolean)
      .sort((a, b) => a.time - b.time);

    if (!parsedData.length) return;

    candleSeries.current.setData(
      parsedData.map(({ time, open, high, low, close }) => ({ time, open, high, low, close }))
    );

    if (showVolume) {
      volumeSeries.current.setData(
        parsedData.map(({ time, volume, open, close }) => ({
          time,
          value: volume,
          color: close >= open ? '#4ade80' : '#f87171',
        }))
      );
    } else {
      volumeSeries.current.setData([]);
    }

    if (showSMA) {
      sma20.current?.setData(calculateSMA(parsedData, BB_PERIOD));
      sma50.current?.setData(calculateSMA(parsedData, 50));
      sma200.current?.setData(calculateSMA(parsedData, 200));
    } else {
      sma20.current?.setData([]);
      sma50.current?.setData([]);
      sma200.current?.setData([]);
    }

    if (showBB) {
      const bb = calculateBollingerBands(parsedData, BB_PERIOD, BB_MULTIPLIER);
      bbUpper.current?.setData(bb.upper);
      bbLower.current?.setData(bb.lower);
    } else {
      bbUpper.current?.setData([]);
      bbLower.current?.setData([]);
    }

    // Calculate and display RSI
    if (showRSI && rsiSeries.current && rsiOverbought.current && rsiOversold.current) {
      const rsiData = calculateRSI(parsedData, RSI_PERIOD);
      rsiSeries.current.setData(rsiData);

      if (rsiData.length > 0) {
        const overboughtLine = rsiData.map((d) => ({ time: d.time, value: 70 }));
        const oversoldLine = rsiData.map((d) => ({ time: d.time, value: 30 }));
        rsiOverbought.current.setData(overboughtLine);
        rsiOversold.current.setData(oversoldLine);
      }
    }

    if (parsedData.length >= 2) {
      const prev = parsedData[parsedData.length - 2].close;
      const last = parsedData[parsedData.length - 1].close;
      setLastReturn(((last - prev) / prev) * 100);
    }

    const handler = (param: any) => {
      if (!param?.time || !param.seriesData) {
        setHoveredCandle(null);
        return;
      }
      const candle = param.seriesData.get(candleSeries.current!);
      const volumeBar = param.seriesData.get(volumeSeries.current!);
      if (!candle || !volumeBar) {
        setHoveredCandle(null);
        return;
      }
      setHoveredCandle({
        time: param.time as UTCTimestamp,
        ...(candle as any),
        volume: (volumeBar as any).value,
      });
    };

    chartApi.current.subscribeCrosshairMove(handler);

    // Sync crosshair between main and RSI charts
    if (rsiChartApi.current) {
      const syncCrosshair = (fromChart: IChartApi, toChart: IChartApi) => {
        return (param: any) => {
          if (param?.time) {
            toChart.setCrosshairPosition(param.point?.y ?? 0, param.time, toChart.timeScale());
          } else {
            toChart.clearCrosshairPosition();
          }
        };
      };

      const mainToRsi = syncCrosshair(chartApi.current, rsiChartApi.current);
      const rsiToMain = syncCrosshair(rsiChartApi.current, chartApi.current);

      chartApi.current.subscribeCrosshairMove(mainToRsi);
      rsiChartApi.current.subscribeCrosshairMove(rsiToMain);

      // Set initial viewport to show last ~50 candles
      if (parsedData.length > 50) {
        const priceTime = chartApi.current.timeScale();
        const rsiTime = rsiChartApi.current.timeScale();
        const lastIndex = parsedData.length - 1;
        const firstVisibleIndex = Math.max(0, lastIndex - 50);

        const initialRange: LogicalRange = {
          from: firstVisibleIndex,
          to: lastIndex,
        };

        priceTime.setVisibleLogicalRange(initialRange);
        rsiTime.setVisibleLogicalRange(initialRange);
      }

      return () => {
        chartApi.current?.unsubscribeCrosshairMove(handler);
        chartApi.current?.unsubscribeCrosshairMove(mainToRsi);
        rsiChartApi.current?.unsubscribeCrosshairMove(rsiToMain);
      };
    }

    return () => chartApi.current?.unsubscribeCrosshairMove(handler);
  }, [data, showSMA, showBB, showRSI, showVolume]);

  return (
    <div
      ref={wrapperRef}
      className="rounded-xl border border-slate-700 bg-slate-900 p-4 mx-auto w-full max-w-[1400px]"
    >
      <div className="flex justify-between items-center mb-3">
        <div className="text-lg font-semibold text-slate-200">{ticker}</div>
        {lastReturn !== null && (
          <div className={`text-sm font-medium ${lastReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {lastReturn >= 0 ? '+' : ''}
            {lastReturn.toFixed(2)}%
          </div>
        )}
      </div>

      {/* Period and Indicator Toggles */}
      <div className="flex gap-3 mb-3 text-sm items-center flex-wrap">
        <button
          className="px-3 py-1 rounded border border-slate-700 bg-slate-800 text-white cursor-default"
          disabled
        >
          {interval}
        </button>
        <div className="h-4 border-l border-slate-700"></div>
        <button
          onClick={() => setShowSMA(!showSMA)}
          className={`px-2 py-1 rounded text-xs transition-colors ${
            showSMA
              ? 'bg-blue-600/20 text-blue-400 border border-blue-600/50'
              : 'border border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          SMA
        </button>
        <button
          onClick={() => setShowBB(!showBB)}
          className={`px-2 py-1 rounded text-xs transition-colors ${
            showBB
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
              : 'border border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          Bollinger Bands
        </button>
        <button
          onClick={() => setShowVolume(!showVolume)}
          className={`px-2 py-1 rounded text-xs transition-colors ${
            showVolume
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/50'
              : 'border border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          Volume
        </button>
        <button
          onClick={() => setShowRSI(!showRSI)}
          className={`px-2 py-1 rounded text-xs transition-colors ${
            showRSI
              ? 'bg-purple-600/20 text-purple-400 border border-purple-600/50'
              : 'border border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          RSI
        </button>
      </div>

      {/* Legend */}
      {showSMA && (
        <div className="flex gap-3 text-xs text-slate-300 mb-1">
          <span className="text-rose-400">● SMA 20</span>
          <span className="text-orange-400">● SMA 50</span>
          <span className="text-yellow-300">● SMA 200</span>
        </div>
      )}
      {showBB && (
        <div className="flex gap-3 text-xs text-slate-300 mb-1">
          <span className="text-blue-400">- - Bollinger Bands (±2σ)</span>
        </div>
      )}

      {/* OHLCV Data Display */}
      {hoveredCandle && (
        <div className="text-xs text-slate-300 mb-2 font-mono whitespace-nowrap">
          {new Date(hoveredCandle.time * 1000).toLocaleDateString()} |
          <span className="text-slate-200"> O: {hoveredCandle.open.toFixed(2)}</span> |
          <span className="text-green-400"> H: {hoveredCandle.high.toFixed(2)}</span> |
          <span className="text-red-400"> L: {hoveredCandle.low.toFixed(2)}</span> |
          <span className="text-slate-200"> C: {hoveredCandle.close.toFixed(2)}</span> |
          <span className="text-slate-400">
            {' '}
            Vol: {Number.isFinite(hoveredCandle.volume) ? `${hoveredCandle.volume.toFixed(2)}M` : '—'}
          </span>
        </div>
      )}

      {/* Main Price Chart */}
      <div ref={chartRef} style={{ width: '100%', height: `${height}px` }} className="overflow-visible mb-2" />

      {/* RSI Indicator Chart */}
      {showRSI && (
        <div className="mt-3">
          <div className="text-xs text-purple-400 mb-1 font-semibold">RSI (14)</div>
          <div ref={rsiChartRef} style={{ width: '100%', height: '120px' }} className="overflow-visible" />
        </div>
      )}

      <div className="mt-2 text-xs text-slate-500 text-center">
        💡 Use mouse wheel to zoom, drag to pan | {data.length} candles loaded
      </div>
    </div>
  );
}

function calculateSMA(data: { time: UTCTimestamp; close: number }[], period: number) {
  const result: { time: UTCTimestamp; value: number }[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const avg = data.slice(i - period + 1, i + 1).reduce((sum, d) => sum + d.close, 0) / period;
    result.push({ time: data[i].time, value: avg });
  }
  return result;
}

function calculateBollingerBands(
  data: { time: UTCTimestamp; close: number }[],
  period: number,
  multiplier: number
) {
  const upper: { time: UTCTimestamp; value: number }[] = [];
  const lower: { time: UTCTimestamp; value: number }[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((sum, d) => sum + d.close, 0) / period;
    const stdDev = Math.sqrt(slice.reduce((sum, d) => sum + (d.close - mean) ** 2, 0) / period);
    upper.push({ time: data[i].time, value: mean + multiplier * stdDev });
    lower.push({ time: data[i].time, value: mean - multiplier * stdDev });
  }
  return { upper, lower };
}

function calculateRSI(data: { time: UTCTimestamp; close: number }[], period: number) {
  const result: { time: UTCTimestamp; value: number }[] = [];

  if (data.length < period + 1) return result;

  const changes: number[] = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].close - data[i - 1].close);
  }

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  let rs = avgGain / (avgLoss || 1);
  let rsi = 100 - 100 / (1 + rs);
  result.push({ time: data[period].time, value: rsi });

  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgGain / (avgLoss || 1);
    rsi = 100 - 100 / (1 + rs);
    result.push({ time: data[i + 1].time, value: rsi });
  }

  return result;
}
