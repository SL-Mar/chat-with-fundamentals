// components/AnalystRatings.tsx - Analyst ratings and price targets
'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface AnalystRatingsProps {
  ticker: string;
}

export default function AnalystRatings({ ticker }: AnalystRatingsProps) {
  const [ratings, setRatings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;
    fetchRatings();
  }, [ticker]);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.fetchAnalystRatings(ticker);
      setRatings(data);
    } catch (err: any) {
      console.error('Failed to fetch analyst ratings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Analyst Ratings</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-700 rounded w-3/4"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
          <div className="h-4 bg-slate-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Analyst Ratings</h3>
        <p className="text-sm text-red-400">Failed to load analyst ratings</p>
      </div>
    );
  }

  if (!ratings) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Analyst Ratings</h3>
        <p className="text-sm text-slate-400">No analyst data available</p>
      </div>
    );
  }

  // Parse ratings data (structure depends on EODHD API response)
  // API now returns flat structure: { Rating, TargetPrice, StrongBuy, Buy, Hold, Sell, StrongSell }
  const buyCount = ratings?.Buy || 0;
  const holdCount = ratings?.Hold || 0;
  const sellCount = ratings?.Sell || 0;
  const strongBuyCount = ratings?.StrongBuy || 0;
  const strongSellCount = ratings?.StrongSell || 0;

  const totalAnalysts = buyCount + holdCount + sellCount + strongBuyCount + strongSellCount;

  const targetPrice = ratings?.TargetPrice;
  const targetHigh = undefined; // Not available in current API response
  const targetAvg = targetPrice;
  const targetLow = undefined; // Not available in current API response
  const currentPrice = undefined; // Not available in current API response

  // Calculate consensus
  const bullishCount = strongBuyCount + buyCount;
  const bearishCount = strongSellCount + sellCount;
  const consensus = bullishCount > bearishCount ? 'Bullish' : bearishCount > bullishCount ? 'Bearish' : 'Neutral';
  const consensusColor = consensus === 'Bullish' ? 'text-green-400' : consensus === 'Bearish' ? 'text-red-400' : 'text-yellow-400';

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Analyst Ratings</h3>

      {totalAnalysts > 0 ? (
        <>
          {/* Ratings Distribution */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-400">Consensus</span>
              <span className={`text-sm font-semibold ${consensusColor}`}>
                {consensus} ({totalAnalysts} analysts)
              </span>
            </div>

            <div className="space-y-2">
              {strongBuyCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-24">Strong Buy</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${(strongBuyCount / totalAnalysts) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-white w-8 text-right">{strongBuyCount}</span>
                </div>
              )}
              {buyCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-24">Buy</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-green-400 h-2 rounded-full"
                      style={{ width: `${(buyCount / totalAnalysts) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-white w-8 text-right">{buyCount}</span>
                </div>
              )}
              {holdCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-24">Hold</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{ width: `${(holdCount / totalAnalysts) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-white w-8 text-right">{holdCount}</span>
                </div>
              )}
              {sellCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-24">Sell</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-red-400 h-2 rounded-full"
                      style={{ width: `${(sellCount / totalAnalysts) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-white w-8 text-right">{sellCount}</span>
                </div>
              )}
              {strongSellCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-24">Strong Sell</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${(strongSellCount / totalAnalysts) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-white w-8 text-right">{strongSellCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Price Targets */}
          {(targetLow || targetAvg || targetHigh) && (
            <div className="border-t border-slate-700 pt-4">
              <div className="text-sm text-slate-400 mb-2">Price Targets</div>
              <div className="grid grid-cols-3 gap-2">
                {targetLow && (
                  <div className="bg-slate-700 rounded px-2 py-1 text-center">
                    <div className="text-xs text-slate-400">Low</div>
                    <div className="text-sm font-semibold text-white">${targetLow.toFixed(2)}</div>
                  </div>
                )}
                {targetAvg && (
                  <div className="bg-slate-700 rounded px-2 py-1 text-center">
                    <div className="text-xs text-slate-400">Average</div>
                    <div className="text-sm font-semibold text-blue-400">${targetAvg.toFixed(2)}</div>
                  </div>
                )}
                {targetHigh && (
                  <div className="bg-slate-700 rounded px-2 py-1 text-center">
                    <div className="text-xs text-slate-400">High</div>
                    <div className="text-sm font-semibold text-white">${targetHigh.toFixed(2)}</div>
                  </div>
                )}
              </div>
              {currentPrice && targetAvg && (
                <div className="mt-2 text-xs text-center">
                  <span className="text-slate-400">Upside: </span>
                  <span className={targetAvg > currentPrice ? 'text-green-400' : 'text-red-400'}>
                    {(((targetAvg - currentPrice) / currentPrice) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-400">No analyst coverage available</p>
      )}
    </div>
  );
}
