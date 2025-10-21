// components/IndexConstituents.tsx - Major index constituents analysis
'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface IndexConstituentsProps {
  defaultIndex?: string;
}

type IndexType = 'GSPC' | 'DJI' | 'IXIC' | 'RUT' | 'VIX';

const INDEX_INFO: Record<IndexType, { name: string; description: string }> = {
  'GSPC': { name: 'S&P 500', description: 'Large-cap U.S. stocks' },
  'DJI': { name: 'Dow Jones', description: '30 blue-chip companies' },
  'IXIC': { name: 'NASDAQ 100', description: 'Technology-heavy index' },
  'RUT': { name: 'Russell 2000', description: 'Small-cap stocks' },
  'VIX': { name: 'VIX', description: 'Volatility index' },
};

export default function IndexConstituents({ defaultIndex = 'GSPC' }: IndexConstituentsProps) {
  const [selectedIndex, setSelectedIndex] = useState<IndexType>(defaultIndex as IndexType);
  const [constituents, setConstituents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'symbol' | 'name' | 'weight'>('weight');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchConstituents();
  }, [selectedIndex]);

  const fetchConstituents = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await api.fetchIndexConstituents(selectedIndex);

      // Extract constituents from response
      const constituentsArray = Array.isArray(data)
        ? data
        : data?.constituents || data?.data || [];

      setConstituents(constituentsArray);
    } catch (err: any) {
      console.error(`Failed to fetch ${selectedIndex} constituents:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort constituents
  const filteredConstituents = constituents.filter((c) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const symbol = (c.symbol || c.code || '').toLowerCase();
    const name = (c.name || '').toLowerCase();
    return symbol.includes(search) || name.includes(search);
  });

  const sortedConstituents = [...filteredConstituents].sort((a, b) => {
    let compareA, compareB;

    switch (sortBy) {
      case 'symbol':
        compareA = (a.symbol || a.code || '').toLowerCase();
        compareB = (b.symbol || b.code || '').toLowerCase();
        break;
      case 'name':
        compareA = (a.name || '').toLowerCase();
        compareB = (b.name || '').toLowerCase();
        break;
      case 'weight':
        compareA = a.weight || 0;
        compareB = b.weight || 0;
        break;
      default:
        return 0;
    }

    if (sortDirection === 'asc') {
      return compareA > compareB ? 1 : -1;
    } else {
      return compareA < compareB ? 1 : -1;
    }
  });

  const toggleSort = (column: 'symbol' | 'name' | 'weight') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  // Calculate sector distribution
  const sectorMap = new Map<string, number>();
  constituents.forEach((constituent) => {
    const sector = constituent.sector || 'Other';
    sectorMap.set(sector, (sectorMap.get(sector) || 0) + 1);
  });
  const sectors = Array.from(sectorMap.entries())
    .map(([sector, count]) => ({ sector, count }))
    .sort((a, b) => b.count - a.count);

  const formatWeight = (weight: number) => {
    if (!weight) return '-';
    return `${weight.toFixed(2)}%`;
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Index Constituents</h3>

      {/* Index Selector */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(Object.keys(INDEX_INFO) as IndexType[]).map((idx) => (
          <button
            key={idx}
            onClick={() => setSelectedIndex(idx)}
            className={`px-3 py-2 rounded transition-colors ${
              selectedIndex === idx
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <div className="text-xs font-semibold">{INDEX_INFO[idx].name}</div>
            <div className="text-xs opacity-75">{INDEX_INFO[idx].description}</div>
          </button>
        ))}
      </div>

      {loading && (
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-700 rounded"></div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-400 py-8 text-center">
          Failed to load constituents: {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-slate-700 rounded px-3 py-2 text-center">
              <div className="text-xs text-slate-400">Total Stocks</div>
              <div className="text-lg font-semibold text-white">{constituents.length}</div>
            </div>
            <div className="bg-slate-700 rounded px-3 py-2 text-center">
              <div className="text-xs text-slate-400">Sectors</div>
              <div className="text-lg font-semibold text-white">{sectors.length}</div>
            </div>
            <div className="bg-slate-700 rounded px-3 py-2 text-center">
              <div className="text-xs text-slate-400">Filtered</div>
              <div className="text-lg font-semibold text-blue-400">
                {sortedConstituents.length}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by symbol or name..."
              className="w-full px-3 py-2 bg-slate-700 text-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sector Distribution */}
          {sectors.length > 0 && (
            <div className="mb-4 p-3 bg-slate-700/50 rounded">
              <div className="text-sm text-slate-400 mb-2">Sector Distribution</div>
              <div className="flex flex-wrap gap-2">
                {sectors.slice(0, 8).map((sector, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-700 rounded px-2 py-1 text-xs"
                  >
                    <span className="text-white">{sector.sector}</span>
                    <span className="text-slate-400 ml-1">({sector.count})</span>
                  </div>
                ))}
                {sectors.length > 8 && (
                  <div className="bg-slate-700 rounded px-2 py-1 text-xs text-slate-400">
                    +{sectors.length - 8} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Constituents Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th
                    className="text-left py-2 px-2 text-xs text-slate-400 cursor-pointer hover:text-white"
                    onClick={() => toggleSort('symbol')}
                  >
                    Symbol {sortBy === 'symbol' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left py-2 px-2 text-xs text-slate-400 cursor-pointer hover:text-white"
                    onClick={() => toggleSort('name')}
                  >
                    Name {sortBy === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left py-2 px-2 text-xs text-slate-400">Sector</th>
                  <th
                    className="text-right py-2 px-2 text-xs text-slate-400 cursor-pointer hover:text-white"
                    onClick={() => toggleSort('weight')}
                  >
                    Weight {sortBy === 'weight' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedConstituents.slice(0, 50).map((constituent, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer"
                  >
                    <td className="py-2 px-2 text-sm font-semibold text-white">
                      {constituent.symbol || constituent.code}
                    </td>
                    <td className="py-2 px-2 text-sm text-slate-300 truncate max-w-[200px]">
                      {constituent.name || '-'}
                    </td>
                    <td className="py-2 px-2 text-xs text-slate-400">
                      {constituent.sector || '-'}
                    </td>
                    <td className="py-2 px-2 text-sm text-right text-blue-400">
                      {formatWeight(constituent.weight)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedConstituents.length > 50 && (
            <div className="text-xs text-slate-500 text-center mt-3">
              Showing 50 of {sortedConstituents.length} constituents
            </div>
          )}

          {sortedConstituents.length === 0 && constituents.length > 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              No constituents match your search
            </div>
          )}

          {constituents.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              No constituents data available for this index
            </div>
          )}
        </>
      )}
    </div>
  );
}
