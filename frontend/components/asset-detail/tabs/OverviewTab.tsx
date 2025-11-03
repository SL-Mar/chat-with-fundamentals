// components/asset-detail/tabs/OverviewTab.tsx
'use client';

import { useState, useEffect } from 'react';
import CandlestickChartAdvanced from '../../CandlestickChartAdvanced';
import { api } from '../../../lib/api';

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
    <div className="p-6 space-y-6">
      {/* Live Price Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {livePrice && (
          <>
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Current Price</div>
              <div className="text-2xl font-bold">${livePrice.price?.toFixed(2) || 'N/A'}</div>
              {livePrice.change !== undefined && (
                <div className={`text-sm ${livePrice.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {livePrice.change >= 0 ? '+' : ''}{livePrice.change.toFixed(2)} (
                  {livePrice.change_p?.toFixed(2)}%)
                </div>
              )}
            </div>

            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Open</div>
              <div className="text-2xl font-bold">${livePrice.open?.toFixed(2) || 'N/A'}</div>
            </div>

            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">High / Low</div>
              <div className="text-xl font-bold">
                ${livePrice.high?.toFixed(2) || 'N/A'} / ${livePrice.low?.toFixed(2) || 'N/A'}
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Volume</div>
              <div className="text-2xl font-bold">
                {livePrice.volume ? (livePrice.volume / 1_000_000).toFixed(2) + 'M' : 'N/A'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Chart and Metrics Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* EOD Chart - Takes 3 columns */}
        <div className="lg:col-span-3">
          {eodData.length > 0 && (
            <CandlestickChartAdvanced
              data={eodData}
              ticker={ticker}
              interval="1d"
              height={500}
            />
          )}
        </div>

        {/* Key Metrics Sidebar - Takes 1 column */}
        {keyMetrics && (
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h3 className="text-lg font-bold mb-4">Key Metrics</h3>
              <div className="space-y-3">
                {keyMetrics.marketCap && keyMetrics.marketCap !== 'N/A' && (
                  <div>
                    <div className="text-xs text-slate-400">Market Cap</div>
                    <div className="text-sm font-semibold">
                      ${formatNumber(parseFloat(keyMetrics.marketCap) / 1_000_000_000, 2)}B
                    </div>
                  </div>
                )}
                {keyMetrics.peRatio && keyMetrics.peRatio !== 'N/A' && (
                  <div>
                    <div className="text-xs text-slate-400">P/E Ratio</div>
                    <div className="text-sm font-semibold">{formatNumber(keyMetrics.peRatio)}</div>
                  </div>
                )}
                {keyMetrics.eps && keyMetrics.eps !== 'N/A' && (
                  <div>
                    <div className="text-xs text-slate-400">EPS</div>
                    <div className="text-sm font-semibold">${formatNumber(keyMetrics.eps)}</div>
                  </div>
                )}
                {keyMetrics.dividendYield && keyMetrics.dividendYield !== 'N/A' && (
                  <div>
                    <div className="text-xs text-slate-400">Dividend Yield</div>
                    <div className="text-sm font-semibold">{formatNumber(keyMetrics.dividendYield)}%</div>
                  </div>
                )}
                {keyMetrics['52WeekHigh'] && keyMetrics['52WeekHigh'] !== 'N/A' && (
                  <div>
                    <div className="text-xs text-slate-400">52 Week High</div>
                    <div className="text-sm font-semibold">${formatNumber(keyMetrics['52WeekHigh'])}</div>
                  </div>
                )}
                {keyMetrics['52WeekLow'] && keyMetrics['52WeekLow'] !== 'N/A' && (
                  <div>
                    <div className="text-xs text-slate-400">52 Week Low</div>
                    <div className="text-sm font-semibold">${formatNumber(keyMetrics['52WeekLow'])}</div>
                  </div>
                )}
                {keyMetrics.beta && keyMetrics.beta !== 'N/A' && (
                  <div>
                    <div className="text-xs text-slate-400">Beta</div>
                    <div className="text-sm font-semibold">{formatNumber(keyMetrics.beta)}</div>
                  </div>
                )}
                {keyMetrics.wallStreetTargetPrice && keyMetrics.wallStreetTargetPrice !== 'N/A' && (
                  <div>
                    <div className="text-xs text-slate-400">Analyst Target</div>
                    <div className="text-sm font-semibold">${formatNumber(keyMetrics.wallStreetTargetPrice)}</div>
                  </div>
                )}
              </div>
            </div>
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
                  className="text-blue-400 hover:text-blue-300 font-semibold"
                >
                  {article.title}
                </a>
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
