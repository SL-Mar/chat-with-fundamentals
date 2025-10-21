// components/MacroIndicators.tsx - Government bond yields (interest rate proxy)
'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface MacroIndicatorsProps {
  country?: string;
  years?: number;
}

export default function MacroIndicators({ country = 'USA', years = 10 }: MacroIndicatorsProps) {
  const [selectedCountry, setSelectedCountry] = useState(country);
  const [bondData, setBondData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    current: number;
    previous: number;
    change: number;
    changePercent: number;
    max: number;
    min: number;
  } | null>(null);

  useEffect(() => {
    fetchBondData();
  }, [selectedCountry]);

  const fetchBondData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[MacroIndicators] Fetching government bond 10Y for', selectedCountry);

      // Calculate date range
      const yearsAgo = new Date();
      yearsAgo.setFullYear(yearsAgo.getFullYear() - years);
      const from_date = yearsAgo.toISOString().split('T')[0];

      const response = await api.fetchMacroIndicator(
        selectedCountry,
        'government_bond_10y',
        from_date
      );

      console.log('[MacroIndicators] Received response:', response);

      const dataArray = response?.data || [];

      if (dataArray.length > 0) {
        // Sort by date
        const sortedData = dataArray.sort((a: any, b: any) => {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        setBondData(sortedData);

        // Calculate stats
        const current = parseFloat(sortedData[sortedData.length - 1]?.close || 0);
        const previous = sortedData.length > 1 ? parseFloat(sortedData[sortedData.length - 2]?.close || 0) : 0;
        const change = current - previous;
        const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
        const max = Math.max(...sortedData.map((d: any) => parseFloat(d.close || 0)));
        const min = Math.min(...sortedData.map((d: any) => parseFloat(d.close || 0)));

        setStats({
          current,
          previous,
          change,
          changePercent,
          max,
          min,
        });

        console.log('[MacroIndicators] Stats:', { current, previous, change, changePercent, max, min });
      } else {
        console.warn('[MacroIndicators] No data received for', selectedCountry);
        setError('No data available for selected country');
      }
    } catch (err: any) {
      console.error('[MacroIndicators] Failed to fetch bond data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const formatPercent = (value: number): string => {
    if (!value && value !== 0) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  // Calculate chart dimensions
  const maxValue = stats?.max || 0;
  const minValue = stats?.min || 0;
  const valueRange = maxValue - minValue;

  const getY = (value: number): number => {
    if (valueRange === 0) return 50;
    return ((maxValue - value) / valueRange) * 100;
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Government Bond Yields (10Y)</h3>

        {/* Country Selector */}
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="px-3 py-2 bg-slate-700 text-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="USA">United States</option>
          <option value="UK">United Kingdom</option>
          <option value="DE">Germany</option>
          <option value="FR">France</option>
          <option value="IT">Italy</option>
          <option value="JP">Japan</option>
          <option value="CN">China</option>
        </select>
      </div>

      {loading && (
        <div className="animate-pulse">
          <div className="h-48 bg-slate-700 rounded mb-4"></div>
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="text-center py-8 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && bondData.length > 0 && stats && (
        <div>
          {/* Current Rate Card */}
          <div className="mb-4 p-4 bg-slate-700 rounded">
            <div className="text-sm text-slate-400 mb-1">Current 10Y Yield</div>
            <div className="text-3xl font-bold text-white">{formatPercent(stats.current)}</div>
            <div className={`text-sm ${stats.change >= 0 ? 'text-red-400' : 'text-green-400'}`}>
              {stats.change >= 0 ? '+' : ''}{formatPercent(Math.abs(stats.change))} ({stats.changePercent >= 0 ? '+' : ''}{stats.changePercent.toFixed(2)}% from prev)
            </div>
          </div>

          {/* Chart */}
          <div className="mb-4">
            <div className="text-sm text-slate-400 mb-2">
              {years} Year Historical Trend
            </div>

            <div className="relative h-48 bg-slate-900 rounded p-2">
              {/* Y-axis */}
              <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-slate-400 pr-1">
                <span>{formatPercent(maxValue)}</span>
                <span>{formatPercent((maxValue + minValue) / 2)}</span>
                <span>{formatPercent(minValue)}</span>
              </div>

              {/* Chart area */}
              <div className="ml-16 h-full relative">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="border-b border-slate-700/30"></div>
                  ))}
                </div>

                {/* Line chart */}
                <svg className="absolute inset-0 w-full h-full">
                  <defs>
                    <linearGradient id="gradient-bonds" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Area fill */}
                  <polyline
                    fill="url(#gradient-bonds)"
                    stroke="none"
                    points={
                      bondData
                        .map((d: any, idx: number) => {
                          const x = (idx / (bondData.length - 1)) * 100;
                          const y = getY(parseFloat(d.close || 0));
                          return `${x}%,${y}%`;
                        })
                        .join(' ') + ` 100%,100% 0%,100%`
                    }
                  />

                  {/* Line */}
                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    points={bondData
                      .map((d: any, idx: number) => {
                        const x = (idx / (bondData.length - 1)) * 100;
                        const y = getY(parseFloat(d.close || 0));
                        return `${x}%,${y}%`;
                      })
                      .join(' ')}
                  />
                </svg>
              </div>
            </div>

            {/* Time axis */}
            <div className="ml-16 flex justify-between mt-2 text-xs text-slate-400">
              <span>{new Date(bondData[0]?.date).getFullYear()}</span>
              <span>
                {new Date(bondData[Math.floor(bondData.length / 2)]?.date).getFullYear()}
              </span>
              <span>{new Date(bondData[bondData.length - 1]?.date).getFullYear()}</span>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-700 rounded px-3 py-2">
              <div className="text-xs text-slate-400">Current</div>
              <div className="text-sm font-semibold text-white">{formatPercent(stats.current)}</div>
            </div>
            <div className="bg-slate-700 rounded px-3 py-2">
              <div className="text-xs text-slate-400">Peak ({years}Y)</div>
              <div className="text-sm font-semibold text-red-400">{formatPercent(stats.max)}</div>
            </div>
            <div className="bg-slate-700 rounded px-3 py-2">
              <div className="text-xs text-slate-400">Low ({years}Y)</div>
              <div className="text-sm font-semibold text-green-400">{formatPercent(stats.min)}</div>
            </div>
          </div>

          {/* Educational Note */}
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-slate-300">
            <strong className="text-blue-400">Note:</strong> 10-year government bond yields serve as a proxy for long-term interest rates.
            Higher yields indicate expectations of higher growth/inflation or increased credit risk.
          </div>
        </div>
      )}
    </div>
  );
}
