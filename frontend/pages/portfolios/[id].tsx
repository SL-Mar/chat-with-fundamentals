// pages/portfolios/[id].tsx - Portfolio Detail Page
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import AgentConsole from '../../components/AgentConsole';

type TabType = 'overview' | 'holdings' | 'performance' | 'allocation' | 'ai';

interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  value: number;
  gainLoss: number;
  gainLossPercent: number;
  weight: number;
}

const SAMPLE_HOLDINGS: Holding[] = [
  {
    symbol: 'AAPL.US',
    name: 'Apple Inc.',
    quantity: 100,
    avgCost: 150,
    currentPrice: 175,
    value: 17500,
    gainLoss: 2500,
    gainLossPercent: 16.67,
    weight: 35
  },
  {
    symbol: 'MSFT.US',
    name: 'Microsoft Corporation',
    quantity: 50,
    avgCost: 300,
    currentPrice: 350,
    value: 17500,
    gainLoss: 2500,
    gainLossPercent: 16.67,
    weight: 35
  },
  {
    symbol: 'GOOGL.US',
    name: 'Alphabet Inc.',
    quantity: 100,
    avgCost: 120,
    currentPrice: 150,
    value: 15000,
    gainLoss: 3000,
    gainLossPercent: 25,
    weight: 30
  },
];

export default function PortfolioDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [holdings] = useState<Holding[]>(SAMPLE_HOLDINGS);
  const [aiResult, setAiResult] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const runAIAnalysis = async () => {
    if (!id) return;

    try {
      setLoadingAI(true);
      const result = await api.analyzePortfolio(Number(id), false);
      setAiResult(result);
    } catch (err) {
      console.error('AI analysis failed:', err);
    } finally {
      setLoadingAI(false);
    }
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Portfolio</h1>
          <p className="text-slate-400">No portfolio specified</p>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'holdings', label: 'Holdings', icon: '📋' },
    { id: 'performance', label: 'Performance', icon: '📈' },
    { id: 'allocation', label: 'Allocation', icon: '🎯' },
    { id: 'ai', label: 'AI Optimization', icon: '🤖' },
  ];

  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
  const totalGainLoss = holdings.reduce((sum, h) => sum + h.gainLoss, 0);
  const totalGainLossPercent = (totalGainLoss / (totalValue - totalGainLoss)) * 100;

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Back button */}
        <button
          onClick={() => router.push('/portfolios')}
          className="mb-4 text-sm text-slate-400 hover:text-white flex items-center gap-2"
        >
          <span>←</span> Back to Portfolios
        </button>

        {/* Portfolio Header */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Growth Portfolio</h1>
              <p className="text-slate-400">High-growth tech and innovation stocks</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400 mb-1">Total Value</div>
              <div className="text-4xl font-bold">{formatCurrency(totalValue)}</div>
              <div className={`text-lg ${totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)} (
                {totalGainLossPercent >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%)
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-slate-700 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="pb-12">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">Total Value</div>
                  <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">Total Gain/Loss</div>
                  <div className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(totalGainLoss)}
                  </div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">Return %</div>
                  <div className={`text-2xl font-bold ${totalGainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {totalGainLossPercent.toFixed(2)}%
                  </div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">Holdings</div>
                  <div className="text-2xl font-bold">{holdings.length}</div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-xl font-bold mb-4">Quick Stats</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-slate-400">Volatility (30d)</div>
                    <div className="text-lg font-semibold">18.5%</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Sharpe Ratio</div>
                    <div className="text-lg font-semibold">1.45</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Beta</div>
                    <div className="text-lg font-semibold">1.15</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'holdings' && (
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="px-6 py-4 text-left font-bold">Symbol</th>
                    <th className="px-6 py-4 text-right font-bold">Quantity</th>
                    <th className="px-6 py-4 text-right font-bold">Avg Cost</th>
                    <th className="px-6 py-4 text-right font-bold">Current Price</th>
                    <th className="px-6 py-4 text-right font-bold">Value</th>
                    <th className="px-6 py-4 text-right font-bold">Gain/Loss</th>
                    <th className="px-6 py-4 text-right font-bold">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding) => (
                    <tr key={holding.symbol} className="border-b border-slate-700">
                      <td className="px-6 py-4">
                        <div className="font-bold">{holding.symbol.replace('.US', '')}</div>
                        <div className="text-sm text-slate-400">{holding.name}</div>
                      </td>
                      <td className="px-6 py-4 text-right">{holding.quantity}</td>
                      <td className="px-6 py-4 text-right">{formatCurrency(holding.avgCost)}</td>
                      <td className="px-6 py-4 text-right">{formatCurrency(holding.currentPrice)}</td>
                      <td className="px-6 py-4 text-right font-semibold">{formatCurrency(holding.value)}</td>
                      <td className={`px-6 py-4 text-right font-semibold ${
                        holding.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(holding.gainLoss)}<br />
                        <span className="text-sm">({holding.gainLossPercent.toFixed(2)}%)</span>
                      </td>
                      <td className="px-6 py-4 text-right">{holding.weight.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-xl font-bold mb-4">Performance Chart</h3>
              <p className="text-slate-400">Performance chart will be displayed here.</p>
            </div>
          )}

          {activeTab === 'allocation' && (
            <div className="space-y-6">
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-xl font-bold mb-4">Asset Allocation</h3>
                <div className="space-y-3">
                  {holdings.map((holding) => (
                    <div key={holding.symbol}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>{holding.symbol.replace('.US', '')}</span>
                        <span>{holding.weight.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-blue-500"
                          style={{ width: `${holding.weight}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <button
                  onClick={runAIAnalysis}
                  disabled={loadingAI}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded font-semibold transition-colors"
                >
                  {loadingAI ? 'Analyzing...' : 'Run AI Portfolio Optimization'}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-[600px]">
                  <AgentConsole autoScroll maxLogs={200} />
                </div>

                <div>
                  {aiResult ? (
                    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                      <h3 className="text-xl font-bold mb-4">AI Recommendations</h3>
                      <div className="text-2xl font-bold mb-2">{aiResult.signal}</div>
                      <p className="text-slate-300">{aiResult.reasoning}</p>
                    </div>
                  ) : (
                    <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
                      <div className="text-6xl mb-4">🤖</div>
                      <h3 className="text-xl font-bold mb-2">AI Portfolio Optimization</h3>
                      <p className="text-slate-400">
                        Get AI-powered recommendations for portfolio rebalancing and optimization
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
