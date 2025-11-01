// components/stocks/StockOverviewTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import TradingViewChart from '../TradingViewChart';
import IntradayChart from '../IntradayChart';

interface StockOverviewTabProps {
  ticker: string;
}

export default function StockOverviewTab({ ticker }: StockOverviewTabProps) {
  const [livePrice, setLivePrice] = useState<any>(null);
  const [eodData, setEodData] = useState<any>(null);
  const [keyMetrics, setKeyMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'eod' | 'intraday'>('eod');

  useEffect(() => {
    fetchData();
  }, [ticker]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch live price
      const livePriceData = await api.fetchLivePrice(ticker);
      setLivePrice(livePriceData);

      // Fetch EOD data (limit to 252 trading days = ~1 year)
      const eodResult = await api.fetchEODData(ticker);
      setEodData(eodResult);

      // Calculate key metrics from EOD data and fetch market cap
      if (eodResult && eodResult.data && eodResult.data.length > 0) {
        const data = eodResult.data;
        const recentYear = data.slice(-252); // Last 252 trading days

        // Calculate 52-week high/low
        const high52Week = Math.max(...recentYear.map((d: any) => d.high));
        const low52Week = Math.min(...recentYear.map((d: any) => d.low));

        // Get previous close (second to last day)
        const previousClose = data.length > 1 ? data[data.length - 2].close : null;

        // Fetch market cap from company highlights
        try {
          const highlights = await api.fetchCompanyHighlights(ticker);
          setKeyMetrics({
            previousClose,
            '52WeekHigh': high52Week,
            '52WeekLow': low52Week,
            marketCap: highlights.marketCap
          });
        } catch {
          // If highlights fail, still show price metrics
          setKeyMetrics({
            previousClose,
            '52WeekHigh': high52Week,
            '52WeekLow': low52Week,
            marketCap: null
          });
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch overview data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400">Loading overview...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Price Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {livePrice && (
          <>
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Current Price</div>
              <div className="text-2xl font-bold">${livePrice.price?.toFixed(2) || 'N/A'}</div>
              {livePrice.change !== undefined && (
                <div className={`text-sm ${livePrice.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {livePrice.change >= 0 ? '+' : ''}{livePrice.change.toFixed(2)} (
                  {livePrice.change_p?.toFixed(2)}%)
                </div>
              )}
            </div>

            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Open</div>
              <div className="text-2xl font-bold">${livePrice.open?.toFixed(2) || 'N/A'}</div>
            </div>

            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">High / Low</div>
              <div className="text-xl font-bold">
                ${livePrice.high?.toFixed(2) || 'N/A'} / ${livePrice.low?.toFixed(2) || 'N/A'}
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Volume</div>
              <div className="text-2xl font-bold">
                {livePrice.volume ? (livePrice.volume / 1_000_000).toFixed(2) + 'M' : 'N/A'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Chart Type Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setChartType('eod')}
          className={`px-4 py-2 rounded font-semibold transition-colors ${
            chartType === 'eod'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          EOD Chart
        </button>
        <button
          onClick={() => setChartType('intraday')}
          className={`px-4 py-2 rounded font-semibold transition-colors ${
            chartType === 'intraday'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Intraday Chart
        </button>
      </div>

      {/* Chart */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        {chartType === 'eod' ? (
          <TradingViewChart ticker={ticker.replace('.US', '')} />
        ) : (
          <IntradayChart ticker={ticker} interval="5m" />
        )}
      </div>

      {/* Key Metrics */}
      {keyMetrics && (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-xl font-bold mb-4">Key Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-slate-400">Previous Close</div>
              <div className="text-lg font-semibold">${keyMetrics.previousClose?.toFixed(2) || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">52 Week High</div>
              <div className="text-lg font-semibold">${keyMetrics['52WeekHigh']?.toFixed(2) || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">52 Week Low</div>
              <div className="text-lg font-semibold">${keyMetrics['52WeekLow']?.toFixed(2) || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Market Cap</div>
              <div className="text-lg font-semibold">
                {keyMetrics.marketCap ? `$${(keyMetrics.marketCap / 1_000_000_000).toFixed(2)}B` : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
