// components/InterestRates.tsx - Interest rates via government bond yields
'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface InterestRatesProps {
  years?: number;
}

interface RateData {
  country: string;
  countryCode: string;
  data: any[];
  current: number;
  previous: number;
  change: number;
  trend: 'rising' | 'falling' | 'stable';
  loading: boolean;
  error: string | null;
}

const COUNTRIES = [
  { name: 'United States', code: 'USA', label: 'US 10Y' },
  { name: 'United Kingdom', code: 'UK', label: 'UK 10Y' },
  { name: 'Germany', code: 'DE', label: 'DE 10Y' },
  { name: 'France', code: 'FR', label: 'FR 10Y' },
  { name: 'Italy', code: 'IT', label: 'IT 10Y' },
  { name: 'Japan', code: 'JP', label: 'JP 10Y' },
];

export default function InterestRates({ years = 10 }: InterestRatesProps) {
  const [rates, setRates] = useState<Map<string, RateData>>(new Map());
  const [selectedCountry, setSelectedCountry] = useState<string>('USA');

  useEffect(() => {
    fetchAllRates();
  }, []);

  const fetchAllRates = async () => {
    const newData = new Map<string, RateData>();

    // Initialize with loading state
    COUNTRIES.forEach((country) => {
      newData.set(country.code, {
        country: country.name,
        countryCode: country.code,
        data: [],
        current: 0,
        previous: 0,
        change: 0,
        trend: 'stable',
        loading: true,
        error: null,
      });
    });
    setRates(new Map(newData));

    // Calculate date range
    const yearsAgo = new Date();
    yearsAgo.setFullYear(yearsAgo.getFullYear() - years);
    const from_date = yearsAgo.toISOString().split('T')[0];

    // Fetch each country's government bond yield
    for (const country of COUNTRIES) {
      try {
        console.log('[InterestRates] Fetching government bond 10Y for', country.code);

        const response = await api.fetchMacroIndicator(
          country.code,
          'government_bond_10y',
          from_date
        );

        console.log('[InterestRates] Response for', country.code, ':', response);

        const dataArray = response?.data || [];

        if (dataArray.length > 0) {
          // Sort by date
          const sortedData = dataArray.sort((a: any, b: any) => {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          });

          const current = parseFloat(sortedData[sortedData.length - 1]?.close || 0);
          const previous = sortedData.length > 1 ? parseFloat(sortedData[sortedData.length - 2]?.close || 0) : 0;
          const change = current - previous;

          // Determine trend
          let trend: 'rising' | 'falling' | 'stable' = 'stable';
          if (sortedData.length >= 3) {
            const last3 = sortedData.slice(-3).map((d: any) => parseFloat(d.close || 0));
            if (last3[2] > last3[1] && last3[1] > last3[0]) trend = 'rising';
            else if (last3[2] < last3[1] && last3[1] < last3[0]) trend = 'falling';
          }

          newData.set(country.code, {
            country: country.name,
            countryCode: country.code,
            data: sortedData,
            current,
            previous,
            change,
            trend,
            loading: false,
            error: null,
          });

          console.log('[InterestRates] Stats for', country.code, ':', { current, previous, change, trend });
        } else {
          console.warn('[InterestRates] No data for', country.code);
          newData.set(country.code, {
            ...newData.get(country.code)!,
            loading: false,
            error: 'No data available',
          });
        }
      } catch (err: any) {
        console.error(`[InterestRates] Failed to fetch ${country.name} rates:`, err);
        newData.set(country.code, {
          ...newData.get(country.code)!,
          loading: false,
          error: err.message,
        });
      }

      setRates(new Map(newData));
    }
  };

  const selectedData = rates.get(selectedCountry);
  const selectedCountryInfo = COUNTRIES.find((c) => c.code === selectedCountry);

  // Calculate chart dimensions
  const maxRate = selectedData?.data.length
    ? Math.max(...selectedData.data.map((d: any) => parseFloat(d.close || 0)))
    : 0;
  const minRate = selectedData?.data.length
    ? Math.min(...selectedData.data.map((d: any) => parseFloat(d.close || 0)))
    : 0;
  const rateRange = maxRate - minRate;

  const getY = (value: number): number => {
    if (rateRange === 0) return 50;
    return ((maxRate - value) / rateRange) * 100;
  };

  const getTrendIcon = (trend: 'rising' | 'falling' | 'stable'): string => {
    switch (trend) {
      case 'rising':
        return '📈';
      case 'falling':
        return '📉';
      case 'stable':
        return '➡️';
    }
  };

  const getTrendColor = (trend: 'rising' | 'falling' | 'stable'): string => {
    switch (trend) {
      case 'rising':
        return 'text-red-400';
      case 'falling':
        return 'text-green-400';
      case 'stable':
        return 'text-yellow-400';
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Government Bond Yields (10Y)</h3>

      {/* Rates Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {COUNTRIES.map((country) => {
          const data = rates.get(country.code);
          const isSelected = selectedCountry === country.code;

          return (
            <button
              key={country.code}
              onClick={() => setSelectedCountry(country.code)}
              className={`p-3 rounded transition-colors text-left ${
                isSelected
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs opacity-75">{country.label}</div>
                {data && !data.loading && !data.error && (
                  <div className="text-lg">{getTrendIcon(data.trend)}</div>
                )}
              </div>
              {data?.loading ? (
                <div className="text-sm">Loading...</div>
              ) : data?.error ? (
                <div className="text-xs text-red-400">Error</div>
              ) : (
                <>
                  <div className="text-xl font-bold">{data?.current.toFixed(2)}%</div>
                  <div
                    className={`text-xs ${
                      (data?.change || 0) >= 0 ? 'text-red-400' : 'text-green-400'
                    }`}
                  >
                    {(data?.change || 0) >= 0 ? '+' : ''}
                    {data?.change.toFixed(2)}% chg
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Country Chart */}
      {selectedData && !selectedData.loading && !selectedData.error && selectedData.data.length > 0 && (
        <div>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-slate-400">
                {selectedData.country} - {selectedCountryInfo?.label} ({years} Years)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Trend:</span>
                <span className={`text-sm font-semibold ${getTrendColor(selectedData.trend)}`}>
                  {getTrendIcon(selectedData.trend)} {selectedData.trend.charAt(0).toUpperCase() + selectedData.trend.slice(1)}
                </span>
              </div>
            </div>

            {/* Line Chart */}
            <div className="relative h-48 bg-slate-900 rounded p-2">
              {/* Y-axis */}
              <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-slate-400 pr-1">
                <span>{maxRate.toFixed(1)}%</span>
                <span>{((maxRate + minRate) / 2).toFixed(1)}%</span>
                <span>{minRate.toFixed(1)}%</span>
              </div>

              {/* Chart area */}
              <div className="ml-12 h-full relative">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="border-b border-slate-700/30"></div>
                  ))}
                </div>

                {/* Zero line if rates go negative */}
                {minRate < 0 && (
                  <div
                    className="absolute left-0 right-0 border-b border-white/30"
                    style={{ top: `${getY(0)}%` }}
                  ></div>
                )}

                {/* Line chart with area fill */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id={`gradient-rates-${selectedCountry}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop
                        offset="0%"
                        stopColor={selectedData.trend === 'rising' ? '#f87171' : '#34d399'}
                        stopOpacity="0.3"
                      />
                      <stop
                        offset="100%"
                        stopColor={selectedData.trend === 'rising' ? '#f87171' : '#34d399'}
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>

                  {/* Area fill */}
                  <polyline
                    fill={`url(#gradient-rates-${selectedCountry})`}
                    stroke="none"
                    points={
                      selectedData.data
                        .map((d: any, idx: number) => {
                          const x = (idx / (selectedData.data.length - 1)) * 100;
                          const y = getY(parseFloat(d.close || 0));
                          return `${x}%,${y}%`;
                        })
                        .join(' ') + ` 100%,100% 0%,100%`
                    }
                  />

                  {/* Line */}
                  <polyline
                    fill="none"
                    stroke={selectedData.trend === 'rising' ? '#f87171' : '#34d399'}
                    strokeWidth="2"
                    points={selectedData.data
                      .map((d: any, idx: number) => {
                        const x = (idx / (selectedData.data.length - 1)) * 100;
                        const y = getY(parseFloat(d.close || 0));
                        return `${x}%,${y}%`;
                      })
                      .join(' ')}
                  />
                </svg>
              </div>
            </div>

            {/* Time axis */}
            <div className="ml-12 flex justify-between mt-2 text-xs text-slate-400">
              <span>{new Date(selectedData.data[0]?.date).getFullYear()}</span>
              <span>
                {new Date(
                  selectedData.data[Math.floor(selectedData.data.length / 2)]?.date
                ).getFullYear()}
              </span>
              <span>
                {new Date(selectedData.data[selectedData.data.length - 1]?.date).getFullYear()}
              </span>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-slate-700 rounded px-3 py-2">
              <div className="text-xs text-slate-400">Current</div>
              <div className="text-sm font-semibold text-white">
                {selectedData.current.toFixed(2)}%
              </div>
            </div>
            <div className="bg-slate-700 rounded px-3 py-2">
              <div className="text-xs text-slate-400">Change</div>
              <div
                className={`text-sm font-semibold ${
                  selectedData.change >= 0 ? 'text-red-400' : 'text-green-400'
                }`}
              >
                {selectedData.change >= 0 ? '+' : ''}
                {selectedData.change.toFixed(2)}%
              </div>
            </div>
            <div className="bg-slate-700 rounded px-3 py-2">
              <div className="text-xs text-slate-400">Peak</div>
              <div className="text-sm font-semibold text-white">{maxRate.toFixed(2)}%</div>
            </div>
            <div className="bg-slate-700 rounded px-3 py-2">
              <div className="text-xs text-slate-400">Low</div>
              <div className="text-sm font-semibold text-white">{minRate.toFixed(2)}%</div>
            </div>
          </div>
        </div>
      )}

      {selectedData?.loading && (
        <div className="animate-pulse">
          <div className="h-48 bg-slate-700 rounded mb-4"></div>
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      )}

      {selectedData?.error && (
        <div className="text-center py-8 text-red-400 text-sm">
          Failed to load {selectedData.country} bond yield data
        </div>
      )}

      {/* Policy Context */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="text-sm text-slate-400 mb-2">Understanding Bond Yields</div>
        <div className="text-xs text-slate-300 space-y-1">
          <p>
            📈 <span className="text-red-400">Rising yields:</span> Higher borrowing costs, often seen during growth/inflation expectations
          </p>
          <p>
            📉 <span className="text-green-400">Falling yields:</span> Lower borrowing costs, often seen during economic slowdown or flight-to-safety
          </p>
          <p>
            ➡️ <span className="text-yellow-400">Stable yields:</span> Market equilibrium, balanced growth and inflation expectations
          </p>
        </div>
      </div>
    </div>
  );
}
