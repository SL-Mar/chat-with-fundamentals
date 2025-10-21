// components/CompanyHeader.tsx - Company branding and key metrics header
'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface CompanyHeaderProps {
  ticker: string;
  fundamentals?: any; // Optional: pass fundamentals if already fetched
}

export default function CompanyHeader({ ticker, fundamentals }: CompanyHeaderProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;
    fetchLogo();
  }, [ticker]);

  const fetchLogo = async () => {
    try {
      setLoading(true);
      const data = await api.fetchCompanyLogo(ticker);
      setLogoUrl(data.logo_url);
    } catch (err: any) {
      console.error('Failed to fetch logo:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Extract company info from fundamentals if available
  const companyName = fundamentals?.General?.Name || ticker.split('.')[0];
  const sector = fundamentals?.General?.Sector || 'N/A';
  const industry = fundamentals?.General?.Industry || 'N/A';
  const marketCap = fundamentals?.Highlights?.MarketCapitalization;
  const peRatio = fundamentals?.Highlights?.PERatio;
  const dividendYield = fundamentals?.Highlights?.DividendYield;
  const description = fundamentals?.General?.Description;

  const formatMarketCap = (value: number) => {
    if (!value) return 'N/A';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(2)}`;
  };

  const formatPercent = (value: number) => {
    if (!value) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 mb-6">
      <div className="flex items-start gap-6">
        {/* Company Logo */}
        <div className="flex-shrink-0">
          {loading ? (
            <div className="w-16 h-16 bg-slate-700 rounded-lg animate-pulse"></div>
          ) : logoUrl && !error ? (
            <img
              src={logoUrl}
              alt={`${companyName} logo`}
              className="w-16 h-16 rounded-lg object-contain bg-white p-2"
              onError={() => setLogoUrl(null)}
            />
          ) : (
            <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center text-2xl font-bold text-slate-400">
              {ticker.charAt(0)}
            </div>
          )}
        </div>

        {/* Company Info */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{companyName}</h1>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono text-blue-400">{ticker}</span>
                {sector !== 'N/A' && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="text-sm text-slate-400">{sector}</span>
                  </>
                )}
                {industry !== 'N/A' && sector !== industry && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="text-sm text-slate-400">{industry}</span>
                  </>
                )}
              </div>
            </div>

            {/* Key Metrics Badges */}
            <div className="flex gap-3">
              {marketCap && (
                <div className="bg-slate-700 rounded-lg px-3 py-2 text-center">
                  <div className="text-xs text-slate-400">Market Cap</div>
                  <div className="text-sm font-semibold text-white">
                    {formatMarketCap(marketCap)}
                  </div>
                </div>
              )}
              {peRatio && (
                <div className="bg-slate-700 rounded-lg px-3 py-2 text-center">
                  <div className="text-xs text-slate-400">P/E Ratio</div>
                  <div className="text-sm font-semibold text-white">
                    {peRatio.toFixed(2)}
                  </div>
                </div>
              )}
              {dividendYield && (
                <div className="bg-slate-700 rounded-lg px-3 py-2 text-center">
                  <div className="text-xs text-slate-400">Div Yield</div>
                  <div className="text-sm font-semibold text-green-400">
                    {formatPercent(dividendYield)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Company Description */}
          {description && (
            <p className="text-sm text-slate-400 mt-3 line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
