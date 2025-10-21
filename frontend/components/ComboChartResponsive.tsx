// ComboChartResponsive.tsx

"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  createChart,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  LineStyle,
  UTCTimestamp,
} from "lightweight-charts";
import { OLHCV } from "../types/models";

interface ComboChartProps {
  data: OLHCV[];
  ticker: string;
  interval: string;
  height?: number;
  onIntervalChange?: (newInterval: string) => void;
}

const BB_PERIOD = 20;
const BB_MULTIPLIER = 2;

export default function ComboChartResponsive({
  data,
  ticker,
  interval,
  height = 500,
  onIntervalChange,
}: ComboChartProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartApi = useRef<IChartApi | null>(null);

  const candleSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeries = useRef<ISeriesApi<"Histogram"> | null>(null);
  const sma20 = useRef<ISeriesApi<"Line"> | null>(null);
  const sma50 = useRef<ISeriesApi<"Line"> | null>(null);
  const sma200 = useRef<ISeriesApi<"Line"> | null>(null);
  const bbUpper = useRef<ISeriesApi<"Line"> | null>(null);
  const bbLower = useRef<ISeriesApi<"Line"> | null>(null);

  const [lastReturn, setLastReturn] = useState<number | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<any>(null);

  // Indicator visibility toggles
  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(true);
  const [showSMA200, setShowSMA200] = useState(true);
  const [showBB, setShowBB] = useState(true);

  useLayoutEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height,
      layout: { background: { color: "#0f172a" }, textColor: "#cbd5e1" },
      crosshair: { mode: CrosshairMode.Normal },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      timeScale: { borderColor: "#475569", timeVisible: true },
      rightPriceScale: {
        borderColor: "#475569",
        scaleMargins: { top: 0.1, bottom: 0.3 },
      },
    });

    chartApi.current = chart;

    candleSeries.current = chart.addCandlestickSeries({
      upColor: "#4ade80",
      downColor: "#f87171",
      wickUpColor: "#4ade80",
      wickDownColor: "#f87171",
      borderVisible: false,
    });

    volumeSeries.current = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      color: "#8884d8",
    });

    // configure the separate volume scale
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
      borderVisible: false,
    });

    sma20.current = chart.addLineSeries({ color: "#f43f5e", lineWidth: 2 });
    sma50.current = chart.addLineSeries({ color: "#f97316", lineWidth: 2 });
    sma200.current = chart.addLineSeries({ color: "#facc15", lineWidth: 2 });

    bbUpper.current = chart.addLineSeries({
      color: "#60a5fa",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
    });
    bbLower.current = chart.addLineSeries({
      color: "#60a5fa",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
    });

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.resize(entry.contentRect.width, height);
      }
    });
    if (wrapperRef.current) resizeObserver.observe(wrapperRef.current);

    return () => {
      chart.remove();
      resizeObserver.disconnect();
    };
  }, [height]);

  useEffect(() => {
    if (!candleSeries.current || !volumeSeries.current || !chartApi.current) return;
    if (!data?.length) return;

    const parsedData = data
      .map((d) => {
        const ts = Date.parse(d.date);
        return isNaN(ts)
          ? null
          : { time: Math.floor(ts / 1000) as UTCTimestamp, open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume / 1_000_000 };
      })
      .filter(Boolean)
      .sort((a, b) => a.time - b.time);

    if (!parsedData.length) return;

    candleSeries.current.setData(
      parsedData.map(({ time, open, high, low, close }) => ({ time, open, high, low, close }))
    );
    volumeSeries.current.setData(
      parsedData.map(({ time, volume, open, close }) => ({ time, value: volume, color: close >= open ? "#4ade80" : "#f87171" }))
    );

    // Update indicator data based on visibility
    if (showSMA20) {
      sma20.current?.setData(calculateSMA(parsedData, BB_PERIOD));
    } else {
      sma20.current?.setData([]);
    }

    if (showSMA50) {
      sma50.current?.setData(calculateSMA(parsedData, 50));
    } else {
      sma50.current?.setData([]);
    }

    if (showSMA200) {
      sma200.current?.setData(calculateSMA(parsedData, 200));
    } else {
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
      setHoveredCandle({ time: param.time as UTCTimestamp, ...(candle as any), volume: (volumeBar as any).value });
    };

    chartApi.current.subscribeCrosshairMove(handler);
    return () => chartApi.current?.unsubscribeCrosshairMove(handler);
  }, [data, showSMA20, showSMA50, showSMA200, showBB]);

  return (
    <div ref={wrapperRef} className="rounded-xl border border-slate-700 bg-slate-900 p-4 mx-auto w-full max-w-[1400px] overflow-x-auto">
      <div className="flex justify-between items-center mb-3">
        <div className="text-lg font-semibold text-slate-200">{ticker}</div>
        {lastReturn !== null && (
          <div className={
            `text-sm font-medium ${ lastReturn >= 0 ? "text-green-400" : "text-red-400" }`}
          >
            {lastReturn >= 0 ? "+" : ""}{lastReturn.toFixed(2)}%
          </div>
        )}
      </div>
      <div className="flex gap-3 mb-2 text-sm text-slate-300">
        <button className="px-3 py-1 rounded border border-slate-600 bg-slate-700 text-white cursor-default" disabled>1D</button>
      </div>
      <div className="flex gap-2 text-xs text-slate-300 mb-1 flex-wrap">
        <button
          onClick={() => setShowSMA20(!showSMA20)}
          className={`px-2 py-1 rounded border ${
            showSMA20 ? "border-pink-400 bg-pink-900/30 text-pink-400" : "border-slate-600 bg-slate-800 text-slate-400"
          }`}
        >
          SMA 20
        </button>
        <button
          onClick={() => setShowSMA50(!showSMA50)}
          className={`px-2 py-1 rounded border ${
            showSMA50 ? "border-orange-400 bg-orange-900/30 text-orange-400" : "border-slate-600 bg-slate-800 text-slate-400"
          }`}
        >
          SMA 50
        </button>
        <button
          onClick={() => setShowSMA200(!showSMA200)}
          className={`px-2 py-1 rounded border ${
            showSMA200 ? "border-yellow-300 bg-yellow-900/30 text-yellow-300" : "border-slate-600 bg-slate-800 text-slate-400"
          }`}
        >
          SMA 200
        </button>
        <button
          onClick={() => setShowBB(!showBB)}
          className={`px-2 py-1 rounded border ${
            showBB ? "border-blue-400 bg-blue-900/30 text-blue-400" : "border-slate-600 bg-slate-800 text-slate-400"
          }`}
        >
          Bollinger ±2σ
        </button>
      </div>
      {hoveredCandle && (
        <div className="text-xs text-slate-300 mb-2 font-mono whitespace-nowrap">
          🗓 {new Date(hoveredCandle.time * 1000).toLocaleDateString()} | O: {hoveredCandle.open.toFixed(2)} | H: {hoveredCandle.high.toFixed(2)} | L: {hoveredCandle.low.toFixed(2)} | C: {hoveredCandle.close.toFixed(2)} | Vol: {Number.isFinite(hoveredCandle.volume) ? `${hoveredCandle.volume.toFixed(2)}M` : "—"}
        </div>
      )}
      <div ref={chartRef} style={{ width: "100%", height: `${height}px` }} className="overflow-visible" />
    </div>
  );
}

function calculateSMA(
  data: { time: UTCTimestamp; close: number }[],
  period: number
) {
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
