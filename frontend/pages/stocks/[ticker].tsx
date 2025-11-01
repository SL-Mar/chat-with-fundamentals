// pages/stocks/[ticker].tsx - Unified Stock Detail Page
'use client';

import { useRouter } from 'next/router';
import AssetDetailPage from '../../components/asset-detail/AssetDetailPage';

export default function StockDetailPage() {
  const router = useRouter();
  const { ticker } = router.query;

  if (!ticker || typeof ticker !== 'string') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <h1 className="text-2xl font-bold mb-2">Stock Detail</h1>
          <p className="text-slate-400">No ticker specified</p>
          <button
            onClick={() => router.push('/stocks')}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold"
          >
            Browse Stocks
          </button>
        </div>
      </div>
    );
  }

  return (
    <AssetDetailPage
      ticker={ticker}
      assetType="stock"
      defaultTab="overview"
    />
  );
}
