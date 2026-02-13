import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import * as api from '../../lib/api';

const GRANULARITY_OPTIONS = [
  { value: 'd', label: 'Daily' },
  { value: '1h', label: '1 Hour' },
  { value: '5m', label: '5 Minutes' },
];

const POPULAR_ETFS = [
  { symbol: 'SPY', label: 'S&P 500' },
  { symbol: 'QQQ', label: 'Nasdaq 100' },
  { symbol: 'IWM', label: 'Russell 2000' },
  { symbol: 'XLK', label: 'Technology' },
  { symbol: 'XLF', label: 'Financials' },
  { symbol: 'XLV', label: 'Healthcare' },
  { symbol: 'XLE', label: 'Energy' },
  { symbol: 'XLI', label: 'Industrials' },
  { symbol: 'XLP', label: 'Consumer Staples' },
  { symbol: 'XLY', label: 'Consumer Discretionary' },
];

export default function CreateUniverseWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [sectors, setSectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [sourceType, setSourceType] = useState<'sector' | 'etf'>('etf');
  const [sector, setSector] = useState('');
  const [etfSymbol, setEtfSymbol] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [granularities, setGranularities] = useState<string[]>(['d']);

  useEffect(() => {
    api.getSectors().then(setSectors).catch(() => {});
  }, []);

  const toggleGranularity = (g: string) => {
    setGranularities((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  const canProceedStep1 = name && startDate && endDate &&
    (sourceType === 'sector' ? !!sector : !!etfSymbol);

  const sourceLabel = sourceType === 'etf'
    ? `ETF: ${etfSymbol.toUpperCase()}`
    : `Sector: ${sector}`;

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.createUniverse({
        name,
        source_type: sourceType,
        sector: sourceType === 'sector' ? sector : undefined,
        etf_symbol: sourceType === 'etf' ? etfSymbol.toUpperCase() : undefined,
        start_date: startDate,
        end_date: endDate,
        granularities,
      });
      router.push(`/universe/${result.id}`);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-white mb-6">Create Universe</h2>

      {/* Step indicators */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${
              s <= step ? 'bg-indigo-500' : 'bg-gray-700'
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Universe Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., S&P 500 2024"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Source type toggle */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Source</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSourceType('etf')}
                className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                  sourceType === 'etf'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                }`}
              >
                ETF Holdings
              </button>
              <button
                onClick={() => setSourceType('sector')}
                className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                  sourceType === 'sector'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                }`}
              >
                Sector Screen
              </button>
            </div>
          </div>

          {/* ETF input */}
          {sourceType === 'etf' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">ETF Symbol</label>
              <input
                type="text"
                value={etfSymbol}
                onChange={(e) => setEtfSymbol(e.target.value.toUpperCase())}
                placeholder="e.g., SPY"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:border-indigo-500 focus:outline-none mb-2"
              />
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_ETFS.map((etf) => (
                  <button
                    key={etf.symbol}
                    onClick={() => {
                      setEtfSymbol(etf.symbol);
                      if (!name) setName(`${etf.label} Universe`);
                    }}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      etfSymbol === etf.symbol
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-indigo-500'
                    }`}
                  >
                    {etf.symbol} ({etf.label})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sector select */}
          {sourceType === 'sector' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Sector</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Select sector...</option>
                {sectors.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={!canProceedStep1}
            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <label className="block text-sm text-gray-400 mb-2">Data Granularities</label>
          <div className="space-y-2">
            {GRANULARITY_OPTIONS.map((g) => (
              <label
                key={g.value}
                className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${
                  granularities.includes(g.value)
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={granularities.includes(g.value)}
                  onChange={() => toggleGranularity(g.value)}
                  className="accent-indigo-500"
                />
                <span className="text-white">{g.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            More granularities = more API calls and longer ingestion time
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 bg-gray-700 text-gray-300 py-2 rounded hover:bg-gray-600 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={granularities.length === 0}
              className="flex-1 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-400">Confirm Universe</h3>
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Name</span>
              <span className="text-white">{name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Source</span>
              <span className="text-white">{sourceLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Period</span>
              <span className="text-white">{startDate} to {endDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Granularities</span>
              <span className="text-white">{granularities.join(', ')}</span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              className="flex-1 bg-gray-700 text-gray-300 py-2 rounded hover:bg-gray-600 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating...' : 'Create Universe'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
