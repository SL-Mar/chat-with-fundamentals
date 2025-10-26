// components/stocks/StockNewsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import NewsList from '../NewsList';
import SentimentAnalysis from '../SentimentAnalysis';

interface StockNewsTabProps {
  ticker: string;
}

export default function StockNewsTab({ ticker }: StockNewsTabProps) {
  const [news, setNews] = useState<any[]>([]);
  const [sentiment, setSentiment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [ticker]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch news articles
      const newsData = await api.fetchNewsArticles(ticker, undefined, 20);
      setNews(newsData.articles || newsData || []);

      // Fetch sentiment analysis
      try {
        const sentimentData = await api.fetchSentiment(ticker);
        setSentiment(sentimentData);
      } catch (sentimentErr) {
        console.warn('Sentiment not available:', sentimentErr);
      }
    } catch (err: any) {
      console.error('Failed to fetch news:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400">Loading news and sentiment...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sentiment Analysis */}
      {sentiment && (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-xl font-bold mb-4">Sentiment Analysis</h3>
          <SentimentAnalysis ticker={ticker} />
        </div>
      )}

      {/* News Articles */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-xl font-bold mb-4">Recent News</h3>
        {news.length > 0 ? (
          <NewsList news={news} />
        ) : (
          <div className="text-center py-8 text-slate-400">
            No news articles available for {ticker}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded font-semibold transition-colors"
        >
          {loading ? 'Refreshing...' : 'Refresh News'}
        </button>
      </div>
    </div>
  );
}
