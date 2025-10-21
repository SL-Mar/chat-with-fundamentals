// pages/etf-analyzer.tsx - Comprehensive ETF analysis page
'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ETFHoldings from '../components/ETFHoldings';
import IndexConstituents from '../components/IndexConstituents';
import ETFComparison from '../components/ETFComparison';

export default function ETFAnalyzerPage() {
  const searchParams = useSearchParams();
  const initialETF = searchParams?.get('etf') || 'SPY.US';

  const [etf, setETF] = useState(initialETF);
  const [activeView, setActiveView] = useState<'holdings' | 'index' | 'comparison'>('holdings');
  const [etfInput, setETFInput] = useState(initialETF);

  const handleETFChange = () => {
    if (etfInput.trim()) {
      const newETF = etfInput.trim().toUpperCase();
      setETF(newETF.includes('.') ? newETF : `${newETF}.US`);
    }
  };

  // Popular ETFs for quick selection
  const popularETFs = [
    { ticker: 'SPY.US', name: 'S&P 500 ETF' },
    { ticker: 'QQQ.US', name: 'Nasdaq 100 ETF' },
    { ticker: 'IWM.US', name: 'Russell 2000 ETF' },
    { ticker: 'VTI.US', name: 'Total Stock Market ETF' },
    { ticker: 'VOO.US', name: 'Vanguard S&P 500 ETF' },
    { ticker: 'AGG.US', name: 'Aggregate Bond ETF' },
    { ticker: 'GLD.US', name: 'Gold ETF' },
    { ticker: 'VWO.US', name: 'Emerging Markets ETF' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">ETF Analyzer</h1>
          <a
            href="/"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
          >
            ← Back to Home
          </a>
        </div>

        {/* ETF Input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={etfInput}
            onChange={(e) => setETFInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleETFChange()}
            placeholder="Enter ETF ticker (e.g., SPY, QQQ)"
            className="flex-1 max-w-md px-4 py-2 bg-slate-800 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleETFChange}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
          >
            Analyze
          </button>
        </div>

        {/* Popular ETFs Quick Select */}
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-sm text-slate-400 mb-2">Popular ETFs</div>
          <div className="flex flex-wrap gap-2">
            {popularETFs.map((item) => (
              <button
                key={item.ticker}
                onClick={() => {
                  setETF(item.ticker);
                  setETFInput(item.ticker);
                }}
                className={`px-3 py-2 rounded text-sm transition-colors ${
                  etf === item.ticker
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {item.ticker.replace('.US', '')}
              </button>
            ))}
          </div>
        </div>

        {/* Current ETF Display */}
        <div className="bg-slate-800 rounded-lg p-4 mt-4">
          <div className="text-sm text-slate-400">Analyzing</div>
          <div className="text-2xl font-bold">{etf}</div>
        </div>
      </div>

      {/* View Selector */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex gap-2 bg-slate-800 p-2 rounded-lg">
          <button
            onClick={() => setActiveView('holdings')}
            className={`flex-1 px-4 py-3 rounded transition-colors ${
              activeView === 'holdings'
                ? 'bg-blue-500 text-white'
                : 'bg-transparent text-slate-300 hover:bg-slate-700'
            }`}
          >
            <div className="font-semibold">Holdings Analysis</div>
            <div className="text-xs opacity-75">Top holdings & sector allocation</div>
          </button>
          <button
            onClick={() => setActiveView('index')}
            className={`flex-1 px-4 py-3 rounded transition-colors ${
              activeView === 'index'
                ? 'bg-blue-500 text-white'
                : 'bg-transparent text-slate-300 hover:bg-slate-700'
            }`}
          >
            <div className="font-semibold">Index Constituents</div>
            <div className="text-xs opacity-75">Major indices breakdown</div>
          </button>
          <button
            onClick={() => setActiveView('comparison')}
            className={`flex-1 px-4 py-3 rounded transition-colors ${
              activeView === 'comparison'
                ? 'bg-blue-500 text-white'
                : 'bg-transparent text-slate-300 hover:bg-slate-700'
            }`}
          >
            <div className="font-semibold">ETF Comparison</div>
            <div className="text-xs opacity-75">Compare multiple ETFs</div>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto">
        {activeView === 'holdings' && (
          <div className="space-y-6">
            <ETFHoldings ticker={etf} maxHoldings={10} />

            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Understanding ETF Holdings</h3>
              <div className="text-sm text-slate-400 space-y-2">
                <p>
                  ETF holdings reveal the underlying assets that make up the fund. Understanding the composition
                  helps you assess diversification, concentration risk, and alignment with your investment goals.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><span className="text-white">Weight Distribution:</span> Shows how concentrated the ETF is in top holdings</li>
                  <li><span className="text-white">Sector Allocation:</span> Reveals sector exposure and potential risks</li>
                  <li><span className="text-white">Expense Ratio:</span> Annual management fee charged by the ETF</li>
                  <li><span className="text-white">Total Assets:</span> Size of the fund (larger is generally more liquid)</li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-2">💡 Tip</div>
                <div className="text-sm text-white">
                  Look for ETFs with low concentration (top 10 holdings &lt; 50%) for better diversification.
                </div>
              </div>
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-2">⚠️ Watch Out</div>
                <div className="text-sm text-white">
                  High sector concentration can increase risk. Check if your portfolio is overweight in certain sectors.
                </div>
              </div>
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-2">📊 Best Practice</div>
                <div className="text-sm text-white">
                  Compare expense ratios between similar ETFs. Even 0.1% difference matters over time.
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'index' && (
          <div className="space-y-6">
            <IndexConstituents defaultIndex="GSPC" />

            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">About Major Indices</h3>
              <div className="text-sm text-slate-400 space-y-2">
                <p>
                  Market indices track the performance of specific stock market segments. Understanding index
                  composition helps you make informed decisions about index fund investments.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div className="bg-slate-700/50 rounded p-3">
                    <div className="text-white font-semibold mb-1">S&P 500 (GSPC)</div>
                    <div className="text-xs">500 large-cap U.S. stocks representing ~80% of U.S. equity market cap</div>
                  </div>
                  <div className="bg-slate-700/50 rounded p-3">
                    <div className="text-white font-semibold mb-1">Dow Jones (DJI)</div>
                    <div className="text-xs">30 blue-chip companies, price-weighted (not market cap weighted)</div>
                  </div>
                  <div className="bg-slate-700/50 rounded p-3">
                    <div className="text-white font-semibold mb-1">NASDAQ 100 (IXIC)</div>
                    <div className="text-xs">100 largest non-financial companies on NASDAQ, tech-heavy</div>
                  </div>
                  <div className="bg-slate-700/50 rounded p-3">
                    <div className="text-white font-semibold mb-1">Russell 2000 (RUT)</div>
                    <div className="text-xs">2000 small-cap stocks, measure of small-company performance</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'comparison' && (
          <div className="space-y-6">
            <ETFComparison initialETFs={[etf]} />

            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">How to Compare ETFs</h3>
              <div className="text-sm text-slate-400 space-y-2">
                <p>
                  When comparing ETFs, consider multiple factors beyond just performance. The right ETF depends
                  on your investment strategy, risk tolerance, and time horizon.
                </p>
                <div className="mt-3 space-y-3">
                  <div>
                    <div className="text-white font-semibold mb-1">1. Check Expense Ratios</div>
                    <div className="text-xs">Lower fees mean more of your returns stay in your pocket. For passive ETFs, look for ratios &lt; 0.20%</div>
                  </div>
                  <div>
                    <div className="text-white font-semibold mb-1">2. Analyze Holdings Overlap</div>
                    <div className="text-xs">High overlap means less diversification. If two ETFs have 80%+ overlap, you might not need both</div>
                  </div>
                  <div>
                    <div className="text-white font-semibold mb-1">3. Review Asset Size</div>
                    <div className="text-xs">Larger ETFs typically have better liquidity and tighter bid-ask spreads</div>
                  </div>
                  <div>
                    <div className="text-white font-semibold mb-1">4. Compare Performance</div>
                    <div className="text-xs">Look at 1Y, 3Y, 5Y returns, but remember past performance doesn't guarantee future results</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💼</div>
                <div>
                  <div className="text-white font-semibold mb-1">Portfolio Building Tip</div>
                  <div className="text-sm text-slate-300">
                    A well-diversified portfolio typically includes broad market ETFs (like SPY or VTI) as core holdings,
                    with sector-specific or thematic ETFs as satellites for targeted exposure. Consider combining
                    large-cap (SPY), mid-cap (MDY), small-cap (IWM), and international (VWO) ETFs for global diversification.
                  </div>
                </div>
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
              href="/advanced-charts?ticker=SPY.US"
              className="bg-slate-700 hover:bg-slate-600 rounded p-3 text-center transition-colors"
            >
              <div className="text-sm font-semibold">Advanced Charts</div>
              <div className="text-xs text-slate-400">Price analysis</div>
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
