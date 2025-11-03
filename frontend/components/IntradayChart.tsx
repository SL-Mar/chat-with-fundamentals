// components/IntradayChart.tsx - Intraday price chart with zoom/pan support
'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import CandlestickChartAdvanced from './CandlestickChartAdvanced';

interface IntradayChartProps {
  ticker: string;
  interval?: '1m' | '5m' | '15m' | '30m' | '1h';
  onIntervalChange?: (interval: string) => void;
}

export default function IntradayChart({
  ticker,
  interval = '5m',
  onIntervalChange,
}: IntradayChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;
    fetchIntradayData();
  }, [ticker, interval]);

  const fetchIntradayData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[IntradayChart] Fetching intraday data for', ticker, 'interval:', interval);

      const data = await api.fetchIntradayData(ticker, interval);
      const dataArray = Array.isArray(data) ? data : data?.data || [];

      const sortedData = dataArray.sort((a: any, b: any) => {
        const timeA = new Date(a.datetime || a.timestamp).getTime();
        const timeB = new Date(b.datetime || b.timestamp).getTime();
        return timeA - timeB;
      });

      setChartData(sortedData);
    } catch (err: any) {
      console.error('[IntradayChart] Failed to fetch intraday data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
    <CandlestickChartAdvanced
      data={chartData}
      ticker={ticker}
      interval={interval}
      height={500}
      showIntervalSelector={true}
      onIntervalChange={onIntervalChange}
    />
  );
}
