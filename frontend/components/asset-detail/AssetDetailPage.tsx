// components/asset-detail/AssetDetailPage.tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import AssetHeader from './AssetHeader';
import TabNavigation, { AssetTab } from './TabNavigation';
import OverviewTab from './tabs/OverviewTab';
import ChartsTab from './tabs/ChartsTab';
import FundamentalsTab from './tabs/FundamentalsTab';
import NewsTab from './tabs/NewsTab';
import AIAnalysisTab from './tabs/AIAnalysisTab';
import StockPeerComparisonTab from '../stocks/StockPeerComparisonTab';
import StockDeepResearchTab from '../stocks/StockDeepResearchTab';
import ReturnsTab from './tabs/ReturnsTab';

interface AssetDetailPageProps {
  ticker: string;
  assetType: 'stock' | 'etf' | 'currency' | 'macro';
  defaultTab?: AssetTab;
}

export default function AssetDetailPage({ ticker, assetType, defaultTab = 'overview' }: AssetDetailPageProps) {
  const [activeTab, setActiveTab] = useState<AssetTab>(defaultTab);
  const [livePrice, setLivePrice] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAssetData();
  }, [ticker]);

  const fetchAssetData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch live price
      try {
        const livePriceData = await api.fetchLivePrice(ticker);
        setLivePrice(livePriceData);
      } catch (err) {
        console.error('Failed to fetch live price:', err);
      }

      // Fetch company/asset data (for stocks and ETFs)
      if (assetType === 'stock' || assetType === 'etf') {
        try {
          const highlights = await api.fetchCompanyHighlights(ticker);
          setCompanyData(highlights);
        } catch (err) {
          console.error('Failed to fetch company data:', err);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch asset data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <div className="text-xl text-slate-400">Loading {ticker}...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-300 mb-2">Failed to Load Asset</h2>
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 rounded text-white font-semibold"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab ticker={ticker} assetType={assetType} livePrice={livePrice} />;

      case 'intraday':
        return <ChartsTab ticker={ticker} assetType={assetType} />;

      case 'live':
        return (
          <div className="p-6">
            <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
              <div className="text-6xl mb-4">📊</div>
              <div className="text-xl text-slate-400 mb-2">Live data coming soon</div>
              <div className="text-sm text-slate-500">
                Real-time WebSocket streaming in development
              </div>
            </div>
          </div>
        );

      case 'fundamentals':
        return <FundamentalsTab ticker={ticker} assetType={assetType} />;

      case 'news':
        return <NewsTab ticker={ticker} assetType={assetType} />;

      case 'ai-analysis':
        return <AIAnalysisTab ticker={ticker} assetType={assetType} />;

      case 'research':
        return <StockDeepResearchTab ticker={ticker} />;

      case 'compare':
        return <StockPeerComparisonTab ticker={ticker} />;

      case 'returns':
        return <ReturnsTab ticker={ticker} />;

      case 'modelling':
        return (
          <div className="p-6">
            <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
              <div className="text-6xl mb-4">🤖</div>
              <div className="text-xl text-slate-400 mb-2">Modelling features coming soon</div>
              <div className="text-sm text-slate-500">
                Beta plot and forecasting ML models in development
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-6 text-center text-slate-400">
            Tab content not yet implemented
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Asset Header */}
      <AssetHeader
        ticker={ticker}
        assetType={assetType}
        livePrice={livePrice}
        companyData={companyData}
      />

      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        assetType={assetType}
      />

      {/* Tab Content */}
      <div className="bg-slate-900">
        {renderTabContent()}
      </div>
    </div>
  );
}
