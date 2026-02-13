import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import * as api from '../../lib/api';
import { Universe } from '../../types/universe';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';
import OverviewTab from '../../components/workspace/OverviewTab';
import ChartsTab from '../../components/workspace/ChartsTab';
import ChatTab from '../../components/workspace/ChatTab';
import FactorsTab from '../../components/workspace/FactorsTab';
import FundamentalsTab from '../../components/workspace/FundamentalsTab';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'charts', label: 'Charts' },
  { key: 'chat', label: 'Chat' },
  { key: 'factors', label: 'Factors' },
  { key: 'fundamentals', label: 'Fundamentals' },
] as const;

export default function UniverseWorkspace() {
  const router = useRouter();
  const { id } = router.query;
  const { activeTab, setActiveTab } = useWorkspaceStore();

  const [universe, setUniverse] = useState<Universe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchUniverse();
  }, [id]);

  // Poll for progress if creating
  useEffect(() => {
    if (!universe || universe.status !== 'creating') return;
    const interval = setInterval(async () => {
      try {
        const progress = await api.getUniverseProgress(universe.id);
        if (progress.status === 'ready' || progress.status === 'error') {
          // Refresh full universe data
          const data = await api.getUniverse(universe.id);
          setUniverse(data);
        } else {
          setUniverse((prev) =>
            prev
              ? { ...prev, tickers_completed: progress.tickers_completed, total_tickers: progress.total_tickers }
              : null
          );
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [universe?.status]);

  const fetchUniverse = async () => {
    setLoading(true);
    try {
      const data = await api.getUniverse(id as string);
      setUniverse(data);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (error) return <ErrorMessage message={error} />;
  if (!universe) return <ErrorMessage message="Universe not found" />;

  const progressPct = universe.total_tickers > 0
    ? Math.round((universe.tickers_completed / universe.total_tickers) * 100)
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">{universe.name}</h1>
          <StatusBadge status={universe.status} />
        </div>
        <span className="text-sm text-gray-400">{universe.sector}</span>
      </div>

      {/* Progress bar for creating status */}
      {universe.status === 'creating' && (
        <div className="mb-4">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Ingesting data: {universe.tickers_completed}/{universe.total_tickers} tickers ({progressPct}%)
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'text-indigo-400 border-indigo-400'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab universe={universe} />}
      {activeTab === 'charts' && <ChartsTab universe={universe} />}
      {activeTab === 'chat' && <ChatTab universeId={universe.id} />}
      {activeTab === 'factors' && <FactorsTab universeId={universe.id} />}
      {activeTab === 'fundamentals' && <FundamentalsTab universeId={universe.id} />}
    </div>
  );
}
