// components/asset-detail/AssetHeader.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getDisplayTicker } from '@/utils/tickerUtils';

interface AssetHeaderProps {
  ticker: string;
  assetType: 'stock' | 'etf' | 'currency' | 'macro';
  livePrice?: any;
  companyData?: any;
}

export default function AssetHeader({ ticker, assetType, livePrice, companyData }: AssetHeaderProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    // Fetch company logo
    if (assetType === 'stock' || assetType === 'etf') {
      fetch(`http://localhost:8000/special/logo?ticker=${ticker}`)
        .then(res => {
          if (!res.ok) throw new Error('Logo fetch failed');
          return res.json();
        })
        .then(data => {
          if (data.logo_url && data.logo_url !== 'NA' && data.logo_url.startsWith('http')) {
            setLogoUrl(data.logo_url);
          } else {
            setLogoUrl(null);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch logo:', err);
          // Logo fetch failed - use fallback
          setLogoUrl(null);
        });
    }
  }, [ticker, assetType]);

  // Format price change - ensure we have valid numbers
  const priceChange = typeof livePrice?.change === 'number' ? livePrice.change : 0;
  const priceChangePercent = typeof livePrice?.change_p === 'number' ? livePrice.change_p : 0;
  const isPositive = priceChange >= 0;

  // Format market cap
  const formatMarketCap = (cap: number | string) => {
    if (!cap || cap === 'N/A') return 'N/A';
    const numCap = typeof cap === 'string' ? parseFloat(cap) : cap;
    if (isNaN(numCap)) return 'N/A';
    if (numCap >= 1e12) return `$${(numCap / 1e12).toFixed(2)}T`;
    if (numCap >= 1e9) return `$${(numCap / 1e9).toFixed(2)}B`;
    if (numCap >= 1e6) return `$${(numCap / 1e6).toFixed(2)}M`;
    return `$${numCap.toFixed(0)}`;
  };

  return (
    <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div className="flex items-start justify-between">
        {/* Left: Logo + Ticker Info */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          {logoUrl ? (
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-white flex items-center justify-center">
              <Image
                src={logoUrl}
                alt={`${ticker} logo`}
                width={64}
                height={64}
                className="object-contain"
                onError={() => setLogoUrl(null)}
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg bg-slate-700 flex items-center justify-center">
              <span className="text-2xl font-bold text-slate-400">
                {ticker.charAt(0)}
              </span>
            </div>
          )}

          {/* Ticker & Company Name */}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">
                {getDisplayTicker(ticker)}
              </h1>
              <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded uppercase">
                {assetType}
              </span>
            </div>
            <p className="text-lg text-slate-400 mt-1">
              {assetType === 'macro'
                ? ticker.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()
                : (companyData?.name || 'Loading...')
              }
            </p>
            {companyData?.exchange && (
              <p className="text-sm text-slate-500">
                {companyData.exchange} | Sector: {companyData.sector || 'N/A'}
              </p>
            )}
          </div>
        </div>

        {/* Right: Live Price (not for macro indicators) */}
        {livePrice && assetType !== 'macro' && (
          <div className="text-right">
            <div className="text-4xl font-bold text-white">
              ${livePrice.price?.toFixed(2) || 'N/A'}
            </div>
            <div className={`text-lg font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
            </div>
            {/* Timestamp */}
            <div className="text-sm text-slate-300 mt-2 font-medium">
              {livePrice.timestamp ? new Date(livePrice.timestamp * 1000).toLocaleString() : 'Unknown'}
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats Row (not for macro indicators) */}
      {(companyData || livePrice) && assetType !== 'macro' && (
        <div className="mt-4 flex flex-wrap gap-6 text-sm">
          {livePrice?.open && typeof livePrice.open === 'number' && (
            <div>
              <span className="text-slate-500">Open:</span>
              <span className="ml-2 text-white font-semibold">${livePrice.open.toFixed(2)}</span>
            </div>
          )}
          {livePrice?.high && typeof livePrice.high === 'number' && (
            <div>
              <span className="text-slate-500">High:</span>
              <span className="ml-2 text-white font-semibold">${livePrice.high.toFixed(2)}</span>
            </div>
          )}
          {livePrice?.low && typeof livePrice.low === 'number' && (
            <div>
              <span className="text-slate-500">Low:</span>
              <span className="ml-2 text-white font-semibold">${livePrice.low.toFixed(2)}</span>
            </div>
          )}
          {livePrice?.volume && typeof livePrice.volume === 'number' && (
            <div>
              <span className="text-slate-500">Volume:</span>
              <span className="ml-2 text-white font-semibold">
                {(livePrice.volume / 1_000_000).toFixed(2)}M
              </span>
            </div>
          )}
          {companyData?.marketCap && (
            <div>
              <span className="text-slate-500">Market Cap:</span>
              <span className="ml-2 text-white font-semibold">
                {formatMarketCap(companyData.marketCap)}
              </span>
            </div>
          )}
          {companyData?.peRatio && companyData.peRatio !== 'N/A' && (
            <div>
              <span className="text-slate-500">P/E:</span>
              <span className="ml-2 text-white font-semibold">
                {typeof companyData.peRatio === 'number' ? companyData.peRatio.toFixed(2) : companyData.peRatio}
              </span>
            </div>
          )}
          {companyData?.eps && companyData.eps !== 'N/A' && (
            <div>
              <span className="text-slate-500">EPS:</span>
              <span className="ml-2 text-white font-semibold">
                ${typeof companyData.eps === 'number' ? companyData.eps.toFixed(2) : companyData.eps}
              </span>
            </div>
          )}
          {companyData?.dividendYield && companyData.dividendYield !== 'N/A' && (
            <div>
              <span className="text-slate-500">Div Yield:</span>
              <span className="ml-2 text-white font-semibold">
                {typeof companyData.dividendYield === 'number' ? companyData.dividendYield.toFixed(2) : companyData.dividendYield}%
              </span>
            </div>
          )}
          {companyData?.['52WeekHigh'] && companyData['52WeekHigh'] !== 'N/A' && (
            <div>
              <span className="text-slate-500">52W High:</span>
              <span className="ml-2 text-white font-semibold">
                ${typeof companyData['52WeekHigh'] === 'number' ? companyData['52WeekHigh'].toFixed(2) : companyData['52WeekHigh']}
              </span>
            </div>
          )}
          {companyData?.['52WeekLow'] && companyData['52WeekLow'] !== 'N/A' && (
            <div>
              <span className="text-slate-500">52W Low:</span>
              <span className="ml-2 text-white font-semibold">
                ${typeof companyData['52WeekLow'] === 'number' ? companyData['52WeekLow'].toFixed(2) : companyData['52WeekLow']}
              </span>
            </div>
          )}
          {companyData?.beta && companyData.beta !== 'N/A' && (
            <div>
              <span className="text-slate-500">Beta:</span>
              <span className="ml-2 text-white font-semibold">
                {typeof companyData.beta === 'number' ? companyData.beta.toFixed(2) : companyData.beta}
              </span>
            </div>
          )}
          {companyData?.wallStreetTargetPrice && companyData.wallStreetTargetPrice !== 'N/A' && (
            <div>
              <span className="text-slate-500">Target:</span>
              <span className="ml-2 text-white font-semibold">
                ${typeof companyData.wallStreetTargetPrice === 'number' ? companyData.wallStreetTargetPrice.toFixed(2) : companyData.wallStreetTargetPrice}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
