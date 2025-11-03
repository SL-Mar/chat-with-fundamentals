// pages/macro/[indicator].tsx - Macro Indicator Detail Page
'use client';

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Mapping frontend IDs to backend parameters
const INDICATOR_MAP: Record<string, {name: string, country: string, indicator: string, category: string}> = {
  // Government Bond Yields (10Y)
  'USA_10Y': { name: 'US 10-Year Treasury Yield', country: 'USA', indicator: 'government_bond_10y', category: 'Interest Rates' },
  'UK_10Y': { name: 'UK 10-Year Government Bond', country: 'UK', indicator: 'government_bond_10y', category: 'Interest Rates' },
  'DE_10Y': { name: 'Germany 10-Year Bund', country: 'DE', indicator: 'government_bond_10y', category: 'Interest Rates' },
  'FR_10Y': { name: 'France 10-Year Government Bond', country: 'FR', indicator: 'government_bond_10y', category: 'Interest Rates' },
  'IT_10Y': { name: 'Italy 10-Year Government Bond', country: 'IT', indicator: 'government_bond_10y', category: 'Interest Rates' },
  'JP_10Y': { name: 'Japan 10-Year Government Bond', country: 'JP', indicator: 'government_bond_10y', category: 'Interest Rates' },
  'CN_10Y': { name: 'China 10-Year Government Bond', country: 'CN', indicator: 'government_bond_10y', category: 'Interest Rates' },

  // EURIBOR Rates
  'EURIBOR_3M': { name: '3-Month EURIBOR', country: 'EUR', indicator: 'euribor_3m', category: 'Money Market' },
  'EURIBOR_6M': { name: '6-Month EURIBOR', country: 'EUR', indicator: 'euribor_6m', category: 'Money Market' },
  'EURIBOR_12M': { name: '12-Month EURIBOR', country: 'EUR', indicator: 'euribor_12m', category: 'Money Market' },

  // LIBOR Rates
  'LIBOR_USD_3M': { name: '3-Month USD LIBOR', country: 'USD', indicator: 'libor_usd_3m', category: 'Money Market' },
  'LIBOR_EUR_3M': { name: '3-Month EUR LIBOR', country: 'EUR', indicator: 'libor_eur_3m', category: 'Money Market' },
  'LIBOR_GBP_3M': { name: '3-Month GBP LIBOR', country: 'GBP', indicator: 'libor_gbp_3m', category: 'Money Market' },

  // Legacy indicator IDs (backward compatibility) - map to US 10Y Treasury
  'GDP': { name: 'US 10-Year Treasury Yield', country: 'USA', indicator: 'government_bond_10y', category: 'Interest Rates' },
  'UNEMPLOYMENT': { name: 'US 10-Year Treasury Yield', country: 'USA', indicator: 'government_bond_10y', category: 'Interest Rates' },
  'CPI': { name: 'US 10-Year Treasury Yield', country: 'USA', indicator: 'government_bond_10y', category: 'Interest Rates' },
  'INTEREST_RATE': { name: 'US 10-Year Treasury Yield', country: 'USA', indicator: 'government_bond_10y', category: 'Interest Rates' },
};

export default function MacroIndicatorPage() {
  const router = useRouter();
  const { indicator } = router.query;

  const [macroData, setMacroData] = useState<any[]>([]);
  const [economicEvents, setEconomicEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!indicator || typeof indicator !== 'string') return;
    fetchMacroData(indicator);
  }, [indicator]);

  const fetchMacroData = async (indicatorId: string) => {
    try {
      setLoading(true);
      setError(null);

      const meta = INDICATOR_MAP[indicatorId];
      if (!meta) {
        setError('Indicator not found');
        setLoading(false);
        return;
      }

      // Fetch last 2 years of data
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const fromDate = twoYearsAgo.toISOString().split('T')[0];

      const [indicatorResponse, eventsResponse] = await Promise.all([
        fetch(
          `http://localhost:8000/macro/indicator?country=${meta.country}&indicator=${meta.indicator}&from_date=${fromDate}`
        ),
        fetch(
          `http://localhost:8000/macro/economic-events?country=US&limit=10`
        )
      ]);

      if (!indicatorResponse.ok) {
        throw new Error(`Failed to fetch data: ${indicatorResponse.statusText}`);
      }

      const indicatorResult = await indicatorResponse.json();
      setMacroData(indicatorResult.data || []);

      if (eventsResponse.ok) {
        const eventsResult = await eventsResponse.json();
        setEconomicEvents(eventsResult.events || []);
      }

    } catch (err) {
      console.error('Failed to fetch macro data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!indicator || typeof indicator !== 'string') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <h1 className="text-2xl font-bold mb-2">Macro Indicator</h1>
          <p className="text-slate-400">No indicator specified</p>
        </div>
      </div>
    );
  }

  const meta = INDICATOR_MAP[indicator];

  if (!meta) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Indicator Not Found</h1>
          <p className="text-slate-400">The requested indicator does not exist</p>
          <button
            onClick={() => router.push('/macro')}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Back to Macro Indicators
          </button>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: macroData.map((d) => d.date),
    datasets: [
      {
        label: meta.name,
        data: macroData.map((d) => d.close),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: '#334155',
        },
        ticks: {
          color: '#94a3b8',
          maxTicksLimit: 10,
        },
      },
      y: {
        display: true,
        grid: {
          color: '#334155',
        },
        ticks: {
          color: '#94a3b8',
        },
      },
    },
  };

  const latestValue = macroData.length > 0 ? macroData[macroData.length - 1] : null;
  const change30d = macroData.length >= 30
    ? macroData[macroData.length - 1]?.close - macroData[macroData.length - 30]?.close
    : null;
  const changePercent30d = change30d && macroData[macroData.length - 30]?.close
    ? (change30d / macroData[macroData.length - 30].close) * 100
    : null;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-slate-700 flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-white">
                  {meta.name}
                </h1>
                <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded uppercase">
                  {meta.category}
                </span>
              </div>
              <p className="text-lg text-slate-400 mt-1">
                {meta.country}
              </p>
            </div>
          </div>

          {latestValue && (
            <div className="text-right">
              <div className="text-4xl font-bold text-white">
                {typeof latestValue.close === 'number' ? latestValue.close.toFixed(2) : 'N/A'}%
              </div>
              {typeof change30d === 'number' && typeof changePercent30d === 'number' && (
                <div className={`text-lg font-semibold ${change30d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {change30d >= 0 ? '+' : ''}{change30d.toFixed(2)} ({change30d >= 0 ? '+' : ''}{changePercent30d.toFixed(2)}%)
                </div>
              )}
              <div className="text-sm text-slate-400 mt-1">
                Last 30 days
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-400">Loading data...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <p className="text-red-400">Error: {error}</p>
          </div>
        )}

        {!loading && !error && macroData.length > 0 && (
          <div className="space-y-6">
            {/* Chart */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-bold mb-4">Historical Data (2 Years)</h2>
              <div style={{ height: '400px' }}>
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="text-sm text-slate-400 mb-1">Current Value</div>
                <div className="text-2xl font-bold">
                  {typeof latestValue?.close === 'number' ? latestValue.close.toFixed(2) : 'N/A'}%
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {latestValue?.date || 'N/A'}
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="text-sm text-slate-400 mb-1">30-Day Change</div>
                <div className={`text-2xl font-bold ${change30d && change30d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {typeof change30d === 'number' ? (
                    <>{change30d >= 0 ? '+' : ''}{change30d.toFixed(2)}</>
                  ) : 'N/A'}
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {typeof changePercent30d === 'number' ? `${changePercent30d.toFixed(2)}%` : ''}
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="text-sm text-slate-400 mb-1">Data Points</div>
                <div className="text-2xl font-bold">
                  {macroData.length}
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  Daily observations
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="text-sm text-slate-400 mb-1">Date Range</div>
                <div className="text-lg font-bold">
                  {macroData[0]?.date?.substring(0, 7)} - {latestValue?.date?.substring(0, 7)}
                </div>
              </div>
            </div>

            {/* About Section */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-xl font-bold mb-4">About This Indicator</h3>
              <div className="space-y-2 text-slate-300">
                <p><strong>Name:</strong> {meta.name}</p>
                <p><strong>Country:</strong> {meta.country}</p>
                <p><strong>Category:</strong> {meta.category}</p>
                <p><strong>Data Source:</strong> EODHD API</p>
                <p><strong>Frequency:</strong> Daily</p>
              </div>
            </div>

            {/* Economic Calendar */}
            {economicEvents.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-xl font-bold mb-4">Upcoming Economic Events</h3>
                <div className="space-y-3">
                  {economicEvents.map((event, idx) => (
                    <div key={idx} className="border-b border-slate-700 pb-3 last:border-b-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-white">{event.type}</div>
                          <div className="text-sm text-slate-400">
                            {new Date(event.date).toLocaleString()}
                          </div>
                        </div>
                        {event.estimate && (
                          <div className="text-sm">
                            <span className="text-slate-400">Est:</span>{' '}
                            <span className="text-white font-semibold">{event.estimate}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !error && macroData.length === 0 && (
          <div className="bg-slate-800 rounded-lg p-12 border border-slate-700 text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">No Data Available</h3>
            <p className="text-slate-400">
              No historical data found for this indicator.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
