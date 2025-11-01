// components/asset-detail/tabs/FundamentalsTab.tsx
'use client';

import StockFundamentalsTab from '../../stocks/StockFundamentalsTab';

interface FundamentalsTabProps {
  ticker: string;
  assetType: 'stock' | 'etf' | 'currency' | 'macro';
}

export default function FundamentalsTab({ ticker, assetType }: FundamentalsTabProps) {
  return (
    <div className="p-6">
      <StockFundamentalsTab ticker={ticker} />
    </div>
  );
}
