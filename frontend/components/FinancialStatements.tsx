// components/FinancialStatements.tsx - Financial Statements Viewer
'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface FinancialStatementsProps {
  ticker: string;
  defaultStatement?: 'balance_sheet' | 'income_statement' | 'cash_flow';
  defaultPeriod?: 'yearly' | 'quarterly';
}

export default function FinancialStatements({
  ticker,
  defaultStatement = 'balance_sheet',
  defaultPeriod = 'yearly',
}: FinancialStatementsProps) {
  const [statement, setStatement] = useState<'balance_sheet' | 'income_statement' | 'cash_flow'>(defaultStatement);
  const [period, setPeriod] = useState<'yearly' | 'quarterly'>(defaultPeriod);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;
    fetchFinancials();
  }, [ticker, statement, period]);

  const fetchFinancials = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.fetchFinancials(ticker, statement, period);

      console.log('[FinancialStatements] API response:', response);

      if (response && response.data) {
        setData(response.data);
      } else {
        setData(null);
      }
    } catch (err: any) {
      console.error('[FinancialStatements] Failed to fetch:', err);
      setError(err.message || 'Failed to load financial statements');
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';

    const num = parseFloat(value);
    if (isNaN(num)) return value.toString();

    // Format large numbers
    if (Math.abs(num) >= 1e9) {
      return `$${(num / 1e9).toFixed(2)}B`;
    } else if (Math.abs(num) >= 1e6) {
      return `$${(num / 1e6).toFixed(2)}M`;
    } else if (Math.abs(num) >= 1e3) {
      return `$${(num / 1e3).toFixed(2)}K`;
    } else {
      return `$${num.toFixed(2)}`;
    }
  };

  const formatLabel = (key: string): string => {
    // Convert snake_case or camelCase to Title Case
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  };

  const getStatementTitle = () => {
    switch (statement) {
      case 'balance_sheet':
        return 'Balance Sheet';
      case 'income_statement':
        return 'Income Statement';
      case 'cash_flow':
        return 'Cash Flow Statement';
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Financial Statements</h3>
        <div className="animate-pulse">
          <div className="h-64 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Financial Statements</h3>
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  // Extract periods (dates) from data
  const periods = data ? Object.keys(data).sort().reverse() : [];

  if (periods.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Financial Statements</h3>
        <p className="text-sm text-slate-400">No financial data available for {ticker}</p>
      </div>
    );
  }

  // Get all line items from first period
  const lineItems = periods.length > 0 ? Object.keys(data[periods[0]] || {}) : [];

  // Show only the most recent 5 periods for readability
  const displayPeriods = periods.slice(0, 5);

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h3 className="text-xl font-semibold">{getStatementTitle()}</h3>

        <div className="flex gap-3">
          {/* Statement Type Selector */}
          <div className="flex gap-1 bg-slate-700 rounded p-1">
            {(['balance_sheet', 'income_statement', 'cash_flow'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setStatement(type)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  statement === type
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-300 hover:bg-slate-600'
                }`}
              >
                {type === 'balance_sheet' && 'Balance Sheet'}
                {type === 'income_statement' && 'Income'}
                {type === 'cash_flow' && 'Cash Flow'}
              </button>
            ))}
          </div>

          {/* Period Selector */}
          <div className="flex gap-1 bg-slate-700 rounded p-1">
            {(['yearly', 'quarterly'] as const).map((per) => (
              <button
                key={per}
                onClick={() => setPeriod(per)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  period === per
                    ? 'bg-green-500 text-white'
                    : 'text-slate-300 hover:bg-slate-600'
                }`}
              >
                {per === 'yearly' ? 'Annual' : 'Quarterly'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Financial Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-300 sticky left-0 bg-slate-800 z-10">
                Line Item
              </th>
              {displayPeriods.map((date) => (
                <th key={date} className="text-right py-3 px-4 font-semibold text-slate-300 min-w-[120px]">
                  {date}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, idx) => {
              // Skip date field
              if (item === 'date' || item === 'filing_date' || item === 'currency_symbol') {
                return null;
              }

              return (
                <tr
                  key={item}
                  className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${
                    idx % 2 === 0 ? 'bg-slate-800/50' : ''
                  }`}
                >
                  <td className="py-2 px-4 font-medium text-white sticky left-0 bg-slate-800 z-10">
                    {formatLabel(item)}
                  </td>
                  {displayPeriods.map((date) => {
                    const value = data[date]?.[item];
                    return (
                      <td
                        key={`${date}-${item}`}
                        className={`py-2 px-4 text-right font-mono ${
                          value && parseFloat(value) < 0 ? 'text-red-400' : 'text-slate-200'
                        }`}
                      >
                        {formatValue(value)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {periods.length > 5 && (
        <div className="mt-4 text-center text-xs text-slate-400">
          Showing {displayPeriods.length} of {periods.length} available periods
        </div>
      )}
    </div>
  );
}
