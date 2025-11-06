// pages/database-manager.tsx
'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDatabase,
  faChartLine,
  faClock,
  faFolderOpen,
  faPlus,
  faRefresh,
  faCheckCircle,
  faExclamationCircle,
  faServer,
  faChartBar,
  faTable,
  faCog,
  faTachometerAlt
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
    date_range: { earliest: string | null; latest: string | null };
  };
  daily_prices: {
    tickers_with_data: number;
    total_records: number;
    date_range: { earliest: string | null; latest: string | null };
  };
  news: {
    tickers_with_news: number;
    total_articles: number;
    date_range: { earliest: string | null; latest: string | null };
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
    date_range: { earliest: string | null; latest: string | null };
  }>;
  overall: { unique_tickers: number; total_records: number };
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

interface TickerInfo {
  ticker: string;
  type: 'stock' | 'etf' | 'forex';
}

interface MainInventory {
  fundamentals: TickerInfo[];
  daily_prices: TickerInfo[];
  news: TickerInfo[];
}

interface IntradayInventory {
  [timeframe: string]: TickerInfo[];
}

type InventoryView = 'eod' | 'fundamentals' | 'news' | 'intraday' | 'portfolios' | null;
type PopulateView = 'main' | 'intraday' | null;

interface PopulateTask {
  task_id: string;
  status: string;
  progress: number;
  total_tickers: number;
  processed_tickers: number;
  current_ticker: string | null;
  errors: string[];
}

export default function DatabaseManagerPage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [inventoryView, setInventoryView] = useState<InventoryView>(null);
  const [populateView, setPopulateView] = useState<PopulateView>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('etf');
  const [selectedETF, setSelectedETF] = useState<string>('SPY.US');
  const [customTickers, setCustomTickers] = useState<string>('');
  const [includeFundamentals, setIncludeFundamentals] = useState(true);
  const [includePrices, setIncludePrices] = useState(true);
  const [priceDays, setPriceDays] = useState(365);
  const [populateTask, setPopulateTask] = useState<PopulateTask | null>(null);
  const [isPopulating, setIsPopulating] = useState(false);
  const [mainInventory, setMainInventory] = useState<MainInventory | null>(null);
  const [intradayInventory, setIntradayInventory] = useState<IntradayInventory | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const apiKey = localStorage.getItem('apiKey') || process.env.NEXT_PUBLIC_APP_API_KEY || '';

      const response = await fetch(`${apiUrl}/api/v2/database/stats`, {
        headers: { 'X-API-Key': apiKey },
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

  const formatNumber = (num: number): string => num.toLocaleString();
  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  // Get color class for asset type
  const getAssetTypeColor = (type: 'stock' | 'etf' | 'forex') => {
    switch (type) {
      case 'etf':
        return 'text-blue-400'; // Blue for ETFs
      case 'stock':
        return 'text-green-400'; // Green for stocks
      case 'forex':
        return 'text-yellow-400'; // Yellow for forex
      default:
        return 'text-slate-300';
    }
  };

  const handlePopulate = async () => {
    try {
      setIsPopulating(true);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const apiKey = localStorage.getItem('apiKey') || process.env.NEXT_PUBLIC_APP_API_KEY || '';

      const body: any = {
        method: selectedMethod,
        include_fundamentals: includeFundamentals,
        include_prices: includePrices,
        price_days: priceDays,
      };

      if (selectedMethod === 'etf') {
        body.source = selectedETF;
      } else if (selectedMethod === 'custom') {
        body.tickers = customTickers.split(/[\s,]+/).filter((t) => t.trim());
      }

      const response = await fetch(`${apiUrl}/api/v2/database/populate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to start population');
      }

      const data = await response.json();

      // Start polling for progress
      pollProgress(data.task_id);
    } catch (err: any) {
      alert(`Failed to start population: ${err.message}`);
      setIsPopulating(false);
    }
  };

  const pollProgress = async (taskId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const apiKey = localStorage.getItem('apiKey') || process.env.NEXT_PUBLIC_APP_API_KEY || '';

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${apiUrl}/api/v2/database/populate/${taskId}`, {
          headers: { 'X-API-Key': apiKey },
        });

        if (response.ok) {
          const task: PopulateTask = await response.json();
          setPopulateTask(task);

          if (task.status === 'completed' || task.status === 'failed') {
            clearInterval(interval);
            setIsPopulating(false);

            // Refresh stats after completion
            if (task.status === 'completed') {
              await fetchStats();
            }
          }
        }
      } catch (err) {
        console.error('Failed to poll progress:', err);
      }
    }, 2000); // Poll every 2 seconds
  };

  const fetchMainInventory = async () => {
    try {
      setInventoryLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const apiKey = localStorage.getItem('apiKey') || process.env.NEXT_PUBLIC_APP_API_KEY || '';

      const response = await fetch(`${apiUrl}/api/v2/database/inventory/main`, {
        headers: { 'X-API-Key': apiKey },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch inventory: ${response.statusText}`);
      }

      const data = await response.json();
      setMainInventory(data);
    } catch (err: any) {
      console.error('Error fetching main inventory:', err);
      alert(`Failed to load inventory: ${err.message}`);
    } finally {
      setInventoryLoading(false);
    }
  };

  const fetchIntradayInventory = async () => {
    try {
      setInventoryLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const apiKey = localStorage.getItem('apiKey') || process.env.NEXT_PUBLIC_APP_API_KEY || '';

      const response = await fetch(`${apiUrl}/api/v2/database/inventory/intraday`, {
        headers: { 'X-API-Key': apiKey },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch inventory: ${response.statusText}`);
      }

      const data = await response.json();
      setIntradayInventory(data);
    } catch (err: any) {
      console.error('Error fetching intraday inventory:', err);
      alert(`Failed to load inventory: ${err.message}`);
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleInventoryView = async (view: InventoryView) => {
    if (view === inventoryView) {
      // Close if clicking same view
      setInventoryView(null);
      return;
    }

    setInventoryView(view);

    // Fetch main inventory for eod, fundamentals, or news views
    if ((view === 'eod' || view === 'fundamentals' || view === 'news') && !mainInventory) {
      await fetchMainInventory();
    } else if (view === 'intraday' && !intradayInventory) {
      await fetchIntradayInventory();
    }
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <FontAwesomeIcon icon={faDatabase} className="text-6xl mb-4 animate-pulse" />
          <p className="text-xl text-slate-400">Loading database status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="max-w-md">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
            <FontAwesomeIcon icon={faExclamationCircle} className="text-4xl mb-4 text-red-400" />
            <h2 className="text-xl font-bold text-red-300 mb-2">Failed to Load Database Status</h2>
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

  const hasMainData = stats.main_db.companies_count > 0;
  const hasIntradayData = stats.intraday_db.overall.total_records > 0;
  const hasPortfolios = stats.portfolios_db.portfolios_count > 0;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Database Manager</h1>
            <p className="text-slate-400">Manage and monitor all databases</p>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <div className="text-sm text-slate-400">
                <FontAwesomeIcon icon={faClock} className="mr-2" />
                {lastUpdated.toLocaleTimeString()}
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

        {/* Database Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* EOD / Daily Prices Card */}
          <div className="bg-slate-800 rounded-lg border-2 border-slate-700 hover:border-green-500 transition-all">
            <div className="p-6">
              {/* Icon & Title */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-900/30 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faChartLine} className="text-2xl text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">EOD Prices</h3>
                    <p className="text-xs text-slate-400">TimescaleDB</p>
                  </div>
                </div>
                <FontAwesomeIcon
                  icon={stats.main_db.daily_prices.tickers_with_data > 0 ? faCheckCircle : faExclamationCircle}
                  className={`text-xl ${stats.main_db.daily_prices.tickers_with_data > 0 ? 'text-green-400' : 'text-yellow-400'}`}
                />
              </div>

              {/* Stats Summary */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Assets:</span>
                  <span className="font-semibold">{formatNumber(stats.main_db.daily_prices.tickers_with_data)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Records:</span>
                  <span className="font-semibold">{formatNumber(stats.main_db.daily_prices.total_records)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">From:</span>
                  <span className="font-semibold text-xs">
                    {stats.main_db.daily_prices.date_range.earliest ?
                      new Date(stats.main_db.daily_prices.date_range.earliest).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">To:</span>
                  <span className="font-semibold text-xs">
                    {stats.main_db.daily_prices.date_range.latest ?
                      new Date(stats.main_db.daily_prices.date_range.latest).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Size:</span>
                  <span className="font-semibold">{stats.main_db.database_size}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => handleInventoryView('eod')}
                  disabled={inventoryLoading}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={inventoryLoading ? faRefresh : faFolderOpen} className={inventoryLoading ? 'animate-spin' : ''} />
                  View Inventory
                </button>
                <button
                  onClick={() => setPopulateView('main')}
                  className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faPlus} />
                  Add Tickers
                </button>
              </div>
            </div>
          </div>

          {/* Fundamentals Card */}
          <div className="bg-slate-800 rounded-lg border-2 border-slate-700 hover:border-blue-500 transition-all">
            <div className="p-6">
              {/* Icon & Title */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faServer} className="text-2xl text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Fundamentals</h3>
                    <p className="text-xs text-slate-400">TimescaleDB</p>
                  </div>
                </div>
                <FontAwesomeIcon
                  icon={stats.main_db.fundamentals.tickers_with_data > 0 ? faCheckCircle : faExclamationCircle}
                  className={`text-xl ${stats.main_db.fundamentals.tickers_with_data > 0 ? 'text-green-400' : 'text-yellow-400'}`}
                />
              </div>

              {/* Stats Summary */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Assets:</span>
                  <span className="font-semibold">{formatNumber(stats.main_db.fundamentals.tickers_with_data)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Records:</span>
                  <span className="font-semibold">{formatNumber(stats.main_db.fundamentals.total_records)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">From:</span>
                  <span className="font-semibold text-xs">
                    {stats.main_db.fundamentals.date_range.earliest ?
                      new Date(stats.main_db.fundamentals.date_range.earliest).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">To:</span>
                  <span className="font-semibold text-xs">
                    {stats.main_db.fundamentals.date_range.latest ?
                      new Date(stats.main_db.fundamentals.date_range.latest).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Size:</span>
                  <span className="font-semibold">{stats.main_db.database_size}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => handleInventoryView('fundamentals')}
                  disabled={inventoryLoading}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={inventoryLoading ? faRefresh : faFolderOpen} className={inventoryLoading ? 'animate-spin' : ''} />
                  View Inventory
                </button>
                <button
                  onClick={() => setPopulateView('main')}
                  className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faPlus} />
                  Add Tickers
                </button>
              </div>
            </div>
          </div>

          {/* News Card */}
          <div className="bg-slate-800 rounded-lg border-2 border-slate-700 hover:border-yellow-500 transition-all">
            <div className="p-6">
              {/* Icon & Title */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-900/30 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faTable} className="text-2xl text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">News</h3>
                    <p className="text-xs text-slate-400">TimescaleDB</p>
                  </div>
                </div>
                <FontAwesomeIcon
                  icon={stats.main_db.news.tickers_with_news > 0 ? faCheckCircle : faExclamationCircle}
                  className={`text-xl ${stats.main_db.news.tickers_with_news > 0 ? 'text-green-400' : 'text-yellow-400'}`}
                />
              </div>

              {/* Stats Summary */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Assets:</span>
                  <span className="font-semibold">{formatNumber(stats.main_db.news.tickers_with_news)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Articles:</span>
                  <span className="font-semibold">{formatNumber(stats.main_db.news.total_articles)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">From:</span>
                  <span className="font-semibold text-xs">
                    {stats.main_db.news.date_range.earliest ?
                      new Date(stats.main_db.news.date_range.earliest).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">To:</span>
                  <span className="font-semibold text-xs">
                    {stats.main_db.news.date_range.latest ?
                      new Date(stats.main_db.news.date_range.latest).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Size:</span>
                  <span className="font-semibold">{stats.main_db.database_size}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => handleInventoryView('news')}
                  disabled={inventoryLoading}
                  className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={inventoryLoading ? faRefresh : faFolderOpen} className={inventoryLoading ? 'animate-spin' : ''} />
                  View Inventory
                </button>
                <button
                  onClick={() => setPopulateView('main')}
                  className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faPlus} />
                  Add Tickers
                </button>
              </div>
            </div>
          </div>

          {/* Intraday Database Card */}
          <div className="bg-slate-800 rounded-lg border-2 border-slate-700 hover:border-orange-500 transition-all">
            <div className="p-6">
              {/* Icon & Title */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-900/30 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faChartLine} className="text-2xl text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Intraday Data</h3>
                    <p className="text-xs text-slate-400">TimescaleDB</p>
                  </div>
                </div>
                <FontAwesomeIcon
                  icon={hasIntradayData ? faCheckCircle : faExclamationCircle}
                  className={`text-xl ${hasIntradayData ? 'text-green-400' : 'text-yellow-400'}`}
                />
              </div>

              {/* Stats Summary */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Assets:</span>
                  <span className="font-semibold">{formatNumber(stats.intraday_db.overall.unique_tickers)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Records:</span>
                  <span className="font-semibold">{formatNumber(stats.intraday_db.overall.total_records)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">From:</span>
                  <span className="font-semibold text-xs">
                    {(() => {
                      const earliestDates = stats.intraday_db.by_granularity
                        .map(g => g.date_range.earliest)
                        .filter(d => d);
                      const earliest = earliestDates.length > 0
                        ? new Date(Math.min(...earliestDates.map(d => new Date(d!).getTime())))
                        : null;
                      return earliest ? earliest.toLocaleDateString() : 'N/A';
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">To:</span>
                  <span className="font-semibold text-xs">
                    {(() => {
                      const latestDates = stats.intraday_db.by_granularity
                        .map(g => g.date_range.latest)
                        .filter(d => d);
                      const latest = latestDates.length > 0
                        ? new Date(Math.max(...latestDates.map(d => new Date(d!).getTime())))
                        : null;
                      return latest ? latest.toLocaleDateString() : 'N/A';
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Size:</span>
                  <span className="font-semibold">{stats.intraday_db.database_size}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => handleInventoryView('intraday')}
                  disabled={inventoryLoading}
                  className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={inventoryLoading ? faRefresh : faFolderOpen} className={inventoryLoading ? 'animate-spin' : ''} />
                  View Inventory
                </button>
                <button
                  onClick={() => setPopulateView('intraday')}
                  className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faPlus} />
                  Add Tickers
                </button>
              </div>
            </div>
          </div>

          {/* Portfolios Database Card */}
          <div className="bg-slate-800 rounded-lg border-2 border-slate-700 hover:border-purple-500 transition-all">
            <div className="p-6">
              {/* Icon & Title */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faChartBar} className="text-2xl text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Portfolios</h3>
                    <p className="text-xs text-slate-400">PostgreSQL</p>
                  </div>
                </div>
                <FontAwesomeIcon
                  icon={hasPortfolios ? faCheckCircle : faExclamationCircle}
                  className={`text-xl ${hasPortfolios ? 'text-green-400' : 'text-yellow-400'}`}
                />
              </div>

              {/* Stats Summary */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Portfolios:</span>
                  <span className="font-semibold">{formatNumber(stats.portfolios_db.portfolios_count)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Holdings:</span>
                  <span className="font-semibold">{formatNumber(stats.portfolios_db.total_holdings)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assets:</span>
                  <span className="font-semibold">{formatNumber(stats.portfolios_db.unique_tickers)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Size:</span>
                  <span className="font-semibold">{stats.portfolios_db.database_size}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => setInventoryView('portfolios')}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faFolderOpen} />
                  View Inventory
                </button>
                <button
                  onClick={() => window.location.href = '/portfolios'}
                  className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faPlus} />
                  Manage Portfolios
                </button>
              </div>
            </div>
          </div>

          {/* Settings / Configuration Card */}
          <div className="bg-slate-800 rounded-lg border-2 border-slate-700 hover:border-gray-500 transition-all">
            <div className="p-6">
              {/* Icon & Title */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-900/30 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faCog} className="text-2xl text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Settings</h3>
                    <p className="text-xs text-slate-400">Configuration</p>
                  </div>
                </div>
                <FontAwesomeIcon
                  icon={faCheckCircle}
                  className="text-xl text-green-400"
                />
              </div>

              {/* Stats Summary */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cache Warming:</span>
                  <span className="font-semibold text-green-400">Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Redis:</span>
                  <span className="font-semibold text-green-400">Connected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">API Keys:</span>
                  <span className="font-semibold text-green-400">Configured</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Environment:</span>
                  <span className="font-semibold">Development</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => alert('Settings panel coming soon')}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faCog} />
                  Configure Settings
                </button>
                <button
                  onClick={() => window.location.href = '/admin'}
                  className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faTachometerAlt} />
                  Admin Panel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Modal */}
        {inventoryView && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-5xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {inventoryView === 'eod' && 'EOD Prices - Ticker Inventory'}
                  {inventoryView === 'fundamentals' && 'Fundamentals - Ticker Inventory'}
                  {inventoryView === 'news' && 'News - Ticker Inventory'}
                  {inventoryView === 'intraday' && 'Intraday Data - Ticker Inventory'}
                  {inventoryView === 'portfolios' && 'Portfolios Inventory'}
                </h2>
                <button
                  onClick={() => setInventoryView(null)}
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto flex-1">
                {/* EOD Prices Inventory */}
                {inventoryView === 'eod' && (
                  <div>
                    {inventoryLoading && (
                      <div className="flex justify-center py-8">
                        <FontAwesomeIcon icon={faRefresh} className="text-4xl animate-spin text-green-400" />
                      </div>
                    )}

                    {!inventoryLoading && mainInventory && (
                      <div className="bg-slate-900 rounded-lg p-4">
                        <h3 className="text-lg font-bold mb-3">Tickers with EOD Price Data ({mainInventory.daily_prices.length})</h3>
                        <div className="text-xs text-slate-400 mb-2 flex gap-4">
                          <span><span className="text-green-400">●</span> Stock</span>
                          <span><span className="text-blue-400">●</span> ETF</span>
                          <span><span className="text-yellow-400">●</span> Forex</span>
                        </div>
                        <div className="text-sm max-h-96 overflow-y-auto bg-slate-800 p-3 rounded border border-slate-700">
                          {mainInventory.daily_prices.length > 0 ? (
                            <div className="space-y-1">
                              {mainInventory.daily_prices.map((item) => (
                                <div key={item.ticker} className={`hover:bg-slate-700 px-2 py-1 rounded transition-colors ${getAssetTypeColor(item.type)}`}>
                                  {item.ticker}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-500">No tickers with EOD price data</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Fundamentals Inventory */}
                {inventoryView === 'fundamentals' && (
                  <div>
                    {inventoryLoading && (
                      <div className="flex justify-center py-8">
                        <FontAwesomeIcon icon={faRefresh} className="text-4xl animate-spin text-blue-400" />
                      </div>
                    )}

                    {!inventoryLoading && mainInventory && (
                      <div className="bg-slate-900 rounded-lg p-4">
                        <h3 className="text-lg font-bold mb-3">Tickers with Fundamentals Data ({mainInventory.fundamentals.length})</h3>
                        <div className="text-xs text-slate-400 mb-2 flex gap-4">
                          <span><span className="text-green-400">●</span> Stock</span>
                          <span><span className="text-blue-400">●</span> ETF</span>
                          <span><span className="text-yellow-400">●</span> Forex</span>
                        </div>
                        <div className="text-sm max-h-96 overflow-y-auto bg-slate-800 p-3 rounded border border-slate-700">
                          {mainInventory.fundamentals.length > 0 ? (
                            <div className="space-y-1">
                              {mainInventory.fundamentals.map((item) => (
                                <div key={item.ticker} className={`hover:bg-slate-700 px-2 py-1 rounded transition-colors ${getAssetTypeColor(item.type)}`}>
                                  {item.ticker}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-500">No tickers with fundamentals data</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* News Inventory */}
                {inventoryView === 'news' && (
                  <div>
                    {inventoryLoading && (
                      <div className="flex justify-center py-8">
                        <FontAwesomeIcon icon={faRefresh} className="text-4xl animate-spin text-yellow-400" />
                      </div>
                    )}

                    {!inventoryLoading && mainInventory && (
                      <div className="bg-slate-900 rounded-lg p-4">
                        <h3 className="text-lg font-bold mb-3">Tickers with News Data ({mainInventory.news.length})</h3>
                        <div className="text-xs text-slate-400 mb-2 flex gap-4">
                          <span><span className="text-green-400">●</span> Stock</span>
                          <span><span className="text-blue-400">●</span> ETF</span>
                          <span><span className="text-yellow-400">●</span> Forex</span>
                        </div>
                        <div className="text-sm max-h-96 overflow-y-auto bg-slate-800 p-3 rounded border border-slate-700">
                          {mainInventory.news.length > 0 ? (
                            <div className="space-y-1">
                              {mainInventory.news.map((item) => (
                                <div key={item.ticker} className={`hover:bg-slate-700 px-2 py-1 rounded transition-colors ${getAssetTypeColor(item.type)}`}>
                                  {item.ticker}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-500">No tickers with news data</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {inventoryView === 'intraday' && (
                  <div className="space-y-6">
                    {inventoryLoading && (
                      <div className="flex justify-center py-8">
                        <FontAwesomeIcon icon={faRefresh} className="text-4xl animate-spin text-orange-400" />
                      </div>
                    )}

                    {!inventoryLoading && intradayInventory && (
                      <>
                        {/* Color legend */}
                        <div className="text-xs text-slate-400 flex gap-4 bg-slate-900 rounded-lg p-3">
                          <span><span className="text-green-400">●</span> Stock</span>
                          <span><span className="text-blue-400">●</span> ETF</span>
                          <span><span className="text-yellow-400">●</span> Forex</span>
                        </div>

                        {Object.entries(intradayInventory)
                          .sort((a, b) => {
                            const order = { '1m': 1, '5m': 2, '15m': 3, '1h': 4 };
                            return (order[a[0] as keyof typeof order] || 99) - (order[b[0] as keyof typeof order] || 99);
                          })
                          .map(([timeframe, tickers]) => {
                            // Find metadata for this timeframe
                            const metadata = stats.intraday_db.by_granularity.find(g => g.interval === timeframe);

                            return (
                              <div key={timeframe} className="bg-slate-900 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <h3 className="text-lg font-bold">{timeframe} Interval</h3>
                                  {metadata && (
                                    <div className="text-xs text-slate-400 text-right space-y-1">
                                      <div>Assets: <span className="text-slate-200 font-semibold">{formatNumber(metadata.tickers_with_data)}</span></div>
                                      <div>Records: <span className="text-slate-200 font-semibold">{formatNumber(metadata.total_records)}</span></div>
                                      {metadata.date_range.earliest && (
                                        <div>From: <span className="text-slate-200 font-semibold">{new Date(metadata.date_range.earliest).toLocaleDateString()}</span></div>
                                      )}
                                      {metadata.date_range.latest && (
                                        <div>To: <span className="text-slate-200 font-semibold">{new Date(metadata.date_range.latest).toLocaleDateString()}</span></div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="text-sm max-h-96 overflow-y-auto bg-slate-800 p-3 rounded border border-slate-700">
                                  {tickers.length > 0 ? (
                                    <div className="space-y-1">
                                      {tickers.map((item) => (
                                        <div key={item.ticker} className={`hover:bg-slate-700 px-2 py-1 rounded transition-colors ${getAssetTypeColor(item.type)}`}>
                                          {item.ticker}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-slate-500">No tickers for this timeframe</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </>
                    )}
                  </div>
                )}

                {inventoryView === 'portfolios' && (
                  <div className="space-y-6">
                    {/* Overall Stats */}
                    <div className="bg-slate-900 rounded-lg p-4">
                      <h3 className="text-lg font-bold mb-3">Overall Statistics</h3>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-slate-400">Portfolios</div>
                          <div className="text-xl font-bold">{formatNumber(stats.portfolios_db.portfolios_count)}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Total Holdings</div>
                          <div className="text-xl font-bold">{formatNumber(stats.portfolios_db.total_holdings)}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Unique Tickers</div>
                          <div className="text-xl font-bold">{formatNumber(stats.portfolios_db.unique_tickers)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Portfolio Details */}
                    {stats.portfolios_db.portfolio_details.length > 0 && (
                      <div className="bg-slate-900 rounded-lg p-4">
                        <h3 className="text-lg font-bold mb-3">Portfolio Details</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-700">
                                <th className="text-left py-2 px-3">Name</th>
                                <th className="text-right py-2 px-3">Holdings</th>
                                <th className="text-right py-2 px-3">Total Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stats.portfolios_db.portfolio_details.map((portfolio) => (
                                <tr key={portfolio.id} className="border-b border-slate-700">
                                  <td className="py-2 px-3 font-semibold">{portfolio.name}</td>
                                  <td className="text-right py-2 px-3">{formatNumber(portfolio.holdings_count)}</td>
                                  <td className="text-right py-2 px-3 text-green-400 font-semibold">
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
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-700 flex justify-end">
                <button
                  onClick={() => setInventoryView(null)}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Populate Modal */}
        {populateView && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Populate Database</h2>
                <button
                  onClick={() => {
                    setPopulateView(null);
                    setPopulateTask(null);
                  }}
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto flex-1">
                {!isPopulating && !populateTask ? (
                  <div className="space-y-6">
                    {/* Method Selection */}
                    <div>
                      <label className="block text-sm font-semibold mb-2">Population Method</label>
                      <select
                        value={selectedMethod}
                        onChange={(e) => setSelectedMethod(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                      >
                        <option value="etf">ETF Constituents</option>
                        <option value="custom">Custom Ticker List</option>
                      </select>
                    </div>

                    {/* ETF Selection */}
                    {selectedMethod === 'etf' && (
                      <div>
                        <label className="block text-sm font-semibold mb-2">Select ETF</label>
                        <select
                          value={selectedETF}
                          onChange={(e) => setSelectedETF(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                        >
                          <option value="SPY.US">SPY - S&P 500 (~500 stocks)</option>
                          <option value="QQQ.US">QQQ - NASDAQ 100 (~100 stocks)</option>
                          <option value="IWM.US">IWM - Russell 2000 (~2000 stocks)</option>
                          <option value="DIA.US">DIA - Dow Jones (~30 stocks)</option>
                          <option value="VTI.US">VTI - Total Stock Market (~3500 stocks)</option>
                        </select>
                        <p className="text-xs text-slate-400 mt-2">
                          This will fetch all constituents of the selected ETF and populate the database.
                        </p>
                      </div>
                    )}

                    {/* Custom Tickers */}
                    {selectedMethod === 'custom' && (
                      <div>
                        <label className="block text-sm font-semibold mb-2">Enter Tickers (comma or space separated)</label>
                        <textarea
                          value={customTickers}
                          onChange={(e) => setCustomTickers(e.target.value)}
                          placeholder="e.g., AAPL.US, MSFT.US, GOOGL.US"
                          className="w-full h-32 px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white resize-none"
                        />
                      </div>
                    )}

                    {/* Options */}
                    <div className="space-y-3">
                      <div>
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={includeFundamentals}
                            onChange={(e) => setIncludeFundamentals(e.target.checked)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Include Fundamentals (financials, balance sheet, etc.)</span>
                        </label>
                        <p className="text-xs text-slate-400 ml-7 mt-1">
                          Note: Fundamentals are only available for stocks, not for ETFs or forex pairs
                        </p>
                      </div>

                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={includePrices}
                          onChange={(e) => setIncludePrices(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Include Historical Prices</span>
                      </label>

                      {includePrices && (
                        <div className="ml-7">
                          <label className="block text-xs font-semibold mb-1">Days of history</label>
                          <input
                            type="number"
                            value={priceDays}
                            onChange={(e) => setPriceDays(parseInt(e.target.value))}
                            min="30"
                            max="3650"
                            className="w-32 px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                          />
                        </div>
                      )}
                    </div>

                    {/* Warning */}
                    <div className="bg-yellow-900/20 border border-yellow-700 rounded p-3">
                      <p className="text-sm text-yellow-400">
                        ⚠️ This operation may take several minutes depending on the number of stocks. The process runs in the background.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Progress Display */}
                    {populateTask && (
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-4xl mb-2">
                            {populateTask.status === 'completed' ? '✅' : populateTask.status === 'failed' ? '❌' : '⏳'}
                          </div>
                          <h3 className="text-xl font-bold">
                            {populateTask.status === 'completed' && 'Population Complete!'}
                            {populateTask.status === 'failed' && 'Population Failed'}
                            {populateTask.status === 'running' && 'Populating Database...'}
                          </h3>
                        </div>

                        {/* Progress Bar */}
                        <div className="bg-slate-700 rounded-full h-4 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full transition-all duration-300"
                            style={{ width: `${populateTask.progress}%` }}
                          />
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="bg-slate-900 rounded p-3">
                            <div className="text-slate-400">Progress</div>
                            <div className="text-xl font-bold">{populateTask.progress.toFixed(1)}%</div>
                          </div>
                          <div className="bg-slate-900 rounded p-3">
                            <div className="text-slate-400">Processed</div>
                            <div className="text-xl font-bold">
                              {populateTask.processed_tickers} / {populateTask.total_tickers}
                            </div>
                          </div>
                        </div>

                        {/* Current Ticker */}
                        {populateTask.current_ticker && populateTask.status === 'running' && (
                          <div className="text-sm text-center text-slate-400">
                            Processing: <span className="font-semibold text-white">{populateTask.current_ticker}</span>
                          </div>
                        )}

                        {/* Errors */}
                        {populateTask.errors.length > 0 && (
                          <div className="bg-red-900/20 border border-red-700 rounded p-3 max-h-40 overflow-y-auto">
                            <div className="text-sm font-semibold text-red-400 mb-2">
                              Errors ({populateTask.errors.length}):
                            </div>
                            <div className="text-xs text-red-300 space-y-1">
                              {populateTask.errors.slice(0, 10).map((error, idx) => (
                                <div key={idx}>• {error}</div>
                              ))}
                              {populateTask.errors.length > 10 && (
                                <div className="text-red-400">... and {populateTask.errors.length - 10} more</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
                {!isPopulating && !populateTask && (
                  <>
                    <button
                      onClick={() => setPopulateView(null)}
                      className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePopulate}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition-colors"
                    >
                      Start Population
                    </button>
                  </>
                )}
                {(isPopulating || populateTask) && (
                  <button
                    onClick={() => {
                      setPopulateView(null);
                      setPopulateTask(null);
                    }}
                    disabled={isPopulating}
                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded font-semibold transition-colors"
                  >
                    {isPopulating ? 'Running in Background...' : 'Close'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
