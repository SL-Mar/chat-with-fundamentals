// pages/database-stats.tsx
'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDatabase,
  faServer,
  faRefresh,
  faChartBar,
  faTable,
  faClock,
  faCheckCircle,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

interface DatabaseStats {
  main_db: MainDBStats;
  intraday_db: IntradayDBStats;
  portfolios_db: PortfoliosDBStats;
  timestamp: string;
}

interface MainDBStats {
  companies_count: number;
  fundamentals: {
    tickers_with_data: number;
    total_records: number;
    date_range: {
      earliest: string | null;
      latest: string | null;
    };
  };
  daily_prices: {
    tickers_with_data: number;
    total_records: number;
    date_range: {
      earliest: string | null;
      latest: string | null;
    };
  };
  news: {
    tickers_with_news: number;
    total_articles: number;
  };
  dividends_count: number;
  analyst_ratings_count: number;
  insider_transactions_count: number;
  exchanges_count: number;
  sectors_count: number;
  industries_count: number;
  database_size: string;
}

interface IntradayDBStats {
  by_granularity: Array<{
    interval: string;
    tickers_with_data: number;
    total_records: number;
    date_range: {
      earliest: string | null;
      latest: string | null;
    };
  }>;
  overall: {
    unique_tickers: number;
    total_records: number;
  };
  recent_updates: Array<{
    ticker: string;
    interval: string;
    last_updated: string | null;
    status: string;
  }>;
  database_size: string;
}

interface PortfoliosDBStats {
  portfolios_count: number;
  total_holdings: number;
  unique_tickers: number;
  portfolio_details: Array<{
    id: number;
    name: string;
    holdings_count: number;
    total_value: number;
  }>;
  database_size: string;
}

export default function DatabaseStatsPage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const apiKey = localStorage.getItem('apiKey') || process.env.NEXT_PUBLIC_APP_API_KEY || '';

      const response = await fetch(`${apiUrl}/api/v2/database/stats`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch database stats: ${response.statusText}`);
      }

      const data = await response.json();
      setStats(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching database stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <FontAwesomeIcon icon={faDatabase} className="text-6xl mb-4 animate-pulse" />
          <p className="text-xl text-slate-400">Loading database statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="max-w-md">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-4xl mb-4 text-red-400" />
            <h2 className="text-xl font-bold text-red-300 mb-2">Failed to Load Database Stats</h2>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchStats}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded text-white font-semibold"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Database Statistics</h1>
            <p className="text-slate-400">
              Monitor database usage and data coverage across all databases
            </p>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <div className="text-sm text-slate-400">
                <FontAwesomeIcon icon={faClock} className="mr-2" />
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
            <button
              onClick={fetchStats}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded font-semibold transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faRefresh} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Main TimescaleDB */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-900/20 to-blue-800/20 rounded-lg p-6 border border-blue-700/50 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faServer} className="text-3xl text-blue-400" />
                <div>
                  <h2 className="text-2xl font-bold">Main Database (TimescaleDB)</h2>
                  <p className="text-sm text-slate-400">Primary data store: fundamentals, daily prices, news</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-400">Database Size</div>
                <div className="text-2xl font-bold text-blue-400">{stats.main_db.database_size}</div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-slate-800 rounded p-4">
                <div className="text-sm text-slate-400">Companies</div>
                <div className="text-2xl font-bold">{formatNumber(stats.main_db.companies_count)}</div>
              </div>
              <div className="bg-slate-800 rounded p-4">
                <div className="text-sm text-slate-400">Exchanges</div>
                <div className="text-2xl font-bold">{formatNumber(stats.main_db.exchanges_count)}</div>
              </div>
              <div className="bg-slate-800 rounded p-4">
                <div className="text-sm text-slate-400">Sectors</div>
                <div className="text-2xl font-bold">{formatNumber(stats.main_db.sectors_count)}</div>
              </div>
              <div className="bg-slate-800 rounded p-4">
                <div className="text-sm text-slate-400">Industries</div>
                <div className="text-2xl font-bold">{formatNumber(stats.main_db.industries_count)}</div>
              </div>
            </div>

            {/* Detailed Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fundamentals */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faChartBar} className="text-green-400" />
                  Fundamentals
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tickers with Data:</span>
                    <span className="font-semibold">{formatNumber(stats.main_db.fundamentals.tickers_with_data)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Records:</span>
                    <span className="font-semibold">{formatNumber(stats.main_db.fundamentals.total_records)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date Range:</span>
                    <span className="font-semibold">
                      {formatDate(stats.main_db.fundamentals.date_range.earliest)} →{' '}
                      {formatDate(stats.main_db.fundamentals.date_range.latest)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Daily Prices */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faChartBar} className="text-yellow-400" />
                  Daily Prices (OHLCV)
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tickers with Data:</span>
                    <span className="font-semibold">{formatNumber(stats.main_db.daily_prices.tickers_with_data)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Records:</span>
                    <span className="font-semibold">{formatNumber(stats.main_db.daily_prices.total_records)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date Range:</span>
                    <span className="font-semibold">
                      {formatDate(stats.main_db.daily_prices.date_range.earliest)} →{' '}
                      {formatDate(stats.main_db.daily_prices.date_range.latest)}
                    </span>
                  </div>
                </div>
              </div>

              {/* News */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faTable} className="text-purple-400" />
                  News
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tickers with News:</span>
                    <span className="font-semibold">{formatNumber(stats.main_db.news.tickers_with_news)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Articles:</span>
                    <span className="font-semibold">{formatNumber(stats.main_db.news.total_articles)}</span>
                  </div>
                </div>
              </div>

              {/* Other Datasets */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faTable} className="text-cyan-400" />
                  Other Datasets
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dividends:</span>
                    <span className="font-semibold">{formatNumber(stats.main_db.dividends_count)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Analyst Ratings:</span>
                    <span className="font-semibold">{formatNumber(stats.main_db.analyst_ratings_count)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Insider Transactions:</span>
                    <span className="font-semibold">{formatNumber(stats.main_db.insider_transactions_count)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Intraday TimescaleDB */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-orange-900/20 to-orange-800/20 rounded-lg p-6 border border-orange-700/50 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faDatabase} className="text-3xl text-orange-400" />
                <div>
                  <h2 className="text-2xl font-bold">Intraday Database (TimescaleDB)</h2>
                  <p className="text-sm text-slate-400">High-frequency time-series data</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-400">Database Size</div>
                <div className="text-2xl font-bold text-orange-400">{stats.intraday_db.database_size}</div>
              </div>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-800 rounded p-4">
                <div className="text-sm text-slate-400">Unique Tickers</div>
                <div className="text-2xl font-bold">{formatNumber(stats.intraday_db.overall.unique_tickers)}</div>
              </div>
              <div className="bg-slate-800 rounded p-4">
                <div className="text-sm text-slate-400">Total Records</div>
                <div className="text-2xl font-bold">{formatNumber(stats.intraday_db.overall.total_records)}</div>
              </div>
            </div>

            {/* By Granularity */}
            <div className="bg-slate-800 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-bold mb-3">Data by Granularity</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2">Interval</th>
                      <th className="text-right py-2">Tickers</th>
                      <th className="text-right py-2">Records</th>
                      <th className="text-right py-2">Date Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.intraday_db.by_granularity.map((gran) => (
                      <tr key={gran.interval} className="border-b border-slate-700">
                        <td className="py-2 font-semibold">{gran.interval}</td>
                        <td className="text-right py-2">{formatNumber(gran.tickers_with_data)}</td>
                        <td className="text-right py-2">{formatNumber(gran.total_records)}</td>
                        <td className="text-right py-2 text-slate-400">
                          {formatDate(gran.date_range.earliest)} → {formatDate(gran.date_range.latest)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Updates */}
            {stats.intraday_db.recent_updates.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="text-lg font-bold mb-3">Recent Updates (Top 10)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-2">Ticker</th>
                        <th className="text-left py-2">Interval</th>
                        <th className="text-right py-2">Last Updated</th>
                        <th className="text-right py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.intraday_db.recent_updates.map((update, idx) => (
                        <tr key={idx} className="border-b border-slate-700">
                          <td className="py-2 font-semibold">{update.ticker}</td>
                          <td className="py-2">{update.interval}</td>
                          <td className="text-right py-2 text-slate-400">
                            {update.last_updated ? new Date(update.last_updated).toLocaleString() : 'N/A'}
                          </td>
                          <td className="text-right py-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                update.status === 'success'
                                  ? 'bg-green-900/20 text-green-400'
                                  : 'bg-red-900/20 text-red-400'
                              }`}
                            >
                              {update.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Portfolios SQLite */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-purple-900/20 to-purple-800/20 rounded-lg p-6 border border-purple-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faDatabase} className="text-3xl text-purple-400" />
                <div>
                  <h2 className="text-2xl font-bold">Portfolios Database (SQLite)</h2>
                  <p className="text-sm text-slate-400">User portfolios and holdings</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-400">Database Size</div>
                <div className="text-2xl font-bold text-purple-400">{stats.portfolios_db.database_size}</div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-800 rounded p-4">
                <div className="text-sm text-slate-400">Portfolios</div>
                <div className="text-2xl font-bold">{formatNumber(stats.portfolios_db.portfolios_count)}</div>
              </div>
              <div className="bg-slate-800 rounded p-4">
                <div className="text-sm text-slate-400">Total Holdings</div>
                <div className="text-2xl font-bold">{formatNumber(stats.portfolios_db.total_holdings)}</div>
              </div>
              <div className="bg-slate-800 rounded p-4">
                <div className="text-sm text-slate-400">Unique Tickers</div>
                <div className="text-2xl font-bold">{formatNumber(stats.portfolios_db.unique_tickers)}</div>
              </div>
            </div>

            {/* Portfolio Details */}
            {stats.portfolios_db.portfolio_details.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="text-lg font-bold mb-3">Portfolio Details</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-2">ID</th>
                        <th className="text-left py-2">Name</th>
                        <th className="text-right py-2">Holdings</th>
                        <th className="text-right py-2">Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.portfolios_db.portfolio_details.map((portfolio) => (
                        <tr key={portfolio.id} className="border-b border-slate-700">
                          <td className="py-2">{portfolio.id}</td>
                          <td className="py-2 font-semibold">{portfolio.name}</td>
                          <td className="text-right py-2">{formatNumber(portfolio.holdings_count)}</td>
                          <td className="text-right py-2 font-semibold text-green-400">
                            {formatCurrency(portfolio.total_value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
