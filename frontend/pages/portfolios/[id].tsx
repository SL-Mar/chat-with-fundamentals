// pages/portfolios/[id].tsx - Portfolio Detail Page
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type TabType = 'overview' | 'holdings' | 'analysis' | 'risk' | 'ai';
type AnalysisMethod = 'equal-weight' | 'mvo' | 'min_variance' | 'black_litterman';

interface Portfolio {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  stocks: PortfolioStock[];
}

interface PortfolioStock {
  id: number;
  ticker: string;
  weight: number | null;
  shares: number | null;
  added_at: string;
}

export default function PortfolioDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add stock modal
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [newTicker, setNewTicker] = useState('');
  const [adding, setAdding] = useState(false);

  // Analysis data
  const [analysisMethod, setAnalysisMethod] = useState<AnalysisMethod>('equal-weight');
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Monte Carlo data
  const [monteCarloData, setMonteCarloData] = useState<any>(null);
  const [loadingMonteCarlo, setLoadingMonteCarlo] = useState(false);

  // VaR data
  const [varData, setVarData] = useState<any>(null);
  const [loadingVaR, setLoadingVaR] = useState(false);

  // AI Analysis
  const [aiResult, setAiResult] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    if (id) {
      loadPortfolio();
    }
  }, [id]);

  useEffect(() => {
    if (portfolio && portfolio.stocks.length > 0 && activeTab === 'analysis') {
      loadAnalysis();
    }
  }, [portfolio, activeTab, analysisMethod]);

  const loadPortfolio = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await api.fetchPortfolio(Number(id));
      setPortfolio(data);
    } catch (err: any) {
      console.error('Failed to load portfolio:', err);
      setError(err.message || 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysis = async () => {
    if (!portfolio || portfolio.stocks.length === 0) return;

    try {
      setLoadingAnalysis(true);
      setError(null);

      let data;
      if (analysisMethod === 'equal-weight') {
        data = await api.fetchEqualWeightAnalysis(portfolio.id);
      } else {
        data = await api.fetchOptimizedPortfolio(portfolio.id, analysisMethod);
      }

      setAnalysisData(data);
    } catch (err: any) {
      console.error('Failed to load analysis:', err);
      setError(err.message || 'Failed to load analysis');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const loadMonteCarlo = async () => {
    if (!portfolio || portfolio.stocks.length === 0) return;

    try {
      setLoadingMonteCarlo(true);
      setError(null);
      const data = await api.fetchMonteCarloSimulation(portfolio.id);
      setMonteCarloData(data);
    } catch (err: any) {
      console.error('Failed to load Monte Carlo:', err);
      setError(err.message || 'Failed to load Monte Carlo simulation');
    } finally {
      setLoadingMonteCarlo(false);
    }
  };

  const loadVaR = async () => {
    if (!portfolio || portfolio.stocks.length === 0) return;

    try {
      setLoadingVaR(true);
      setError(null);
      const data = await api.fetchVaRAnalysis(portfolio.id);
      setVarData(data);
    } catch (err: any) {
      console.error('Failed to load VaR:', err);
      setError(err.message || 'Failed to load VaR analysis');
    } finally {
      setLoadingVaR(false);
    }
  };

  const runAIAnalysis = async () => {
    if (!id) return;

    try {
      setLoadingAI(true);
      const result = await api.analyzePortfolio(Number(id), false);
      setAiResult(result);
    } catch (err) {
      console.error('AI analysis failed:', err);
      setError('AI analysis failed');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleAddStock = async () => {
    if (!portfolio || !newTicker.trim()) {
      setError('Ticker is required');
      return;
    }

    try {
      setAdding(true);
      setError(null);
      await api.addStockToPortfolio(portfolio.id, newTicker.toUpperCase());
      setShowAddStockModal(false);
      setNewTicker('');
      await loadPortfolio();
    } catch (err: any) {
      console.error('Failed to add stock:', err);
      setError(err.message || 'Failed to add stock');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveStock = async (stockId: number) => {
    if (!portfolio) return;

    if (!confirm('Are you sure you want to remove this stock?')) {
      return;
    }

    try {
      setError(null);
      await api.removeStockFromPortfolio(portfolio.id, stockId);
      await loadPortfolio();
    } catch (err: any) {
      console.error('Failed to remove stock:', err);
      setError(err.message || 'Failed to remove stock');
    }
  };

  const formatCurrency = (value: number | undefined): string => {
    if (value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number | undefined): string => {
    if (value === undefined) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Portfolio</h1>
          <p className="text-slate-400">No portfolio specified</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-600 border-t-blue-500 mb-4"></div>
          <p className="text-slate-400">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Portfolio Not Found</h1>
          <button
            onClick={() => router.push('/portfolios')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Back to Portfolios
          </button>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'holdings', label: 'Holdings', icon: '📋' },
    { id: 'analysis', label: 'Analysis', icon: '📈' },
    { id: 'risk', label: 'Risk', icon: '⚠️' },
    { id: 'ai', label: 'AI Optimization', icon: '🤖' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Back button */}
        <button
          onClick={() => router.push('/portfolios')}
          className="mb-4 text-sm text-slate-400 hover:text-white flex items-center gap-2"
        >
          <span>←</span> Back to Portfolios
        </button>

        {/* Portfolio Header */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{portfolio.name}</h1>
              {portfolio.description && (
                <p className="text-slate-400">{portfolio.description}</p>
              )}
            </div>
            <button
              onClick={() => setShowAddStockModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition-colors"
            >
              + Add Stock
            </button>
          </div>
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

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-slate-700 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="pb-12">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">Holdings</div>
                  <div className="text-2xl font-bold">{portfolio.stocks.length}</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">Status</div>
                  <div className="text-2xl font-bold text-green-400">Active</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">Created</div>
                  <div className="text-lg font-bold">
                    {new Date(portfolio.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {portfolio.stocks.length === 0 && (
                <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
                  <div className="text-6xl mb-4">📈</div>
                  <h3 className="text-xl font-bold mb-2">No Stocks Yet</h3>
                  <p className="text-slate-400 mb-6">Add stocks to start analyzing your portfolio</p>
                  <button
                    onClick={() => setShowAddStockModal(true)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition-colors"
                  >
                    Add Your First Stock
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'holdings' && (
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-x-auto">
              {portfolio.stocks.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-slate-400">No stocks in this portfolio</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="px-6 py-4 text-left font-bold">Ticker</th>
                      <th className="px-6 py-4 text-right font-bold">Weight</th>
                      <th className="px-6 py-4 text-right font-bold">Shares</th>
                      <th className="px-6 py-4 text-right font-bold">Added</th>
                      <th className="px-6 py-4 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.stocks.map((stock) => (
                      <tr key={stock.id} className="border-b border-slate-700 hover:bg-slate-750">
                        <td className="px-6 py-4 font-bold">{stock.ticker}</td>
                        <td className="px-6 py-4 text-right">
                          {stock.weight ? `${(stock.weight * 100).toFixed(2)}%` : 'Equal'}
                        </td>
                        <td className="px-6 py-4 text-right">{stock.shares || '-'}</td>
                        <td className="px-6 py-4 text-right text-sm text-slate-400">
                          {new Date(stock.added_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleRemoveStock(stock.id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-6">
              {portfolio.stocks.length === 0 ? (
                <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
                  <p className="text-slate-400">Add stocks to view analysis</p>
                </div>
              ) : (
                <>
                  {/* Analysis Method Selector */}
                  <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <label className="block text-sm font-semibold mb-2">Optimization Method</label>
                    <select
                      value={analysisMethod}
                      onChange={(e) => setAnalysisMethod(e.target.value as AnalysisMethod)}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded focus:outline-none focus:border-blue-500"
                    >
                      <option value="equal-weight">Equal Weight</option>
                      <option value="mvo">Mean-Variance Optimization (MVO)</option>
                      <option value="min_variance">Minimum Variance</option>
                      <option value="black_litterman">Black-Litterman</option>
                    </select>
                  </div>

                  {/* Analysis Results */}
                  {loadingAnalysis ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-600 border-t-blue-500"></div>
                      <p className="text-slate-400 mt-4">Loading analysis...</p>
                    </div>
                  ) : analysisData ? (
                    <div className="space-y-6">
                      {/* Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                          <div className="text-sm text-slate-400 mb-1">Total Return</div>
                          <div className="text-2xl font-bold text-green-400">
                            {formatPercent(analysisData.metrics?.total_return)}
                          </div>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                          <div className="text-sm text-slate-400 mb-1">Ann. Return</div>
                          <div className="text-2xl font-bold">
                            {formatPercent(analysisData.metrics?.annualized_return)}
                          </div>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                          <div className="text-sm text-slate-400 mb-1">Volatility</div>
                          <div className="text-2xl font-bold">
                            {formatPercent(analysisData.metrics?.volatility)}
                          </div>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                          <div className="text-sm text-slate-400 mb-1">Sharpe Ratio</div>
                          <div className="text-2xl font-bold">
                            {analysisData.metrics?.sharpe_ratio?.toFixed(2) || 'N/A'}
                          </div>
                        </div>
                      </div>

                      {/* Weights */}
                      {analysisData.weights && (
                        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                          <h3 className="text-xl font-bold mb-4">Portfolio Weights</h3>
                          <div className="space-y-3">
                            {Object.entries(analysisData.weights).map(([ticker, weight]: [string, any]) => (
                              <div key={ticker}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span>{ticker}</span>
                                  <span>{(weight * 100).toFixed(2)}%</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                  <div
                                    className="h-2 rounded-full bg-blue-500"
                                    style={{ width: `${weight * 100}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Equity Curve */}
                      {analysisData.equity_curve && analysisData.equity_curve.length > 0 && (
                        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                          <h3 className="text-xl font-bold mb-4">Equity Curve</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={analysisData.equity_curve}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                              <XAxis dataKey="date" stroke="#94a3b8" />
                              <YAxis stroke="#94a3b8" />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                                labelStyle={{ color: '#94a3b8' }}
                              />
                              <Legend />
                              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
                      <p className="text-slate-400">Select an optimization method to view analysis</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'risk' && (
            <div className="space-y-6">
              {portfolio.stocks.length === 0 ? (
                <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
                  <p className="text-slate-400">Add stocks to view risk analysis</p>
                </div>
              ) : (
                <>
                  {/* Monte Carlo Simulation */}
                  <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold">Monte Carlo Simulation</h3>
                      <button
                        onClick={loadMonteCarlo}
                        disabled={loadingMonteCarlo}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded font-semibold transition-colors"
                      >
                        {loadingMonteCarlo ? 'Running...' : 'Run Simulation'}
                      </button>
                    </div>

                    {monteCarloData && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-sm text-slate-400">Simulations</div>
                            <div className="text-lg font-semibold">{monteCarloData.num_simulations || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-sm text-slate-400">Time Horizon</div>
                            <div className="text-lg font-semibold">{monteCarloData.time_horizon_days || 'N/A'} days</div>
                          </div>
                          <div>
                            <div className="text-sm text-slate-400">Initial Value</div>
                            <div className="text-lg font-semibold">{formatCurrency(monteCarloData.initial_value)}</div>
                          </div>
                          <div>
                            <div className="text-sm text-slate-400">Paths Generated</div>
                            <div className="text-lg font-semibold">{monteCarloData.paths?.length || 0}</div>
                          </div>
                        </div>
                        <p className="text-sm text-slate-400">
                          Monte Carlo simulation completed with {monteCarloData.num_simulations} paths over {monteCarloData.time_horizon_days} days.
                          View detailed path data in the API response.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* VaR Analysis */}
                  <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold">Value at Risk (VaR)</h3>
                      <button
                        onClick={loadVaR}
                        disabled={loadingVaR}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded font-semibold transition-colors"
                      >
                        {loadingVaR ? 'Calculating...' : 'Calculate VaR'}
                      </button>
                    </div>

                    {varData && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm text-slate-400">VaR (95%)</div>
                          <div className="text-lg font-semibold text-red-400">
                            {formatPercent(varData.var_percent)} ({formatCurrency(varData.var_value)})
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-400">CVaR (95%)</div>
                          <div className="text-lg font-semibold text-red-400">
                            {formatPercent(varData.cvar_percent)} ({formatCurrency(varData.cvar_value)})
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-400">Historical VaR</div>
                          <div className="text-lg font-semibold">{formatCurrency(varData.historical_var)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-400">Parametric VaR</div>
                          <div className="text-lg font-semibold">{formatCurrency(varData.parametric_var)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <button
                  onClick={runAIAnalysis}
                  disabled={loadingAI}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded font-semibold transition-colors"
                >
                  {loadingAI ? 'Analyzing...' : 'Run AI Portfolio Optimization'}
                </button>
              </div>

              {aiResult && (
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <h3 className="text-xl font-bold mb-4">AI Recommendations</h3>
                  <div className="text-2xl font-bold mb-2">{aiResult.signal}</div>
                  <p className="text-slate-300">{aiResult.reasoning}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Stock Modal */}
      {showAddStockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Add Stock</h2>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Ticker Symbol *</label>
              <input
                type="text"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                placeholder="e.g., AAPL"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <p className="text-sm text-slate-400 mt-2">
                Stock will be added with equal weight by default
              </p>
            </div>

            {error && (
              <div className="mb-4 bg-red-900/50 border border-red-700 rounded p-3">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddStockModal(false);
                  setNewTicker('');
                  setError(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition-colors"
                disabled={adding}
              >
                Cancel
              </button>
              <button
                onClick={handleAddStock}
                disabled={adding || !newTicker.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded font-semibold transition-colors"
              >
                {adding ? 'Adding...' : 'Add Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
