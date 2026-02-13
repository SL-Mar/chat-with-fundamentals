import { useState } from 'react';
import { Universe } from '../../types/universe';
import TradingViewChart from '../charts/TradingViewChart';

interface Props {
  universe: Universe;
}

export default function ChartsTab({ universe }: Props) {
  const [selectedTicker, setSelectedTicker] = useState<string>(
    universe.tickers?.[0]?.ticker || ''
  );

  const tickers = universe.tickers || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400">Ticker:</label>
        <select
          value={selectedTicker}
          onChange={(e) => setSelectedTicker(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
        >
          {tickers.map((t) => (
            <option key={t.ticker} value={t.ticker}>
              {t.ticker} {t.company_name ? `— ${t.company_name}` : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedTicker && (
        <TradingViewChart universeId={universe.id} ticker={selectedTicker} />
      )}
    </div>
  );
}
