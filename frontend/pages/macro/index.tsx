// pages/macro/index.tsx - Macro Indicators Module Hub Page
'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';

const INDICATORS = [
  { id: 'GDP', name: 'Gross Domestic Product', country: 'USA', category: 'Growth' },
  { id: 'CPI', name: 'Consumer Price Index (Inflation)', country: 'USA', category: 'Inflation' },
  { id: 'UNEMPLOYMENT', name: 'Unemployment Rate', country: 'USA', category: 'Employment' },
  { id: 'INTEREST_RATE', name: 'Federal Funds Rate', country: 'USA', category: 'Monetary Policy' },
  { id: 'RETAIL_SALES', name: 'Retail Sales', country: 'USA', category: 'Consumption' },
  { id: 'PMI', name: 'Purchasing Managers Index', country: 'USA', category: 'Manufacturing' },
  { id: 'HOUSING_STARTS', name: 'Housing Starts', country: 'USA', category: 'Real Estate' },
  { id: 'TRADE_BALANCE', name: 'Trade Balance', country: 'USA', category: 'Trade' },
  { id: 'INDUSTRIAL_PRODUCTION', name: 'Industrial Production', country: 'USA', category: 'Manufacturing' },
  { id: 'CONSUMER_CONFIDENCE', name: 'Consumer Confidence Index', country: 'USA', category: 'Sentiment' },
];

export default function MacroHubPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'Growth', 'Inflation', 'Employment', 'Monetary Policy', 'Consumption', 'Manufacturing'];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/macro/${searchQuery.toUpperCase()}`);
    }
  };

  const goToIndicator = (id: string) => {
    router.push(`/macro/${id}`);
  };

  const filteredIndicators = INDICATORS.filter(
    (ind) => selectedCategory === 'all' || ind.category === selectedCategory
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold mb-2">Macroeconomic Indicators</h1>
          <p className="text-slate-400">
            Track key economic indicators, analyze trends, and understand macro environment impact
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
                placeholder="Search indicator (e.g., GDP, CPI, UNEMPLOYMENT)..."
                className="flex-1 px-6 py-4 bg-slate-800 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none text-lg"
              />
              <button
                type="submit"
                disabled={!searchQuery.trim()}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold text-lg transition-colors"
              >
                View
              </button>
            </div>
          </form>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div
            onClick={() => router.push('/economic-dashboard')}
            className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-6 cursor-pointer hover:scale-105 transition-transform"
          >
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-xl font-bold mb-2">Economic Dashboard</h3>
            <p className="text-blue-100 text-sm">
              Comprehensive view of all major economic indicators
            </p>
          </div>

          <div
            onClick={() => router.push('/calendar')}
            className="bg-gradient-to-br from-green-600 to-green-800 rounded-lg p-6 cursor-pointer hover:scale-105 transition-transform"
          >
            <div className="text-4xl mb-3">📅</div>
            <h3 className="text-xl font-bold mb-2">Economic Calendar</h3>
            <p className="text-green-100 text-sm">
              Upcoming economic releases and central bank decisions
            </p>
          </div>

        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded font-semibold transition-colors text-sm ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {category === 'all' ? 'All Indicators' : category}
              </button>
            ))}
          </div>
        </div>

        {/* Indicators Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-4">
            {selectedCategory === 'all' ? 'All Indicators' : selectedCategory}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredIndicators.map((indicator) => (
              <div
                key={indicator.id}
                onClick={() => goToIndicator(indicator.id)}
                className="bg-slate-800 rounded-lg p-5 cursor-pointer hover:bg-slate-750 transition-colors border border-slate-700 hover:border-blue-500"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-lg mb-1">{indicator.name}</div>
                    <div className="text-sm text-slate-400">{indicator.country}</div>
                  </div>
                  <div className="px-2 py-1 bg-slate-700 rounded text-xs">
                    {indicator.category}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
