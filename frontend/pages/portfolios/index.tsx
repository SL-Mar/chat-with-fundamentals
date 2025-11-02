// pages/portfolios/index.tsx - Portfolio List Page
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';

interface Portfolio {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  stocks: any[];
}

export default function PortfoliosPage() {
  const router = useRouter();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPortfolios();
  }, []);

  const loadPortfolios = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.fetchPortfolios();
      setPortfolios(data.portfolios || []);
    } catch (err: any) {
      console.error('Failed to load portfolios:', err);
      setError(err.message || 'Failed to load portfolios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePortfolio = async () => {
    if (!newName.trim()) {
      setError('Portfolio name is required');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      const portfolio = await api.createPortfolio(newName, newDescription || undefined);
      setShowCreateModal(false);
      setNewName('');
      setNewDescription('');
      await loadPortfolios();
      // Navigate to the new portfolio
      router.push(`/portfolios/${portfolio.id}`);
    } catch (err: any) {
      console.error('Failed to create portfolio:', err);
      setError(err.message || 'Failed to create portfolio');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePortfolio = async (portfolioId: number, name: string) => {
    if (!confirm(`Are you sure you want to delete portfolio "${name}"?`)) {
      return;
    }

    try {
      setError(null);
      await api.deletePortfolio(portfolioId);
      await loadPortfolios();
    } catch (err: any) {
      console.error('Failed to delete portfolio:', err);
      setError(err.message || 'Failed to delete portfolio');
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Portfolios</h1>
            <p className="text-slate-400">Manage and analyze your investment portfolios</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition-colors flex items-center gap-2"
          >
            <span>+</span> Create Portfolio
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-700 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-red-400">⚠️</span>
              <p className="text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-600 border-t-blue-500"></div>
            <p className="text-slate-400 mt-4">Loading portfolios...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && portfolios.length === 0 && (
          <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">No Portfolios Yet</h3>
            <p className="text-slate-400 mb-6">
              Create your first portfolio to start analyzing and optimizing your investments
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition-colors"
            >
              Create Your First Portfolio
            </button>
          </div>
        )}

        {/* Portfolio Grid */}
        {!loading && portfolios.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolios.map((portfolio) => (
              <div
                key={portfolio.id}
                className="bg-slate-800 rounded-lg border border-slate-700 hover:border-blue-500 transition-colors overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-1">{portfolio.name}</h3>
                      {portfolio.description && (
                        <p className="text-sm text-slate-400">{portfolio.description}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePortfolio(portfolio.id, portfolio.name);
                      }}
                      className="text-slate-400 hover:text-red-400 transition-colors"
                      title="Delete portfolio"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Holdings</span>
                      <span className="font-semibold">{portfolio.stocks?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Created</span>
                      <span className="font-semibold">{formatDate(portfolio.created_at)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push(`/portfolios/${portfolio.id}`)}
                    className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Portfolio Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Create New Portfolio</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Portfolio Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Growth Portfolio"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Description (Optional)</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g., High-growth tech and innovation stocks"
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-900/50 border border-red-700 rounded p-3">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewName('');
                  setNewDescription('');
                  setError(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition-colors"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePortfolio}
                disabled={creating || !newName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded font-semibold transition-colors"
              >
                {creating ? 'Creating...' : 'Create Portfolio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
