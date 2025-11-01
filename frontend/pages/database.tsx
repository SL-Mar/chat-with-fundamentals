import { useState, useEffect } from 'react'
import { api } from '../lib/api'

interface DataStatus {
  available: boolean
  record_count?: number
  last_update?: string
  date_range?: string
}

interface TickerInfo {
  ticker: string
  name: string
  exchange: string
  ohlcv: DataStatus
  fundamentals: DataStatus
  news: DataStatus
  dividends: DataStatus
  completeness_score: number
}

interface TickerInventory {
  total_tickers: number
  tickers: TickerInfo[]
}

export default function AdminPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [inventory, setInventory] = useState<TickerInventory | null>(null)
  const [search, setSearch] = useState('')
  const [filterMissing, setFilterMissing] = useState(false)
  const [expandedHealth, setExpandedHealth] = useState(false)
  const [refreshingTicker, setRefreshingTicker] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      const data = await api.fetchDatabaseStats()
      setStats(data)
    } catch (error: any) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchInventory = async () => {
    try {
      setLoading(true)
      const data = await api.fetchTickerInventory(search || undefined, filterMissing, 100, 0)
      setInventory(data)
    } catch (error: any) {
      setMessage({ type: 'error', text: `Failed to fetch inventory: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  const populateCompanies = async (limit: number) => {
    setLoading(true)
    setMessage({ type: 'info', text: `Populating ${limit} companies... This may take a few minutes.` })

    try {
      const data = await api.populateCompanies(limit)
      setMessage({ type: 'success', text: `✅ Success! Added ${data.companies_added} companies. Total: ${data.total_companies}` })
      await fetchStats()
      await fetchInventory()
    } catch (error: any) {
      setMessage({ type: 'error', text: `❌ Error: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  const populateFromETF = async (etfTicker: string, maxHoldings?: number, description?: string) => {
    setLoading(true)
    setMessage({ type: 'info', text: `Loading ${description || etfTicker} holdings... This may take a minute.` })

    try {
      const data = await api.populateFromETF(etfTicker, 'US', maxHoldings)
      setMessage({
        type: 'success',
        text: `✅ Success! Added ${data.added} stocks from ${etfTicker} (skipped ${data.skipped} existing). Total holdings: ${data.total_holdings}`
      })
      await fetchStats()
      await fetchInventory()
    } catch (error: any) {
      setMessage({ type: 'error', text: `❌ Error: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  const refreshAllData = async (dataType: string) => {
    setLoading(true)
    setMessage({ type: 'info', text: `Refreshing ${dataType} for all companies...` })

    try {
      let result
      switch (dataType) {
        case 'ohlcv':
          result = await api.triggerOHLCVRefresh()
          break
        case 'fundamentals':
          result = await api.triggerFundamentalsRefresh()
          break
        case 'news':
          result = await api.triggerNewsRefresh()
          break
        case 'dividends':
          result = await api.triggerDividendsRefresh()
          break
        default:
          throw new Error('Unknown data type')
      }
      setMessage({ type: 'success', text: `✅ ${result.message}` })
      setTimeout(() => {
        fetchInventory()
        fetchStats() // Refresh stats to update counts
      }, 2000) // Refresh after 2 seconds
    } catch (error: any) {
      setMessage({ type: 'error', text: `❌ Error: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  const refreshTicker = async (ticker: string, dataTypes: string[]) => {
    setRefreshingTicker(ticker)
    setMessage({ type: 'info', text: `Refreshing ${dataTypes.join(', ')} for ${ticker}...` })

    try {
      const result = await api.refreshTicker(ticker, dataTypes)
      setMessage({ type: 'success', text: `✅ ${result.message}` })
      await fetchInventory()
      await fetchStats() // Refresh stats to update counts
    } catch (error: any) {
      setMessage({ type: 'error', text: `❌ Error: ${error.message}` })
    } finally {
      setRefreshingTicker(null)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchInventory()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInventory()
    }, 500)
    return () => clearTimeout(timer)
  }, [search, filterMissing])

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleDateString()
  }

  const getCompletenessColor = (score: number) => {
    if (score >= 75) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    if (score >= 25) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Database Management Dashboard</h1>
            <p className="text-gray-400 mt-1">Manage financial data for US equities</p>
          </div>
          <a href="/" className="text-indigo-400 hover:text-indigo-300">← Back to Home</a>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Quick Stats</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-700 rounded p-4">
                <div className="text-sm text-gray-400">Total Companies</div>
                <div className="text-2xl font-bold">{stats.statistics.total_companies}</div>
              </div>
              <div className="bg-gray-700 rounded p-4">
                <div className="text-sm text-gray-400">Active Companies</div>
                <div className="text-2xl font-bold">{stats.statistics.active_companies}</div>
              </div>
              <div className="bg-gray-700 rounded p-4">
                <div className="text-sm text-gray-400">Exchanges</div>
                <div className="text-2xl font-bold">{stats.statistics.exchanges}</div>
              </div>
              <div className="bg-gray-700 rounded p-4">
                <div className="text-sm text-gray-400">Sectors</div>
                <div className="text-2xl font-bold">{stats.statistics.sectors}</div>
              </div>
            </div>
          </div>
        )}

        {/* Database Population */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-2">Step 1: Database Population</h2>
          <p className="text-gray-400 text-sm mb-4">
            Load liquid US stocks from major index ETFs (one-time setup)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Large Cap */}
            <div className="bg-gray-700 rounded p-4">
              <div className="text-sm font-semibold text-gray-300 mb-2">📊 Large Cap (S&P 500)</div>
              <button
                onClick={() => populateFromETF('SPY', undefined, 'S&P 500 top holdings (99 stocks)')}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded"
              >
                {loading ? 'Loading...' : 'Load SPY Holdings'}
              </button>
              <p className="text-xs text-gray-400 mt-1">Top 99 S&P 500 stocks by weight</p>
            </div>

            {/* Total Market */}
            <div className="bg-gray-700 rounded p-4">
              <div className="text-sm font-semibold text-gray-300 mb-2">🌎 Total Market</div>
              <button
                onClick={() => populateFromETF('VTI', 1500, 'Top 1500 most liquid stocks')}
                disabled={loading}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded"
              >
                {loading ? 'Loading...' : 'Load VTI Top 1500'}
              </button>
              <p className="text-xs text-gray-400 mt-1">1500 most liquid US stocks (recommended)</p>
            </div>

            {/* Small Cap */}
            <div className="bg-gray-700 rounded p-4">
              <div className="text-sm font-semibold text-gray-300 mb-2">🔹 Small Cap (Russell 2000)</div>
              <button
                onClick={() => populateFromETF('IWM', undefined, 'Russell 2000 (1936 stocks)')}
                disabled={loading}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded"
              >
                {loading ? 'Loading...' : 'Load IWM Holdings'}
              </button>
              <p className="text-xs text-gray-400 mt-1">All Russell 2000 small cap stocks</p>
            </div>

            {/* Tech Heavy */}
            <div className="bg-gray-700 rounded p-4">
              <div className="text-sm font-semibold text-gray-300 mb-2">💻 Tech (Nasdaq 100)</div>
              <button
                onClick={() => populateFromETF('QQQ', undefined, 'Nasdaq 100 tech stocks')}
                disabled={loading}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white rounded"
              >
                {loading ? 'Loading...' : 'Load QQQ Holdings'}
              </button>
              <p className="text-xs text-gray-400 mt-1">Top Nasdaq 100 technology stocks</p>
            </div>
          </div>
        </div>

        {/* Bulk Data Refresh */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-2">Step 2: Bulk Data Refresh</h2>
          <p className="text-gray-400 text-sm mb-4">
            Refresh data for all companies in database
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => refreshAllData('ohlcv')}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded"
            >
              📈 All OHLCV
            </button>
            <button
              onClick={() => refreshAllData('fundamentals')}
              disabled={loading}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white rounded"
            >
              📊 All Fundamentals
            </button>
            <button
              onClick={() => refreshAllData('news')}
              disabled={loading}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded"
            >
              📰 All News
            </button>
            <button
              onClick={() => refreshAllData('dividends')}
              disabled={loading}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 text-white rounded"
            >
              💰 All Dividends
            </button>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`rounded-lg p-4 mb-6 ${
            message.type === 'error' ? 'bg-red-900/50 text-red-200' :
            message.type === 'success' ? 'bg-green-900/50 text-green-200' :
            'bg-blue-900/50 text-blue-200'
          }`}>
            <pre className="whitespace-pre-wrap font-mono text-sm">{message.text}</pre>
          </div>
        )}

        {/* Ticker Inventory */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Ticker Inventory</h2>
            <button
              onClick={fetchInventory}
              disabled={loading}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
            >
              🔄 Refresh
            </button>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="Search ticker or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-indigo-500 outline-none"
            />
            <label className="flex items-center gap-2 bg-gray-700 px-4 py-2 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={filterMissing}
                onChange={(e) => setFilterMissing(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Show only incomplete</span>
            </label>
          </div>

          {/* Inventory Table */}
          {inventory && (
            <div className="overflow-x-auto">
              <div className="text-sm text-gray-400 mb-2">
                Showing {inventory.tickers.length} of {inventory.total_tickers} tickers
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left">Ticker</th>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-center">OHLCV</th>
                    <th className="px-4 py-2 text-center">Fund.</th>
                    <th className="px-4 py-2 text-center">News</th>
                    <th className="px-4 py-2 text-center">Div.</th>
                    <th className="px-4 py-2 text-center">Score</th>
                    <th className="px-4 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.tickers.map((ticker) => (
                    <tr key={ticker.ticker} className="border-b border-gray-700 hover:bg-gray-700/50">
                      <td className="px-4 py-3 font-mono font-semibold">{ticker.ticker}</td>
                      <td className="px-4 py-3 text-gray-300 truncate max-w-xs">{ticker.name}</td>

                      {/* OHLCV */}
                      <td className="px-4 py-3 text-center">
                        {ticker.ohlcv.available ? (
                          <div>
                            <div className="text-green-400">✅ {ticker.ohlcv.record_count}</div>
                            <div className="text-xs text-gray-500">{formatDate(ticker.ohlcv.last_update)}</div>
                          </div>
                        ) : (
                          <div className="text-red-400">❌</div>
                        )}
                      </td>

                      {/* Fundamentals */}
                      <td className="px-4 py-3 text-center">
                        {ticker.fundamentals.available ? (
                          <div>
                            <div className="text-green-400">✅</div>
                            <div className="text-xs text-gray-500">{formatDate(ticker.fundamentals.last_update)}</div>
                          </div>
                        ) : (
                          <div className="text-red-400">❌</div>
                        )}
                      </td>

                      {/* News */}
                      <td className="px-4 py-3 text-center">
                        {ticker.news.available ? (
                          <div>
                            <div className="text-green-400">✅ {ticker.news.record_count}</div>
                            <div className="text-xs text-gray-500">{formatDate(ticker.news.last_update)}</div>
                          </div>
                        ) : (
                          <div className="text-red-400">❌</div>
                        )}
                      </td>

                      {/* Dividends */}
                      <td className="px-4 py-3 text-center">
                        {ticker.dividends.available ? (
                          <div>
                            <div className="text-green-400">✅ {ticker.dividends.record_count}</div>
                            <div className="text-xs text-gray-500">{formatDate(ticker.dividends.last_update)}</div>
                          </div>
                        ) : (
                          <div className="text-red-400">❌</div>
                        )}
                      </td>

                      {/* Completeness Score */}
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${getCompletenessColor(ticker.completeness_score)}`}>
                          {ticker.completeness_score}%
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => refreshTicker(ticker.ticker, ['ohlcv', 'fundamentals', 'news', 'dividends'])}
                          disabled={refreshingTicker === ticker.ticker}
                          className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white rounded"
                        >
                          {refreshingTicker === ticker.ticker ? '⏳' : '🔄 Refresh'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {inventory.tickers.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No tickers found. {filterMissing && 'Try unchecking "Show only incomplete".'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* System Health (Collapsible) */}
        <div className="bg-gray-800 rounded-lg p-6">
          <button
            onClick={() => setExpandedHealth(!expandedHealth)}
            className="w-full flex items-center justify-between text-xl font-bold"
          >
            <span>System Health</span>
            <span className="text-2xl">{expandedHealth ? '▼' : '▶'}</span>
          </button>

          {expandedHealth && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-700 rounded p-4">
                <div className="text-sm text-gray-400">Database</div>
                <div className="text-lg font-semibold text-green-400">✅ Healthy</div>
              </div>
              <div className="bg-gray-700 rounded p-4">
                <div className="text-sm text-gray-400">Redis Cache</div>
                <div className="text-lg font-semibold text-green-400">✅ Available</div>
              </div>
              <div className="bg-gray-700 rounded p-4">
                <div className="text-sm text-gray-400">API Status</div>
                <div className="text-lg font-semibold text-green-400">✅ Online</div>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-900/30 border border-blue-700 rounded-lg p-4">
          <p className="text-sm text-blue-200">
            <strong>ℹ️ Usage:</strong> First populate companies (Step 1), then refresh data types (Step 2).
            Use the ticker inventory to monitor data completeness and refresh individual tickers as needed.
          </p>
        </div>
      </div>
    </div>
  )
}
