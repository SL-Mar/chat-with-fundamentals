// components/asset-detail/tabs/ChartsTab.tsx
'use client';

import { useState } from 'react';
import IntradayChart from '../../IntradayChart';

interface ChartsTabProps {
  ticker: string;
  assetType: 'stock' | 'etf' | 'currency' | 'macro';
}

type ChartType = 'intraday' | 'live';
type Interval = '1m' | '5m' | '15m' | '30m' | '1h';

export default function ChartsTab({ ticker, assetType }: ChartsTabProps) {
  const [chartType, setChartType] = useState<ChartType>('intraday');
  const [interval, setInterval] = useState<Interval>('5m');

  // Chart type options
  const chartTypes: { value: ChartType; label: string }[] = [
    { value: 'intraday', label: 'Intraday' },
    { value: 'live', label: 'Live' }
  ];

  // Interval options for intraday
  const intervalOptions: { value: Interval; label: string }[] = [
    { value: '1m', label: '1 Minute' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '30m', label: '30 Minutes' },
    { value: '1h', label: '1 Hour' }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Chart Controls */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex flex-wrap gap-4">
          {/* Chart Type Selector */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Chart Type</label>
            <div className="flex gap-2">
              {chartTypes.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setChartType(value)}
                  className={`
                    px-4 py-2 rounded font-semibold transition-colors
                    ${chartType === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Interval Selector */}
          {chartType !== 'live' && (
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Interval</label>
              <div className="flex gap-2">
                {intervalOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setInterval(value)}
                    className={`
                      px-3 py-2 rounded text-sm font-semibold transition-colors
                      ${interval === value
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart Display */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="h-[600px]">
          {chartType === 'intraday' ? (
            <IntradayChart ticker={ticker} interval={interval} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-slate-400">Live chart coming soon...</div>
                <div className="text-sm text-slate-500 mt-2">
                  Real-time WebSocket streaming in development
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart Tips */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h4 className="font-semibold text-blue-300 mb-1">Chart Tips</h4>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Toggle technical indicators (SMA, Bollinger Bands, RSI) using the chart controls</li>
              <li>• Use Intraday for day trading and short-term patterns</li>
              <li>• Combine multiple timeframes for better context</li>
              <li>• Pan and zoom to analyze specific time periods</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
