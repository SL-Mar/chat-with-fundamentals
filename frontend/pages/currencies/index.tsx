// pages/currencies/index.tsx - Currency Module Hub Page
'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';

const POPULAR_PAIRS = [
  { pair: 'EUR/USD', name: 'Euro / US Dollar', region: 'Major' },
  { pair: 'GBP/USD', name: 'British Pound / US Dollar', region: 'Major' },
  { pair: 'USD/JPY', name: 'US Dollar / Japanese Yen', region: 'Major' },
  { pair: 'USD/CHF', name: 'US Dollar / Swiss Franc', region: 'Major' },
  { pair: 'AUD/USD', name: 'Australian Dollar / US Dollar', region: 'Major' },
  { pair: 'USD/CAD', name: 'US Dollar / Canadian Dollar', region: 'Major' },
  { pair: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', region: 'Major' },
  { pair: 'EUR/GBP', name: 'Euro / British Pound', region: 'Cross' },
  { pair: 'EUR/JPY', name: 'Euro / Japanese Yen', region: 'Cross' },
  { pair: 'GBP/JPY', name: 'British Pound / Japanese Yen', region: 'Cross' },
];

const CRYPTO_PAIRS = [
  { pair: 'BTC/USD', name: 'Bitcoin / US Dollar', region: 'Crypto' },
  { pair: 'ETH/USD', name: 'Ethereum / US Dollar', region: 'Crypto' },
  { pair: 'BNB/USD', name: 'Binance Coin / US Dollar', region: 'Crypto' },
];

export default function CurrenciesHubPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<'all' | 'Major' | 'Cross' | 'Crypto'>('all');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/currencies/${searchQuery.toUpperCase()}`);
    }
  };

  const goToPair = (pair: string) => {
    router.push(`/currencies/${pair}`);
  };

  const filteredPairs = [...POPULAR_PAIRS, ...CRYPTO_PAIRS].filter(
    (p) => selectedRegion === 'all' || p.region === selectedRegion
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold mb-2">Currencies & Forex</h1>
          <p className="text-slate-400">
            Real-time forex data, technical analysis, and AI-powered insights for currency pairs
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Bar */}
        <div className="mb-12">
          <form onSubmit={handleSearch} className="max-w-2xl">
            <div className="flex gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search currency pair (e.g., EUR/USD, BTC/USD)..."
                className="flex-1 px-6 py-4 bg-slate-800 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none text-lg"
              />
              <button
                type="submit"
                disabled={!searchQuery.trim()}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold text-lg transition-colors"
              >
                Analyze
              </button>
            </div>
          </form>
        </div>

        {/* Region Filter */}
        <div className="mb-8">
          <div className="flex gap-3">
            {['all', 'Major', 'Cross', 'Crypto'].map((region) => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region as any)}
                className={`px-4 py-2 rounded font-semibold transition-colors ${
                  selectedRegion === region
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {region === 'all' ? 'All Pairs' : region}
              </button>
            ))}
          </div>
        </div>

        {/* Currency Pairs Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-4">
            {selectedRegion === 'all' ? 'All Currency Pairs' : `${selectedRegion} Pairs`}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPairs.map((pair) => (
              <div
                key={pair.pair}
                onClick={() => goToPair(pair.pair)}
                className="bg-slate-800 rounded-lg p-5 cursor-pointer hover:bg-slate-750 transition-colors border border-slate-700 hover:border-blue-500"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-xl mb-1">{pair.pair}</div>
                    <div className="text-sm text-slate-400">{pair.name}</div>
                  </div>
                  <div className="px-2 py-1 bg-slate-700 rounded text-xs">
                    {pair.region}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Overview */}
        <div className="mt-12 bg-slate-800 rounded-lg p-8 border border-slate-700">
          <h2 className="text-2xl font-bold mb-6">Currency Analysis Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">📊</div>
                <h3 className="font-semibold text-lg">Real-time Charts</h3>
              </div>
              <p className="text-slate-400 text-sm ml-11">
                Live forex charts with multiple timeframes and technical overlays
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">📈</div>
                <h3 className="font-semibold text-lg">Technical Indicators</h3>
              </div>
              <p className="text-slate-400 text-sm ml-11">
                RSI, MACD, Fibonacci retracements, and pivot points
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">🌍</div>
                <h3 className="font-semibold text-lg">Economic Calendar</h3>
              </div>
              <p className="text-slate-400 text-sm ml-11">
                Track economic events affecting currency movements
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">🤖</div>
                <h3 className="font-semibold text-lg">AI Analysis</h3>
              </div>
              <p className="text-slate-400 text-sm ml-11">
                MarketSense AI adapted for forex with sentiment and trend analysis
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">📰</div>
                <h3 className="font-semibold text-lg">News & Events</h3>
              </div>
              <p className="text-slate-400 text-sm ml-11">
                Central bank decisions, economic reports, and geopolitical events
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">⚡</div>
                <h3 className="font-semibold text-lg">Live Rates</h3>
              </div>
              <p className="text-slate-400 text-sm ml-11">
                Real-time bid/ask spreads and pip movement tracking
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
