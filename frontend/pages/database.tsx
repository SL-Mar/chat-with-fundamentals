import { useState, useEffect } from 'react'
import { api } from '../lib/api'

interface DataStatus {
  available: boolean
  record_count?: number
  last_update?: string
  date_range?: string
}

interface IntradayStatus {
  available: boolean
  timeframes?: {
    '1m'?: number
    '5m'?: number
    '15m'?: number
    '1h'?: number
  }
  last_update?: string
}

interface TickerInfo {
  ticker: string
  name: string
  exchange: string
  ohlcv: DataStatus
  intraday?: IntradayStatus
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
  const [intradayStats, setIntradayStats] = useState<any>(null)
  const [inventory, setInventory] = useState<TickerInventory | null>(null)
  const [search, setSearch] = useState('')
  const [filterMissing, setFilterMissing] = useState(false)
  const [expandedHealth, setExpandedHealth] = useState(false)
  const [refreshingTicker, setRefreshingTicker] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'stocks' | 'etfs' | 'currencies' | 'macro'>('stocks')
  const [multiAssetView, setMultiAssetView] = useState(false)

  const fetchStats = async () => {
    try {
      const data = await api.fetchDatabaseStats()
      setStats(data)
    } catch (error: any) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchIntradayStats = async () => {
    try {
      const data = await api.fetchIntradayMetrics()
      setIntradayStats(data)
    } catch (error: any) {
      console.error('Error fetching intraday stats:', error)
    }
  }

  const fetchInventory = async () => {
    try {
      setLoading(true)
      const data = await api.fetchTickerInventory(search || undefined, filterMissing, 1000, 0)
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
    fetchIntradayStats()
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

  const getFreshnessStatus = (lastUpdate?: string): { color: string; emoji: string; label: string } => {
    if (!lastUpdate) return { color: 'text-red-400', emoji: '❌', label: 'Missing' }

    const daysSince = Math.floor((Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24))

    if (daysSince === 0) return { color: 'text-green-400', emoji: '🟢', label: 'Today' }
    if (daysSince === 1) return { color: 'text-green-400', emoji: '🟢', label: '1d ago' }
    if (daysSince <= 7) return { color: 'text-green-300', emoji: '🟢', label: `${daysSince}d ago` }
    if (daysSince <= 30) return { color: 'text-yellow-400', emoji: '🟡', label: `${daysSince}d ago` }
    if (daysSince <= 90) return { color: 'text-orange-400', emoji: '🟠', label: `${daysSince}d ago` }
    return { color: 'text-red-400', emoji: '🔴', label: `${daysSince}d ago` }
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

        {/* Multi-Asset Data Coverage Overview */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Data Coverage Overview</h2>
            <button
              onClick={() => setMultiAssetView(!multiAssetView)}
              className="text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              {multiAssetView ? 'Compact View' : 'Detailed View'}
            </button>
          </div>

          {multiAssetView ? (
            /* Detailed Matrix View */
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left">Asset Type</th>
                    <th className="px-4 py-2 text-center">Count</th>
                    <th className="px-4 py-2 text-center">OHLCV</th>
                    <th className="px-4 py-2 text-center">Intraday</th>
                    <th className="px-4 py-2 text-center">Fundamentals</th>
                    <th className="px-4 py-2 text-center">News</th>
                    <th className="px-4 py-2 text-center">Other Data</th>
                    <th className="px-4 py-2 text-center">Completeness</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="px-4 py-3 font-semibold">📈 US Stocks</td>
                    <td className="px-4 py-3 text-center">{stats?.statistics.total_companies || 0}</td>
                    <td className="px-4 py-3 text-center"><span className="text-green-400">✅</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-green-400">✅</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-green-400">✅</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-green-400">✅</span></td>
                    <td className="px-4 py-3 text-center text-xs text-gray-400">Dividends, Splits</td>
                    <td className="px-4 py-3 text-center"><span className="text-green-400 font-bold">95%</span></td>
                  </tr>
                  <tr className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="px-4 py-3 font-semibold">📊 ETFs</td>
                    <td className="px-4 py-3 text-center">~100</td>
                    <td className="px-4 py-3 text-center"><span className="text-green-400">✅</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-green-400">✅</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-green-400">✅</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-green-400">✅</span></td>
                    <td className="px-4 py-3 text-center text-xs text-gray-400">Holdings</td>
                    <td className="px-4 py-3 text-center"><span className="text-green-400 font-bold">90%</span></td>
                  </tr>
                  <tr className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="px-4 py-3 font-semibold">💱 Currencies</td>
                    <td className="px-4 py-3 text-center">~50</td>
                    <td className="px-4 py-3 text-center"><span className="text-green-400">✅</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-green-400">✅</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-gray-600">N/A</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-yellow-400">⚠️</span></td>
                    <td className="px-4 py-3 text-center text-xs text-gray-400">-</td>
                    <td className="px-4 py-3 text-center"><span className="text-yellow-400 font-bold">70%</span></td>
                  </tr>
                  <tr className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="px-4 py-3 font-semibold">🌍 Macro Indicators</td>
                    <td className="px-4 py-3 text-center">13</td>
                    <td className="px-4 py-3 text-center"><span className="text-green-400">✅</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-gray-600">N/A</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-gray-600">N/A</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-gray-600">N/A</span></td>
                    <td className="px-4 py-3 text-center text-xs text-gray-400">Economic Events</td>
                    <td className="px-4 py-3 text-center"><span className="text-green-400 font-bold">100%</span></td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-3 text-xs text-gray-400">
                <strong>Legend:</strong> ✅ Available | ⚠️ Partial | ❌ Missing | N/A Not Applicable
              </div>
            </div>
          ) : (
            /* Compact Card View */
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-700 rounded p-4 border-l-4 border-blue-500">
                <div className="text-sm text-gray-400 mb-1">US Stocks</div>
                <div className="text-2xl font-bold">{stats?.statistics.total_companies || 0}</div>
                <div className="text-xs text-green-400 mt-1">📈 95% complete</div>
              </div>
              <div className="bg-gray-700 rounded p-4 border-l-4 border-purple-500">
                <div className="text-sm text-gray-400 mb-1">ETFs</div>
                <div className="text-2xl font-bold">~100</div>
                <div className="text-xs text-green-400 mt-1">📊 90% complete</div>
              </div>
              <div className="bg-gray-700 rounded p-4 border-l-4 border-green-500">
                <div className="text-sm text-gray-400 mb-1">Currencies</div>
                <div className="text-2xl font-bold">~50</div>
                <div className="text-xs text-yellow-400 mt-1">💱 70% complete</div>
              </div>
              <div className="bg-gray-700 rounded p-4 border-l-4 border-orange-500">
                <div className="text-sm text-gray-400 mb-1">Macro Indicators</div>
                <div className="text-2xl font-bold">13</div>
                <div className="text-xs text-green-400 mt-1">🌍 100% complete</div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Stock Database Stats</h2>
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

        {/* Data Availability by Type */}
        {stats?.data_availability && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Data Availability</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gray-700 rounded p-4 border-l-4 border-green-500">
                <div className="text-sm text-gray-400 mb-1">OHLCV (Daily)</div>
                <div className="text-2xl font-bold">{stats.data_availability.ohlcv || 0}</div>
                <div className="text-xs text-gray-500 mt-1">stocks with EOD data</div>
              </div>
              <div className="bg-gray-700 rounded p-4 border-l-4 border-blue-500">
                <div className="text-sm text-gray-400 mb-1">Fundamentals</div>
                <div className="text-2xl font-bold">{stats.data_availability.fundamentals || 0}</div>
                <div className="text-xs text-gray-500 mt-1">stocks with fundamentals</div>
              </div>
              <div className="bg-gray-700 rounded p-4 border-l-4 border-purple-500">
                <div className="text-sm text-gray-400 mb-1">News</div>
                <div className="text-2xl font-bold">{stats.data_availability.news || 0}</div>
                <div className="text-xs text-gray-500 mt-1">stocks with news</div>
              </div>
              <div className="bg-gray-700 rounded p-4 border-l-4 border-yellow-500">
                <div className="text-sm text-gray-400 mb-1">Dividends</div>
                <div className="text-2xl font-bold">{stats.data_availability.dividends || 0}</div>
                <div className="text-xs text-gray-500 mt-1">stocks with dividends</div>
              </div>
              <div className="bg-gray-700 rounded p-4 border-l-4 border-cyan-500">
                <div className="text-sm text-gray-400 mb-1">Intraday</div>
                <div className="text-lg font-bold">
                  {Object.entries(stats.data_availability.intraday || {}).map(([tf, count]) => (
                    <div key={tf} className="text-sm">
                      {tf}: <span className="font-bold">{count}</span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-1">stocks by timeframe</div>
              </div>
            </div>
          </div>
        )}

        {/* Intraday Stats */}
        {intradayStats && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Intraday Data Status</h2>
              <div className="text-sm text-gray-400">
                DB Size: {intradayStats.database_size}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {['1m', '5m', '15m', '1h'].map((tf) => {
                const stats = intradayStats.timeframes[tf]
                return (
                  <div key={tf} className="bg-gray-700 rounded p-4">
                    <div className="text-sm text-gray-400 mb-2">{tf} Candles</div>
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-white">
                        {stats?.total_records?.toLocaleString() || '0'} records
                      </div>
                      <div className="text-xs text-gray-400">
                        {stats?.unique_tickers || 0} tickers
                      </div>
                      {stats?.last_timestamp && (
                        <div className="text-xs text-green-400">
                          Latest: {new Date(stats.last_timestamp).toLocaleString()}
                        </div>
                      )}
                      {!stats?.total_records && (
                        <div className="text-xs text-gray-500">No data</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {intradayStats.data_status && (
              <div className="mt-4 text-xs text-gray-400">
                Tracked ticker/timeframe combinations: {intradayStats.data_status.total_tracked_combinations}
              </div>
            )}
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

        {/* Stale Data Alerts */}
        {inventory && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6 border-l-4 border-yellow-500">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>⚠️ Stale Data Alerts</span>
              <span className="text-sm font-normal text-gray-400">(Data older than 7 days)</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {['ohlcv', 'fundamentals', 'news', 'dividends'].map((dataType) => {
                const staleCount = inventory.tickers.filter((t: any) => {
                  const status = t[dataType]
                  if (!status?.available || !status?.last_update) return false
                  const daysSince = Math.floor((Date.now() - new Date(status.last_update).getTime()) / (1000 * 60 * 60 * 24))
                  return daysSince > 7
                }).length

                return (
                  <div key={dataType} className="bg-gray-700 rounded p-4">
                    <div className="text-sm text-gray-400 capitalize mb-1">{dataType}</div>
                    <div className={`text-2xl font-bold ${staleCount > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {staleCount > 0 ? `${staleCount} stale` : '✓ Fresh'}
                    </div>
                    {staleCount > 0 && (
                      <button
                        onClick={() => refreshAllData(dataType)}
                        disabled={loading}
                        className="mt-2 w-full px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white rounded"
                      >
                        Refresh All
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
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

          {/* Loading Progress */}
          {loading && (
            <div className="mb-4 bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                <div className="text-sm text-gray-300">Loading ticker inventory...</div>
              </div>
              <div className="mt-2 w-full bg-gray-600 rounded-full h-2">
                <div className="bg-indigo-500 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
            </div>
          )}

          {/* Inventory Table */}
          {inventory && !loading && (
            <div>
              <div className="text-sm text-gray-400 mb-2">
                Showing {inventory.tickers.length} of {inventory.total_tickers} tickers
              </div>

              {/* Compact Table Layout */}
              <div className="max-h-[700px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-800 border-b border-gray-600">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs text-gray-400 font-semibold">Ticker</th>
                      <th className="text-left px-3 py-2 text-xs text-gray-400 font-semibold">Name</th>
                      <th className="text-center px-2 py-2 text-xs text-gray-400 font-semibold" title="End of Day">EOD</th>
                      <th className="text-center px-2 py-2 text-xs text-gray-400 font-semibold" title="Intraday">INT</th>
                      <th className="text-center px-2 py-2 text-xs text-gray-400 font-semibold" title="Fundamentals">FND</th>
                      <th className="text-center px-2 py-2 text-xs text-gray-400 font-semibold" title="News">NWS</th>
                      <th className="text-center px-2 py-2 text-xs text-gray-400 font-semibold" title="Dividends">DIV</th>
                      <th className="text-center px-2 py-2 text-xs text-gray-400 font-semibold">Score</th>
                      <th className="text-center px-2 py-2 text-xs text-gray-400 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.tickers.map((ticker) => (
                      <tr key={ticker.ticker} className="border-b border-gray-700 hover:bg-gray-750">
                        <td className="px-3 py-2">
                          <span className="font-mono font-bold text-white">{ticker.ticker}</span>
                        </td>
                        <td className="px-3 py-2 text-gray-300 max-w-xs truncate">{ticker.name}</td>
                        <td className="px-2 py-2 text-center" title={`OHLCV: ${ticker.ohlcv.record_count || 0} records`}>
                          {ticker.ohlcv.available ? getFreshnessStatus(ticker.ohlcv.last_update).emoji : '❌'}
                        </td>
                        <td className="px-2 py-2 text-center" title={`Intraday: ${ticker.intraday?.available ? Object.keys(ticker.intraday.timeframes || {}).join(', ') : 'None'}`}>
                          {ticker.intraday?.available ? getFreshnessStatus(ticker.intraday.last_update).emoji : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-2 py-2 text-center" title="Fundamentals">
                          {ticker.fundamentals.available
                            ? getFreshnessStatus(ticker.fundamentals.last_update).emoji
                            : (ticker.ticker.endsWith('.US') ? '❌' : <span className="text-xs text-gray-500">N/A</span>)
                          }
                        </td>
                        <td className="px-2 py-2 text-center" title={`News: ${ticker.news.record_count || 0} articles`}>
                          {ticker.news.available ? getFreshnessStatus(ticker.news.last_update).emoji : '❌'}
                        </td>
                        <td className="px-2 py-2 text-center" title={`Dividends: ${ticker.dividends.record_count || 0} records`}>
                          {ticker.dividends.available ? getFreshnessStatus(ticker.dividends.last_update).emoji : '❌'}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className={`text-xs px-2 py-1 rounded font-semibold ${
                            ticker.completeness_score === 100 ? 'bg-green-600' :
                            ticker.completeness_score >= 75 ? 'bg-blue-600' :
                            ticker.completeness_score >= 50 ? 'bg-yellow-600' :
                            'bg-red-600'
                          }`}>
                            {ticker.completeness_score}%
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => refreshSingleTicker(ticker.ticker)}
                            disabled={loading}
                            className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50"
                            title="Refresh data"
                          >
                            🔄
                          </button>
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
  )
}
