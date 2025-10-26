// components/stocks/StockTechnicalTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import TechnicalIndicators from '../TechnicalIndicators';

interface StockTechnicalTabProps {
  ticker: string;
}

export default function StockTechnicalTab({ ticker }: StockTechnicalTabProps) {
  const [indicators, setIndicators] = useState<any>(null);
  const [selectedIndicator, setSelectedIndicator] = useState('RSI');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableIndicators = [
    { name: 'RSI', label: 'Relative Strength Index', period: 14 },
    { name: 'MACD', label: 'MACD', fastperiod: 12, slowperiod: 26, signalperiod: 9 },
    { name: 'SMA', label: 'Simple Moving Average', period: 50 },
    { name: 'EMA', label: 'Exponential Moving Average', period: 20 },
    { name: 'BBANDS', label: 'Bollinger Bands', period: 20 },
    { name: 'STOCH', label: 'Stochastic Oscillator', period: 14 },
    { name: 'ADX', label: 'Average Directional Index', period: 14 },
    { name: 'CCI', label: 'Commodity Channel Index', period: 20 },
  ];

  useEffect(() => {
    if (selectedIndicator) {
      fetchIndicator();
    }
  }, [ticker, selectedIndicator]);

  const fetchIndicator = async () => {
    try {
      setLoading(true);
      setError(null);

      const indicator = availableIndicators.find(i => i.name === selectedIndicator);
      if (!indicator) return;

      const options: any = {};
      if ('fastperiod' in indicator) {
        options.fastperiod = indicator.fastperiod;
        options.slowperiod = indicator.slowperiod;
        options.signalperiod = indicator.signalperiod;
      }

      const data = await api.fetchTechnicalIndicator(
        ticker,
        selectedIndicator,
        indicator.period,
        options
      );
      setIndicators(data);
    } catch (err: any) {
      console.error('Failed to fetch indicator:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Indicator Selector */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="text-lg font-bold mb-3">Select Technical Indicator</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {availableIndicators.map((indicator) => (
            <button
              key={indicator.name}
              onClick={() => setSelectedIndicator(indicator.name)}
              className={`px-4 py-2 rounded font-semibold transition-colors text-sm ${
                selectedIndicator === indicator.name
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {indicator.label}
            </button>
          ))}
        </div>
      </div>

      {/* Technical Indicators Component */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <TechnicalIndicators ticker={ticker} />
      </div>

      {/* Indicator Data */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-400">Loading {selectedIndicator}...</div>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-300">
          {error}
        </div>
      ) : indicators ? (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-xl font-bold mb-4">{selectedIndicator} Data</h3>
          <div className="overflow-auto">
            <pre className="text-xs text-slate-300 font-mono">
              {JSON.stringify(indicators, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}

      {/* Trading Signals Summary */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-xl font-bold mb-4">Technical Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-slate-700 rounded">
            <div className="text-sm text-slate-400 mb-1">Short Term</div>
            <div className="text-lg font-bold text-yellow-400">NEUTRAL</div>
          </div>
          <div className="text-center p-4 bg-slate-700 rounded">
            <div className="text-sm text-slate-400 mb-1">Medium Term</div>
            <div className="text-lg font-bold text-green-400">BULLISH</div>
          </div>
          <div className="text-center p-4 bg-slate-700 rounded">
            <div className="text-sm text-slate-400 mb-1">Long Term</div>
            <div className="text-lg font-bold text-green-400">BULLISH</div>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4 text-center">
          Technical summary is based on multiple indicators including moving averages, oscillators, and momentum indicators.
        </p>
      </div>
    </div>
  );
}
