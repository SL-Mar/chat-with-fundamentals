// pages/currencies/[pair].tsx - Currency Pair Detail Page
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TradingViewChart from '../../components/TradingViewChart';
import AgentConsole from '../../components/AgentConsole';
import { api } from '../../lib/api';

type TabType = 'overview' | 'technical' | 'news' | 'ai' | 'live';

export default function CurrencyDetailPage() {
  const router = useRouter();
  const { pair } = router.query;
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [liveRate, setLiveRate] = useState<any>(null);
  const [aiResult, setAiResult] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    if (pair && typeof pair === 'string') {
      fetchLiveRate();
    }
  }, [pair]);

  const fetchLiveRate = async () => {
    try {
      // This would call a forex API endpoint
      // For now, mock data
      setLiveRate({
        bid: 1.0850,
        ask: 1.0852,
        change: 0.0023,
        change_p: 0.21
      });
    } catch (err) {
      console.error('Failed to fetch live rate:', err);
    }
  };

  const runAIAnalysis = async () => {
    if (!pair || typeof pair !== 'string') return;

    try {
      setLoadingAI(true);
      const result = await api.analyzeCurrency(pair, false);
      setAiResult(result);
    } catch (err) {
      console.error('AI analysis failed:', err);
    } finally {
      setLoadingAI(false);
    }
  };

  if (!pair || typeof pair !== 'string') {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Currency Pair</h1>
          <p className="text-slate-400">No pair specified</p>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'technical', label: 'Technical', icon: '📈' },
    { id: 'news', label: 'News', icon: '📰' },
    { id: 'ai', label: 'AI Analysis', icon: '🤖' },
    { id: 'live', label: 'Live Rates', icon: '⚡' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Back button */}
        <button
          onClick={() => router.push('/currencies')}
          className="mb-4 text-sm text-slate-400 hover:text-white flex items-center gap-2"
        >
          <span>←</span> Back to Currencies
        </button>

        {/* Pair Header */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{pair}</h1>
              <p className="text-slate-400">Currency Pair Analysis</p>
            </div>
            {liveRate && (
              <div className="text-right">
                <div className="text-4xl font-bold">{liveRate.bid.toFixed(4)}</div>
                <div className={`text-lg ${liveRate.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {liveRate.change >= 0 ? '+' : ''}{liveRate.change.toFixed(4)} (
                  {liveRate.change_p.toFixed(2)}%)
                </div>
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
                <TradingViewChart ticker={pair.replace('/', '')} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">Bid</div>
                  <div className="text-2xl font-bold">{liveRate?.bid.toFixed(4) || 'N/A'}</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">Ask</div>
                  <div className="text-2xl font-bold">{liveRate?.ask.toFixed(4) || 'N/A'}</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">Spread</div>
                  <div className="text-2xl font-bold">
                    {liveRate ? ((liveRate.ask - liveRate.bid) * 10000).toFixed(1) : 'N/A'} pips
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'technical' && (
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-xl font-bold mb-4">Technical Analysis</h3>
              <p className="text-slate-400">Technical indicators for {pair} will be displayed here.</p>
            </div>
          )}

          {activeTab === 'news' && (
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-xl font-bold mb-4">Forex News</h3>
              <p className="text-slate-400">Latest news affecting {pair} will be displayed here.</p>
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

          {activeTab === 'live' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-8 border border-slate-700">
                <h3 className="text-xl font-bold mb-6">Live Rates</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-slate-400 mb-2">Bid</div>
                    <div className="text-5xl font-bold text-green-400">
                      {liveRate?.bid.toFixed(4) || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-2">Ask</div>
                    <div className="text-5xl font-bold text-red-400">
                      {liveRate?.ask.toFixed(4) || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
