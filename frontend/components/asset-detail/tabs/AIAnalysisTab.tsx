// components/asset-detail/tabs/AIAnalysisTab.tsx
'use client';

import StockAIAnalysisTab from '../../stocks/StockAIAnalysisTab';

interface AIAnalysisTabProps {
  ticker: string;
  assetType: 'stock' | 'etf' | 'currency' | 'macro';
}

export default function AIAnalysisTab({ ticker, assetType }: AIAnalysisTabProps) {
  return (
    <div className="p-6 h-full">
      {/* Reuse existing Stock AI Analysis Tab */}
      <StockAIAnalysisTab ticker={ticker} />
    </div>
  );
}
