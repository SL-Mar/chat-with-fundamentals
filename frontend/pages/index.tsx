import { useEffect } from 'react';
import Link from 'next/link';
import { useUniverseStore } from '../stores/universeStore';
import UniverseList from '../components/universe/UniverseList';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

export default function Home() {
  const { universes, loading, error, fetchUniverses, deleteUniverse } = useUniverseStore();

  useEffect(() => {
    fetchUniverses();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Universes</h1>
          <p className="text-sm text-gray-400 mt-1">
            Create scoped datasets to analyze OHLCV + fundamentals data
          </p>
        </div>
        <Link
          href="/universe/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors text-sm font-medium"
        >
          Create Universe
        </Link>
      </div>

      {error && <ErrorMessage message={error} />}
      {loading && universes.length === 0 ? (
        <LoadingSpinner size="lg" />
      ) : (
        <UniverseList
          universes={universes}
          onDelete={(id) => {
            if (confirm('Delete this universe and all its data?')) {
              deleteUniverse(id);
            }
          }}
        />
      )}
    </div>
  );
}
