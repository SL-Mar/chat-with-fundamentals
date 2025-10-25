// pages/financials.tsx - Financial Statements Page
'use client';

import { useState } from 'react';
import FinancialStatements from '../components/FinancialStatements';
import Header from '../components/Header';

export default function FinancialsPage() {
  const [ticker, setTicker] = useState('AAPL.US');
  const [inputValue, setInputValue] = useState('AAPL.US');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedTicker = inputValue.toUpperCase().includes('.')
      ? inputValue.toUpperCase()
      : `${inputValue.toUpperCase()}.US`;
    setTicker(formattedTicker);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Financial Statements</h1>
          <p className="text-slate-400">
            View detailed Balance Sheet, Income Statement, and Cash Flow statements
          </p>
        </div>

        {/* Ticker Input */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-2">Stock Ticker</label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="AAPL.US"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Enter ticker with exchange suffix (e.g., AAPL.US, MSFT.US)
              </p>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium transition-colors"
              >
                Load Statements
              </button>
            </div>
          </form>
        </div>

        {/* Financial Statements Component */}
        {ticker && <FinancialStatements ticker={ticker} />}

        {/* Help Section */}
        <div className="mt-8 bg-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Understanding Financial Statements</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h3 className="font-semibold text-blue-400 mb-2">Balance Sheet</h3>
              <p className="text-slate-400">
                Shows company's assets, liabilities, and shareholders' equity at a specific point in time.
                Key metrics: Total Assets, Total Liabilities, Shareholders' Equity.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-green-400 mb-2">Income Statement</h3>
              <p className="text-slate-400">
                Shows company's revenues and expenses over a period.
                Key metrics: Revenue, Operating Income, Net Income, EPS.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-purple-400 mb-2">Cash Flow Statement</h3>
              <p className="text-slate-400">
                Shows cash inflows and outflows from operating, investing, and financing activities.
                Key metrics: Operating Cash Flow, Free Cash Flow, Capital Expenditures.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
