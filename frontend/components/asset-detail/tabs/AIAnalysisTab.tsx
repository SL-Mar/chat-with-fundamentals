// components/asset-detail/tabs/AIAnalysisTab.tsx
'use client';

import StockAIAnalysisTab from '../../stocks/StockAIAnalysisTab';

interface AIAnalysisTabProps {
  ticker: string;
  assetType: 'stock' | 'etf' | 'currency' | 'macro';
}

export default function AIAnalysisTab({ ticker, assetType }: AIAnalysisTabProps) {
  return (
    <div className="p-6">
      {/* Reuse existing Stock AI Analysis Tab */}
      <StockAIAnalysisTab ticker={ticker} />

      {/* AI Methodology */}
      <div className="mt-6 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <h4 className="font-semibold text-blue-300 mb-2">How MarketSense AI Works</h4>
            <div className="text-sm text-slate-400 space-y-2">
              <p>
                <strong className="text-white">Fundamentals Agent:</strong> Analyzes financial metrics,
                valuation ratios, profitability, and growth indicators to assess intrinsic value.
              </p>
              <p>
                <strong className="text-white">News Sentiment Agent:</strong> Processes recent news articles
                using NLP to gauge market sentiment and public perception.
              </p>
              <p>
                <strong className="text-white">Price Dynamics Agent:</strong> Examines technical indicators,
                momentum, and price patterns to identify trends and reversal signals.
              </p>
              <p>
                <strong className="text-white">Macro Environment Agent:</strong> Evaluates economic indicators,
                market conditions, and sector performance for broader context.
              </p>
              <p className="mt-3 pt-3 border-t border-blue-700">
                <strong className="text-white">Signal Generator:</strong> Synthesizes all 4 agent outputs to generate
                a final BUY/HOLD/SELL recommendation with weighted scoring (Fundamentals: 30%, News: 25%,
                Price Dynamics: 25%, Macro: 20%).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
