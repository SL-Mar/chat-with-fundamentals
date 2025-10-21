// components/ETFComparison.tsx - Multi-ETF side-by-side comparison
'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface ETFComparisonProps {
  initialETFs?: string[];
}

interface ETFData {
  ticker: string;
  name: string;
  totalAssets: number;
  expenseRatio: number;
  category: string;
  inception: string;
  holdings: any[];
  performance1Y: number;
  performance3Y: number;
  performance5Y: number;
  loading: boolean;
  error: string | null;
}

export default function ETFComparison({ initialETFs = [] }: ETFComparisonProps) {
  const [etfTickers, setETFTickers] = useState<string[]>(
    initialETFs.length > 0 ? initialETFs : ['SPY.US', 'QQQ.US', 'IWM.US']
  );
  const [etfData, setETFData] = useState<Map<string, ETFData>>(new Map());
  const [newETF, setNewETF] = useState('');
  const [viewMode, setViewMode] = useState<'overview' | 'holdings' | 'performance'>('overview');

  useEffect(() => {
    fetchAllETFs();
  }, [etfTickers]);

  const fetchAllETFs = async () => {
    const newData = new Map<string, ETFData>();

    // Initialize with loading state
    etfTickers.forEach((ticker) => {
      newData.set(ticker, {
        ticker,
        name: '',
        totalAssets: 0,
        expenseRatio: 0,
        category: '',
        inception: '',
        holdings: [],
        performance1Y: 0,
        performance3Y: 0,
        performance5Y: 0,
        loading: true,
        error: null,
      });
    });
    setETFData(new Map(newData));

    // Fetch data for each ETF
    for (const ticker of etfTickers) {
      try {
        // Fetch ETF holdings and info
        const holdingsData = await api.fetchETFHoldings(ticker);

        // Fetch performance data (1Y)
        let perf1Y = 0;
        try {
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          const perfData = await api.fetchEODExtended(ticker, 'd', oneYearAgo.toISOString().split('T')[0]);
          const perfArray = Array.isArray(perfData) ? perfData : perfData?.data || [];
          if (perfArray.length > 1) {
            const startPrice = perfArray[0]?.close || 0;
            const endPrice = perfArray[perfArray.length - 1]?.close || 0;
            perf1Y = startPrice ? ((endPrice - startPrice) / startPrice) * 100 : 0;
          }
        } catch (err) {
          console.error(`Failed to fetch ${ticker} performance:`, err);
        }

        newData.set(ticker, {
          ticker,
          name: holdingsData?.name || holdingsData?.data?.name || ticker,
          totalAssets: holdingsData?.totalAssets || holdingsData?.data?.totalAssets || 0,
          expenseRatio: holdingsData?.expenseRatio || holdingsData?.data?.expenseRatio || 0,
          category: holdingsData?.category || holdingsData?.data?.category || '',
          inception: holdingsData?.inception || holdingsData?.data?.inception || '',
          holdings: holdingsData?.holdings || holdingsData?.data?.holdings || [],
          performance1Y: perf1Y,
          performance3Y: 0, // Would need additional API call
          performance5Y: 0, // Would need additional API call
          loading: false,
          error: null,
        });
      } catch (err: any) {
        console.error(`Failed to fetch ${ticker} data:`, err);
        newData.set(ticker, {
          ...newData.get(ticker)!,
          loading: false,
          error: err.message,
        });
      }

      setETFData(new Map(newData));
    }
  };

  const addETF = () => {
    if (!newETF.trim()) return;
    const ticker = newETF.trim().toUpperCase();
    if (!ticker.includes('.')) {
      setETFTickers([...etfTickers, `${ticker}.US`]);
    } else {
      setETFTickers([...etfTickers, ticker]);
    }
    setNewETF('');
  };

  const removeETF = (ticker: string) => {
    setETFTickers(etfTickers.filter((t) => t !== ticker));
  };

  const formatAssets = (assets: number) => {
    if (!assets) return 'N/A';
    if (assets >= 1e9) return `$${(assets / 1e9).toFixed(2)}B`;
    if (assets >= 1e6) return `$${(assets / 1e6).toFixed(2)}M`;
    return `$${assets.toLocaleString()}`;
  };

  const formatPercent = (percent: number) => {
    if (percent === 0) return 'N/A';
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  // Calculate holdings overlap
  const calculateOverlap = (etf1: string, etf2: string): number => {
    const data1 = etfData.get(etf1);
    const data2 = etfData.get(etf2);
    if (!data1 || !data2 || data1.holdings.length === 0 || data2.holdings.length === 0) {
      return 0;
    }

    const symbols1 = new Set(data1.holdings.map((h) => h.symbol || h.code));
    const symbols2 = new Set(data2.holdings.map((h) => h.symbol || h.code));

    let overlap = 0;
    symbols1.forEach((symbol) => {
      if (symbols2.has(symbol)) overlap++;
    });

    return (overlap / Math.min(symbols1.size, symbols2.size)) * 100;
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">ETF Comparison</h3>

      {/* Add ETF Input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newETF}
          onChange={(e) => setNewETF(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addETF()}
          placeholder="Add ETF (e.g., VOO, VTI)"
          className="flex-1 px-3 py-2 bg-slate-700 text-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addETF}
          className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
        >
          Add ETF
        </button>
      </div>

      {/* View Mode Selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('overview')}
          className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
            viewMode === 'overview'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setViewMode('holdings')}
          className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
            viewMode === 'holdings'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Holdings
        </button>
        <button
          onClick={() => setViewMode('performance')}
          className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
            viewMode === 'performance'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Performance
        </button>
      </div>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 px-2 text-xs text-slate-400">Metric</th>
                {Array.from(etfData.values()).map((etf) => (
                  <th key={etf.ticker} className="text-center py-2 px-2">
                    <div className="text-sm font-semibold text-white">{etf.ticker}</div>
                    {!etf.loading && !etf.error && (
                      <div className="text-xs text-slate-400 truncate">{etf.name}</div>
                    )}
                    {etf.loading && <div className="text-xs text-slate-400">Loading...</div>}
                    {etf.error && <div className="text-xs text-red-400">Error</div>}
                    <button
                      onClick={() => removeETF(etf.ticker)}
                      className="text-xs text-slate-500 hover:text-red-400 transition-colors mt-1"
                    >
                      Remove
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-700/50">
                <td className="py-2 px-2 text-xs text-slate-400">Total Assets</td>
                {Array.from(etfData.values()).map((etf) => (
                  <td key={etf.ticker} className="py-2 px-2 text-sm text-center text-white">
                    {etf.loading ? '...' : formatAssets(etf.totalAssets)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="py-2 px-2 text-xs text-slate-400">Expense Ratio</td>
                {Array.from(etfData.values()).map((etf) => (
                  <td key={etf.ticker} className="py-2 px-2 text-sm text-center text-white">
                    {etf.loading ? '...' : etf.expenseRatio ? `${etf.expenseRatio.toFixed(2)}%` : 'N/A'}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="py-2 px-2 text-xs text-slate-400">Category</td>
                {Array.from(etfData.values()).map((etf) => (
                  <td key={etf.ticker} className="py-2 px-2 text-xs text-center text-slate-300">
                    {etf.loading ? '...' : etf.category || 'N/A'}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="py-2 px-2 text-xs text-slate-400">Inception</td>
                {Array.from(etfData.values()).map((etf) => (
                  <td key={etf.ticker} className="py-2 px-2 text-xs text-center text-slate-300">
                    {etf.loading
                      ? '...'
                      : etf.inception
                      ? new Date(etf.inception).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
                      : 'N/A'}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="py-2 px-2 text-xs text-slate-400">Holdings Count</td>
                {Array.from(etfData.values()).map((etf) => (
                  <td key={etf.ticker} className="py-2 px-2 text-sm text-center text-white">
                    {etf.loading ? '...' : etf.holdings.length}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="py-2 px-2 text-xs text-slate-400">1Y Performance</td>
                {Array.from(etfData.values()).map((etf) => (
                  <td
                    key={etf.ticker}
                    className={`py-2 px-2 text-sm text-center font-semibold ${
                      etf.performance1Y >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {etf.loading ? '...' : formatPercent(etf.performance1Y)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Holdings Mode */}
      {viewMode === 'holdings' && (
        <div>
          <div className="mb-4">
            <div className="text-sm text-slate-400 mb-2">Holdings Overlap</div>
            <div className="grid grid-cols-2 gap-2">
              {etfTickers.map((ticker1, idx1) =>
                etfTickers.slice(idx1 + 1).map((ticker2, idx2) => {
                  const overlap = calculateOverlap(ticker1, ticker2);
                  return (
                    <div key={`${ticker1}-${ticker2}`} className="bg-slate-700 rounded px-3 py-2">
                      <div className="text-xs text-slate-400">
                        {ticker1} vs {ticker2}
                      </div>
                      <div className="text-sm font-semibold text-white">
                        {overlap > 0 ? `${overlap.toFixed(1)}% overlap` : 'No data'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="text-sm text-slate-400 mb-2">Top 10 Holdings</div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-2 text-xs text-slate-400">Rank</th>
                  {Array.from(etfData.values()).map((etf) => (
                    <th key={etf.ticker} className="text-left py-2 px-2 text-xs text-slate-400">
                      {etf.ticker}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(10)].map((_, idx) => (
                  <tr key={idx} className="border-b border-slate-700/50">
                    <td className="py-2 px-2 text-xs text-slate-400">#{idx + 1}</td>
                    {Array.from(etfData.values()).map((etf) => {
                      const holding = etf.holdings[idx];
                      return (
                        <td key={etf.ticker} className="py-2 px-2">
                          {holding ? (
                            <div>
                              <div className="text-xs font-semibold text-white">
                                {holding.symbol || holding.code}
                              </div>
                              <div className="text-xs text-slate-400">
                                {(holding.weight || holding.allocation || 0).toFixed(2)}%
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500">-</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Performance Mode */}
      {viewMode === 'performance' && (
        <div>
          <div className="mb-4 p-4 bg-slate-700/50 rounded">
            <div className="text-sm text-slate-400 mb-3">1-Year Performance Comparison</div>
            <div className="space-y-3">
              {Array.from(etfData.values())
                .sort((a, b) => b.performance1Y - a.performance1Y)
                .map((etf, idx) => {
                  const maxPerf = Math.max(...Array.from(etfData.values()).map((e) => Math.abs(e.performance1Y)));
                  const barWidth = maxPerf > 0 ? (Math.abs(etf.performance1Y) / maxPerf) * 100 : 0;

                  return (
                    <div key={etf.ticker}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-white">
                          {idx + 1}. {etf.ticker}
                        </span>
                        <span
                          className={`text-sm font-semibold ${
                            etf.performance1Y >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {formatPercent(etf.performance1Y)}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            etf.performance1Y >= 0 ? 'bg-green-500' : 'bg-red-500'
                          } rounded-full transition-all duration-300`}
                          style={{ width: `${barWidth}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-700/50 rounded p-3">
              <div className="text-sm text-slate-400 mb-2">Best Performer</div>
              {(() => {
                const best = Array.from(etfData.values()).sort((a, b) => b.performance1Y - a.performance1Y)[0];
                return best ? (
                  <div>
                    <div className="text-lg font-semibold text-green-400">{best.ticker}</div>
                    <div className="text-sm text-white">{formatPercent(best.performance1Y)}</div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">N/A</div>
                );
              })()}
            </div>

            <div className="bg-slate-700/50 rounded p-3">
              <div className="text-sm text-slate-400 mb-2">Lowest Expense Ratio</div>
              {(() => {
                const cheapest = Array.from(etfData.values())
                  .filter((e) => e.expenseRatio > 0)
                  .sort((a, b) => a.expenseRatio - b.expenseRatio)[0];
                return cheapest ? (
                  <div>
                    <div className="text-lg font-semibold text-blue-400">{cheapest.ticker}</div>
                    <div className="text-sm text-white">{cheapest.expenseRatio.toFixed(2)}%</div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">N/A</div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {etfData.size === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm">
          Add ETFs above to start comparing
        </div>
      )}
    </div>
  );
}
