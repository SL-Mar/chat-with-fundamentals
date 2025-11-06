// pages/etfs/index.tsx - ETF Module Hub Page
'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import { getDisplayTicker } from '../../utils/tickerUtils';

const POPULAR_ETFS = [
  { symbol: 'SPY.US', name: 'SPDR S&P 500 ETF Trust', category: 'Equity - Broad Market' },
  { symbol: 'QQQ.US', name: 'Invesco QQQ Trust', category: 'Equity - Technology' },
  { symbol: 'IWM.US', name: 'iShares Russell 2000 ETF', category: 'Equity - Small Cap' },
  { symbol: 'DIA.US', name: 'SPDR Dow Jones Industrial Average ETF', category: 'Equity - Large Cap' },
  { symbol: 'VTI.US', name: 'Vanguard Total Stock Market ETF', category: 'Equity - Broad Market' },
  { symbol: 'VOO.US', name: 'Vanguard S&P 500 ETF', category: 'Equity - Large Cap' },
  { symbol: 'AGG.US', name: 'iShares Core U.S. Aggregate Bond ETF', category: 'Fixed Income' },
  { symbol: 'TLT.US', name: 'iShares 20+ Year Treasury Bond ETF', category: 'Fixed Income' },
  { symbol: 'GLD.US', name: 'SPDR Gold Shares', category: 'Commodities' },
  { symbol: 'VNQ.US', name: 'Vanguard Real Estate ETF', category: 'Real Estate' },
  { symbol: 'XLE.US', name: 'Energy Select Sector SPDR Fund', category: 'Sector - Energy' },
  { symbol: 'XLF.US', name: 'Financial Select Sector SPDR Fund', category: 'Sector - Financial' },
];

export default function ETFsHubPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    'all',
    'Equity - Broad Market',
    'Equity - Technology',
    'Equity - Large Cap',
    'Equity - Small Cap',
    'Fixed Income',
    'Commodities',
    'Real Estate',
    'Sector - Energy',
    'Sector - Financial',
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/etfs/${searchQuery.toUpperCase()}`);
    }
  };

  const goToETF = (symbol: string) => {
    router.push(`/etfs/${symbol}`);
  };

  const filteredETFs = POPULAR_ETFS.filter(
    (etf) => selectedCategory === 'all' || etf.category === selectedCategory
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold mb-2">ETFs (Exchange-Traded Funds)</h1>
          <p className="text-slate-400">
            Analyze ETF holdings, performance, and AI-powered investment insights
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
                placeholder="Search ETF by symbol (e.g., SPY.US, QQQ.US)..."
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

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex gap-2 flex-wrap">
            {categories.slice(0, 6).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded font-semibold transition-colors text-sm ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {category === 'all' ? 'All ETFs' : category}
              </button>
            ))}
          </div>
        </div>

        {/* ETFs Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-4">
            {selectedCategory === 'all' ? 'Popular ETFs' : selectedCategory}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredETFs.map((etf) => (
              <div
                key={etf.symbol}
                onClick={() => goToETF(etf.symbol)}
                className="bg-slate-800 rounded-lg p-5 cursor-pointer hover:bg-slate-750 transition-colors border border-slate-700 hover:border-blue-500"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-xl mb-1">{getDisplayTicker(etf.symbol)}</div>
                    <div className="text-sm text-slate-400 line-clamp-2">{etf.name}</div>
                  </div>
                </div>
                <div className="mt-3 px-2 py-1 bg-slate-700 rounded text-xs inline-block">
                  {etf.category}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
