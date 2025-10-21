// pages/screener.tsx - Stock Screener with filters
"use client";

import { useState } from "react";
import { api } from "../lib/api";

export default function ScreenerPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [minMarketCap, setMinMarketCap] = useState("1000000000"); // $1B
  const [maxPE, setMaxPE] = useState("30");
  const [minDividend, setMinDividend] = useState("0");
  const [sector, setSector] = useState("");
  const [signal, setSignal] = useState("");
  const [sortField, setSortField] = useState("market_capitalization.desc");

  const runScreener = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build filters JSON array
      const filters: string[] = [];

      if (minMarketCap) {
        filters.push(`["market_capitalization",">",${minMarketCap}]`);
      }
      if (maxPE) {
        filters.push(`["pe_ratio","<",${maxPE}]`);
      }
      if (minDividend && parseFloat(minDividend) > 0) {
        filters.push(`["dividend_yield",">",${parseFloat(minDividend) / 100}]`);
      }
      if (sector) {
        filters.push(`["sector","=","${sector}"]`);
      }

      const filtersStr = `[${filters.join(",")}]`;

      const data = await api.screenStocks(
        filtersStr,
        signal || undefined,
        sortField,
        50,
        0
      );

      setResults(data.data || []);
    } catch (e: any) {
      setError(e.message || "Screener error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Stock Screener</h1>

      {/* Filters */}
      <div className="bg-slate-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Filters</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Market Cap */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Min Market Cap ($)</label>
            <input
              type="number"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded"
              value={minMarketCap}
              onChange={(e) => setMinMarketCap(e.target.value)}
              placeholder="1000000000"
            />
          </div>

          {/* P/E Ratio */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Max P/E Ratio</label>
            <input
              type="number"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded"
              value={maxPE}
              onChange={(e) => setMaxPE(e.target.value)}
              placeholder="30"
            />
          </div>

          {/* Dividend Yield */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Min Dividend Yield (%)</label>
            <input
              type="number"
              step="0.1"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded"
              value={minDividend}
              onChange={(e) => setMinDividend(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Sector */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Sector</label>
            <select
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
            >
              <option value="">All Sectors</option>
              <option value="Technology">Technology</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Financial Services">Financial Services</option>
              <option value="Consumer Cyclical">Consumer Cyclical</option>
              <option value="Industrials">Industrials</option>
              <option value="Energy">Energy</option>
              <option value="Utilities">Utilities</option>
              <option value="Real Estate">Real Estate</option>
            </select>
          </div>

          {/* Technical Signal */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Technical Signal</label>
            <select
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded"
              value={signal}
              onChange={(e) => setSignal(e.target.value)}
            >
              <option value="">No Signal Filter</option>
              <option value="50d_new_hi">50-Day New High</option>
              <option value="50d_new_lo">50-Day New Low</option>
              <option value="200d_new_hi">200-Day New High</option>
              <option value="200d_new_lo">200-Day New Low</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Sort By</label>
            <select
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded"
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
            >
              <option value="market_capitalization.desc">Market Cap (High to Low)</option>
              <option value="market_capitalization.asc">Market Cap (Low to High)</option>
              <option value="pe_ratio.asc">P/E Ratio (Low to High)</option>
              <option value="dividend_yield.desc">Dividend Yield (High to Low)</option>
              <option value="code.asc">Ticker (A-Z)</option>
            </select>
          </div>
        </div>

        <button
          onClick={runScreener}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
        >
          {loading ? "Screening..." : "Run Screen"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded p-4 mb-6">
          ❌ {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            Results ({results.length} stocks)
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-4">Ticker</th>
                  <th className="text-left py-2 px-4">Name</th>
                  <th className="text-right py-2 px-4">Price</th>
                  <th className="text-right py-2 px-4">Market Cap</th>
                  <th className="text-right py-2 px-4">P/E</th>
                  <th className="text-right py-2 px-4">Div Yield</th>
                  <th className="text-left py-2 px-4">Sector</th>
                </tr>
              </thead>
              <tbody>
                {results.map((stock, idx) => (
                  <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-2 px-4 font-mono font-semibold text-blue-400">
                      {stock.code}
                    </td>
                    <td className="py-2 px-4">{stock.name || "-"}</td>
                    <td className="py-2 px-4 text-right">
                      ${stock.close?.toFixed(2) || "-"}
                    </td>
                    <td className="py-2 px-4 text-right">
                      {stock.market_capitalization
                        ? `$${(stock.market_capitalization / 1e9).toFixed(2)}B`
                        : "-"}
                    </td>
                    <td className="py-2 px-4 text-right">
                      {stock.pe_ratio?.toFixed(2) || "-"}
                    </td>
                    <td className="py-2 px-4 text-right">
                      {stock.dividend_yield
                        ? `${(stock.dividend_yield * 100).toFixed(2)}%`
                        : "-"}
                    </td>
                    <td className="py-2 px-4 text-sm">{stock.sector || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <div className="text-center text-slate-400 py-12">
          Set your filters and click "Run Screen" to find stocks
        </div>
      )}
    </div>
  );
}
