// components/MacroIndicators.tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface MacroDataPoint {
  date: string;
  close?: number;
  value?: number;
}

interface CountryData {
  [country: string]: MacroDataPoint[];
}

const AVAILABLE_COUNTRIES = [
  { code: 'USA', name: 'United States' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
];

const MONEY_MARKET_REGIONS = [
  { code: 'USA', name: 'United States (USD LIBOR)' },
  { code: 'UK', name: 'United Kingdom (GBP LIBOR)' },
  { code: 'EUR', name: 'Eurozone (EURIBOR)' },
  { code: 'JP', name: 'Japan (USD LIBOR)' },
  { code: 'CN', name: 'China (USD LIBOR)' },
];

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
  '#14b8a6', // teal
];

export default function MacroIndicators() {
  // Treasury Yield state
  const [selectedTreasuryCountries, setSelectedTreasuryCountries] = useState<Set<string>>(new Set(['USA']));
  const [treasuryData, setTreasuryData] = useState<CountryData>({});
  const [loadingTreasury, setLoadingTreasury] = useState(false);

  // Money Market state
  const [selectedMoneyMarketCountries, setSelectedMoneyMarketCountries] = useState<Set<string>>(new Set(['EUR']));
  const [moneyMarketData, setMoneyMarketData] = useState<CountryData>({});
  const [loadingMoneyMarket, setLoadingMoneyMarket] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Auto-fetch on mount
  useEffect(() => {
    fetchTreasuryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchMoneyMarketData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTreasuryData = async () => {
    if (selectedTreasuryCountries.size === 0) return;

    try {
      setLoadingTreasury(true);
      setError(null);

      const allData: CountryData = {};

      for (const country of Array.from(selectedTreasuryCountries)) {
        try {
          const yearsAgo = new Date();
          yearsAgo.setFullYear(yearsAgo.getFullYear() - 10);
          const from_date = yearsAgo.toISOString().split('T')[0];

          const response = await api.fetchMacroIndicator(country, 'government_bond_10y', from_date);
          const data = response?.data || [];
          if (data.length > 0) {
            allData[country] = data.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          }
        } catch (err) {
          console.error(`Failed to fetch treasury data for ${country}:`, err);
        }
      }

      setTreasuryData(allData);
    } catch (err: any) {
      console.error('Failed to fetch treasury data:', err);
      setError(err.message || 'Failed to fetch treasury data');
    } finally {
      setLoadingTreasury(false);
    }
  };

  const fetchMoneyMarketData = async () => {
    if (selectedMoneyMarketCountries.size === 0) return;

    try {
      setLoadingMoneyMarket(true);
      setError(null);

      const allData: CountryData = {};

      // Map regions to their money market indicators
      const indicatorMap: Record<string, { code: string, indicator: string }> = {
        'USA': { code: 'USD', indicator: 'libor_usd_3m' },
        'UK': { code: 'GBP', indicator: 'libor_gbp_3m' },
        'EUR': { code: 'EUR', indicator: 'euribor_3m' },
        'JP': { code: 'USD', indicator: 'libor_usd_3m' },
        'CN': { code: 'USD', indicator: 'libor_usd_3m' },
      };

      for (const region of Array.from(selectedMoneyMarketCountries)) {
        try {
          const yearsAgo = new Date();
          yearsAgo.setFullYear(yearsAgo.getFullYear() - 10);
          const from_date = yearsAgo.toISOString().split('T')[0];

          const config = indicatorMap[region] || { code: 'USD', indicator: 'libor_usd_3m' };

          const response = await api.fetchMacroIndicator(config.code, config.indicator, from_date);
          const data = response?.data || [];
          if (data.length > 0) {
            allData[region] = data.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          }
        } catch (err) {
          console.error(`Failed to fetch money market data for ${region}:`, err);
        }
      }

      setMoneyMarketData(allData);
    } catch (err: any) {
      console.error('Failed to fetch money market data:', err);
      setError(err.message || 'Failed to fetch money market data');
    } finally {
      setLoadingMoneyMarket(false);
    }
  };

  const toggleTreasuryCountry = (countryCode: string) => {
    const newSelected = new Set(selectedTreasuryCountries);
    if (newSelected.has(countryCode)) {
      newSelected.delete(countryCode);
    } else {
      if (newSelected.size >= 10) {
        setError('Maximum 10 countries can be selected');
        return;
      }
      newSelected.add(countryCode);
    }
    setSelectedTreasuryCountries(newSelected);
    setError(null);
  };

  const toggleMoneyMarketCountry = (countryCode: string) => {
    const newSelected = new Set(selectedMoneyMarketCountries);
    if (newSelected.has(countryCode)) {
      newSelected.delete(countryCode);
    } else {
      if (newSelected.size >= 10) {
        setError('Maximum 10 countries can be selected');
        return;
      }
      newSelected.add(countryCode);
    }
    setSelectedMoneyMarketCountries(newSelected);
    setError(null);
  };

  // Transform treasury data for Recharts
  const treasuryChartData = (() => {
    const allDates = new Set<string>();
    Object.values(treasuryData).forEach((data) => {
      data.forEach((point) => allDates.add(point.date));
    });

    const sortedDates = Array.from(allDates).sort();
    return sortedDates.map((date) => {
      const dataPoint: any = { date };
      Object.entries(treasuryData).forEach(([country, points]) => {
        const point = points.find((p) => p.date === date);
        if (point) {
          dataPoint[country] = parseFloat(String(point.close || point.value || 0));
        }
      });
      return dataPoint;
    });
  })();

  // Transform money market data for Recharts
  const moneyMarketChartData = (() => {
    const allDates = new Set<string>();
    Object.values(moneyMarketData).forEach((data) => {
      data.forEach((point) => allDates.add(point.date));
    });

    const sortedDates = Array.from(allDates).sort();
    return sortedDates.map((date) => {
      const dataPoint: any = { date };
      Object.entries(moneyMarketData).forEach(([country, points]) => {
        const point = points.find((p) => p.date === date);
        if (point) {
          dataPoint[country] = parseFloat(String(point.close || point.value || 0));
        }
      });
      return dataPoint;
    });
  })();

  return (
    <div className="space-y-8 p-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-300">
          {error}
        </div>
      )}

      {/* Treasury Yield (10Y) Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Treasury Yield (10Y Government Bonds)</h2>

        {/* Country Selection */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">Select Countries</h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            {AVAILABLE_COUNTRIES.map((country) => {
              const isSelected = selectedTreasuryCountries.has(country.code);
              return (
                <div
                  key={country.code}
                  onClick={() => toggleTreasuryCountry(country.code)}
                  className={`
                    p-3 rounded-lg border-2 cursor-pointer transition-all text-center
                    ${
                      isSelected
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-slate-700 bg-slate-700/50 hover:border-slate-600'
                    }
                  `}
                >
                  <div className="font-semibold">{country.code}</div>
                  <div className="text-xs text-slate-400 truncate">{country.name}</div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={fetchTreasuryData}
              disabled={selectedTreasuryCountries.size === 0 || loadingTreasury}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded font-semibold transition-colors"
            >
              {loadingTreasury ? 'Loading...' : `Update Chart (${selectedTreasuryCountries.size} selected)`}
            </button>

            {selectedTreasuryCountries.size > 0 && (
              <button
                onClick={() => setSelectedTreasuryCountries(new Set())}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition-colors"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>

        {/* Treasury Chart */}
        {Object.keys(treasuryData).length > 0 && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-xl font-bold mb-4">10-Year Treasury Yield (%)</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={treasuryChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date) => {
                    const d = new Date(date);
                    return `${d.getMonth() + 1}/${d.getFullYear()}`;
                  }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#cbd5e1' }}
                  formatter={(value: any) => [`${value.toFixed(2)}%`, '']}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                {Object.keys(treasuryData).map((country, idx) => (
                  <Line
                    key={country}
                    type="monotone"
                    dataKey={country}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    name={country}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Money Market Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Money Market Rates</h2>

        {/* Region Selection */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">Select Regions</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {MONEY_MARKET_REGIONS.map((region) => {
              const isSelected = selectedMoneyMarketCountries.has(region.code);
              return (
                <div
                  key={region.code}
                  onClick={() => toggleMoneyMarketCountry(region.code)}
                  className={`
                    p-3 rounded-lg border-2 cursor-pointer transition-all
                    ${
                      isSelected
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-slate-700 bg-slate-700/50 hover:border-slate-600'
                    }
                  `}
                >
                  <div className="font-semibold text-sm">{region.name}</div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={fetchMoneyMarketData}
              disabled={selectedMoneyMarketCountries.size === 0 || loadingMoneyMarket}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded font-semibold transition-colors"
            >
              {loadingMoneyMarket ? 'Loading...' : `Update Chart (${selectedMoneyMarketCountries.size} selected)`}
            </button>

            {selectedMoneyMarketCountries.size > 0 && (
              <button
                onClick={() => setSelectedMoneyMarketCountries(new Set())}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition-colors"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>

        {/* Money Market Chart */}
        {Object.keys(moneyMarketData).length > 0 && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-xl font-bold mb-4">Money Market Rates (%)</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={moneyMarketChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date) => {
                    const d = new Date(date);
                    return `${d.getMonth() + 1}/${d.getFullYear()}`;
                  }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#cbd5e1' }}
                  formatter={(value: any) => [`${value.toFixed(2)}%`, '']}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                {Object.keys(moneyMarketData).map((country, idx) => (
                  <Line
                    key={country}
                    type="monotone"
                    dataKey={country}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    name={country}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
