// components/InsiderTransactions.tsx - Insider buying and selling activity
'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface InsiderTransactionsProps {
  ticker: string;
  limit?: number;
}

export default function InsiderTransactions({ ticker, limit = 20 }: InsiderTransactionsProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;
    fetchTransactions();
  }, [ticker]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.fetchInsiderTransactions(ticker, limit);

      // Data might be nested - adjust based on actual API response
      const txArray = Array.isArray(data) ? data : data?.data || [];
      setTransactions(txArray);
    } catch (err: any) {
      console.error('Failed to fetch insider transactions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Insider Transactions</h3>
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
        <h3 className="text-lg font-semibold mb-2">Insider Transactions</h3>
        <p className="text-sm text-red-400">Failed to load insider transactions</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Insider Transactions</h3>
        <p className="text-sm text-slate-400">No insider transactions available</p>
      </div>
    );
  }

  // Calculate net insider sentiment
  const netShares = transactions.reduce((acc, tx) => {
    const shares = tx.transactionShares || tx.shares || tx.transactionAmount || 0;
    // EODHD uses transactionCode: P=purchase, S=sale
    // Or transactionAcquiredDisposed: A=acquired, D=disposed
    const isBuy = tx.transactionType?.toLowerCase().includes('buy') ||
                  tx.transactionType?.toLowerCase().includes('purchase') ||
                  tx.transactionCode === 'P' ||
                  tx.transactionAcquiredDisposed === 'A';
    return acc + (isBuy ? shares : -shares);
  }, 0);

  const sentiment = netShares > 0 ? 'Bullish' : netShares < 0 ? 'Bearish' : 'Neutral';
  const sentimentColor = sentiment === 'Bullish' ? 'text-green-400' : sentiment === 'Bearish' ? 'text-red-400' : 'text-yellow-400';

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatShares = (shares: number) => {
    if (!shares) return '-';
    if (shares >= 1000000) return `${(shares / 1000000).toFixed(2)}M`;
    if (shares >= 1000) return `${(shares / 1000).toFixed(1)}K`;
    return shares.toLocaleString();
  };

  const formatValue = (value: number) => {
    if (!value) return '-';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 h-[1000px] flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold">Insider Transactions</h3>
        <div className="text-sm">
          <span className="text-slate-400">Sentiment: </span>
          <span className={`font-semibold ${sentimentColor}`}>{sentiment}</span>
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-800">
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-2 text-xs text-slate-400">Date</th>
              <th className="text-left py-2 px-2 text-xs text-slate-400">Insider</th>
              <th className="text-left py-2 px-2 text-xs text-slate-400">Type</th>
              <th className="text-right py-2 px-2 text-xs text-slate-400">Shares</th>
              <th className="text-right py-2 px-2 text-xs text-slate-400">Value</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, idx) => {
              // EODHD uses transactionCode: P=purchase, S=sale
              // Or transactionAcquiredDisposed: A=acquired, D=disposed
              const isBuy = tx.transactionType?.toLowerCase().includes('buy') ||
                           tx.transactionType?.toLowerCase().includes('purchase') ||
                           tx.transactionCode === 'P' ||
                           tx.transactionAcquiredDisposed === 'A';
              const transactionColor = isBuy ? 'text-green-400' : 'text-red-400';

              // EODHD field names: ownerName, ownerTitle, transactionAmount, transactionPrice, transactionDate
              const shares = tx.transactionShares || tx.shares || tx.transactionAmount || 0;
              const price = tx.transactionPrice || tx.price || 0;
              const value = tx.transactionValue || tx.value || (shares * price);

              return (
                <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-2 px-2 text-xs text-slate-300">
                    {formatDate(tx.filingDate || tx.date || tx.transactionDate)}
                  </td>
                  <td className="py-2 px-2 text-xs">
                    <div className="text-white">{tx.fullName || tx.reportingName || tx.ownerName || 'Unknown'}</div>
                    <div className="text-slate-400 text-xs">{tx.position || tx.title || tx.ownerTitle || ''}</div>
                  </td>
                  <td className={`py-2 px-2 text-xs font-semibold ${transactionColor}`}>
                    {tx.transactionType || tx.type || (tx.transactionCode === 'P' ? 'Purchase' : tx.transactionCode === 'S' ? 'Sale' : tx.transactionAcquiredDisposed === 'A' ? 'Acquired' : tx.transactionAcquiredDisposed === 'D' ? 'Disposed' : 'N/A')}
                  </td>
                  <td className="py-2 px-2 text-xs text-right text-white">
                    {formatShares(shares)}
                  </td>
                  <td className="py-2 px-2 text-xs text-right text-white">
                    {formatValue(value)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
