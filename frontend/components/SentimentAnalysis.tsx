// components/SentimentAnalysis.tsx - News sentiment and social media analysis
'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface SentimentAnalysisProps {
  ticker: string;
}

export default function SentimentAnalysis({ ticker }: SentimentAnalysisProps) {
  const [sentiment, setSentiment] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [twitter, setTwitter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;
    fetchSentimentData();
  }, [ticker]);

  const fetchSentimentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch sentiment analysis
      const sentimentPromise = api.fetchSentiment(ticker).catch(() => null);

      // Fetch recent news articles
      const symbol = ticker.split('.')[0]; // Remove exchange suffix
      const newsPromise = api.fetchNewsArticles(symbol, undefined, 10).catch(() => []);

      // Fetch Twitter mentions
      const twitterPromise = api.fetchTwitterMentions(symbol).catch(() => null);

      const [sentimentData, newsData, twitterData] = await Promise.all([
        sentimentPromise,
        newsPromise,
        twitterPromise
      ]);

      setSentiment(sentimentData);
      setNews(Array.isArray(newsData) ? newsData : []);
      setTwitter(twitterData);
    } catch (err: any) {
      console.error('Failed to fetch sentiment data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Sentiment Analysis</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-slate-700 rounded"></div>
          <div className="h-4 bg-slate-700 rounded w-3/4"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error && !sentiment && news.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Sentiment Analysis</h3>
        <p className="text-sm text-red-400">Failed to load sentiment data</p>
      </div>
    );
  }

  // Parse sentiment score (depends on API response structure)
  const sentimentScore = sentiment?.sentiment || sentiment?.score || 0;
  const sentimentLabel = sentimentScore > 0.2 ? 'Bullish' : sentimentScore < -0.2 ? 'Bearish' : 'Neutral';
  const sentimentColor = sentimentLabel === 'Bullish' ? 'text-green-400' : sentimentLabel === 'Bearish' ? 'text-red-400' : 'text-yellow-400';

  // Calculate gauge position (convert -1 to 1 scale to 0-100%)
  const gaugePosition = ((sentimentScore + 1) / 2) * 100;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    } else if (diffHours < 168) {
      return `${Math.floor(diffHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Sentiment Analysis</h3>

      {/* Sentiment Gauge */}
      {sentiment && (
        <div className="mb-4 pb-4 border-b border-slate-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-400">Overall Sentiment</span>
            <span className={`text-sm font-semibold ${sentimentColor}`}>{sentimentLabel}</span>
          </div>

          {/* Gauge visualization */}
          <div className="relative h-8 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full overflow-hidden">
            {/* Needle */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-lg transition-all duration-500"
              style={{ left: `${gaugePosition}%` }}
            >
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
            </div>
          </div>

          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>Bearish</span>
            <span>Neutral</span>
            <span>Bullish</span>
          </div>
        </div>
      )}

      {/* Social Media Buzz */}
      {twitter && (
        <div className="mb-4 pb-4 border-b border-slate-700">
          <div className="text-sm text-slate-400 mb-2">Social Media Buzz</div>
          <div className="flex items-center gap-4">
            <div className="text-xs">
              <span className="text-slate-400">Mentions: </span>
              <span className="text-white font-semibold">{twitter.mentions || 0}</span>
            </div>
            <div className="text-xs">
              <span className="text-slate-400">Engagement: </span>
              <span className="text-white font-semibold">{twitter.engagement || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent News */}
      {news.length > 0 && (
        <div>
          <div className="text-sm text-slate-400 mb-2">Recent News</div>
          <div className="space-y-2">
            {news.slice(0, 5).map((article: any, idx: number) => (
              <div key={idx} className="border-b border-slate-700/50 pb-2 last:border-b-0">
                <a
                  href={article.link || article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white hover:text-blue-400 transition-colors line-clamp-2"
                >
                  {article.title}
                </a>
                <div className="flex items-center gap-2 mt-1">
                  {article.source && (
                    <span className="text-xs text-slate-500">{article.source}</span>
                  )}
                  {article.date && (
                    <>
                      <span className="text-xs text-slate-600">•</span>
                      <span className="text-xs text-slate-500">{formatDate(article.date)}</span>
                    </>
                  )}
                  {article.sentiment && (
                    <>
                      <span className="text-xs text-slate-600">•</span>
                      <span
                        className={`text-xs font-semibold ${
                          (typeof article.sentiment === 'object' && article.sentiment.polarity > 0.5) || article.sentiment === 'positive'
                            ? 'text-green-400'
                            : (typeof article.sentiment === 'object' && article.sentiment.polarity < -0.5) || article.sentiment === 'negative'
                            ? 'text-red-400'
                            : 'text-yellow-400'
                        }`}
                      >
                        {typeof article.sentiment === 'object'
                          ? (article.sentiment.polarity > 0.5 ? 'Positive' : article.sentiment.polarity < -0.5 ? 'Negative' : 'Neutral')
                          : article.sentiment}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!sentiment && news.length === 0 && !twitter && (
        <p className="text-sm text-slate-400">No sentiment data available</p>
      )}
    </div>
  );
}
