// components/stocks/StockFundamentalsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import FinancialStatements from '../FinancialStatements';
import AnalystRatings from '../AnalystRatings';
import DividendHistory from '../DividendHistory';

interface StockFundamentalsTabProps {
  ticker: string;
}

export default function StockFundamentalsTab({ ticker }: StockFundamentalsTabProps) {
  const [financials, setFinancials] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statementType, setStatementType] = useState<'balance_sheet' | 'income_statement' | 'cash_flow'>('income_statement');
  const [period, setPeriod] = useState<'yearly' | 'quarterly'>('yearly');

  useEffect(() => {
    fetchFinancials();
  }, [ticker, statementType, period]);

  const fetchFinancials = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await api.fetchFinancials(ticker, statementType, period);
      setFinancials(data);
    } catch (err: any) {
      console.error('Failed to fetch financials:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Statement Type Selector */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={() => setStatementType('income_statement')}
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              statementType === 'income_statement'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Income Statement
          </button>
          <button
            onClick={() => setStatementType('balance_sheet')}
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              statementType === 'balance_sheet'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Balance Sheet
          </button>
          <button
            onClick={() => setStatementType('cash_flow')}
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              statementType === 'cash_flow'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Cash Flow
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setPeriod('yearly')}
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              period === 'yearly'
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Annual
          </button>
          <button
            onClick={() => setPeriod('quarterly')}
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              period === 'quarterly'
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Quarterly
          </button>
        </div>
      </div>

      {/* Financial Statements */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-400">Loading financial statements...</div>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-300">
          {error}
        </div>
      ) : (
        <FinancialStatements ticker={ticker} statement={statementType} period={period} />
      )}

      {/* Analyst Ratings */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-xl font-bold mb-4">Analyst Ratings</h3>
        <AnalystRatings ticker={ticker} />
      </div>

      {/* Dividend History */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-xl font-bold mb-4">Dividend History</h3>
        <DividendHistory ticker={ticker} />
      </div>
    </div>
  );
}
