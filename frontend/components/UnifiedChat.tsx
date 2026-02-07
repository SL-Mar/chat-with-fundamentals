'use client'

/**
 * Unified Chat Component
 *
 * Supports two modes:
 * 1. Deep Analysis Mode - Full AI analysis with comprehensive reports (/analyzer/chat)
 * 2. Quick Query Mode - Fast database queries with dynamic panels (/chat/panels)
 */

import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Executive_Summary } from '../types/models'
import TradingViewChart from './TradingViewChart'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBolt, faMagnifyingGlass, faComments, faChartLine,
  faNewspaper, faCalendarDays, faBriefcase, faMoneyBillTrendUp,
  faChartArea, faBullseye, faUserTie, faPaperPlane, faHandWave,
  faChartColumn, faBrain, faWind, faChartSimple, faBullhorn, faChartBar,
  faTimesCircle
} from '@fortawesome/free-solid-svg-icons'

type ChatMode = 'deep' | 'quick'

interface Message {
  role: 'user' | 'assistant'
  content: string
  panels?: any[]
  data?: Executive_Summary
  timestamp: Date
}

export default function UnifiedChat() {
  const [mode, setMode] = useState<ChatMode>('quick')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const submitQuery = async (query: string) => {
    if (!query.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: query,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      if (mode === 'deep') {
        const result = await api.chatWithFundamentals(query)
        const assistantMessage: Message = {
          role: 'assistant',
          content: result.Ex_summary || 'Analysis complete',
          data: result,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        const result = await api.chatWithPanels(query,
          messages.map(m => ({ role: m.role, content: m.content }))
        )
        const assistantMessage: Message = {
          role: 'assistant',
          content: result.message,
          panels: result.panels,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (err: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${err.message}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitQuery(input)
  }

  const handleTileClick = (query: string) => {
    setInput(query)
    submitQuery(query)
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header with Mode Selector */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">AI Financial Assistant</h2>

          {/* Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('quick')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === 'quick'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <FontAwesomeIcon icon={faBolt} className="mr-2" />
              Quick Query
            </button>
            <button
              onClick={() => setMode('deep')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === 'deep'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} className="mr-2" />
              Deep Analysis
            </button>
          </div>
        </div>

        {/* Mode Description */}
        <p className="text-sm text-gray-400 mt-2 flex items-center">
          <FontAwesomeIcon icon={mode === 'quick' ? faBolt : faMagnifyingGlass} className="mr-2" />
          {mode === 'quick'
            ? 'Fast queries from database • Instant responses • Dynamic panels'
            : 'Comprehensive AI analysis • Full reports • Charts & metrics'
          }
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg mb-4 flex items-center justify-center">
              <FontAwesomeIcon icon={faComments} className="mr-2" />
              How can I help you today?
            </p>
            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
              <button
                onClick={() => handleTileClick('Show me AAPL dividends')}
                className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <p className="font-medium text-white flex items-center">
                  <FontAwesomeIcon icon={faMoneyBillTrendUp} className="mr-2" />
                  Dividend History
                </p>
                <p className="text-sm text-gray-400">Show me AAPL dividends</p>
              </button>
              <button
                onClick={() => handleTileClick('Analyze MSFT fundamentals')}
                className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <p className="font-medium text-white flex items-center">
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="mr-2" />
                  Deep Analysis
                </p>
                <p className="text-sm text-gray-400">Analyze MSFT fundamentals</p>
              </button>
              <button
                onClick={() => handleTileClick('Show TSLA price chart')}
                className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <p className="font-medium text-white flex items-center">
                  <FontAwesomeIcon icon={faChartLine} className="mr-2" />
                  Price Chart
                </p>
                <p className="text-sm text-gray-400">Show TSLA price chart</p>
              </button>
              <button
                onClick={() => handleTileClick('What are the top ETF holdings for SPY?')}
                className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <p className="font-medium text-white flex items-center">
                  <FontAwesomeIcon icon={faBullseye} className="mr-2" />
                  ETF Analysis
                </p>
                <p className="text-sm text-gray-400">Top ETF holdings for SPY</p>
              </button>
            </div>
          </div>
        )}

        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-100'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>

              {/* Render Dynamic Panels (Quick Mode) */}
              {message.panels && message.panels.length > 0 && (
                <div className="mt-4 space-y-4">
                  {message.panels.map((panel, pidx) => (
                    <DynamicPanel key={pidx} panel={panel} />
                  ))}
                </div>
              )}

              {/* Render Full Analysis (Deep Mode) */}
              {message.data && (
                <div className="mt-4">
                  <FullAnalysisView data={message.data} />
                </div>
              )}

              <p className="text-xs mt-2 opacity-50">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                <span className="text-gray-400 ml-2">Analyzing...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'quick'
                ? 'Ask anything... (e.g., "Show AAPL dividends")'
                : 'Request deep analysis... (e.g., "Analyze MSFT")'
            }
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {loading ? 'Thinking...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}

/**
 * Dynamic Panel Renderer
 * Renders different panel types based on backend response
 */
function DynamicPanel({ panel }: { panel: any }) {
  const { type, props } = panel

  switch (type) {
    case 'show_dividend_history':
      return <DividendHistoryPanel ticker={props.ticker} />
    case 'show_price_chart':
      return <PriceChartPanel ticker={props.ticker} interval={props.interval} />
    case 'show_analyst_ratings':
      return <AnalystRatingsPanel ticker={props.ticker} />
    case 'show_insider_transactions':
      return <InsiderTransactionsPanel ticker={props.ticker} limit={props.limit} />
    case 'show_etf_holdings':
      return <ETFHoldingsPanel ticker={props.ticker} />
    case 'show_news':
      return <NewsPanel ticker={props.ticker} limit={props.limit} />
    case 'show_live_price':
      return <LivePricePanel ticker={props.ticker} />
    case 'show_earnings_calendar':
      return <EarningsCalendarPanel fromDate={props.from_date} toDate={props.to_date} />
    case 'show_esg':
      return <ESGPanel ticker={props.ticker} />
    case 'show_shareholders':
      return <ShareholdersPanel ticker={props.ticker} />
    case 'show_sentiment':
      return <SentimentPanel ticker={props.ticker} />
    case 'show_stock_splits':
      return <StockSplitsPanel ticker={props.ticker} />
    case 'show_technical_screener':
      return <TechnicalScreenerPanel signal={props.signal} limit={props.limit} />
    case 'show_returns_distribution':
      return <ReturnsDistributionPanel ticker={props.ticker} period={props.period} />
    case 'show_cumulative_returns':
      return <CumulativeReturnsPanel ticker={props.ticker} period={props.period} />
    case 'show_market_cap_history':
      return <MarketCapHistoryPanel ticker={props.ticker} />
    case 'show_twitter_mentions':
      return <TwitterMentionsPanel ticker={props.ticker} limit={props.limit} />
    case 'show_ipo_calendar':
      return <IPOCalendarPanel fromDate={props.from_date} toDate={props.to_date} />
    case 'show_monte_carlo':
      return <MonteCarloPanel ticker={props.ticker} days={props.days} simulations={props.simulations} />
    case 'show_volatility_forecast':
      return <VolatilityForecastPanel ticker={props.ticker} lookback={props.lookback} />
    case 'show_performance_ratios':
      return <PerformanceRatiosPanel ticker={props.ticker} years={props.years} />
    case 'show_economic_events':
      return <EconomicEventsPanel fromDate={props.from_date} toDate={props.to_date} />
    case 'show_index_constituents':
      return <IndexConstituentsPanel index={props.index} />
    case 'show_logo':
      return <LogoPanel ticker={props.ticker} />
    case 'show_historical_constituents':
      return <HistoricalConstituentsPanel index={props.index} date={props.date} />
    case 'show_eod_extended':
      return <EODExtendedPanel ticker={props.ticker} />
    case 'show_technical_indicators':
      return <TechnicalIndicatorsPanel ticker={props.ticker} indicators={props.indicators} />
    case 'show_macro_indicators':
      return <MacroIndicatorsPanel indicators={props.indicators} />
    default:
      return <div className="text-gray-400">Unknown panel type: {type}</div>
  }
}

/**
 * Full Analysis View
 * Renders comprehensive analysis from Deep Mode
 */
function FullAnalysisView({ data }: { data: Executive_Summary }) {
  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center">
        <FontAwesomeIcon icon={faChartBar} className="mr-2" />
        Executive Summary
      </h3>
      <p className="text-gray-200">{data.Ex_summary}</p>

      {/* Add more sections as needed */}
      {data.Metrics && (
        <div className="mt-4">
          <h4 className="font-semibold text-white mb-2">Financial Metrics</h4>
          {/* Render metrics */}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// DYNAMIC PANEL IMPLEMENTATIONS
// ============================================================================

/**
 * Dividend History Panel
 * Fetches and displays dividend payment history
 */
function DividendHistoryPanel({ ticker }: { ticker: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await api.fetchDividendHistory(ticker)
        // Result has structure: { ticker: "AAPL.US", dividends: [...] }
        const dividends = Array.isArray(result) ? result : (result.dividends || result.data || [])
        setData(dividends.slice(0, 10)) // Show last 10 dividends
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch dividends')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ticker])

  if (loading) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-3 py-1">
            <div className="h-4 bg-gray-600 rounded w-3/4"></div>
            <div className="h-4 bg-gray-600 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
        <p className="text-red-400 flex items-center">
          <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
          {error}
        </p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-gray-400">No dividend history available for {ticker}</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
        <FontAwesomeIcon icon={faMoneyBillTrendUp} className="mr-2" />
        Dividend History - {ticker}
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-600">
              <th className="pb-2">Ex-Date</th>
              <th className="pb-2">Payment Date</th>
              <th className="pb-2 text-right">Amount</th>
              <th className="pb-2 text-right">Yield %</th>
            </tr>
          </thead>
          <tbody>
            {data.map((div, idx) => (
              <tr key={idx} className="border-b border-gray-600/50">
                <td className="py-2 text-gray-300">{div.ex_date || div.date}</td>
                <td className="py-2 text-gray-300">{div.payment_date || '-'}</td>
                <td className="py-2 text-right text-green-400 font-medium">
                  ${div.amount?.toFixed(4) || div.value?.toFixed(4)}
                </td>
                <td className="py-2 text-right text-gray-300">
                  {div.yield ? `${(div.yield * 100).toFixed(2)}%` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Price Chart Panel
 * Uses TradingView lightweight-charts for professional candlestick visualization
 */
function PriceChartPanel({ ticker, interval }: { ticker: string; interval?: string }) {
  return (
    <div className="w-full">
      <TradingViewChart ticker={ticker} interval={interval} />
    </div>
  )
}

/**
 * Analyst Ratings Panel
 * Shows consensus analyst ratings and price targets
 */
function AnalystRatingsPanel({ ticker }: { ticker: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await api.fetchAnalystRatings(ticker)
        setData(result)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch analyst ratings')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ticker])

  if (loading) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-600 rounded w-3/4"></div>
          <div className="h-4 bg-gray-600 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
        <p className="text-red-400 flex items-center">
          <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
          {error}
        </p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-gray-400">No analyst ratings available for {ticker}</p>
      </div>
    )
  }

  const ratings = data.ratings || data
  const targetPrice = data.target_price || data.targetPrice
  const consensus = data.consensus || data.rating

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
        <FontAwesomeIcon icon={faBullseye} className="mr-2" />
        Analyst Ratings - {ticker}
      </h4>

      {/* Consensus */}
      {consensus && (
        <div className="mb-4 p-3 bg-gray-800 rounded">
          <div className="text-gray-400 text-sm mb-1">Consensus</div>
          <div className="text-xl font-bold text-white">{consensus}</div>
        </div>
      )}

      {/* Price Targets */}
      {targetPrice && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-2 bg-gray-800 rounded">
            <div className="text-gray-400 text-xs">Low</div>
            <div className="text-red-400 font-medium">${targetPrice.low?.toFixed(2)}</div>
          </div>
          <div className="p-2 bg-gray-800 rounded">
            <div className="text-gray-400 text-xs">Average</div>
            <div className="text-blue-400 font-medium">${targetPrice.average?.toFixed(2)}</div>
          </div>
          <div className="p-2 bg-gray-800 rounded">
            <div className="text-gray-400 text-xs">High</div>
            <div className="text-green-400 font-medium">${targetPrice.high?.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Rating Breakdown */}
      {ratings && typeof ratings === 'object' && (
        <div className="space-y-2">
          <div className="text-gray-400 text-sm mb-2">Rating Distribution</div>
          {Object.entries(ratings).map(([rating, count]) => (
            <div key={rating} className="flex items-center justify-between text-sm">
              <span className="text-gray-300 capitalize">{rating}</span>
              <span className="text-white font-medium">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Insider Transactions Panel
 * Shows recent insider buying/selling activity
 */
function InsiderTransactionsPanel({ ticker, limit = 10 }: { ticker: string; limit?: number }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await api.fetchInsiderTransactions(ticker, limit)
        // Result is an array of transaction records
        const transactions = Array.isArray(result) ? result : (result.data || [])
        setData(transactions.slice(0, limit))
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch insider transactions')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ticker, limit])

  if (loading) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-600 rounded w-3/4"></div>
          <div className="h-4 bg-gray-600 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
        <p className="text-red-400 flex items-center">
          <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
          {error}
        </p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-gray-400">No insider transactions available for {ticker}</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
        <FontAwesomeIcon icon={faUserTie} className="mr-2" />
        Insider Transactions - {ticker}
      </h4>
      <div className="space-y-2">
        {data.map((txn, idx) => {
          const isBuy = txn.transaction_type?.toLowerCase().includes('buy') || txn.type?.toLowerCase().includes('buy')
          return (
            <div key={idx} className="p-3 bg-gray-800 rounded text-sm">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <div className="text-white font-medium">{txn.insider_name || txn.name}</div>
                  <div className="text-gray-400 text-xs">{txn.position || txn.title}</div>
                </div>
                <div className={`font-bold ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
                  {isBuy ? '🟢 BUY' : '🔴 SELL'}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                <div>
                  <div className="text-gray-400">Shares</div>
                  <div className="text-white">{txn.shares?.toLocaleString() || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-400">Price</div>
                  <div className="text-white">${txn.price?.toFixed(2) || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-400">Date</div>
                  <div className="text-white">{txn.date || txn.transaction_date}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * ETF Holdings Panel
 * Shows top holdings of an ETF with weights and sector breakdown
 */
function ETFHoldingsPanel({ ticker }: { ticker: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await api.fetchETFHoldings(ticker)
        setData(result)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch ETF holdings')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ticker])

  if (loading) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-600 rounded w-3/4"></div>
          <div className="h-4 bg-gray-600 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
        <p className="text-red-400 flex items-center">
          <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
          {error}
        </p>
      </div>
    )
  }

  if (!data || !data.holdings || data.holdings.length === 0) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-gray-400">No holdings data available for {ticker}</p>
      </div>
    )
  }

  const { etf_info, holdings } = data
  const topHoldings = holdings.slice(0, 10) // Show top 10

  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center">
          <FontAwesomeIcon icon={faChartSimple} className="mr-2" />
          {etf_info?.name || ticker} Holdings
        </h3>
        <span className="text-sm text-gray-400">
          {etf_info?.holdings_count || holdings.length} total holdings
        </span>
      </div>

      {/* Top Holdings */}
      <div className="space-y-2">
        {topHoldings.map((holding: any, index: number) => (
          <div key={holding.code} className="bg-gray-800 rounded p-3">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-bold text-white">
                  {index + 1}. {holding.code}
                </div>
                <div className="text-sm text-gray-400">{holding.name}</div>
                <div className="text-xs text-gray-500">
                  {holding.sector} • {holding.industry}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-indigo-400">
                  {holding.weight.toFixed(2)}%
                </div>
                <div className="text-xs text-gray-500">weight</div>
              </div>
            </div>
            {/* Weight bar */}
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full"
                style={{ width: `${Math.min(holding.weight, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {holdings.length > 10 && (
        <p className="text-sm text-gray-400 text-center">
          Showing top 10 of {holdings.length} holdings
        </p>
      )}
    </div>
  )
}

/**
 * News Panel
 * Shows recent news articles for a stock
 */
function NewsPanel({ ticker, limit = 10 }: { ticker: string; limit?: number }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await api.fetchNewsArticles(ticker, limit)
        const articles = Array.isArray(result) ? result : (result.data || result.articles || [])
        setData(articles.slice(0, limit))
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch news')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ticker, limit])

  if (loading) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-600 rounded w-3/4"></div>
          <div className="h-3 bg-gray-600 rounded w-full"></div>
          <div className="h-3 bg-gray-600 rounded w-5/6"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
        <p className="text-red-400 flex items-center">
          <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
          {error}
        </p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-gray-400">No news available for {ticker}</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-bold text-white flex items-center">
        <FontAwesomeIcon icon={faNewspaper} className="mr-2" />
        Recent News for {ticker}
      </h3>
      <div className="space-y-3">
        {data.map((article: any, index: number) => (
          <div key={index} className="bg-gray-800 rounded p-3 hover:bg-gray-750 transition-colors">
            <a
              href={article.url || article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <div className="font-semibold text-white mb-1 hover:text-indigo-400">
                {article.title || article.headline}
              </div>
              <div className="text-sm text-gray-400 mb-2">
                {article.summary || article.description}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{article.source || article.publisher}</span>
                <span>{new Date(article.date || article.published_at).toLocaleDateString()}</span>
              </div>
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Live Price Panel
 * Shows real-time quote data
 */
function LivePricePanel({ ticker }: { ticker: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await api.fetchLivePrice(ticker)
        setData(result)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch live price')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ticker])

  if (loading) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-gray-600 rounded w-1/2"></div>
          <div className="h-4 bg-gray-600 rounded w-1/3"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
        <p className="text-red-400 flex items-center">
          <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
          {error}
        </p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-gray-400">No price data available for {ticker}</p>
      </div>
    )
  }

  const price = data.close || data.price || data.last
  const change = data.change || 0
  const changePercent = data.change_p || data.changePercent || 0
  const isPositive = change >= 0

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <h3 className="text-lg font-bold text-white mb-3 flex items-center">
        <FontAwesomeIcon icon={faChartLine} className="mr-2" />
        {ticker} Live Quote
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-3xl font-bold text-white">${price?.toFixed(2)}</div>
          <div className={`text-lg ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-gray-400">Open</div>
            <div className="text-white">${data.open?.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-gray-400">High</div>
            <div className="text-green-400">${data.high?.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-gray-400">Low</div>
            <div className="text-red-400">${data.low?.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-gray-400">Volume</div>
            <div className="text-white">{(data.volume / 1000000).toFixed(2)}M</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Earnings Calendar Panel
 * Shows upcoming earnings announcements
 */
function EarningsCalendarPanel({ fromDate, toDate }: { fromDate?: string; toDate?: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await api.fetchEarningsCalendar(fromDate, toDate)
        const earnings = Array.isArray(result) ? result : (result.data || result.earnings || [])
        setData(earnings.slice(0, 20))
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch earnings calendar')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [fromDate, toDate])

  if (loading) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-600 rounded w-3/4"></div>
          <div className="h-4 bg-gray-600 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
        <p className="text-red-400 flex items-center">
          <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
          {error}
        </p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-gray-400">No upcoming earnings</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-bold text-white flex items-center">
        <FontAwesomeIcon icon={faCalendarDays} className="mr-2" />
        Upcoming Earnings
      </h3>
      <div className="space-y-2">
        {data.map((earning: any, index: number) => (
          <div key={index} className="bg-gray-800 rounded p-3 flex justify-between items-center">
            <div>
              <div className="font-bold text-white">{earning.ticker || earning.symbol}</div>
              <div className="text-sm text-gray-400">{earning.name || earning.company}</div>
            </div>
            <div className="text-right">
              <div className="text-white">{new Date(earning.date || earning.report_date).toLocaleDateString()}</div>
              <div className="text-xs text-gray-400">{earning.time || earning.when || 'N/A'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * ESG Panel
 * Shows ESG scores and ratings
 */
function ESGPanel({ ticker }: { ticker: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await api.fetchESG(ticker)
        setData(result)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch ESG data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ticker])

  if (loading) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-600 rounded w-3/4"></div>
          <div className="h-4 bg-gray-600 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
        <p className="text-red-400 flex items-center">
          <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
          {error}
        </p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-gray-400">No ESG data available for {ticker}</p>
      </div>
    )
  }

  const esgScore = data.esg_score || data.total_esg || data.totalESG || 0
  const envScore = data.environment_score || data.environmentScore || 0
  const socialScore = data.social_score || data.socialScore || 0
  const govScore = data.governance_score || data.governanceScore || 0

  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center">
        <FontAwesomeIcon icon={faBullseye} className="mr-2" />
        ESG Scores for {ticker}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded p-3 text-center">
          <div className="text-3xl font-bold text-indigo-400">{esgScore}</div>
          <div className="text-sm text-gray-400">Total ESG</div>
        </div>
        <div className="bg-gray-800 rounded p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{envScore}</div>
          <div className="text-sm text-gray-400">Environmental</div>
        </div>
        <div className="bg-gray-800 rounded p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{socialScore}</div>
          <div className="text-sm text-gray-400">Social</div>
        </div>
        <div className="bg-gray-800 rounded p-3 text-center">
          <div className="text-2xl font-bold text-purple-400">{govScore}</div>
          <div className="text-sm text-gray-400">Governance</div>
        </div>
      </div>
    </div>
  )
}

/**
 * Shareholders Panel
 * Shows major shareholders and ownership
 */
function ShareholdersPanel({ ticker }: { ticker: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await api.fetchShareholders(ticker)
        setData(result)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch shareholders')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ticker])

  if (loading) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-600 rounded w-3/4"></div>
          <div className="h-4 bg-gray-600 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
        <p className="text-red-400 flex items-center">
          <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
          {error}
        </p>
      </div>
    )
  }

  if (!data || !data.shareholders) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-gray-400">No shareholder data available for {ticker}</p>
      </div>
    )
  }

  const shareholders = data.shareholders || []

  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-bold text-white flex items-center">
        <FontAwesomeIcon icon={faUserTie} className="mr-2" />
        Major Shareholders of {ticker}
      </h3>
      <div className="space-y-2">
        {shareholders.slice(0, 10).map((holder: any, index: number) => (
          <div key={index} className="bg-gray-800 rounded p-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-bold text-white">{holder.name || holder.holder}</div>
                <div className="text-sm text-gray-400">{holder.type || 'Institutional'}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-indigo-400">
                  {(holder.percentage || holder.pct || 0).toFixed(2)}%
                </div>
                <div className="text-xs text-gray-500">
                  {((holder.shares || holder.value || 0) / 1000000).toFixed(1)}M shares
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Sentiment Panel
 * Shows news sentiment analysis
 */
function SentimentPanel({ ticker }: { ticker: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await api.fetchSentiment(ticker)
        setData(result)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch sentiment')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ticker])

  if (loading) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-600 rounded w-3/4"></div>
          <div className="h-4 bg-gray-600 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
        <p className="text-red-400 flex items-center">
          <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
          {error}
        </p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-gray-400">No sentiment data available for {ticker}</p>
      </div>
    )
  }

  const sentiment = data.sentiment || data.overall_sentiment || 'neutral'
  const score = data.score || data.sentiment_score || 0
  const positive = data.positive || 0
  const negative = data.negative || 0
  const neutral = data.neutral || 0

  const getSentimentColor = (sent: string) => {
    if (sent === 'bullish' || sent === 'positive') return 'text-green-400'
    if (sent === 'bearish' || sent === 'negative') return 'text-red-400'
    return 'text-gray-400'
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center">
        <FontAwesomeIcon icon={faBrain} className="mr-2" />
        Sentiment Analysis for {ticker}
      </h3>
      <div className="text-center">
        <div className={`text-4xl font-bold ${getSentimentColor(sentiment)}`}>
          {sentiment.toUpperCase()}
        </div>
        <div className="text-2xl text-gray-300 mt-2">Score: {score.toFixed(2)}</div>
      </div>
      {(positive || negative || neutral) && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-800 rounded p-3 text-center">
            <div className="text-xl font-bold text-green-400">{positive}%</div>
            <div className="text-xs text-gray-400">Positive</div>
          </div>
          <div className="bg-gray-800 rounded p-3 text-center">
            <div className="text-xl font-bold text-gray-400">{neutral}%</div>
            <div className="text-xs text-gray-400">Neutral</div>
          </div>
          <div className="bg-gray-800 rounded p-3 text-center">
            <div className="text-xl font-bold text-red-400">{negative}%</div>
            <div className="text-xs text-gray-400">Negative</div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Stock Splits Panel
 */
function StockSplitsPanel({ ticker }: { ticker: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await api.fetchSplitHistory(ticker)
        const splits = Array.isArray(result) ? result : (result.data || result.splits || [])
        setData(splits)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch stock splits')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ticker])

  if (loading) {
    return (
      <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-gray-400 text-sm">No stock split history available for {ticker}</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-bold text-white flex items-center">
        <FontAwesomeIcon icon={faChartLine} className="mr-2" />
        Stock Splits for {ticker}
      </h3>
      <div className="space-y-2">
        {data.map((split: any, index: number) => (
          <div key={index} className="bg-gray-800 rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">
                {split.ratio || split.split_ratio || 'N/A'}
              </div>
              <div className="text-sm text-gray-400">
                {new Date(split.date || split.split_date).toLocaleDateString()}
              </div>
            </div>
            {split.type && (
              <div className="text-xs text-gray-500 uppercase">{split.type}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Technical Screener Panel
 */
function TechnicalScreenerPanel({ signal, limit = 50 }: { signal?: string; limit?: number }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await api.screenStocks(undefined, signal, undefined, limit)
        const results = Array.isArray(result) ? result : (result.data || result.results || [])
        setData(results.slice(0, limit))
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch screener results')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [signal, limit])

  if (loading) {
    return (
      <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-gray-400 text-sm">No screener results found</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-bold text-white flex items-center">
        <FontAwesomeIcon icon={faChartBar} className="mr-2" />
        Technical Screener {signal && `(${signal})`}
      </h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {data.map((item: any, index: number) => (
          <div key={index} className="bg-gray-800 rounded p-3 flex items-center justify-between">
            <div className="flex-1">
              <div className="font-semibold text-white">{item.ticker || item.symbol}</div>
              <div className="text-sm text-gray-400">{item.name || item.company_name}</div>
            </div>
            <div className="text-right">
              {item.signal && (
                <div className={`text-sm font-semibold ${
                  item.signal === 'buy' ? 'text-green-400' :
                  item.signal === 'sell' ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {item.signal.toUpperCase()}
                </div>
              )}
              {item.price && (
                <div className="text-xs text-gray-500">${item.price.toFixed(2)}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Returns Distribution Panel
 */
function ReturnsDistributionPanel({ ticker, period = '1y' }: { ticker: string; period?: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const years = period === '1y' ? 1 : period === '3y' ? 3 : 5
        const result = await api.fetchReturns(ticker, years)
        setData(result)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch returns distribution')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ticker, period])

  if (loading) {
    return (
      <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-gray-400 text-sm">No distribution data available for {ticker}</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-bold text-white flex items-center">
        <FontAwesomeIcon icon={faChartArea} className="mr-2" />
        Returns Distribution for {ticker} ({period})
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400">Mean Return</div>
          <div className="text-lg font-bold text-white">
            {data.mean ? `${(data.mean * 100).toFixed(2)}%` : 'N/A'}
          </div>
        </div>
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400">Std Deviation</div>
          <div className="text-lg font-bold text-white">
            {data.std ? `${(data.std * 100).toFixed(2)}%` : 'N/A'}
          </div>
        </div>
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400">Skewness</div>
          <div className="text-lg font-bold text-white">
            {data.skew ? data.skew.toFixed(2) : 'N/A'}
          </div>
        </div>
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400">Kurtosis</div>
          <div className="text-lg font-bold text-white">
            {data.kurt ? data.kurt.toFixed(2) : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Cumulative Returns Panel
 */
function CumulativeReturnsPanel({ ticker, period = '1y' }: { ticker: string; period?: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const years = period === '1y' ? 1 : period === '3y' ? 3 : 5
        const result = await api.fetchCumRet(ticker, years)
        const returns = Array.isArray(result) ? result : (result.data || result.returns || [])
        setData(returns)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch cumulative returns')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ticker, period])

  if (loading) {
    return (
      <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-gray-400 text-sm">No cumulative returns data available for {ticker}</p>
      </div>
    )
  }

  const latestReturn = data[data.length - 1]?.cumulative_return || data[data.length - 1]?.value || 0

  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-bold text-white flex items-center">
        <FontAwesomeIcon icon={faChartLine} className="mr-2" />
        Cumulative Returns for {ticker} ({period})
      </h3>
      <div className="bg-gray-800 rounded p-4 text-center">
        <div className="text-xs text-gray-400">Latest Cumulative Return</div>
        <div className={`text-3xl font-bold ${latestReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {(latestReturn * 100).toFixed(2)}%
        </div>
      </div>
      <div className="text-xs text-gray-500 text-center">
        Based on {data.length} data points
      </div>
    </div>
  )
}

/**
 * Market Cap History Panel
 */
function MarketCapHistoryPanel({ ticker }: { ticker: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await api.fetchMarketCapHistory(ticker)
        const history = Array.isArray(result) ? result : (result.data || result.history || [])
        setData(history)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch market cap history')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ticker])

  if (loading) {
    return (
      <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-gray-400 text-sm">No market cap history available for {ticker}</p>
      </div>
    )
  }

  const latestData = data[data.length - 1]
  const latestMarketCap = latestData?.market_cap || latestData?.marketCap || 0
  const formatMarketCap = (cap: number) => {
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`
    return `$${cap.toFixed(0)}`
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-bold text-white flex items-center">
        <FontAwesomeIcon icon={faChartBar} className="mr-2" />
        Market Cap History for {ticker}
      </h3>
      <div className="bg-gray-800 rounded p-4 text-center">
        <div className="text-xs text-gray-400">Current Market Cap</div>
        <div className="text-3xl font-bold text-white">
          {formatMarketCap(latestMarketCap)}
        </div>
        {latestData?.date && (
          <div className="text-xs text-gray-500 mt-2">
            As of {new Date(latestData.date).toLocaleDateString()}
          </div>
        )}
      </div>
      <div className="text-xs text-gray-500 text-center">
        Based on {data.length} historical data points
      </div>
    </div>
  )
}

/**
 * Twitter Mentions Panel
 */
function TwitterMentionsPanel({ ticker, limit = 20 }: { ticker: string; limit?: number }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await api.fetchTwitterMentions(ticker, limit)
        const mentions = Array.isArray(result) ? result : (result.data || result.mentions || [])
        setData(mentions.slice(0, limit))
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch Twitter mentions')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ticker, limit])

  if (loading) {
    return (
      <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-gray-400 text-sm">No Twitter mentions available for {ticker}</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-bold text-white flex items-center">
        <FontAwesomeIcon icon={faNewspaper} className="mr-2" />
        Twitter Mentions for {ticker}
      </h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {data.map((mention: any, index: number) => (
          <div key={index} className="bg-gray-800 rounded p-3">
            <div className="text-sm text-white mb-1">
              {mention.text || mention.content}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>@{mention.user || mention.username}</span>
              <span>{new Date(mention.date || mention.timestamp).toLocaleDateString()}</span>
            </div>
            {mention.sentiment && (
              <div className={`text-xs mt-1 ${
                mention.sentiment === 'positive' ? 'text-green-400' :
                mention.sentiment === 'negative' ? 'text-red-400' : 'text-gray-400'
              }`}>
                {mention.sentiment}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * IPO Calendar Panel
 */
function IPOCalendarPanel({ fromDate, toDate }: { fromDate?: string; toDate?: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await api.fetchIPOCalendar(fromDate, toDate)
        const ipos = Array.isArray(result) ? result : (result.data || result.ipos || [])
        setData(ipos)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch IPO calendar')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [fromDate, toDate])

  if (loading) {
    return (
      <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-gray-400 text-sm">No upcoming IPOs found</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-bold text-white flex items-center">
        <FontAwesomeIcon icon={faCalendar} className="mr-2" />
        Upcoming IPO Calendar
      </h3>
      <div className="space-y-2">
        {data.map((ipo: any, index: number) => (
          <div key={index} className="bg-gray-800 rounded p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">
                  {ipo.company || ipo.name}
                </div>
                <div className="text-sm text-gray-400">
                  {ipo.ticker || ipo.symbol}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-300">
                  {new Date(ipo.date || ipo.ipo_date).toLocaleDateString()}
                </div>
                {ipo.price_range && (
                  <div className="text-xs text-gray-500">${ipo.price_range}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Monte Carlo Simulation Panel
 */
function MonteCarloPanel({ ticker, days = 30, simulations = 1000 }: { ticker: string; days?: number; simulations?: number }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await api.simulateEquity(ticker, days)
        setData(result)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch Monte Carlo simulation')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ticker, days, simulations])

  if (loading) {
    return (
      <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-gray-400 text-sm">No simulation data available for {ticker}</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-bold text-white flex items-center">
        <FontAwesomeIcon icon={faChartArea} className="mr-2" />
        Monte Carlo Simulation for {ticker}
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800 rounded p-3 text-center">
          <div className="text-xs text-gray-400">Expected Price</div>
          <div className="text-lg font-bold text-white">
            ${data.expected_price?.toFixed(2) || 'N/A'}
          </div>
        </div>
        <div className="bg-gray-800 rounded p-3 text-center">
          <div className="text-xs text-gray-400">Best Case</div>
          <div className="text-lg font-bold text-green-400">
            ${data.best_case?.toFixed(2) || 'N/A'}
          </div>
        </div>
        <div className="bg-gray-800 rounded p-3 text-center">
          <div className="text-xs text-gray-400">Worst Case</div>
          <div className="text-lg font-bold text-red-400">
            ${data.worst_case?.toFixed(2) || 'N/A'}
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-500 text-center">
        {simulations} simulations over {days} days
      </div>
    </div>
  )
}

/**
 * Volatility Forecast Panel
 */
function VolatilityForecastPanel({ ticker, lookback = 250 }: { ticker: string; lookback?: number }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await api.fetchVolForecast(ticker, lookback)
        setData(result)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch volatility forecast')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ticker, lookback])

  if (loading) {
    return (
      <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-gray-400 text-sm">No volatility data available for {ticker}</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-bold text-white flex items-center">
        <FontAwesomeIcon icon={faChartLine} className="mr-2" />
        Volatility Forecast for {ticker}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400">Historical Vol</div>
          <div className="text-lg font-bold text-white">
            {data.historical_vol ? `${(data.historical_vol * 100).toFixed(2)}%` : 'N/A'}
          </div>
        </div>
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400">Forecast Vol</div>
          <div className="text-lg font-bold text-white">
            {data.forecast_vol ? `${(data.forecast_vol * 100).toFixed(2)}%` : 'N/A'}
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-500 text-center">
        Based on {lookback}-day lookback
      </div>
    </div>
  )
}

/**
 * Performance Ratios Panel
 */
function PerformanceRatiosPanel({ ticker, years = 3 }: { ticker: string; years?: number }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await api.fetchPerfRatios(ticker, years)
        setData(result)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch performance ratios')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ticker, years])

  if (loading) {
    return (
      <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <p className="text-gray-400 text-sm">No performance ratios available for {ticker}</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-bold text-white flex items-center">
        <FontAwesomeIcon icon={faChartBar} className="mr-2" />
        Performance Ratios for {ticker} ({years}y)
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400">Sharpe Ratio</div>
          <div className="text-lg font-bold text-white">
            {data.sharpe ? data.sharpe.toFixed(2) : 'N/A'}
          </div>
        </div>
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400">Sortino Ratio</div>
          <div className="text-lg font-bold text-white">
            {data.sortino ? data.sortino.toFixed(2) : 'N/A'}
          </div>
        </div>
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400">Calmar Ratio</div>
          <div className="text-lg font-bold text-white">
            {data.calmar ? data.calmar.toFixed(2) : 'N/A'}
          </div>
        </div>
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400">Max Drawdown</div>
          <div className="text-lg font-bold text-red-400">
            {data.max_drawdown ? `${(data.max_drawdown * 100).toFixed(2)}%` : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Economic Events Panel */
function EconomicEventsPanel({ fromDate, toDate }: { fromDate?: string; toDate?: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await api.fetchEconomicCalendar(fromDate, toDate)
        const events = Array.isArray(result) ? result : (result.data || result.events || [])
        setData(events)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch economic events')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [fromDate, toDate])

  if (loading) return <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>
  if (error) return <div className="bg-gray-700 rounded-lg p-4"><p className="text-red-400 text-sm">{error}</p></div>
  if (!data || data.length === 0) return <div className="bg-gray-700 rounded-lg p-4"><p className="text-gray-400 text-sm">No economic events found</p></div>

  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-bold text-white flex items-center"><FontAwesomeIcon icon={faCalendar} className="mr-2" />Economic Events Calendar</h3>
      <div className="space-y-2">{data.map((event: any, index: number) => (
        <div key={index} className="bg-gray-800 rounded p-3"><div className="font-semibold text-white">{event.name || event.event}</div><div className="text-sm text-gray-400">{new Date(event.date || event.timestamp).toLocaleDateString()}</div></div>
      ))}</div>
    </div>
  )
}

/** Index Constituents Panel */
function IndexConstituentsPanel({ index }: { index: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await api.fetchIndexConstituents(index)
        const constituents = Array.isArray(result) ? result : (result.data || result.constituents || [])
        setData(constituents)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch index constituents')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [index])

  if (loading) return <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>
  if (error) return <div className="bg-gray-700 rounded-lg p-4"><p className="text-red-400 text-sm">{error}</p></div>
  if (!data || data.length === 0) return <div className="bg-gray-700 rounded-lg p-4"><p className="text-gray-400 text-sm">No constituents found for {index}</p></div>

  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-bold text-white"><FontAwesomeIcon icon={faChartBar} className="mr-2" />Index Constituents ({index})</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">{data.map((item: any, index: number) => (
        <div key={index} className="bg-gray-800 rounded p-2 flex justify-between"><span className="text-white">{item.ticker || item.symbol}</span><span className="text-sm text-gray-400">{item.name || item.company_name}</span></div>
      ))}</div>
    </div>
  )
}

/** Logo, Historical Constituents, EOD Extended, Technical Indicators, Macro Indicators Panels */
function LogoPanel({ ticker }: { ticker: string }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const fetchData = async () => {
      try { setLoading(true); const result = await api.fetchLogo(ticker); setLogoUrl(result.logo_url || result.url || result); setError(null) } catch (err: any) { setError(err.message || 'Failed to fetch logo') } finally { setLoading(false) }
    }
    fetchData()
  }, [ticker])
  if (loading) return <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>
  if (error) return <div className="bg-gray-700 rounded-lg p-4"><p className="text-red-400 text-sm">{error}</p></div>
  if (!logoUrl) return <div className="bg-gray-700 rounded-lg p-4"><p className="text-gray-400 text-sm">No logo available for {ticker}</p></div>
  return <div className="bg-gray-700 rounded-lg p-4 space-y-3"><h3 className="text-lg font-bold text-white">{ticker} Logo</h3><div className="flex items-center justify-center bg-white rounded p-4"><img src={logoUrl} alt={`${ticker} logo`} className="max-h-32 max-w-full object-contain" /></div></div>
}

function HistoricalConstituentsPanel({ index, date }: { index: string; date?: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const fetchData = async () => {
      try { setLoading(true); const result = await api.fetchHistoricalConstituents(index, date); const constituents = Array.isArray(result) ? result : (result.data || result.constituents || []); setData(constituents); setError(null) } catch (err: any) { setError(err.message || 'Failed to fetch historical constituents') } finally { setLoading(false) }
    }
    fetchData()
  }, [index, date])
  if (loading) return <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>
  if (error) return <div className="bg-gray-700 rounded-lg p-4"><p className="text-red-400 text-sm">{error}</p></div>
  if (!data || data.length === 0) return <div className="bg-gray-700 rounded-lg p-4"><p className="text-gray-400 text-sm">No historical constituents found</p></div>
  return <div className="bg-gray-700 rounded-lg p-4 space-y-3"><h3 className="text-lg font-bold text-white">Historical Constituents ({index})</h3><div className="space-y-2 max-h-96 overflow-y-auto">{data.map((item: any, index: number) => (<div key={index} className="bg-gray-800 rounded p-2"><span className="text-white">{item.ticker || item.symbol}</span></div>))}</div></div>
}

function EODExtendedPanel({ ticker }: { ticker: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const fetchData = async () => {
      try { setLoading(true); const result = await api.fetchEODExtended(ticker); setData(result); setError(null) } catch (err: any) { setError(err.message || 'Failed to fetch EOD extended data') } finally { setLoading(false) }
    }
    fetchData()
  }, [ticker])
  if (loading) return <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>
  if (error) return <div className="bg-gray-700 rounded-lg p-4"><p className="text-red-400 text-sm">{error}</p></div>
  if (!data) return <div className="bg-gray-700 rounded-lg p-4"><p className="text-gray-400 text-sm">No extended data available for {ticker}</p></div>
  return <div className="bg-gray-700 rounded-lg p-4 space-y-3"><h3 className="text-lg font-bold text-white">EOD Extended Data for {ticker}</h3><div className="grid grid-cols-2 gap-3"><div className="bg-gray-800 rounded p-3"><div className="text-xs text-gray-400">Close</div><div className="text-lg font-bold text-white">${data.close?.toFixed(2) || 'N/A'}</div></div><div className="bg-gray-800 rounded p-3"><div className="text-xs text-gray-400">Volume</div><div className="text-lg font-bold text-white">{data.volume?.toLocaleString() || 'N/A'}</div></div></div></div>
}

function TechnicalIndicatorsPanel({ ticker, indicators = ['RSI', 'MACD', 'SMA'] }: { ticker: string; indicators?: string[] }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const fetchData = async () => {
      try { setLoading(true); const result = await api.fetchTechnicalIndicator(ticker, 'RSI', 14); setData(result); setError(null) } catch (err: any) { setError(err.message || 'Failed to fetch technical indicators') } finally { setLoading(false) }
    }
    fetchData()
  }, [ticker, indicators])
  if (loading) return <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>
  if (error) return <div className="bg-gray-700 rounded-lg p-4"><p className="text-red-400 text-sm">{error}</p></div>
  if (!data) return <div className="bg-gray-700 rounded-lg p-4"><p className="text-gray-400 text-sm">No technical indicators available for {ticker}</p></div>
  return <div className="bg-gray-700 rounded-lg p-4 space-y-3"><h3 className="text-lg font-bold text-white">Technical Indicators for {ticker}</h3><div className="bg-gray-800 rounded p-3"><div className="text-xs text-gray-400">RSI (14)</div><div className="text-lg font-bold text-white">{data.rsi || data.value || 'N/A'}</div></div></div>
}

function MacroIndicatorsPanel({ indicators = ['10Y_YIELD', 'INFLATION', 'FED_RATE'] }: { indicators?: string[] }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await api.fetchMacroIndicators(indicators)
        setData(result)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch macro indicators')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [indicators])

  if (loading) return <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>
  if (error) return <div className="bg-gray-700 rounded-lg p-4"><p className="text-red-400 text-sm">{error}</p></div>
  if (!data || !data.indicators) return <div className="bg-gray-700 rounded-lg p-4"><p className="text-gray-400 text-sm">No macro indicators available</p></div>

  // API returns: { country: "USA", indicators: { government_bond_10y: [{date, close, ...}] } }
  // Extract latest value from government_bond_10y array
  const bondData = data.indicators.government_bond_10y
  const latestBond = Array.isArray(bondData) && bondData.length > 0 ? bondData[bondData.length - 1] : null
  const bond10Y = latestBond ? latestBond.close?.toFixed(2) + '%' : 'N/A'

  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-bold text-white">Macro Economic Indicators ({data.country})</h3>
      <div className="bg-gray-800 rounded p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">10-Year Treasury Yield</div>
          <div className="text-2xl font-bold text-white">{bond10Y}</div>
        </div>
        {latestBond && (
          <div className="text-xs text-gray-500 mt-2">As of {latestBond.date}</div>
        )}
      </div>
      <div className="text-xs text-gray-500">
        Note: EODHD API only provides government bond yields. Inflation and Fed Rate data not available via this endpoint.
      </div>
    </div>
  )
}
