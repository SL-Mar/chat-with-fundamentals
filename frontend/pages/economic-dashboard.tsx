// pages/economic-dashboard.tsx - Comprehensive macroeconomic dashboard
'use client';

import { useState } from 'react';
import MacroIndicators from '../components/MacroIndicators';
import EconomicCalendar from '../components/EconomicCalendar';
import InterestRates from '../components/InterestRates';

export default function EconomicDashboardPage() {
  const [selectedView, setSelectedView] = useState<'overview' | 'indicators' | 'calendar' | 'rates'>('overview');

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Economic Dashboard</h1>
          <a
            href="/"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
          >
            ← Back to Home
          </a>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">📊</div>
              <div>
                <div className="text-sm text-slate-400">Economic Indicators</div>
                <div className="text-lg font-semibold">GDP, Inflation, Jobs</div>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">📅</div>
              <div>
                <div className="text-sm text-slate-400">Economic Calendar</div>
                <div className="text-lg font-semibold">Upcoming Events</div>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">💰</div>
              <div>
                <div className="text-sm text-slate-400">Interest Rates</div>
                <div className="text-lg font-semibold">Central Bank Policy</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Selector */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex gap-2 bg-slate-800 p-2 rounded-lg">
          <button
            onClick={() => setSelectedView('overview')}
            className={`flex-1 px-4 py-3 rounded transition-colors ${
              selectedView === 'overview'
                ? 'bg-blue-500 text-white'
                : 'bg-transparent text-slate-300 hover:bg-slate-700'
            }`}
          >
            <div className="font-semibold">Overview</div>
            <div className="text-xs opacity-75">All components</div>
          </button>
          <button
            onClick={() => setSelectedView('indicators')}
            className={`flex-1 px-4 py-3 rounded transition-colors ${
              selectedView === 'indicators'
                ? 'bg-blue-500 text-white'
                : 'bg-transparent text-slate-300 hover:bg-slate-700'
            }`}
          >
            <div className="font-semibold">Indicators</div>
            <div className="text-xs opacity-75">GDP, inflation, unemployment</div>
          </button>
          <button
            onClick={() => setSelectedView('calendar')}
            className={`flex-1 px-4 py-3 rounded transition-colors ${
              selectedView === 'calendar'
                ? 'bg-blue-500 text-white'
                : 'bg-transparent text-slate-300 hover:bg-slate-700'
            }`}
          >
            <div className="font-semibold">Calendar</div>
            <div className="text-xs opacity-75">FOMC, CPI, jobs reports</div>
          </button>
          <button
            onClick={() => setSelectedView('rates')}
            className={`flex-1 px-4 py-3 rounded transition-colors ${
              selectedView === 'rates'
                ? 'bg-blue-500 text-white'
                : 'bg-transparent text-slate-300 hover:bg-slate-700'
            }`}
          >
            <div className="font-semibold">Interest Rates</div>
            <div className="text-xs opacity-75">Central bank policy</div>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto">
        {selectedView === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MacroIndicators country="USA" years={10} />
              <InterestRates years={10} />
            </div>
            <EconomicCalendar defaultCountry="US" days={30} />

            {/* Educational Section */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3">📚 Economic Dashboard Guide</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
                <div>
                  <div className="font-semibold text-white mb-2">Key Indicators</div>
                  <ul className="space-y-1 text-xs">
                    <li><strong>GDP:</strong> Total economic output (growth = bullish)</li>
                    <li><strong>Inflation:</strong> Price level changes (high = bearish)</li>
                    <li><strong>Unemployment:</strong> Labor market health (low = bullish)</li>
                    <li><strong>Interest Rates:</strong> Cost of borrowing (high = bearish)</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-white mb-2">Key Events</div>
                  <ul className="space-y-1 text-xs">
                    <li><strong>FOMC:</strong> Fed policy decisions (rate changes)</li>
                    <li><strong>CPI:</strong> Inflation data (higher than forecast = bearish)</li>
                    <li><strong>Jobs Report:</strong> Employment data (strong = bullish)</li>
                    <li><strong>GDP:</strong> Economic growth data (beat forecast = bullish)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedView === 'indicators' && (
          <div className="space-y-6">
            <MacroIndicators country="USA" years={10} />

            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Understanding Economic Indicators</h3>
              <div className="text-sm text-slate-400 space-y-2">
                <p>
                  Economic indicators help investors gauge the health of the economy and make informed decisions.
                  These metrics influence central bank policy, corporate earnings, and market sentiment.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div className="bg-slate-700/50 rounded p-3">
                    <div className="text-white font-semibold mb-1">📈 GDP (Gross Domestic Product)</div>
                    <div className="text-xs">
                      Measures total economic output. Strong GDP growth signals a healthy economy and typically
                      supports stock market gains. Target: 2-3% annual growth.
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded p-3">
                    <div className="text-white font-semibold mb-1">💸 Inflation</div>
                    <div className="text-xs">
                      Measures price level changes. Moderate inflation (2%) is healthy. High inflation erodes
                      purchasing power and prompts central banks to raise rates.
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded p-3">
                    <div className="text-white font-semibold mb-1">👷 Unemployment</div>
                    <div className="text-xs">
                      Measures labor market health. Low unemployment indicates strong economy but can fuel
                      inflation. Target: 4-5% for balanced growth.
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded p-3">
                    <div className="text-white font-semibold mb-1">💰 Interest Rates</div>
                    <div className="text-xs">
                      Central bank's primary policy tool. Higher rates fight inflation but slow growth.
                      Lower rates stimulate economy but risk inflation.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedView === 'calendar' && (
          <div className="space-y-6">
            <EconomicCalendar defaultCountry="US" days={30} />

            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Trading Around Economic Events</h3>
              <div className="text-sm text-slate-400 space-y-2">
                <p>
                  Major economic releases can cause significant market volatility. Understanding how to trade
                  around these events is crucial for risk management.
                </p>
                <div className="mt-3 space-y-3">
                  <div>
                    <div className="text-white font-semibold mb-1">Before the Event</div>
                    <div className="text-xs">
                      Markets often become less liquid and more volatile. Consider reducing position sizes
                      or using wider stops. Options premiums typically increase (implied volatility).
                    </div>
                  </div>
                  <div>
                    <div className="text-white font-semibold mb-1">During the Release</div>
                    <div className="text-xs">
                      Expect rapid price movements. Bid-ask spreads widen. Avoid placing orders right at
                      release time unless you're an experienced trader.
                    </div>
                  </div>
                  <div>
                    <div className="text-white font-semibold mb-1">After the Event</div>
                    <div className="text-xs">
                      Initial reaction may reverse as market digests the data. Wait for clear direction
                      before entering new positions. Monitor analyst commentary and revisions.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedView === 'rates' && (
          <div className="space-y-6">
            <InterestRates years={10} />

            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Interest Rates & Market Impact</h3>
              <div className="text-sm text-slate-400 space-y-2">
                <p>
                  Interest rates are one of the most powerful drivers of asset prices. Understanding the
                  relationship between rates and different asset classes is essential for portfolio management.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div className="bg-slate-700/50 rounded p-3">
                    <div className="text-white font-semibold mb-1">📈 Stocks</div>
                    <div className="text-xs">
                      Higher rates = lower valuations (higher discount rate). Growth stocks more sensitive
                      than value. Banks benefit from rising rates, while REITs and utilities struggle.
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded p-3">
                    <div className="text-white font-semibold mb-1">📉 Bonds</div>
                    <div className="text-xs">
                      Inverse relationship with rates. When rates rise, existing bond prices fall.
                      Duration matters: longer-term bonds more sensitive to rate changes.
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded p-3">
                    <div className="text-white font-semibold mb-1">💵 Currency</div>
                    <div className="text-xs">
                      Higher rates typically strengthen currency (attract foreign capital).
                      Rate differentials drive forex trends. Watch relative policy changes.
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded p-3">
                    <div className="text-white font-semibold mb-1">🏠 Real Estate</div>
                    <div className="text-xs">
                      Higher rates increase mortgage costs, reducing affordability and demand.
                      REITs struggle as their dividend yields become less attractive vs. bonds.
                    </div>
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
              href="/etf-analyzer?etf=SPY.US"
              className="bg-slate-700 hover:bg-slate-600 rounded p-3 text-center transition-colors"
            >
              <div className="text-sm font-semibold">ETF Analyzer</div>
              <div className="text-xs text-slate-400">Holdings & comparison</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
