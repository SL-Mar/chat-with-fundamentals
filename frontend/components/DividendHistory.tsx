// components/DividendHistory.tsx - Dividend payment history and analysis
'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface DividendHistoryProps {
  ticker: string;
}

export default function DividendHistory({ ticker }: DividendHistoryProps) {
  const [dividends, setDividends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;
    fetchDividends();
  }, [ticker]);

  const fetchDividends = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch last 5 years of dividend history
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      const fromDate = fiveYearsAgo.toISOString().split('T')[0];

      const data = await api.fetchDividendHistory(ticker, fromDate);

      // Data might be nested - adjust based on actual API response
      const divArray = data?.dividends || (Array.isArray(data) ? data : []);
      setDividends(divArray.sort((a: any, b: any) =>
        new Date(b.date || b.paymentDate).getTime() - new Date(a.date || a.paymentDate).getTime()
      ));
    } catch (err: any) {
      console.error('Failed to fetch dividend history:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Dividend History</h3>
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-slate-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Dividend History</h3>
        <p className="text-sm text-red-400">Failed to load dividend history</p>
      </div>
    );
  }

  if (dividends.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Dividend History</h3>
        <p className="text-sm text-slate-400">No dividend payments found</p>
      </div>
    );
  }

  // Calculate metrics
  const recent10 = dividends.slice(0, 10);
  const totalAnnual = recent10.slice(0, 4).reduce((sum, d) => sum + (d.value || d.dividend || 0), 0);
  const avgDividend = recent10.reduce((sum, d) => sum + (d.value || d.dividend || 0), 0) / recent10.length;

  // Calculate growth (compare last 4 payments to previous 4)
  const last4 = dividends.slice(0, 4).reduce((sum, d) => sum + (d.value || d.dividend || 0), 0);
  const prev4 = dividends.slice(4, 8).reduce((sum, d) => sum + (d.value || d.dividend || 0), 0);
  const growthRate = prev4 > 0 ? ((last4 - prev4) / prev4) * 100 : 0;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Dividend History</h3>

      {/* Summary Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-slate-700 rounded px-2 py-2 text-center">
          <div className="text-xs text-slate-400">Annual (TTM)</div>
          <div className="text-sm font-semibold text-green-400">
            ${totalAnnual.toFixed(2)}
          </div>
        </div>
        <div className="bg-slate-700 rounded px-2 py-2 text-center">
          <div className="text-xs text-slate-400">Avg Payment</div>
          <div className="text-sm font-semibold text-white">
            ${avgDividend.toFixed(2)}
          </div>
        </div>
        <div className="bg-slate-700 rounded px-2 py-2 text-center">
          <div className="text-xs text-slate-400">YoY Growth</div>
          <div className={`text-sm font-semibold ${growthRate > 0 ? 'text-green-400' : growthRate < 0 ? 'text-red-400' : 'text-white'}`}>
            {growthRate > 0 ? '+' : ''}{growthRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Dividend Payment History Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-2 text-xs text-slate-400">Ex-Date</th>
              <th className="text-left py-2 px-2 text-xs text-slate-400">Payment Date</th>
              <th className="text-right py-2 px-2 text-xs text-slate-400">Amount</th>
            </tr>
          </thead>
          <tbody>
            {recent10.map((div, idx) => (
              <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="py-2 px-2 text-xs text-slate-300">
                  {formatDate(div.date || div.exDividendDate)}
                </td>
                <td className="py-2 px-2 text-xs text-slate-300">
                  {formatDate(div.paymentDate || div.date)}
                </td>
                <td className="py-2 px-2 text-xs text-right font-semibold text-green-400">
                  ${(div.value || div.dividend || 0).toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dividends.length > 10 && (
        <div className="text-xs text-slate-500 text-center mt-2">
          Showing 10 of {dividends.length} payments (last 5 years)
        </div>
      )}

      {/* Next Dividend Info */}
      {dividends.length >= 4 && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="text-xs text-slate-400">
            Dividend frequency:{' '}
            <span className="text-white">Quarterly</span>
            {' • '}
            Next estimated payment:{' '}
            <span className="text-white">
              {(() => {
                const lastDate = new Date(dividends[0].date || dividends[0].paymentDate);
                lastDate.setMonth(lastDate.getMonth() + 3);
                return lastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              })()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
