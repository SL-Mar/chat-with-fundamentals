// components/MarketCapHistory.tsx - Market capitalization trends over time
'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface MarketCapHistoryProps {
  ticker: string;
}

export default function MarketCapHistory({ ticker }: MarketCapHistoryProps) {
  const [marketCapData, setMarketCapData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;
    fetchMarketCapHistory();
  }, [ticker]);

  const fetchMarketCapHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch last 5 years of market cap data
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      const fromDate = fiveYearsAgo.toISOString().split('T')[0];

      const data = await api.fetchMarketCapHistory(ticker, fromDate);

      // Data might be nested or an array - adjust based on actual API response
      const mcArray = Array.isArray(data) ? data : data?.data || [];
      setMarketCapData(mcArray);
    } catch (err: any) {
      console.error('Failed to fetch market cap history:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Market Cap History</h3>
        <div className="animate-pulse">
          <div className="h-40 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Market Cap History</h3>
        <p className="text-sm text-red-400">Failed to load market cap history</p>
      </div>
    );
  }

  if (marketCapData.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Market Cap History</h3>
        <p className="text-sm text-slate-400">No market cap data available</p>
      </div>
    );
  }

  // Calculate metrics
  const current = marketCapData[marketCapData.length - 1];
  const oneYearAgo = marketCapData.find((d: any) => {
    const date = new Date(d.date);
    const oneYr = new Date();
    oneYr.setFullYear(oneYr.getFullYear() - 1);
    return date <= oneYr;
  });

  const currentMC = current?.marketCap || current?.value;
  const oneYearMC = oneYearAgo?.marketCap || oneYearAgo?.value;
  const yearChange = oneYearMC ? ((currentMC - oneYearMC) / oneYearMC) * 100 : 0;

  const minMC = Math.min(...marketCapData.map((d: any) => d.marketCap || d.value || 0));
  const maxMC = Math.max(...marketCapData.map((d: any) => d.marketCap || d.value || 0));

  const formatMarketCap = (value: number) => {
    if (!value) return 'N/A';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(0)}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Simple text-based chart representation
  const recentData = marketCapData.slice(-12); // Last 12 data points
  const chartMax = Math.max(...recentData.map((d: any) => d.marketCap || d.value || 0));
  const chartMin = Math.min(...recentData.map((d: any) => d.marketCap || d.value || 0));

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Market Cap History</h3>

      {/* Summary Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-slate-700 rounded px-2 py-2 text-center">
          <div className="text-xs text-slate-400">Current</div>
          <div className="text-sm font-semibold text-white">
            {formatMarketCap(currentMC)}
          </div>
        </div>
        <div className="bg-slate-700 rounded px-2 py-2 text-center">
          <div className="text-xs text-slate-400">1Y Change</div>
          <div className={`text-sm font-semibold ${yearChange > 0 ? 'text-green-400' : yearChange < 0 ? 'text-red-400' : 'text-white'}`}>
            {yearChange > 0 ? '+' : ''}{yearChange.toFixed(1)}%
          </div>
        </div>
        <div className="bg-slate-700 rounded px-2 py-2 text-center">
          <div className="text-xs text-slate-400">5Y Range</div>
          <div className="text-xs text-white">
            {formatMarketCap(minMC)} - {formatMarketCap(maxMC)}
          </div>
        </div>
      </div>

      {/* Simple bar chart visualization */}
      <div className="mb-3">
        <div className="flex items-end justify-between h-32 gap-1">
          {recentData.map((d: any, idx: number) => {
            const value = d.marketCap || d.value || 0;
            const heightPercent = ((value - chartMin) / (chartMax - chartMin)) * 100 || 5;

            return (
              <div
                key={idx}
                className="flex-1 bg-blue-500 rounded-t hover:bg-blue-400 transition-colors cursor-pointer group relative"
                style={{ height: `${heightPercent}%` }}
                title={`${formatDate(d.date)}: ${formatMarketCap(value)}`}
              >
                {/* Tooltip on hover */}
                <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 rounded text-xs whitespace-nowrap">
                  <div className="text-white">{formatMarketCap(value)}</div>
                  <div className="text-slate-400">{formatDate(d.date)}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span>{formatDate(recentData[0]?.date)}</span>
          <span>{formatDate(recentData[recentData.length - 1]?.date)}</span>
        </div>
      </div>

      {/* Valuation Milestones */}
      <div className="pt-3 border-t border-slate-700">
        <div className="text-xs text-slate-400 mb-2">Valuation Milestones</div>
        <div className="grid grid-cols-2 gap-2">
          {currentMC >= 1e12 && (
            <div className="text-xs">
              <span className="text-green-400">✓</span> Trillion Dollar Club
            </div>
          )}
          {currentMC >= 1e11 && currentMC < 1e12 && (
            <div className="text-xs">
              <span className="text-blue-400">→</span> Mega Cap ($100B+)
            </div>
          )}
          {currentMC >= 1e10 && currentMC < 1e11 && (
            <div className="text-xs">
              <span className="text-blue-400">→</span> Large Cap ($10B+)
            </div>
          )}
          {maxMC > currentMC * 1.5 && (
            <div className="text-xs text-yellow-400">
              ⚠ Down {((1 - currentMC / maxMC) * 100).toFixed(0)}% from peak
            </div>
          )}
          {currentMC === maxMC && (
            <div className="text-xs text-green-400">
              🎯 All-time high
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
