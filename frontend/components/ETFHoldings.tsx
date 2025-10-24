// components/ETFHoldings.tsx - ETF holdings breakdown and analysis
'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface ETFHoldingsProps {
  ticker: string;
  maxHoldings?: number;
}

export default function ETFHoldings({ ticker, maxHoldings = 10 }: ETFHoldingsProps) {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [etfInfo, setETFInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'weight' | 'name'>('weight');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!ticker) return;
    fetchETFHoldings();
  }, [ticker]);

  const fetchETFHoldings = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[ETFHoldings] Fetching holdings for', ticker);

      const data = await api.fetchETFHoldings(ticker);

      console.log('[ETFHoldings] Received response:', data);

      // Extract holdings and ETF info from NEW response structure
      const holdingsArray = data?.holdings || [];
      const info = data?.etf_info || {};

      console.log('[ETFHoldings] Extracted', holdingsArray.length, 'holdings');
      console.log('[ETFHoldings] ETF info:', info);

      setHoldings(holdingsArray);
      setETFInfo(info);
    } catch (err: any) {
      console.error('[ETFHoldings] Failed to fetch ETF holdings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">ETF Holdings</h3>
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">ETF Holdings</h3>
        <p className="text-sm text-red-400">Failed to load ETF holdings: {error}</p>
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">ETF Holdings</h3>
        <p className="text-sm text-slate-400">No holdings data available for this ETF</p>
      </div>
    );
  }

  // Sort holdings
  const sortedHoldings = [...holdings].sort((a, b) => {
    if (sortBy === 'weight') {
      return (b.weight || b.allocation || 0) - (a.weight || a.allocation || 0);
    } else {
      return (a.name || a.symbol || '').localeCompare(b.name || b.symbol || '');
    }
  });

  const displayedHoldings = showAll ? sortedHoldings : sortedHoldings.slice(0, maxHoldings);

  // Calculate sector breakdown
  const sectorMap = new Map<string, number>();
  holdings.forEach((holding) => {
    const sector = holding.sector || 'Other';
    const weight = holding.weight || holding.allocation || 0;
    sectorMap.set(sector, (sectorMap.get(sector) || 0) + weight);
  });
  const sectors = Array.from(sectorMap.entries())
    .map(([sector, weight]) => ({ sector, weight }))
    .sort((a, b) => b.weight - a.weight);

  const formatWeight = (weight: number) => {
    if (!weight) return '0.00%';
    return `${weight.toFixed(2)}%`;
  };

  const formatAssets = (assets: number) => {
    if (!assets) return 'N/A';
    if (assets >= 1e9) return `$${(assets / 1e9).toFixed(2)}B`;
    if (assets >= 1e6) return `$${(assets / 1e6).toFixed(2)}M`;
    return `$${assets.toLocaleString()}`;
  };

  const maxWeight = Math.max(...displayedHoldings.map((h) => h.weight || h.allocation || 0));

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">ETF Holdings</h3>

      {/* ETF Info Summary */}
      {etfInfo && (
        <div className="mb-4 pb-4 border-b border-slate-700">
          <div className="text-sm font-semibold text-white mb-2">{etfInfo.name}</div>
          <div className="grid grid-cols-2 gap-2">
            {etfInfo.totalAssets && (
              <div>
                <span className="text-xs text-slate-400">Total Assets: </span>
                <span className="text-xs text-white font-semibold">{formatAssets(etfInfo.totalAssets)}</span>
              </div>
            )}
            {etfInfo.expenseRatio && (
              <div>
                <span className="text-xs text-slate-400">Expense Ratio: </span>
                <span className="text-xs text-white font-semibold">{formatWeight(etfInfo.expenseRatio)}</span>
              </div>
            )}
            {etfInfo.category && (
              <div>
                <span className="text-xs text-slate-400">Category: </span>
                <span className="text-xs text-white font-semibold">{etfInfo.category}</span>
              </div>
            )}
            {etfInfo.inception && (
              <div>
                <span className="text-xs text-slate-400">Inception: </span>
                <span className="text-xs text-white font-semibold">
                  {new Date(etfInfo.inception).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sort Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-slate-400">Top Holdings</div>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('weight')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              sortBy === 'weight'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            By Weight
          </button>
          <button
            onClick={() => setSortBy('name')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              sortBy === 'name'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            By Name
          </button>
        </div>
      </div>

      {/* Holdings List with Visual Bars */}
      <div className="mb-4 space-y-2">
        {displayedHoldings.map((holding, idx) => {
          const weight = holding.weight || holding.allocation || 0;
          const symbol = holding.symbol || holding.code || '';
          const name = holding.name || symbol;
          const barWidth = maxWeight > 0 ? (weight / maxWeight) * 100 : 0;

          return (
            <div key={idx} className="bg-slate-700/50 rounded p-2 hover:bg-slate-700 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">{symbol}</div>
                  <div className="text-xs text-slate-400 truncate">{name}</div>
                </div>
                <div className="text-sm font-semibold text-blue-400 ml-2">
                  {formatWeight(weight)}
                </div>
              </div>
              {/* Visual weight bar */}
              <div className="h-1.5 bg-slate-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${barWidth}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show More/Less Button */}
      {holdings.length > maxHoldings && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full px-3 py-2 bg-slate-700 text-white text-sm rounded hover:bg-slate-600 transition-colors mb-4"
        >
          {showAll ? `Show Less` : `Show All ${holdings.length} Holdings`}
        </button>
      )}

      {/* Sector Breakdown */}
      {sectors.length > 0 && (
        <div className="pt-4 border-t border-slate-700">
          <div className="text-sm text-slate-400 mb-3">Sector Allocation</div>
          <div className="space-y-2">
            {sectors.slice(0, 5).map((sector, idx) => {
              const maxSectorWeight = sectors[0].weight;
              const barWidth = maxSectorWeight > 0 ? (sector.weight / maxSectorWeight) * 100 : 0;

              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white">{sector.sector}</span>
                    <span className="text-xs text-slate-400">{formatWeight(sector.weight)}</span>
                  </div>
                  <div className="h-1 bg-slate-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-300"
                      style={{ width: `${barWidth}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
          {sectors.length > 5 && (
            <div className="text-xs text-slate-500 mt-2 text-center">
              +{sectors.length - 5} more sectors
            </div>
          )}
        </div>
      )}

      {/* Concentration Metrics */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="text-sm text-slate-400 mb-2">Concentration</div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-700 rounded px-2 py-2 text-center">
            <div className="text-xs text-slate-400">Top 10</div>
            <div className="text-sm font-semibold text-white">
              {formatWeight(
                sortedHoldings
                  .slice(0, 10)
                  .reduce((sum, h) => sum + (h.weight || h.allocation || 0), 0)
              )}
            </div>
          </div>
          <div className="bg-slate-700 rounded px-2 py-2 text-center">
            <div className="text-xs text-slate-400">Holdings</div>
            <div className="text-sm font-semibold text-white">{holdings.length}</div>
          </div>
          <div className="bg-slate-700 rounded px-2 py-2 text-center">
            <div className="text-xs text-slate-400">Largest</div>
            <div className="text-sm font-semibold text-blue-400">
              {formatWeight(sortedHoldings[0]?.weight || sortedHoldings[0]?.allocation || 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
