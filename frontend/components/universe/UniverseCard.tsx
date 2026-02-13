import Link from 'next/link';
import { Universe } from '../../types/universe';
import StatusBadge from '../common/StatusBadge';
import { formatDate } from '../../lib/format';

interface Props {
  universe: Universe;
  onDelete: (id: string) => void;
}

export default function UniverseCard({ universe, onDelete }: Props) {
  const progressPct = universe.total_tickers > 0
    ? Math.round((universe.tickers_completed / universe.total_tickers) * 100)
    : 0;

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-5 hover:border-indigo-500/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <Link
            href={`/universe/${universe.id}`}
            className="text-lg font-semibold text-white hover:text-indigo-400 transition-colors"
          >
            {universe.name}
          </Link>
          <p className="text-sm text-gray-400 mt-0.5">
            {universe.source_type === 'etf'
              ? `ETF: ${universe.etf_symbol}`
              : universe.sector}
          </p>
        </div>
        <StatusBadge status={universe.status} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-gray-400 mb-3">
        <div>
          <span className="text-gray-500">Period:</span>{' '}
          {formatDate(universe.start_date)} — {formatDate(universe.end_date)}
        </div>
        <div>
          <span className="text-gray-500">Tickers:</span>{' '}
          {universe.tickers_completed}/{universe.total_tickers}
        </div>
        <div>
          <span className="text-gray-500">Granularities:</span>{' '}
          {universe.granularities?.join(', ') || 'd'}
        </div>
        {universe.created_at && (
          <div>
            <span className="text-gray-500">Created:</span>{' '}
            {formatDate(universe.created_at)}
          </div>
        )}
      </div>

      {universe.status === 'creating' && (
        <div className="mb-3">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{progressPct}% complete</p>
        </div>
      )}

      {universe.error_message && (
        <p className="text-xs text-red-400 mb-3 truncate">{universe.error_message}</p>
      )}

      <div className="flex gap-2">
        <Link
          href={`/universe/${universe.id}`}
          className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition-colors"
        >
          Open
        </Link>
        <button
          onClick={() => onDelete(universe.id)}
          className="text-xs px-3 py-1.5 bg-gray-700 text-gray-300 rounded hover:bg-red-600 hover:text-white transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
