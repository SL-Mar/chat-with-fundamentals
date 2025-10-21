// components/MacroIndicators.tsx - Key macroeconomic indicators dashboard
'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface MacroIndicatorsProps {
  country?: string;
  years?: number;
}

interface IndicatorData {
  name: string;
  code: string;
  data: any[];
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  unit: string;
  loading: boolean;
  error: string | null;
}

const INDICATORS = [
  { name: 'GDP', code: 'gdp_current_usd', unit: 'USD', format: 'billions' },
  { name: 'Inflation', code: 'inflation_consumer_prices_annual', unit: '%', format: 'percent' },
  { name: 'Unemployment', code: 'unemployment_total', unit: '%', format: 'percent' },
  { name: 'Interest Rate', code: 'real_interest_rate', unit: '%', format: 'percent' },
];

export default function MacroIndicators({ country = 'USA', years = 10 }: MacroIndicatorsProps) {
  const [selectedCountry, setSelectedCountry] = useState(country);
  const [indicators, setIndicators] = useState<Map<string, IndicatorData>>(new Map());
  const [selectedIndicator, setSelectedIndicator] = useState<string>('gdp_current_usd');

  useEffect(() => {
    fetchAllIndicators();
  }, [selectedCountry]);

  const fetchAllIndicators = async () => {
    const newData = new Map<string, IndicatorData>();

    // Initialize with loading state
    INDICATORS.forEach((ind) => {
      newData.set(ind.code, {
        name: ind.name,
        code: ind.code,
        data: [],
        current: 0,
        previous: 0,
        change: 0,
        changePercent: 0,
        unit: ind.unit,
        loading: true,
        error: null,
      });
    });
    setIndicators(new Map(newData));

    // Calculate date range
    const yearsAgo = new Date();
    yearsAgo.setFullYear(yearsAgo.getFullYear() - years);
    const from_date = yearsAgo.toISOString().split('T')[0];

    // Fetch each indicator
    for (const ind of INDICATORS) {
      try {
        const response = await api.fetchMacroIndicator(
          selectedCountry,
          ind.code,
          from_date
        );

        const dataArray = response?.data || [];

        if (dataArray.length > 0) {
          // Sort by date
          const sortedData = dataArray.sort((a: any, b: any) => {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          });

          const current = parseFloat(sortedData[sortedData.length - 1]?.value || 0);
          const previous = sortedData.length > 1 ? parseFloat(sortedData[sortedData.length - 2]?.value || 0) : 0;
          const change = current - previous;
          const changePercent = previous !== 0 ? (change / previous) * 100 : 0;

          newData.set(ind.code, {
            name: ind.name,
            code: ind.code,
            data: sortedData,
            current,
            previous,
            change,
            changePercent,
            unit: ind.unit,
            loading: false,
            error: null,
          });
        } else {
          newData.set(ind.code, {
            ...newData.get(ind.code)!,
            loading: false,
            error: 'No data available',
          });
        }
      } catch (err: any) {
        console.error(`Failed to fetch ${ind.name}:`, err);
        newData.set(ind.code, {
          ...newData.get(ind.code)!,
          loading: false,
          error: err.message,
        });
      }

      setIndicators(new Map(newData));
    }
  };

  const formatValue = (value: number, format: string): string => {
    if (!value) return 'N/A';

    switch (format) {
      case 'billions':
        if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
        if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
        return `$${value.toFixed(0)}`;
      case 'percent':
        return `${value.toFixed(2)}%`;
      default:
        return value.toFixed(2);
    }
  };

  const selectedData = indicators.get(selectedIndicator);
  const selectedIndicatorInfo = INDICATORS.find((i) => i.code === selectedIndicator);

  // Calculate chart dimensions
  const maxValue = selectedData?.data.length
    ? Math.max(...selectedData.data.map((d: any) => parseFloat(d.value || 0)))
    : 0;
  const minValue = selectedData?.data.length
    ? Math.min(...selectedData.data.map((d: any) => parseFloat(d.value || 0)))
    : 0;
  const valueRange = maxValue - minValue;

  const getY = (value: number): number => {
    if (valueRange === 0) return 50;
    return ((maxValue - value) / valueRange) * 100;
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Macroeconomic Indicators</h3>

        {/* Country Selector */}
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="px-3 py-2 bg-slate-700 text-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="USA">United States</option>
          <option value="GBR">United Kingdom</option>
          <option value="JPN">Japan</option>
          <option value="DEU">Germany</option>
          <option value="FRA">France</option>
          <option value="CAN">Canada</option>
          <option value="CHN">China</option>
          <option value="IND">India</option>
        </select>
      </div>

      {/* Indicator Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {INDICATORS.map((ind) => {
          const data = indicators.get(ind.code);
          const isSelected = selectedIndicator === ind.code;

          return (
            <button
              key={ind.code}
              onClick={() => setSelectedIndicator(ind.code)}
              className={`p-3 rounded transition-colors text-left ${
                isSelected
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <div className="text-xs opacity-75 mb-1">{ind.name}</div>
              {data?.loading ? (
                <div className="text-sm">Loading...</div>
              ) : data?.error ? (
                <div className="text-xs text-red-400">Error</div>
              ) : (
                <>
                  <div className="text-lg font-bold">
                    {formatValue(data?.current || 0, ind.format)}
                  </div>
                  <div
                    className={`text-xs ${
                      (data?.change || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {(data?.change || 0) >= 0 ? '+' : ''}
                    {data?.changePercent.toFixed(2)}% YoY
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Indicator Chart */}
      {selectedData && !selectedData.loading && !selectedData.error && selectedData.data.length > 0 && (
        <div>
          <div className="mb-4">
            <div className="text-sm text-slate-400 mb-2">
              {selectedData.name} Historical Trend ({years} Years)
            </div>

            {/* Line Chart */}
            <div className="relative h-48 bg-slate-900 rounded p-2">
              {/* Y-axis */}
              <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-slate-400 pr-1">
                <span>{formatValue(maxValue, selectedIndicatorInfo?.format || '')}</span>
                <span>{formatValue((maxValue + minValue) / 2, selectedIndicatorInfo?.format || '')}</span>
                <span>{formatValue(minValue, selectedIndicatorInfo?.format || '')}</span>
              </div>

              {/* Chart area */}
              <div className="ml-16 h-full relative">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="border-b border-slate-700/30"></div>
                  ))}
                </div>

                {/* Line chart with area fill */}
                <svg className="absolute inset-0 w-full h-full">
                  <defs>
                    <linearGradient id={`gradient-${selectedIndicator}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop
                        offset="0%"
                        stopColor={selectedData.change >= 0 ? '#3b82f6' : '#f87171'}
                        stopOpacity="0.3"
                      />
                      <stop
                        offset="100%"
                        stopColor={selectedData.change >= 0 ? '#3b82f6' : '#f87171'}
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>

                  {/* Area fill */}
                  <polyline
                    fill={`url(#gradient-${selectedIndicator})`}
                    stroke="none"
                    points={
                      selectedData.data
                        .map((d: any, idx: number) => {
                          const x = (idx / (selectedData.data.length - 1)) * 100;
                          const y = getY(parseFloat(d.value || 0));
                          return `${x}%,${y}%`;
                        })
                        .join(' ') + ` 100%,100% 0%,100%`
                    }
                  />

                  {/* Line */}
                  <polyline
                    fill="none"
                    stroke={selectedData.change >= 0 ? '#3b82f6' : '#f87171'}
                    strokeWidth="2"
                    points={selectedData.data
                      .map((d: any, idx: number) => {
                        const x = (idx / (selectedData.data.length - 1)) * 100;
                        const y = getY(parseFloat(d.value || 0));
                        return `${x}%,${y}%`;
                      })
                      .join(' ')}
                  />
                </svg>
              </div>
            </div>

            {/* Time axis */}
            <div className="ml-16 flex justify-between mt-2 text-xs text-slate-400">
              <span>
                {new Date(selectedData.data[0]?.date).getFullYear()}
              </span>
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
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-700 rounded px-3 py-2">
              <div className="text-xs text-slate-400">Current</div>
              <div className="text-sm font-semibold text-white">
                {formatValue(selectedData.current, selectedIndicatorInfo?.format || '')}
              </div>
            </div>
            <div className="bg-slate-700 rounded px-3 py-2">
              <div className="text-xs text-slate-400">YoY Change</div>
              <div
                className={`text-sm font-semibold ${
                  selectedData.change >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {selectedData.change >= 0 ? '+' : ''}
                {formatValue(Math.abs(selectedData.change), selectedIndicatorInfo?.format || '')}
              </div>
            </div>
            <div className="bg-slate-700 rounded px-3 py-2">
              <div className="text-xs text-slate-400">% Change</div>
              <div
                className={`text-sm font-semibold ${
                  selectedData.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {selectedData.changePercent >= 0 ? '+' : ''}
                {selectedData.changePercent.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedData?.loading && (
        <div className="animate-pulse">
          <div className="h-48 bg-slate-700 rounded mb-4"></div>
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      )}

      {selectedData?.error && (
        <div className="text-center py-8 text-red-400 text-sm">
          Failed to load {selectedData.name} data
        </div>
      )}
    </div>
  );
}
