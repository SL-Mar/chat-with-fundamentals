// pages/stocks/index.tsx - Stock Module Hub Page
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';

interface PopularStock {
  ticker: string;
  name: string;
  price?: number;
  change?: number;
  changePercent?: number;
}

const POPULAR_STOCKS = [
  { ticker: 'AAPL.US', name: 'Apple Inc.' },
  { ticker: 'MSFT.US', name: 'Microsoft Corporation' },
  { ticker: 'GOOGL.US', name: 'Alphabet Inc.' },
  { ticker: 'AMZN.US', name: 'Amazon.com Inc.' },
  { ticker: 'NVDA.US', name: 'NVIDIA Corporation' },
  { ticker: 'META.US', name: 'Meta Platforms Inc.' },
  { ticker: 'TSLA.US', name: 'Tesla Inc.' },
  { ticker: 'BRK-B.US', name: 'Berkshire Hathaway Inc.' },
  { ticker: 'JPM.US', name: 'JPMorgan Chase & Co.' },
  { ticker: 'V.US', name: 'Visa Inc.' },
  { ticker: 'WMT.US', name: 'Walmart Inc.' },
  { ticker: 'JNJ.US', name: 'Johnson & Johnson' },
];

const INDICES = [
  { ticker: 'SPY.US', name: 'S&P 500 ETF' },
  { ticker: 'QQQ.US', name: 'Nasdaq 100 ETF' },
  { ticker: 'DIA.US', name: 'Dow Jones ETF' },
  { ticker: 'IWM.US', name: 'Russell 2000 ETF' },
];

export default function StocksHubPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [popularStocks, setPopularStocks] = useState<PopularStock[]>(POPULAR_STOCKS);
  const [indices, setIndices] = useState<PopularStock[]>(INDICES);
  const [loading, setLoading] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const ticker = searchQuery.toUpperCase();
      router.push(`/stocks/${ticker}`);
    }
  };

  const goToStock = (ticker: string) => {
    router.push(`/stocks/${ticker}`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold mb-2">Stocks</h1>
          <p className="text-slate-400">
            Professional stock analysis with real-time data, AI insights, and comprehensive research
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
                placeholder="Search by ticker symbol (e.g., AAPL.US, MSFT.US)..."
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
            <p className="text-sm text-slate-500 mt-2">
              Tip: Include exchange suffix (e.g., .US for US stocks, .LSE for London)
            </p>
          </form>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div
            onClick={() => router.push('/stock-ai-analysis')}
            className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-6 cursor-pointer hover:scale-105 transition-transform"
          >
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="text-xl font-bold mb-2">MarketSense AI</h3>
            <p className="text-blue-100 text-sm">
              Multi-agent AI analysis combining fundamentals, news, technicals, and macro
            </p>
          </div>

          <div
            onClick={() => router.push('/screener')}
            className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg p-6 cursor-pointer hover:scale-105 transition-transform"
          >
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-xl font-bold mb-2">Stock Screener</h3>
            <p className="text-purple-100 text-sm">
              Filter and discover stocks based on technical indicators and fundamentals
            </p>
          </div>

          <div
            onClick={() => router.push('/calendar')}
            className="bg-gradient-to-br from-green-600 to-green-800 rounded-lg p-6 cursor-pointer hover:scale-105 transition-transform"
          >
            <div className="text-4xl mb-3">📅</div>
            <h3 className="text-xl font-bold mb-2">Earnings Calendar</h3>
            <p className="text-green-100 text-sm">
              Track upcoming earnings reports, IPOs, and stock splits
            </p>
          </div>
        </div>

        {/* Market Indices */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Market Indices</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {indices.map((index) => (
              <div
                key={index.ticker}
                onClick={() => goToStock(index.ticker)}
                className="bg-slate-800 rounded-lg p-4 cursor-pointer hover:bg-slate-750 transition-colors border border-slate-700 hover:border-blue-500"
              >
                <div className="font-bold text-lg mb-1">{index.ticker.replace('.US', '')}</div>
                <div className="text-sm text-slate-400">{index.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Stocks */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Popular Stocks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularStocks.map((stock) => (
              <div
                key={stock.ticker}
                onClick={() => goToStock(stock.ticker)}
                className="bg-slate-800 rounded-lg p-5 cursor-pointer hover:bg-slate-750 transition-colors border border-slate-700 hover:border-blue-500"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-xl mb-1">{stock.ticker.replace('.US', '')}</div>
                    <div className="text-sm text-slate-400">{stock.name}</div>
                  </div>
                  <div className="text-2xl">→</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Overview */}
        <div className="mt-12 bg-slate-800 rounded-lg p-8 border border-slate-700">
          <h2 className="text-2xl font-bold mb-6">What You Can Do</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">📊</div>
                <h3 className="font-semibold text-lg">Comprehensive Charts</h3>
              </div>
              <p className="text-slate-400 text-sm ml-11">
                EOD, intraday, and live price charts with TradingView integration
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">📈</div>
                <h3 className="font-semibold text-lg">Technical Analysis</h3>
              </div>
              <p className="text-slate-400 text-sm ml-11">
                RSI, MACD, moving averages, and 40+ technical indicators
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">💰</div>
                <h3 className="font-semibold text-lg">Fundamentals</h3>
              </div>
              <p className="text-slate-400 text-sm ml-11">
                Financial statements, ratios, analyst ratings, and ESG scores
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">📰</div>
                <h3 className="font-semibold text-lg">News & Sentiment</h3>
              </div>
              <p className="text-slate-400 text-sm ml-11">
                Real-time news aggregation with AI-powered sentiment analysis
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">🔬</div>
                <h3 className="font-semibold text-lg">Deep Research</h3>
              </div>
              <p className="text-slate-400 text-sm ml-11">
                AI-powered research using Tavily for comprehensive market insights
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">🤖</div>
                <h3 className="font-semibold text-lg">AI Analysis</h3>
              </div>
              <p className="text-slate-400 text-sm ml-11">
                MarketSense AI with 5-agent system providing BUY/HOLD/SELL signals
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">🔄</div>
                <h3 className="font-semibold text-lg">Peer Comparison</h3>
              </div>
              <p className="text-slate-400 text-sm ml-11">
                Compare stocks side-by-side across multiple metrics
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">⚡</div>
                <h3 className="font-semibold text-lg">Live Data</h3>
              </div>
              <p className="text-slate-400 text-sm ml-11">
                Real-time price updates and market data streaming
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
