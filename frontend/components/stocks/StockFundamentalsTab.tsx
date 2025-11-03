// components/stocks/StockFundamentalsTab.tsx
'use client';

import FinancialStatements from '../FinancialStatements';
import AnalystRatings from '../AnalystRatings';
import DividendHistory from '../DividendHistory';

interface StockFundamentalsTabProps {
  ticker: string;
}

export default function StockFundamentalsTab({ ticker }: StockFundamentalsTabProps) {
  return (
    <div className="space-y-6">
      {/* Financial Statements */}
      <FinancialStatements ticker={ticker} defaultStatement="income_statement" defaultPeriod="yearly" />

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
