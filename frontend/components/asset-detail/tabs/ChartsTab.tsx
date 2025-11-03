// components/asset-detail/tabs/ChartsTab.tsx - Intraday charts with interval controls in chart
'use client';

import { useState } from 'react';
import IntradayChart from '../../IntradayChart';

interface ChartsTabProps {
  ticker: string;
  assetType: 'stock' | 'etf' | 'currency' | 'macro';
}

type Interval = '1m' | '5m' | '15m' | '30m' | '1h';

export default function ChartsTab({ ticker, assetType }: ChartsTabProps) {
  const [interval, setInterval] = useState<Interval>('5m');

  return (
    <div className="p-6">
      <IntradayChart
        ticker={ticker}
        interval={interval}
        onIntervalChange={(newInterval) => setInterval(newInterval as Interval)}
      />
    </div>
  );
}
