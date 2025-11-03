// pages/etfs/[symbol].tsx - ETF Detail Page
'use client';

import { useRouter } from 'next/router';
import AssetDetailPage from '../../components/asset-detail/AssetDetailPage';

export default function ETFDetailPage() {
  const router = useRouter();
  const { symbol } = router.query;

  if (!symbol || typeof symbol !== 'string') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <h1 className="text-2xl font-bold mb-2">ETF Detail</h1>
          <p className="text-slate-400">No symbol specified</p>
        </div>
      </div>
    );
  }

  return <AssetDetailPage ticker={symbol} assetType="etf" />;
}
