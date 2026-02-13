import { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { formatNumber, formatPct } from '../../lib/format';
import LoadingSpinner from '../common/LoadingSpinner';

interface Props {
  universeId: string;
}

export default function FundamentalsTab({ universeId }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tickerFilter, setTickerFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pageSize = 25;

  useEffect(() => {
    fetchData();
  }, [universeId, page, tickerFilter]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getFundamentals(
        universeId,
        tickerFilter || undefined,
        undefined,
        page,
        pageSize,
      );
      setData(result.data);
      setTotal(result.total);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const totalPages = Math.ceil(total / pageSize);

  const COLUMNS = [
    { key: 'ticker', label: 'Ticker', format: (v: any) => v },
    { key: 'date', label: 'Date', format: (v: any) => v },
    { key: 'period_type', label: 'Period', format: (v: any) => v },
    { key: 'market_cap', label: 'Market Cap', format: formatNumber },
    { key: 'pe_ratio', label: 'P/E', format: (v: any) => v?.toFixed(2) ?? '—' },
    { key: 'eps', label: 'EPS', format: (v: any) => v != null ? `$${v.toFixed(2)}` : '—' },
    { key: 'revenue', label: 'Revenue', format: formatNumber },
    { key: 'net_income', label: 'Net Income', format: formatNumber },
    { key: 'gross_margin', label: 'Gross Margin', format: (v: any) => v != null ? formatPct(v) : '—' },
    { key: 'roe', label: 'ROE', format: (v: any) => v != null ? formatPct(v) : '—' },
    { key: 'debt_to_equity', label: 'D/E', format: (v: any) => v?.toFixed(2) ?? '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={tickerFilter}
          onChange={(e) => { setTickerFilter(e.target.value.toUpperCase()); setPage(1); }}
          placeholder="Filter by ticker..."
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-white text-sm focus:border-indigo-500 focus:outline-none w-48"
        />
        <span className="text-sm text-gray-500">{total} records</span>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                {COLUMNS.map((col) => (
                  <th key={col.key} className="text-left text-gray-400 px-3 py-2 text-xs font-medium">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                  {COLUMNS.map((col) => (
                    <td key={col.key} className="px-3 py-2 text-gray-300 whitespace-nowrap">
                      {col.format(row[col.key])}
                    </td>
                  ))}
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="text-center py-8 text-gray-500">
                    No fundamentals data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-xs px-3 py-1.5 bg-gray-700 text-gray-300 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="text-xs px-3 py-1.5 bg-gray-700 text-gray-300 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
