// pages/portfolios/[id].tsx - Portfolio Detail Page with Unified Analysis
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine,
  faListUl,
  faChartPie,
  faShieldAlt,
  faRobot,
  faPlus,
  faTrash,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';

type TabType = 'overview' | 'holdings' | 'analysis' | 'risk' | 'ai';

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

  // Unified analysis data (all methods)
  const [allAnalysisData, setAllAnalysisData] = useState<any>({});
  const [loadingAllAnalysis, setLoadingAllAnalysis] = useState(false);

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
      loadAllAnalyses();
    }
  }, [portfolio, activeTab]);

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

  const loadAllAnalyses = async () => {
    if (!portfolio || portfolio.stocks.length === 0) return;

    try {
      setLoadingAllAnalysis(true);
      setError(null);

      // Fetch all optimization methods in parallel
      const [equalWeight, mvo, minVariance, blackLitterman] = await Promise.all([
        api.fetchEqualWeightAnalysis(portfolio.id),
        api.fetchOptimizedPortfolio(portfolio.id, 'mvo'),
        api.fetchOptimizedPortfolio(portfolio.id, 'min_variance'),
        api.fetchOptimizedPortfolio(portfolio.id, 'black_litterman'),
      ]);

      setAllAnalysisData({
        'Equal Weight': equalWeight,
        'MVO': mvo,
        'Min Variance': minVariance,
        'Black-Litterman': blackLitterman,
      });
    } catch (err: any) {
      console.error('Failed to load analyses:', err);
      setError(err.message || 'Failed to load analyses');
    } finally {
      setLoadingAllAnalysis(false);
    }
  };

  const loadMonteCarlo = async () => {
    if (!portfolio) return;

    try {
      setLoadingMonteCarlo(true);
      setError(null);
      const data = await api.fetchMonteCarloSimulation(portfolio.id, 1000, 252, 10000);
      setMonteCarloData(data);
    } catch (err: any) {
      console.error('Failed to load Monte Carlo:', err);
      setError(err.message || 'Failed to run simulation');
    } finally {
      setLoadingMonteCarlo(false);
    }
  };

  const loadVaR = async () => {
    if (!portfolio) return;

    try {
      setLoadingVaR(true);
      setError(null);
      const data = await api.fetchVaRAnalysis(portfolio.id);
      setVarData(data);
    } catch (err: any) {
      console.error('Failed to load VaR:', err);
      setError(err.message || 'Failed to calculate VaR');
    } finally {
      setLoadingVaR(false);
    }
  };

  const runAIAnalysis = async () => {
    if (!portfolio) return;

    try {
      setLoadingAI(true);
      setError(null);
      const result = await api.analyzePortfolio(portfolio.id);
      setAiResult(result);
    } catch (err: any) {
      console.error('Failed to run AI analysis:', err);
      setError(err.message || 'Failed to run AI analysis');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleAddStock = async () => {
    if (!newTicker.trim() || !portfolio) {
      setError('Ticker is required');
      return;
    }

    try {
      setAdding(true);
      setError(null);
      await api.addStockToPortfolio(portfolio.id, newTicker.trim());
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

    try {
      setError(null);
      await api.removeStockFromPortfolio(portfolio.id, stockId);
      await loadPortfolio();
    } catch (err: any) {
      console.error('Failed to remove stock:', err);
      setError(err.message || 'Failed to remove stock');
    }
  };

  const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatPercent = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
  };

  // Prepare unified chart data
  const prepareUnifiedChartData = () => {
    if (!allAnalysisData || Object.keys(allAnalysisData).length === 0) return [];

    const methods = Object.keys(allAnalysisData);
    const firstMethod = methods[0];
    const firstData = allAnalysisData[firstMethod];

    if (!firstData?.equity_curve) return [];

    // Create unified dataset
    return firstData.equity_curve.map((point: any, idx: number) => {
      const dataPoint: any = { date: point.date };

      methods.forEach(method => {
        const curve = allAnalysisData[method]?.equity_curve;
        if (curve && curve[idx]) {
          dataPoint[method] = curve[idx].value;
        }
      });

      return dataPoint;
    });
  };

  // Prepare Monte Carlo chart data
  const prepareMCChartData = () => {
    if (!monteCarloData?.paths || monteCarloData.paths.length === 0) return [];

    const numDays = monteCarloData.time_horizon_days || 252;
    const paths = monteCarloData.paths.slice(0, 100); // Show first 100 paths for visibility

    // Create data points for each day
    const chartData = [];
    for (let day = 0; day <= numDays; day++) {
      const dataPoint: any = { day };

      paths.forEach((path: number[], pathIdx: number) => {
        if (path[day] !== undefined) {
          dataPoint[`path${pathIdx}`] = path[day];
        }
      });

      chartData.push(dataPoint);
    }

    return chartData;
  };

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: faChartLine },
    { id: 'holdings' as TabType, label: 'Holdings', icon: faListUl },
    { id: 'analysis' as TabType, label: 'Analysis', icon: faChartPie },
    { id: 'risk' as TabType, label: 'Risk', icon: faShieldAlt },
    { id: 'ai' as TabType, label: 'AI Insights', icon: faRobot },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} className="text-4xl animate-spin mb-4" />
          <p className="text-slate-400">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-4xl text-yellow-400 mb-4" />
          <p className="text-slate-400">Portfolio not found</p>
        </div>
      </div>
    );
  }

  const unifiedChartData = prepareUnifiedChartData();
  const mcChartData = prepareMCChartData();

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/portfolios')}
            className="text-slate-400 hover:text-white mb-4"
          >
            ← Back to Portfolios
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{portfolio.name}</h1>
              {portfolio.description && (
                <p className="text-slate-400">{portfolio.description}</p>
              )}
            </div>
            <button
              onClick={() => setShowAddStockModal(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faPlus} />
              Add Stock
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-700 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-400" />
              <p className="text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-slate-700 mb-6">
          <div className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <FontAwesomeIcon icon={tab.icon} />
                {tab.label}
              </button>
            ))}
          </div>
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
                  <div className="text-2xl font-bold text-green-400 flex items-center gap-2">
                    <FontAwesomeIcon icon={faCheckCircle} />
                    Active
                  </div>
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
                            <FontAwesomeIcon icon={faTrash} /> Remove
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
                  {loadingAllAnalysis ? (
                    <div className="text-center py-12">
                      <FontAwesomeIcon icon={faSpinner} className="text-4xl animate-spin mb-4" />
                      <p className="text-slate-400">Loading all optimization methods...</p>
                    </div>
                  ) : (
                    <>
                      {/* Unified Comparison Chart */}
                      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                        <h3 className="text-xl font-bold mb-4">Unified Portfolio Comparison</h3>
                        <p className="text-sm text-slate-400 mb-4">
                          All optimization methods compared on the same chart
                        </p>
                        {unifiedChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={unifiedChartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                              <XAxis dataKey="date" stroke="#94a3b8" />
                              <YAxis stroke="#94a3b8" />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                                labelStyle={{ color: '#94a3b8' }}
                              />
                              <Legend />
                              <Line type="monotone" dataKey="Equal Weight" stroke="#3b82f6" strokeWidth={2} dot={false} />
                              <Line type="monotone" dataKey="MVO" stroke="#10b981" strokeWidth={2} dot={false} />
                              <Line type="monotone" dataKey="Min Variance" stroke="#f59e0b" strokeWidth={2} dot={false} />
                              <Line type="monotone" dataKey="Black-Litterman" stroke="#ec4899" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-slate-400 text-center py-8">No chart data available</p>
                        )}
                      </div>

                      {/* Metrics Comparison Table */}
                      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-x-auto">
                        <h3 className="text-xl font-bold p-6 pb-4">Performance Metrics Comparison</h3>
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-700">
                              <th className="px-6 py-3 text-left font-bold">Method</th>
                              <th className="px-6 py-3 text-right font-bold">Total Return</th>
                              <th className="px-6 py-3 text-right font-bold">Ann. Return</th>
                              <th className="px-6 py-3 text-right font-bold">Volatility</th>
                              <th className="px-6 py-3 text-right font-bold">Sharpe Ratio</th>
                              <th className="px-6 py-3 text-right font-bold">Max Drawdown</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(allAnalysisData).map(([method, data]: [string, any]) => (
                              <tr key={method} className="border-b border-slate-700 hover:bg-slate-750">
                                <td className="px-6 py-4 font-bold">{method}</td>
                                <td className={`px-6 py-4 text-right font-semibold ${
                                  (data?.metrics?.total_return || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {formatPercent(data?.metrics?.total_return)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {formatPercent(data?.metrics?.annualized_return)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {formatPercent(data?.metrics?.volatility)}
                                </td>
                                <td className="px-6 py-4 text-right font-semibold">
                                  {data?.metrics?.sharpe_ratio?.toFixed(2) || 'N/A'}
                                </td>
                                <td className="px-6 py-4 text-right text-red-400">
                                  {formatPercent(data?.metrics?.max_drawdown)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Optimal Weights (MVO) */}
                      {allAnalysisData['MVO']?.optimal_weights && (
                        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                          <h3 className="text-xl font-bold mb-4">MVO Optimal Weights</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(allAnalysisData['MVO'].optimal_weights).map(([ticker, weight]: [string, any]) => (
                              <div key={ticker} className="bg-slate-700 rounded p-3">
                                <div className="text-sm text-slate-400">{ticker}</div>
                                <div className="text-lg font-bold">{formatPercent(weight)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
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
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded font-semibold transition-colors flex items-center gap-2"
                      >
                        {loadingMonteCarlo ? (
                          <>
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                            Running...
                          </>
                        ) : (
                          'Run Simulation'
                        )}
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

                        {/* Monte Carlo Chart */}
                        {mcChartData.length > 0 && (
                          <div className="mt-6">
                            <h4 className="text-lg font-bold mb-3">Simulation Paths (First 100)</h4>
                            <ResponsiveContainer width="100%" height={400}>
                              <LineChart data={mcChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="day" stroke="#94a3b8" label={{ value: 'Days', position: 'insideBottom', offset: -5 }} />
                                <YAxis stroke="#94a3b8" label={{ value: 'Portfolio Value ($)', angle: -90, position: 'insideLeft' }} />
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                                  labelStyle={{ color: '#94a3b8' }}
                                  formatter={(value: any) => formatCurrency(value)}
                                />
                                {/* Show first 100 paths */}
                                {Array.from({ length: Math.min(100, monteCarloData.paths?.length || 0) }, (_, i) => (
                                  <Line
                                    key={`path${i}`}
                                    type="monotone"
                                    dataKey={`path${i}`}
                                    stroke={`rgba(59, 130, 246, ${0.1 + (i / 100) * 0.4})`}
                                    strokeWidth={1}
                                    dot={false}
                                  />
                                ))}
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
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
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded font-semibold transition-colors flex items-center gap-2"
                      >
                        {loadingVaR ? (
                          <>
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                            Calculating...
                          </>
                        ) : (
                          'Calculate VaR'
                        )}
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
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {loadingAI ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faRobot} />
                      Run AI Portfolio Optimization
                    </>
                  )}
                </button>
              </div>

              {aiResult && (
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <FontAwesomeIcon icon={faRobot} />
                    AI Recommendations
                  </h3>
                  <div className="text-2xl font-bold mb-2">{aiResult.signal}</div>
                  <p className="text-slate-300 whitespace-pre-line">{aiResult.reasoning}</p>
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
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {adding ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faPlus} />
                    Add Stock
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
