// pages/currencies/[...pair].tsx - Currency Pair Detail Page
'use client';

import { useRouter } from 'next/router';
import AssetDetailPage from '../../components/asset-detail/AssetDetailPage';

export default function CurrencyDetailPage() {
  const router = useRouter();
  const { pair: pairRaw } = router.query;

  // Convert array to string (e.g., ['EUR', 'USD'] -> 'EURUSD')
  const pair = Array.isArray(pairRaw) ? pairRaw.join('') : pairRaw;

  if (!pair || typeof pair !== 'string') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">💱</div>
          <h1 className="text-2xl font-bold mb-2">Currency Pair</h1>
          <p className="text-slate-400">No pair specified</p>
        </div>
      </div>
    );
  }

  return <AssetDetailPage ticker={pair} assetType="currency" />;
}
