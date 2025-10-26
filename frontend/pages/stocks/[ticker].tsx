// pages/stocks/[ticker].tsx - Stock Detail Page with 8 Tabs
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import CompanyHeader from '../../components/CompanyHeader';
import StockOverviewTab from '../../components/stocks/StockOverviewTab';
import StockFundamentalsTab from '../../components/stocks/StockFundamentalsTab';
import StockNewsTab from '../../components/stocks/StockNewsTab';
import StockTechnicalTab from '../../components/stocks/StockTechnicalTab';
import StockAIAnalysisTab from '../../components/stocks/StockAIAnalysisTab';
import StockDeepResearchTab from '../../components/stocks/StockDeepResearchTab';
import StockPeerComparisonTab from '../../components/stocks/StockPeerComparisonTab';
import StockLiveDataTab from '../../components/stocks/StockLiveDataTab';

type TabType = 'overview' | 'fundamentals' | 'news' | 'technical' | 'ai' | 'research' | 'peers' | 'live';

export default function StockDetailPage() {
  const router = useRouter();
  const { ticker } = router.query;
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [fundamentals, setFundamentals] = useState<any>(null);

  useEffect(() => {
    if (ticker && typeof ticker === 'string') {
      // Load any initial data if needed
      setFundamentals({ ticker });
    }
  }, [ticker]);

  if (!ticker || typeof ticker !== 'string') {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Stock Detail</h1>
          <p className="text-slate-400">No ticker specified</p>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'fundamentals', label: 'Fundamentals', icon: '💰' },
    { id: 'news', label: 'News & Sentiment', icon: '📰' },
    { id: 'technical', label: 'Technical', icon: '📈' },
    { id: 'ai', label: 'AI Analysis', icon: '🤖' },
    { id: 'research', label: 'Deep Research', icon: '🔬' },
    { id: 'peers', label: 'Peer Comparison', icon: '🔄' },
    { id: 'live', label: 'Live Data', icon: '⚡' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Back button */}
        <button
          onClick={() => router.push('/stocks')}
          className="mb-4 text-sm text-slate-400 hover:text-white flex items-center gap-2"
        >
          <span>←</span> Back to Stocks
        </button>

        {/* Company Header */}
        <CompanyHeader ticker={ticker} fundamentals={fundamentals} />

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
          {activeTab === 'overview' && <StockOverviewTab ticker={ticker} />}
          {activeTab === 'fundamentals' && <StockFundamentalsTab ticker={ticker} />}
          {activeTab === 'news' && <StockNewsTab ticker={ticker} />}
          {activeTab === 'technical' && <StockTechnicalTab ticker={ticker} />}
          {activeTab === 'ai' && <StockAIAnalysisTab ticker={ticker} />}
          {activeTab === 'research' && <StockDeepResearchTab ticker={ticker} />}
          {activeTab === 'peers' && <StockPeerComparisonTab ticker={ticker} />}
          {activeTab === 'live' && <StockLiveDataTab ticker={ticker} />}
        </div>
      </div>
    </div>
  );
}
