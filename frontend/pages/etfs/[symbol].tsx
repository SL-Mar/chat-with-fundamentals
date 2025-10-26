// pages/etfs/[symbol].tsx - ETF Detail Page
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import TradingViewChart from '../../components/TradingViewChart';
import ETFHoldings from '../../components/ETFHoldings';
import AgentConsole from '../../components/AgentConsole';

type TabType = 'overview' | 'holdings' | 'performance' | 'news' | 'ai';

export default function ETFDetailPage() {
  const router = useRouter();
  const { symbol } = router.query;
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [etfData, setEtfData] = useState<any>(null);
  const [aiResult, setAiResult] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    if (symbol && typeof symbol === 'string') {
      fetchETFData();
    }
  }, [symbol]);

  const fetchETFData = async () => {
    try {
      const data = await api.fetchLivePrice(symbol as string);
      setEtfData(data);
    } catch (err) {
      console.error('Failed to fetch ETF data:', err);
    }
  };

  const runAIAnalysis = async () => {
    if (!symbol || typeof symbol !== 'string') return;

    try {
      setLoadingAI(true);
      const result = await api.analyzeETF(symbol, false);
      setAiResult(result);
    } catch (err) {
      console.error('AI analysis failed:', err);
    } finally {
      setLoadingAI(false);
    }
  };

  if (!symbol || typeof symbol !== 'string') {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">ETF Detail</h1>
          <p className="text-slate-400">No symbol specified</p>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'holdings', label: 'Holdings', icon: '📋' },
    { id: 'performance', label: 'Performance', icon: '📈' },
    { id: 'news', label: 'News', icon: '📰' },
    { id: 'ai', label: 'AI Analysis', icon: '🤖' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Back button */}
        <button
          onClick={() => router.push('/etfs')}
          className="mb-4 text-sm text-slate-400 hover:text-white flex items-center gap-2"
        >
          <span>←</span> Back to ETFs
        </button>

        {/* ETF Header */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{symbol}</h1>
              <p className="text-slate-400">Exchange-Traded Fund</p>
            </div>
            {etfData && (
              <div className="text-right">
                <div className="text-4xl font-bold">${etfData.price?.toFixed(2) || 'N/A'}</div>
                {etfData.change !== undefined && (
                  <div className={`text-lg ${etfData.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {etfData.change >= 0 ? '+' : ''}{etfData.change.toFixed(2)} (
                    {etfData.change_p?.toFixed(2)}%)
                  </div>
                )}
              </div>
            )}
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
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-xl font-bold mb-4">Price Chart</h3>
                <TradingViewChart ticker={symbol.replace('.US', '')} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">NAV</div>
                  <div className="text-2xl font-bold">${etfData?.nav?.toFixed(2) || 'N/A'}</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">AUM</div>
                  <div className="text-2xl font-bold">
                    {etfData?.aum ? `$${(etfData.aum / 1_000_000_000).toFixed(2)}B` : 'N/A'}
                  </div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">Expense Ratio</div>
                  <div className="text-2xl font-bold">{etfData?.expenseRatio?.toFixed(2) || '0.03'}%</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">Div Yield</div>
                  <div className="text-2xl font-bold">{etfData?.dividendYield?.toFixed(2) || 'N/A'}%</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'holdings' && (
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-xl font-bold mb-4">ETF Holdings</h3>
              <ETFHoldings ticker={symbol} />
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-xl font-bold mb-4">Performance Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-sm text-slate-400 mb-1">YTD Return</div>
                    <div className="text-2xl font-bold text-green-400">+12.5%</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-1">1 Year Return</div>
                    <div className="text-2xl font-bold text-green-400">+18.3%</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-1">3 Year Return</div>
                    <div className="text-2xl font-bold text-green-400">+42.7%</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Volatility</div>
                    <div className="text-2xl font-bold">15.2%</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Sharpe Ratio</div>
                    <div className="text-2xl font-bold">1.23</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Beta</div>
                    <div className="text-2xl font-bold">1.02</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'news' && (
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-xl font-bold mb-4">Latest News</h3>
              <p className="text-slate-400">News articles for {symbol} will be displayed here.</p>
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
                  {loadingAI ? 'Analyzing...' : 'Run AI Analysis'}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-[600px]">
                  <AgentConsole autoScroll maxLogs={200} />
                </div>

                <div>
                  {aiResult ? (
                    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                      <h3 className="text-xl font-bold mb-4">AI Result</h3>
                      <div className="text-2xl font-bold mb-2">{aiResult.signal}</div>
                      <p className="text-slate-300">{aiResult.reasoning}</p>
                    </div>
                  ) : (
                    <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
                      <div className="text-6xl mb-4">🤖</div>
                      <h3 className="text-xl font-bold mb-2">Ready to Analyze</h3>
                      <p className="text-slate-400">Click "Run AI Analysis" to start</p>
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
