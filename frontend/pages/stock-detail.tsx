// pages/stock-detail.tsx - Enhanced stock detail page with professional analysis
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { api } from '../lib/api';
import CompanyHeader from '../components/CompanyHeader';
import AnalystRatings from '../components/AnalystRatings';
import InsiderTransactions from '../components/InsiderTransactions';
import DividendHistory from '../components/DividendHistory';
import MarketCapHistory from '../components/MarketCapHistory';
import SentimentAnalysis from '../components/SentimentAnalysis';
import TechnicalIndicators from '../components/TechnicalIndicators';
import EarningsCalendar from '../components/EarningsCalendar';
import IntradayChart from '../components/IntradayChart';

export default function StockDetailPage() {
  const router = useRouter();
  const { ticker } = router.query;

  const [fundamentals, setFundamentals] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'fundamentals' | 'technicals' | 'news'>('overview');

  useEffect(() => {
    if (!ticker || typeof ticker !== 'string') return;
    fetchFundamentals();
  }, [ticker]);

  const fetchFundamentals = async () => {
    if (!ticker || typeof ticker !== 'string') return;

    try {
      setLoading(true);
      setError(null);

      // Fetch fundamental data for company info
      // This assumes you have an endpoint or can use the chat endpoint
      // For now, we'll just set ticker-based data
      setFundamentals({ ticker });
    } catch (err: any) {
      console.error('Failed to fetch fundamentals:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!ticker) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Stock Detail</h1>
          <p className="text-slate-400">No ticker specified</p>
        </div>
      </div>
    );
  }

  const tickerStr = typeof ticker === 'string' ? ticker : ticker[0];

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-4 text-sm text-slate-400 hover:text-white flex items-center gap-2"
        >
          <span>←</span> Back
        </button>

        {/* Company Header */}
        <CompanyHeader ticker={tickerStr} fundamentals={fundamentals} />

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('fundamentals')}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === 'fundamentals'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Fundamentals
          </button>
          <button
            onClick={() => setActiveTab('technicals')}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === 'technicals'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Technicals
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === 'news'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            News & Sentiment
          </button>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Chart and Key Metrics */}
            <div className="lg:col-span-2 space-y-6">
              <IntradayChart ticker={tickerStr} />
              <div className="grid grid-cols-2 gap-6">
                <TechnicalIndicators ticker={tickerStr} />
                <EarningsCalendar ticker={tickerStr} />
              </div>
            </div>

            {/* Right Column - Analysis Widgets */}
            <div className="space-y-6">
              <AnalystRatings ticker={tickerStr} />
              <MarketCapHistory ticker={tickerStr} />
              <SentimentAnalysis ticker={tickerStr} />
            </div>
          </div>
        )}

        {activeTab === 'fundamentals' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalystRatings ticker={tickerStr} />
            <DividendHistory ticker={tickerStr} />
            <InsiderTransactions ticker={tickerStr} />
            <MarketCapHistory ticker={tickerStr} />
          </div>
        )}

        {activeTab === 'technicals' && (
          <div className="space-y-6">
            <IntradayChart ticker={tickerStr} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TechnicalIndicators ticker={tickerStr} />
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Advanced Technical Analysis</h3>
                <p className="text-sm text-slate-400">
                  Coming soon: MACD, Bollinger Bands, Volume Analysis, Moving Average Crossovers
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'news' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SentimentAnalysis ticker={tickerStr} />
            </div>
            <div>
              <InsiderTransactions ticker={tickerStr} limit={10} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
