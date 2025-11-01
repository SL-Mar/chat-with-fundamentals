// components/asset-detail/tabs/NewsTab.tsx
'use client';

import StockNewsTab from '../../stocks/StockNewsTab';

interface NewsTabProps {
  ticker: string;
  assetType: 'stock' | 'etf' | 'currency' | 'macro';
}

export default function NewsTab({ ticker, assetType }: NewsTabProps) {
  return (
    <div className="p-6">
      <StockNewsTab ticker={ticker} />
    </div>
  );
}
