// components/stocks/StockNewsTab.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import SentimentAnalysis from '../SentimentAnalysis';

interface StockNewsTabProps {
  ticker: string;
}

// Helper function outside component to prevent Fast Refresh issues
const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

export default function StockNewsTab({ ticker }: StockNewsTabProps) {
  const [news, setNews] = useState<any[]>([]);
  const [sentiment, setSentiment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
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
  }, [ticker]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

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
        <h3 className="text-xl font-bold mb-4">Recent News ({news.length})</h3>
        {news.length > 0 ? (
          <div className="space-y-4">
            {news.map((article: any, idx: number) => (
              <div key={idx} className="border-b border-slate-700/50 pb-4 last:border-b-0">
                <a
                  href={article.link || article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold text-white hover:text-blue-400 transition-colors block mb-2"
                >
                  {article.title}
                </a>

                {/* Metadata */}
                <div className="flex items-center gap-2 mb-2 text-sm">
                  {article.date && (
                    <span className="text-slate-400">{formatDate(article.date)}</span>
                  )}
                  {article.symbols && article.symbols.length > 0 && (
                    <>
                      <span className="text-slate-600">•</span>
                      <div className="flex gap-1">
                        {article.symbols.slice(0, 3).map((sym: string, i: number) => (
                          <span key={i} className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                            {sym}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                  {article.sentiment && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        (typeof article.sentiment === 'object' && article.sentiment.polarity > 0.5) || article.sentiment === 'positive'
                          ? 'bg-green-900/30 text-green-400'
                          : (typeof article.sentiment === 'object' && article.sentiment.polarity < -0.5) || article.sentiment === 'negative'
                          ? 'bg-red-900/30 text-red-400'
                          : 'bg-yellow-900/30 text-yellow-400'
                      }`}>
                        {typeof article.sentiment === 'object'
                          ? (article.sentiment.polarity > 0.5 ? 'Positive' : article.sentiment.polarity < -0.5 ? 'Negative' : 'Neutral')
                          : article.sentiment}
                      </span>
                    </>
                  )}
                </div>

                {/* Content Preview */}
                {article.content && (
                  <p className="text-sm text-slate-300 line-clamp-3">
                    {article.content}
                  </p>
                )}
              </div>
            ))}
          </div>
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
