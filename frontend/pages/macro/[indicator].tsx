// pages/macro/[indicator].tsx - Macro Indicator Detail Page
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import AgentConsole from '../../components/AgentConsole';

type TabType = 'overview' | 'chart' | 'calendar' | 'ai';

export default function MacroIndicatorPage() {
  const router = useRouter();
  const { indicator } = router.query;
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [aiResult, setAiResult] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const runAIAnalysis = async () => {
    if (!indicator || typeof indicator !== 'string') return;

    try {
      setLoadingAI(true);
      const result = await api.analyzeMacro(indicator, false);
      setAiResult(result);
    } catch (err) {
      console.error('AI analysis failed:', err);
    } finally {
      setLoadingAI(false);
    }
  };

  if (!indicator || typeof indicator !== 'string') {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Macro Indicator</h1>
          <p className="text-slate-400">No indicator specified</p>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'chart', label: 'Historical Chart', icon: '📈' },
    { id: 'calendar', label: 'Release Calendar', icon: '📅' },
    { id: 'ai', label: 'AI Analysis', icon: '🤖' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Back button */}
        <button
          onClick={() => router.push('/macro')}
          className="mb-4 text-sm text-slate-400 hover:text-white flex items-center gap-2"
        >
          <span>←</span> Back to Macro Indicators
        </button>

        {/* Indicator Header */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
          <h1 className="text-3xl font-bold mb-2">{indicator.replace(/_/g, ' ')}</h1>
          <p className="text-slate-400">United States Economic Indicator</p>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">Current Value</div>
                  <div className="text-3xl font-bold">3.2%</div>
                  <div className="text-sm text-green-400 mt-1">↑ 0.1% from previous</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">Last Update</div>
                  <div className="text-xl font-bold">Jan 15, 2025</div>
                  <div className="text-sm text-slate-400 mt-1">Next: Feb 15, 2025</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">Frequency</div>
                  <div className="text-xl font-bold">Monthly</div>
                  <div className="text-sm text-slate-400 mt-1">Source: BLS</div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-xl font-bold mb-4">What This Indicator Measures</h3>
                <p className="text-slate-300 leading-relaxed">
                  This economic indicator provides insights into the health and direction of the economy.
                  It is closely watched by investors, policymakers, and economists to gauge economic momentum
                  and make informed decisions about monetary policy and investment strategies.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'chart' && (
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-xl font-bold mb-4">Historical Data</h3>
              <p className="text-slate-400">Historical chart will be displayed here.</p>
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-xl font-bold mb-4">Release Calendar</h3>
              <p className="text-slate-400">Upcoming release dates will be displayed here.</p>
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
                      <h3 className="text-xl font-bold mb-4">AI Analysis Result</h3>
                      <div className="text-2xl font-bold mb-2">{aiResult.signal}</div>
                      <p className="text-slate-300">{aiResult.reasoning}</p>
                    </div>
                  ) : (
                    <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
                      <div className="text-6xl mb-4">🤖</div>
                      <h3 className="text-xl font-bold mb-2">Ready to Analyze</h3>
                      <p className="text-slate-400">
                        Run AI analysis to understand the economic implications
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
