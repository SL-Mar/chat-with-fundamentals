// pages/portfolios/index.tsx - Portfolio Module Hub Page
'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';

interface Portfolio {
  id: number;
  name: string;
  description: string;
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  assetCount: number;
}

const SAMPLE_PORTFOLIOS: Portfolio[] = [
  {
    id: 1,
    name: 'Growth Portfolio',
    description: 'High-growth tech and innovation stocks',
    totalValue: 125000,
    dayChange: 1250,
    dayChangePercent: 1.01,
    assetCount: 15
  },
  {
    id: 2,
    name: 'Dividend Income',
    description: 'Stable dividend-paying stocks and REITs',
    totalValue: 85000,
    dayChange: -320,
    dayChangePercent: -0.38,
    assetCount: 22
  },
  {
    id: 3,
    name: 'Balanced Portfolio',
    description: 'Mix of stocks, bonds, and ETFs',
    totalValue: 200000,
    dayChange: 500,
    dayChangePercent: 0.25,
    assetCount: 35
  },
];

export default function PortfoliosHubPage() {
  const router = useRouter();
  const [portfolios] = useState<Portfolio[]>(SAMPLE_PORTFOLIOS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioDescription, setNewPortfolioDescription] = useState('');

  const goToPortfolio = (id: number) => {
    router.push(`/portfolios/${id}`);
  };

  const createNewPortfolio = () => {
    setShowCreateModal(true);
  };

  const handleCreateSubmit = () => {
    // In a real implementation, this would call an API to create the portfolio
    console.log('Creating portfolio:', { name: newPortfolioName, description: newPortfolioDescription });
    setShowCreateModal(false);
    setNewPortfolioName('');
    setNewPortfolioDescription('');
    // TODO: Add API call to backend to create portfolio
    alert(`Portfolio "${newPortfolioName}" creation coming soon! Backend integration pending.`);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalValue = portfolios.reduce((sum, p) => sum + p.totalValue, 0);
  const totalDayChange = portfolios.reduce((sum, p) => sum + p.dayChange, 0);
  const totalDayChangePercent = (totalDayChange / (totalValue - totalDayChange)) * 100;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Portfolios</h1>
              <p className="text-slate-400">
                Track performance, optimize allocation, and analyze your investment portfolios
              </p>
            </div>
            <button
              onClick={createNewPortfolio}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
            >
              + Create Portfolio
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Total Portfolio Summary */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-8 mb-8 border border-slate-700">
          <h2 className="text-2xl font-bold mb-6">Total Portfolio Value</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-slate-400 mb-2">Total Value</div>
              <div className="text-4xl font-bold">{formatCurrency(totalValue)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400 mb-2">Today's Change</div>
              <div className={`text-3xl font-bold ${totalDayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalDayChange >= 0 ? '+' : ''}{formatCurrency(totalDayChange)}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-400 mb-2">Change %</div>
              <div className={`text-3xl font-bold ${totalDayChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalDayChangePercent >= 0 ? '+' : ''}{totalDayChangePercent.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* Portfolios List */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Your Portfolios</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolios.map((portfolio) => (
              <div
                key={portfolio.id}
                onClick={() => goToPortfolio(portfolio.id)}
                className="bg-slate-800 rounded-lg p-6 cursor-pointer hover:bg-slate-750 transition-colors border border-slate-700 hover:border-blue-500"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{portfolio.name}</h3>
                    <p className="text-sm text-slate-400">{portfolio.description}</p>
                  </div>
                  <div className="px-2 py-1 bg-slate-700 rounded text-xs">
                    {portfolio.assetCount} assets
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-slate-400">Total Value</div>
                    <div className="text-2xl font-bold">{formatCurrency(portfolio.totalValue)}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-400">Today</div>
                    <div className={`font-semibold ${portfolio.dayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {portfolio.dayChange >= 0 ? '+' : ''}{formatCurrency(portfolio.dayChange)} (
                      {portfolio.dayChangePercent >= 0 ? '+' : ''}{portfolio.dayChangePercent.toFixed(2)}%)
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Overview */}
        <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
          <h2 className="text-2xl font-bold mb-6">Portfolio Management Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">📊</div>
                <h3 className="font-semibold text-lg">Performance Tracking</h3>
              </div>
              <p className="text-slate-400 text-sm ml-11">
                Real-time portfolio valuation with detailed performance analytics
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">🎯</div>
                <h3 className="font-semibold text-lg">Asset Allocation</h3>
              </div>
              <p className="text-slate-400 text-sm ml-11">
                Visualize and optimize your portfolio allocation by sector, asset class, and geography
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">📈</div>
                <h3 className="font-semibold text-lg">Risk Analysis</h3>
              </div>
              <p className="text-slate-400 text-sm ml-11">
                Calculate portfolio volatility, beta, Sharpe ratio, and risk-adjusted returns
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">🤖</div>
                <h3 className="font-semibold text-lg">AI Optimization</h3>
              </div>
              <p className="text-slate-400 text-sm ml-11">
                Get AI-powered recommendations for portfolio rebalancing and optimization
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">💡</div>
                <h3 className="font-semibold text-lg">Rebalancing Alerts</h3>
              </div>
              <p className="text-slate-400 text-sm ml-11">
                Receive notifications when your portfolio drifts from target allocation
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">📊</div>
                <h3 className="font-semibold text-lg">Scenario Analysis</h3>
              </div>
              <p className="text-slate-400 text-sm ml-11">
                Test your portfolio against different market scenarios and stress tests
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Portfolio Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700">
            <h3 className="text-2xl font-bold mb-4">Create New Portfolio</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Portfolio Name</label>
                <input
                  type="text"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  placeholder="e.g., Growth Portfolio"
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Description (Optional)</label>
                <textarea
                  value={newPortfolioDescription}
                  onChange={(e) => setNewPortfolioDescription(e.target.value)}
                  placeholder="Brief description of your portfolio strategy"
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewPortfolioName('');
                  setNewPortfolioDescription('');
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubmit}
                disabled={!newPortfolioName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded font-semibold transition-colors"
              >
                Create Portfolio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
