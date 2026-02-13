import { Universe } from '../../types/universe';
import StatusBadge from '../common/StatusBadge';
import { formatDate } from '../../lib/format';

interface Props {
  universe: Universe;
}

export default function OverviewTab({ universe }: Props) {
  const readyTickers = universe.tickers?.filter((t) => t.ohlcv_status === 'ready') || [];
  const errorTickers = universe.tickers?.filter((t) => t.ohlcv_status === 'error') || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Tickers" value={universe.total_tickers} />
        <StatCard label="Ready" value={readyTickers.length} color="text-green-400" />
        <StatCard label="Errors" value={errorTickers.length} color="text-red-400" />
        <StatCard label="Status" value={universe.status} />
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Universe Details</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Detail label="Sector" value={universe.sector} />
          <Detail label="Period" value={`${formatDate(universe.start_date)} — ${formatDate(universe.end_date)}`} />
          <Detail label="Granularities" value={universe.granularities?.join(', ') || 'd'} />
          <Detail label="Created" value={universe.created_at ? formatDate(universe.created_at) : '—'} />
        </div>
      </div>

      {universe.tickers && universe.tickers.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Tickers ({universe.tickers.length})
          </h3>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {universe.tickers.map((t) => (
              <span
                key={t.ticker}
                className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded font-mono"
              >
                {t.ticker}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color || 'text-white'}`}>{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-500">{label}:</span>{' '}
      <span className="text-white">{value}</span>
    </div>
  );
}
