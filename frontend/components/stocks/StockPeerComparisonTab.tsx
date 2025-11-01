// components/stocks/StockPeerComparisonTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

interface StockPeerComparisonTabProps {
  ticker: string;
}

interface PeerStock {
  ticker: string;
  name: string;
  price?: number;
  marketCap?: number;
  peRatio?: number;
  epsGrowth?: number;
  divYield?: number;
}

export default function StockPeerComparisonTab({ ticker }: StockPeerComparisonTabProps) {
  const [peers, setPeers] = useState<string[]>([]);
  const [customPeer, setCustomPeer] = useState('');
  const [peerData, setPeerData] = useState<PeerStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suggested peers by sector (simplified example)
  const suggestedPeers: Record<string, string[]> = {
    'AAPL.US': ['MSFT.US', 'GOOGL.US', 'META.US', 'AMZN.US'],
    'MSFT.US': ['AAPL.US', 'GOOGL.US', 'ORCL.US', 'IBM.US'],
    'TSLA.US': ['F.US', 'GM.US', 'NIO.US', 'RIVN.US'],
    'JPM.US': ['BAC.US', 'WFC.US', 'C.US', 'GS.US'],
  };

  useEffect(() => {
    // Set initial suggested peers
    const suggested = suggestedPeers[ticker] || [];
    setPeers(suggested.slice(0, 3));
  }, [ticker]);

  useEffect(() => {
    if (peers.length > 0) {
      fetchPeerData();
    }
  }, [peers]);

  const fetchPeerData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch data for main ticker + peers
      const allTickers = [ticker, ...peers];
      const promises = allTickers.map(async (t) => {
        try {
          // Fetch both price and fundamentals
          const [priceData, highlights] = await Promise.all([
            api.fetchLivePrice(t),
            api.fetchCompanyHighlights(t)
          ]);

          return {
            ticker: t,
            name: t.replace('.US', ''),
            price: priceData.close,
            marketCap: highlights.marketCap,
            peRatio: highlights.peRatio,
            epsGrowth: undefined, // Not available yet
            divYield: highlights.divYield,
          };
        } catch {
          return {
            ticker: t,
            name: t.replace('.US', ''),
          };
        }
      });

      const results = await Promise.all(promises);
      setPeerData(results);
    } catch (err: any) {
      console.error('Failed to fetch peer data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addPeer = () => {
    if (customPeer.trim() && !peers.includes(customPeer.toUpperCase())) {
      setPeers([...peers, customPeer.toUpperCase()]);
      setCustomPeer('');
    }
  };

  const removePeer = (peerToRemove: string) => {
    setPeers(peers.filter(p => p !== peerToRemove));
  };

  const formatNumber = (num: number | undefined, suffix: string = ''): string => {
    if (num === undefined) return 'N/A';
    if (num >= 1_000_000_000_000) return `$${(num / 1_000_000_000_000).toFixed(2)}T`;
    if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B${suffix}`;
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M${suffix}`;
    return `${num.toFixed(2)}${suffix}`;
  };

  return (
    <div className="space-y-6">
      {/* Add Peers */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-xl font-bold mb-4">Add Peers for Comparison</h3>

        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={customPeer}
            onChange={(e) => setCustomPeer(e.target.value)}
            placeholder="Enter ticker (e.g., MSFT.US)"
            className="flex-1 px-4 py-2 bg-slate-700 rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && addPeer()}
          />
          <button
            onClick={addPeer}
            disabled={!customPeer.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded font-semibold transition-colors"
          >
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {peers.map((peer) => (
            <div key={peer} className="flex items-center gap-2 px-3 py-1 bg-slate-700 rounded">
              <span className="font-semibold">{peer}</span>
              <button
                onClick={() => removePeer(peer)}
                className="text-red-400 hover:text-red-300"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {suggestedPeers[ticker] && (
          <div className="mt-4">
            <div className="text-sm text-slate-400 mb-2">Suggested peers:</div>
            <div className="flex flex-wrap gap-2">
              {suggestedPeers[ticker]
                .filter(s => !peers.includes(s))
                .map((suggested) => (
                  <button
                    key={suggested}
                    onClick={() => setPeers([...peers, suggested])}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
                  >
                    + {suggested}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Comparison Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-400">Loading comparison data...</div>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-300">
          {error}
        </div>
      ) : peerData.length > 0 ? (
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-6 py-4 text-left font-bold">Ticker</th>
                <th className="px-6 py-4 text-right font-bold">Price</th>
                <th className="px-6 py-4 text-right font-bold">Market Cap</th>
                <th className="px-6 py-4 text-right font-bold">P/E Ratio</th>
                <th className="px-6 py-4 text-right font-bold">EPS Growth</th>
                <th className="px-6 py-4 text-right font-bold">Div Yield</th>
              </tr>
            </thead>
            <tbody>
              {peerData.map((stock, i) => (
                <tr
                  key={stock.ticker}
                  className={`border-b border-slate-700 ${
                    stock.ticker === ticker ? 'bg-blue-900/20' : ''
                  }`}
                >
                  <td className="px-6 py-4 font-bold">
                    {stock.ticker}
                    {stock.ticker === ticker && (
                      <span className="ml-2 text-xs text-blue-400">(Current)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {stock.price ? `$${stock.price.toFixed(2)}` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {formatNumber(stock.marketCap)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {stock.peRatio?.toFixed(2) || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {stock.epsGrowth ? `${stock.epsGrowth.toFixed(2)}%` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {stock.divYield ? `${stock.divYield.toFixed(2)}%` : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Visual Comparison Chart */}
      {peerData.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-xl font-bold mb-4">Visual Comparison</h3>
          <div className="space-y-4">
            {/* Market Cap Comparison */}
            <div>
              <div className="text-sm font-semibold mb-2">Market Cap</div>
              {peerData.map((stock) => {
                const maxCap = Math.max(...peerData.map(s => s.marketCap || 0));
                const width = stock.marketCap ? (stock.marketCap / maxCap) * 100 : 0;
                return (
                  <div key={stock.ticker} className="mb-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{stock.ticker}</span>
                      <span>{formatNumber(stock.marketCap)}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          stock.ticker === ticker ? 'bg-blue-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* P/E Ratio Comparison */}
            <div>
              <div className="text-sm font-semibold mb-2">P/E Ratio</div>
              {peerData.map((stock) => {
                const maxPE = Math.max(...peerData.map(s => s.peRatio || 0));
                const width = stock.peRatio ? (stock.peRatio / maxPE) * 100 : 0;
                return (
                  <div key={stock.ticker} className="mb-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{stock.ticker}</span>
                      <span>{stock.peRatio?.toFixed(2) || 'N/A'}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          stock.ticker === ticker ? 'bg-blue-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
