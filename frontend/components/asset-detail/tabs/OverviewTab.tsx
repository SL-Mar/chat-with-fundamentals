// components/asset-detail/tabs/OverviewTab.tsx
'use client';

import { useState, useEffect } from 'react';
import CandlestickChartAdvanced from '../../CandlestickChartAdvanced';
import InsiderTransactions from '../../InsiderTransactions';
import { api } from '../../../lib/api';
import { getBareTicker } from '../../../utils/tickerUtils';

interface OverviewTabProps {
  ticker: string;
  assetType: 'stock' | 'etf' | 'currency' | 'macro';
  livePrice?: any;
}

export default function OverviewTab({ ticker, assetType, livePrice }: OverviewTabProps) {
  const [keyMetrics, setKeyMetrics] = useState<any>(null);
  const [recentNews, setRecentNews] = useState<any[]>([]);
  const [eodData, setEodData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to safely format numbers
  const formatNumber = (value: any, decimals: number = 2): string => {
    if (value === null || value === undefined || value === 'N/A') return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? 'N/A' : num.toFixed(decimals);
  };

  useEffect(() => {
    fetchOverviewData();
  }, [ticker]);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);

      // Fetch EOD data for chart
      try {
        const eodResult = await api.fetchEODData(ticker);
        const dataArray = Array.isArray(eodResult) ? eodResult : eodResult?.data || [];

        // Convert OLHCV format to chart format and sort by date
        const formattedData = dataArray.map((item: any) => ({
          datetime: item.date,
          timestamp: item.date,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume
        })).sort((a: any, b: any) => {
          const timeA = new Date(a.datetime).getTime();
          const timeB = new Date(b.datetime).getTime();
          return timeA - timeB;
        });

        setEodData(formattedData);
      } catch (err) {
        console.error('Failed to fetch EOD data:', err);
      }

      // Fetch key metrics (for stocks/ETFs)
      if (assetType === 'stock' || assetType === 'etf') {
        try {
          const highlights = await api.fetchCompanyHighlights(ticker);
          setKeyMetrics(highlights);
        } catch (err) {
          console.error('Failed to fetch highlights:', err);
        }
      }

      // Fetch recent news (top 3)
      try {
        const newsData = await api.fetchNewsArticles(ticker, 3);
        setRecentNews(newsData);
      } catch (err) {
        console.error('Failed to fetch news:', err);
      }
    } catch (err) {
      console.error('Failed to fetch overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400">Loading overview...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Chart + Insider Transactions Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Left: Chart (50% width) */}
        {eodData.length > 0 && (
          <div className="min-w-0 h-[1000px]">
            <CandlestickChartAdvanced
              data={eodData}
              ticker={ticker}
              interval="1d"
              height={650}
            />
          </div>
        )}

        {/* Right: Insider Transactions (50% width) */}
        {(assetType === 'stock' || assetType === 'etf') && (
          <div className="w-full">
            <InsiderTransactions ticker={getBareTicker(ticker)} limit={20} />
          </div>
        )}
      </div>

      {/* Recent News */}
      {recentNews.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-xl font-bold mb-4">Recent News</h3>
          <div className="space-y-4">
            {recentNews.map((article, index) => (
              <div key={index} className="border-b border-slate-700 pb-4 last:border-b-0">
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 font-semibold text-lg"
                >
                  {article.title}
                </a>
                {article.content && (
                  <p className="text-sm text-slate-300 mt-2 line-clamp-3">
                    {article.content}
                  </p>
                )}
                <p className="text-sm text-slate-400 mt-1">
                  {new Date(article.date).toLocaleDateString()} • {article.symbols?.join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
