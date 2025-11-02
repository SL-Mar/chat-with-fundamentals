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

type TabType = 'holdings' | 'analysis';

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
  const [activeTab, setActiveTab] = useState<TabType>('holdings');
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add stock modal
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [newTicker, setNewTicker] = useState('');
  const [newShares, setNewShares] = useState<number>(0);
  const [adding, setAdding] = useState(false);

  // Shares editing (replaces weight editing)
  const [editingShares, setEditingShares] = useState<Record<string, number>>({});
  const [savingShares, setSavingShares] = useState(false);
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  const [selectedOptimizationMethod, setSelectedOptimizationMethod] = useState<string>('');
  const [portfolioValue, setPortfolioValue] = useState<number>(10000); // Default $10k portfolio

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
      const [actual, equalWeight, mvo, minVariance, blackLitterman] = await Promise.all([
        api.fetchActualPortfolioAnalysis(portfolio.id).catch(() => null), // May fail if no shares defined
        api.fetchEqualWeightAnalysis(portfolio.id),
        api.fetchOptimizedPortfolio(portfolio.id, 'mvo'),
        api.fetchOptimizedPortfolio(portfolio.id, 'min_variance'),
        api.fetchOptimizedPortfolio(portfolio.id, 'black_litterman'),
      ]);

      const analysisData: any = {
        'Equal Weight': equalWeight,
        'MVO': mvo,
        'Min Variance': minVariance,
        'Black-Litterman': blackLitterman,
      };

      // Only include actual if it loaded successfully
      if (actual) {
        analysisData['Actual Portfolio'] = actual;
      }

      setAllAnalysisData(analysisData);
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

  // Generate rebalancing recommendation based on actual vs optimized performance
  const generateRebalancingRecommendation = (): string => {
    if (!allAnalysisData || Object.keys(allAnalysisData).length === 0) {
      return "Run portfolio analysis to see rebalancing recommendations.";
    }

    // Use actual portfolio if available, otherwise fall back to equal weight
    const actual = allAnalysisData['Actual Portfolio'];
    const equalWeight = allAnalysisData['Equal Weight'];
    const mvo = allAnalysisData['MVO'];
    const minVar = allAnalysisData['Min Variance'];

    const current = actual || equalWeight;
    const portfolioType = actual ? "actual holdings" : "equal-weight portfolio";

    if (!current || !mvo || !minVar) {
      return "Insufficient data to generate rebalancing recommendations.";
    }

    // Compare metrics
    const currentReturn = current.metrics.annualized_return;
    const currentRisk = current.metrics.volatility;
    const currentSharpe = current.metrics.sharpe_ratio;

    const mvoReturn = mvo.metrics.annualized_return;
    const mvoRisk = mvo.metrics.volatility;
    const mvoSharpe = mvo.metrics.sharpe_ratio;

    const minVarRisk = minVar.metrics.volatility;
    const minVarReturn = minVar.metrics.annualized_return;

    // Determine best strategy
    let recommendation = "";

    if (mvoSharpe > currentSharpe * 1.1) {
      // MVO significantly better risk-adjusted returns
      const improvementPct = ((mvoSharpe - currentSharpe) / currentSharpe * 100).toFixed(1);
      recommendation = `**Rebalancing Recommended:** Your ${portfolioType} shows an annualized return of ${currentReturn.toFixed(2)}% with ${currentRisk.toFixed(2)}% volatility (Sharpe: ${currentSharpe.toFixed(2)}). The Mean-Variance Optimization suggests rebalancing could improve your risk-adjusted returns by ${improvementPct}%, achieving ${mvoReturn.toFixed(2)}% return with ${mvoRisk.toFixed(2)}% volatility (Sharpe: ${mvoSharpe.toFixed(2)}). `;
    } else if (minVarRisk < currentRisk * 0.9 && minVarReturn >= currentReturn * 0.95) {
      // Min Variance reduces risk without sacrificing too much return
      const riskReduction = ((currentRisk - minVarRisk) / currentRisk * 100).toFixed(1);
      recommendation = `**Risk Reduction Opportunity:** Your ${portfolioType} has ${currentRisk.toFixed(2)}% volatility. The Minimum Variance strategy could reduce your risk by ${riskReduction}% (down to ${minVarRisk.toFixed(2)}%) while maintaining similar returns (${minVarReturn.toFixed(2)}% vs current ${currentReturn.toFixed(2)}%). `;
    } else {
      // Current allocation is reasonable
      recommendation = `**Current Allocation Acceptable:** Your ${portfolioType} (${currentReturn.toFixed(2)}% return, ${currentRisk.toFixed(2)}% volatility, Sharpe: ${currentSharpe.toFixed(2)}) is performing reasonably well. Optimization methods show only marginal improvements, suggesting your current allocation is well-balanced. `;
    }

    // Add general advice
    recommendation += `Consider your investment goals, risk tolerance, and transaction costs before rebalancing.`;

    return recommendation;
  };

  const handleAddStock = async () => {
    if (!newTicker.trim() || !portfolio) {
      setError('Ticker is required');
      return;
    }

    if (newShares <= 0) {
      setError('Number of shares must be greater than 0');
      return;
    }

    try {
      setAdding(true);
      setError(null);
      await api.addStockToPortfolio(portfolio.id, newTicker.trim(), undefined, newShares);
      setShowAddStockModal(false);
      setNewTicker('');
      setNewShares(0);
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

  const handleSharesChange = (ticker: string, value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1) {
      setEditingShares(prev => ({
        ...prev,
        [ticker]: numValue
      }));
    } else if (value === '') {
      // Allow clearing the field
      setEditingShares(prev => ({
        ...prev,
        [ticker]: 0
      }));
    }
  };

  const handleSaveShares = async () => {
    if (!portfolio) return;

    try {
      setSavingShares(true);
      setError(null);
      await api.updatePortfolioShares(portfolio.id, editingShares);
      await loadPortfolio();
      setEditingShares({});
    } catch (err: any) {
      console.error('Failed to update shares:', err);
      setError(err.message || 'Failed to update shares');
    } finally {
      setSavingShares(false);
    }
  };

  const handleResetToEqual = () => {
    if (!portfolio) return;
    // For equal weight, calculate shares that would give equal dollar amounts
    // Assuming a $10k portfolio divided equally
    const equalValue = portfolioValue / portfolio.stocks.length;
    const shares: Record<string, number> = {};
    portfolio.stocks.forEach(stock => {
      // We'd need current prices to calculate shares accurately
      // For now, just set to 0 - user will need to enter manually
      shares[stock.ticker] = stock.shares || 0;
    });
    setEditingShares(shares);
  };

  const handleApplyOptimizedWeights = async (method: string) => {
    // Show modal to get portfolio value
    setSelectedOptimizationMethod(method);
    setShowOptimizationModal(true);
  };

  const confirmApplyOptimization = async () => {
    if (!portfolio || !selectedOptimizationMethod) return;

    const optimizedWeights = allAnalysisData[selectedOptimizationMethod].weights;
    if (!optimizedWeights) {
      setError('No optimized weights available for this method');
      return;
    }

    try {
      setSavingShares(true);
      setError(null);
      setShowOptimizationModal(false);

      // Convert optimized weights to shares based on portfolio value
      const response = await api.convertWeightsToShares(
        portfolio.id,
        optimizedWeights,
        portfolioValue
      );

      // Update portfolio with calculated shares
      await api.updatePortfolioShares(portfolio.id, response.shares);
      await loadPortfolio();
      setEditingShares({});
    } catch (err: any) {
      console.error('Failed to apply optimized weights:', err);
      setError(err.message || 'Failed to apply optimized weights');
    } finally {
      setSavingShares(false);
    }
  };

  const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatPercent = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    // Backend already returns percentages (e.g., 4.36 for 4.36%), no need to multiply by 100
    return `${value.toFixed(2)}%`;
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
    const percentile5th = monteCarloData.percentile_5th || [];
    const percentile95th = monteCarloData.percentile_95th || [];

    // Create data points for each day
    const chartData = [];
    for (let day = 0; day < numDays; day++) {
      const dataPoint: any = { day };

      // Add percentile bounds (will be displayed in red)
      if (percentile5th[day] !== undefined) {
        dataPoint['percentile_5th'] = percentile5th[day];
      }
      if (percentile95th[day] !== undefined) {
        dataPoint['percentile_95th'] = percentile95th[day];
      }

      // Backend returns paths as objects with {dates: [], values: []}
      paths.forEach((path: any, pathIdx: number) => {
        if (path.values && path.values[day] !== undefined) {
          dataPoint[`path${pathIdx}`] = path.values[day];
        }
      });

      chartData.push(dataPoint);
    }

    return chartData;
  };

  const tabs = [
    { id: 'holdings' as TabType, label: 'Holdings', icon: faListUl },
    { id: 'analysis' as TabType, label: 'Analysis & Risk', icon: faChartPie },
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
          {activeTab === 'holdings' && (
            <div className="space-y-4">
              {/* Shares editing controls */}
              {portfolio.stocks.length > 0 && Object.keys(editingShares).length > 0 && (
                <div className="flex items-center gap-3">
                      <button
                        onClick={handleSaveShares}
                        disabled={savingShares}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded font-semibold transition-colors flex items-center gap-2"
                      >
                        {savingShares ? (
                          <>
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Shares'
                        )}
                      </button>
                  <button
                    onClick={() => setEditingShares({})}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

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
                        <th className="px-6 py-4 text-right font-bold">Shares</th>
                        <th className="px-6 py-4 text-right font-bold">Weight (%)</th>
                        <th className="px-6 py-4 text-right font-bold">Added</th>
                        <th className="px-6 py-4 text-right font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.stocks.map((stock) => {
                        const currentShares = editingShares[stock.ticker] !== undefined
                          ? editingShares[stock.ticker]
                          : (stock.shares || 0);

                        const displayWeight = stock.weight
                          ? (stock.weight * 100).toFixed(2)
                          : (100 / portfolio.stocks.length).toFixed(2);

                        return (
                          <tr key={stock.id} className="border-b border-slate-700 hover:bg-slate-750">
                            <td className="px-6 py-4 font-bold">{stock.ticker}</td>
                            <td className="px-6 py-4 text-right">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={currentShares}
                                onChange={(e) => handleSharesChange(stock.ticker, e.target.value)}
                                className="w-32 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-right focus:outline-none focus:border-blue-500"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-6 py-4 text-right text-slate-400">
                              {displayWeight}%
                            </td>
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
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
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
                      {/* AI Rebalancing Recommendation */}
                      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-6">
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                          <FontAwesomeIcon icon={faRobot} className="text-blue-400" />
                          Rebalancing Recommendation
                        </h3>
                        <p className="text-sm leading-relaxed text-slate-200">
                          {generateRebalancingRecommendation()}
                        </p>
                      </div>

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
                              {allAnalysisData['Actual Portfolio'] && (
                                <Line type="monotone" dataKey="Actual Portfolio" stroke="#8b5cf6" strokeWidth={3} dot={false} />
                              )}
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
                              <th className="px-6 py-3 text-right font-bold">Actions</th>
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
                                <td className="px-6 py-4 text-right">
                                  {method !== 'Equal Weight' && data?.weights && (
                                    <button
                                      onClick={() => handleApplyOptimizedWeights(method)}
                                      disabled={savingShares}
                                      className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 rounded text-sm font-semibold transition-colors"
                                    >
                                      Apply as Shares
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Rolling Sharpe Ratios - Current Values */}
                      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-x-auto">
                        <h3 className="text-xl font-bold p-6 pb-4">Rolling Sharpe Ratios (Current)</h3>
                        <p className="px-6 pb-4 text-sm text-slate-400">
                          Risk-adjusted returns over different lookback periods (20, 60 trading days)
                        </p>
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-700">
                              <th className="px-6 py-3 text-left font-bold">Method</th>
                              <th className="px-6 py-3 text-right font-bold">20-Day Rolling Sharpe</th>
                              <th className="px-6 py-3 text-right font-bold">60-Day Rolling Sharpe</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(allAnalysisData).map(([method, data]: [string, any]) => (
                              <tr key={method} className="border-b border-slate-700 hover:bg-slate-750">
                                <td className="px-6 py-4 font-bold">{method}</td>
                                <td className="px-6 py-4 text-right font-semibold">
                                  {data?.metrics?.rolling_sharpe_20d?.toFixed(2) || 'N/A'}
                                </td>
                                <td className="px-6 py-4 text-right font-semibold">
                                  {data?.metrics?.rolling_sharpe_60d?.toFixed(2) || 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Rolling Sharpe Ratio Curves - Actual Portfolio Only */}
                      {allAnalysisData['Actual Portfolio']?.rolling_sharpe_curves && (
                        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                          <h3 className="text-xl font-bold mb-4">Rolling Sharpe Ratio Evolution (Actual Portfolio)</h3>
                          <p className="text-sm text-slate-400 mb-4">
                            Historical evolution of risk-adjusted returns over time
                          </p>
                          {(() => {
                            const curves = allAnalysisData['Actual Portfolio'].rolling_sharpe_curves;

                            // Prepare chart data
                            const chartData: any[] = [];
                            const curve20d = curves.rolling_sharpe_20d || [];
                            const curve60d = curves.rolling_sharpe_60d || [];

                            for (let i = 0; i < curve20d.length; i++) {
                              chartData.push({
                                date: curve20d[i]?.date,
                                '20-Day': curve20d[i]?.value,
                                '60-Day': curve60d[i]?.value,
                              });
                            }

                            return chartData.length > 0 ? (
                              <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={chartData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                  <XAxis dataKey="date" stroke="#94a3b8" />
                                  <YAxis stroke="#94a3b8" label={{ value: 'Sharpe Ratio', angle: -90, position: 'insideLeft' }} />
                                  <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                                    labelStyle={{ color: '#94a3b8' }}
                                  />
                                  <Legend />
                                  <Line type="monotone" dataKey="20-Day" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                  <Line type="monotone" dataKey="60-Day" stroke="#10b981" strokeWidth={2} dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            ) : (
                              <p className="text-slate-400 text-center py-8">No rolling Sharpe data available</p>
                            );
                          })()}
                        </div>
                      )}

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
                            <h4 className="text-lg font-bold mb-3">Simulation Paths (100 paths + 5%/95% percentiles)</h4>
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
                                {/* Show first 100 paths in light gray */}
                                {Array.from({ length: Math.min(100, monteCarloData.paths?.length || 0) }, (_, i) => (
                                  <Line
                                    key={`path${i}`}
                                    type="monotone"
                                    dataKey={`path${i}`}
                                    stroke="rgba(148, 163, 184, 0.15)"
                                    strokeWidth={1}
                                    dot={false}
                                  />
                                ))}
                                {/* 5th percentile (worst case) in red */}
                                <Line
                                  type="monotone"
                                  dataKey="percentile_5th"
                                  stroke="#ef4444"
                                  strokeWidth={2}
                                  dot={false}
                                  name="5th Percentile (Worst Case)"
                                />
                                {/* 95th percentile (best case) in red */}
                                <Line
                                  type="monotone"
                                  dataKey="percentile_95th"
                                  stroke="#ef4444"
                                  strokeWidth={2}
                                  dot={false}
                                  name="95th Percentile (Best Case)"
                                />
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

        </div>
      </div>

      {/* Optimization Portfolio Value Modal */}
      {showOptimizationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Apply {selectedOptimizationMethod} Weights</h2>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Target Portfolio Value ($)</label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={portfolioValue}
                onChange={(e) => setPortfolioValue(parseFloat(e.target.value) || 10000)}
                placeholder="e.g., 10000"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <p className="text-sm text-slate-400 mt-2">
                Enter your total investment amount. The system will calculate how many shares to buy for each stock.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowOptimizationModal(false);
                  setSelectedOptimizationMethod('');
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition-colors"
                disabled={savingShares}
              >
                Cancel
              </button>
              <button
                onClick={confirmApplyOptimization}
                disabled={savingShares || portfolioValue <= 0}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {savingShares ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    Applying...
                  </>
                ) : (
                  'Apply Optimization'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddStockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Add Stock</h2>

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Ticker Symbol *</label>
              <input
                type="text"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                placeholder="e.g., AAPL"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Number of Shares *</label>
              <input
                type="number"
                min="1"
                step="1"
                value={newShares || ''}
                onChange={(e) => setNewShares(parseInt(e.target.value) || 0)}
                placeholder="e.g., 10"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded focus:outline-none focus:border-blue-500"
              />
              <p className="text-sm text-slate-400 mt-2">
                Portfolio weights will be calculated automatically based on current prices
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
                disabled={adding || !newTicker.trim() || newShares <= 0}
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
