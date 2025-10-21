// pages/advanced-charts.tsx - Advanced charting page with multiple chart types
'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import IntradayChart from '../components/IntradayChart';
import MultiTimeframeView from '../components/MultiTimeframeView';
import ComparisonChart from '../components/ComparisonChart';

export default function AdvancedChartsPage() {
  const searchParams = useSearchParams();
  const initialTicker = searchParams?.get('ticker') || 'AAPL.US';

  const [ticker, setTicker] = useState(initialTicker);
  const [activeView, setActiveView] = useState<'intraday' | 'timeframe' | 'comparison'>('intraday');
  const [tickerInput, setTickerInput] = useState(initialTicker);

  const handleTickerChange = () => {
    if (tickerInput.trim()) {
      const newTicker = tickerInput.trim().toUpperCase();
      setTicker(newTicker.includes('.') ? newTicker : `${newTicker}.US`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Advanced Charts</h1>
          <a
            href="/"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
          >
            ← Back to Home
          </a>
        </div>

        {/* Ticker Input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTickerChange()}
            placeholder="Enter ticker (e.g., AAPL, MSFT.US)"
            className="flex-1 max-w-md px-4 py-2 bg-slate-800 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleTickerChange}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
          >
            Update
          </button>
        </div>

        {/* Current Ticker Display */}
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-sm text-slate-400">Analyzing</div>
          <div className="text-2xl font-bold">{ticker}</div>
        </div>
      </div>

      {/* View Selector */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex gap-2 bg-slate-800 p-2 rounded-lg">
          <button
            onClick={() => setActiveView('intraday')}
            className={`flex-1 px-4 py-3 rounded transition-colors ${
              activeView === 'intraday'
                ? 'bg-blue-500 text-white'
                : 'bg-transparent text-slate-300 hover:bg-slate-700'
            }`}
          >
            <div className="font-semibold">Intraday</div>
            <div className="text-xs opacity-75">1m, 5m, 15m, 1h intervals</div>
          </button>
          <button
            onClick={() => setActiveView('timeframe')}
            className={`flex-1 px-4 py-3 rounded transition-colors ${
              activeView === 'timeframe'
                ? 'bg-blue-500 text-white'
                : 'bg-transparent text-slate-300 hover:bg-slate-700'
            }`}
          >
            <div className="font-semibold">Multi-Timeframe</div>
            <div className="text-xs opacity-75">1D to 5Y performance</div>
          </button>
          <button
            onClick={() => setActiveView('comparison')}
            className={`flex-1 px-4 py-3 rounded transition-colors ${
              activeView === 'comparison'
                ? 'bg-blue-500 text-white'
                : 'bg-transparent text-slate-300 hover:bg-slate-700'
            }`}
          >
            <div className="font-semibold">Comparison</div>
            <div className="text-xs opacity-75">Compare multiple tickers</div>
          </button>
        </div>
      </div>

      {/* Chart Display Area */}
      <div className="max-w-7xl mx-auto">
        {activeView === 'intraday' && (
          <div className="space-y-6">
            <IntradayChart ticker={ticker} defaultInterval="5m" />

            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">About Intraday Charts</h3>
              <div className="text-sm text-slate-400 space-y-2">
                <p>
                  Intraday charts show price movements throughout the trading day at various intervals.
                  Use this view to analyze short-term price action and identify entry/exit points.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><span className="text-white">1m interval:</span> Best for scalping and very short-term trades</li>
                  <li><span className="text-white">5m interval:</span> Popular for day trading and momentum plays</li>
                  <li><span className="text-white">15m interval:</span> Good for swing trading setups</li>
                  <li><span className="text-white">1h interval:</span> Useful for broader intraday trends</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeView === 'timeframe' && (
          <div className="space-y-6">
            <MultiTimeframeView ticker={ticker} />

            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">About Multi-Timeframe Analysis</h3>
              <div className="text-sm text-slate-400 space-y-2">
                <p>
                  Multi-timeframe analysis helps you understand performance across different time horizons.
                  This view is essential for identifying long-term trends while staying aware of short-term movements.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><span className="text-white">1D/1W:</span> Short-term momentum and immediate trends</li>
                  <li><span className="text-white">1M/3M:</span> Medium-term patterns and seasonal effects</li>
                  <li><span className="text-white">1Y/5Y:</span> Long-term trends and major market cycles</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeView === 'comparison' && (
          <div className="space-y-6">
            <ComparisonChart initialTickers={[ticker]} timeframe="1Y" />

            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">About Comparison Charts</h3>
              <div className="text-sm text-slate-400 space-y-2">
                <p>
                  Comparison charts normalize price performance to show relative strength between tickers.
                  All tickers start at 0% and show percentage change from the starting point.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><span className="text-white">Relative Performance:</span> Identify which stocks are outperforming</li>
                  <li><span className="text-white">Correlation Analysis:</span> See which stocks move together</li>
                  <li><span className="text-white">Sector Comparison:</span> Compare stocks within the same sector</li>
                  <li><span className="text-white">Portfolio Construction:</span> Find uncorrelated assets for diversification</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Navigation */}
      <div className="max-w-7xl mx-auto mt-8">
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Quick Navigation</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <a
              href="/"
              className="bg-slate-700 hover:bg-slate-600 rounded p-3 text-center transition-colors"
            >
              <div className="text-sm font-semibold">Home</div>
              <div className="text-xs text-slate-400">Main dashboard</div>
            </a>
            <a
              href="/stock-detail?ticker=AAPL.US"
              className="bg-slate-700 hover:bg-slate-600 rounded p-3 text-center transition-colors"
            >
              <div className="text-sm font-semibold">Stock Detail</div>
              <div className="text-xs text-slate-400">Fundamentals & news</div>
            </a>
            <a
              href="/etf-analyzer"
              className="bg-slate-700 hover:bg-slate-600 rounded p-3 text-center transition-colors"
            >
              <div className="text-sm font-semibold">ETF Analyzer</div>
              <div className="text-xs text-slate-400">Holdings & comparison</div>
            </a>
            <a
              href="/screener"
              className="bg-slate-700 hover:bg-slate-600 rounded p-3 text-center transition-colors"
            >
              <div className="text-sm font-semibold">Screener</div>
              <div className="text-xs text-slate-400">Find stocks</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
