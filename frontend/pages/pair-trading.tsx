// pages/pair-trading.tsx - Pair Trading Analysis Page
import { useState } from 'react';
import Head from 'next/head';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faExchangeAlt, faCalculator, faCheckCircle, faTimesCircle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface CointegrationResult {
  is_cointegrated: boolean;
  p_value: number;
  test_statistic: number;
  hedge_ratio: number;
  half_life: number | null;
  spread_mean: number;
  spread_std: number;
  current_z_score: number;
  signal: string;
}

interface Trade {
  entry_date: string;
  exit_date: string;
  entry_z: number;
  exit_z: number;
  pnl: number;
  duration: number;
  direction: string;
}

interface BacktestResult {
  trades: Trade[];
  total_trades: number;
  win_rate: number;
  avg_profit_per_trade: number;
  avg_trade_duration: number;
  total_return: number;
  sharpe_ratio: number;
}

interface SpreadPoint {
  date: string;
  spread: number;
  z_score: number;
}

interface PricePoint {
  date: string;
  ticker1: number;
  ticker2: number;
}

interface AnalysisResult {
  ticker1: string;
  ticker2: string;
  cointegration: CointegrationResult;
  spread_series: SpreadPoint[];
  price_series: PricePoint[];
  backtest: BacktestResult;
  analyzed_at: string;
}

export default function PairTradingPage() {
  const API_URL = 'http://localhost:8000';

  const [ticker1, setTicker1] = useState('');
  const [ticker2, setTicker2] = useState('');
  const [days, setDays] = useState(365);
  const [entryZ, setEntryZ] = useState(2.0);
  const [exitZ, setExitZ] = useState(0.5);
  const [useAdjusted, setUseAdjusted] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyzePair = async () => {
    if (!ticker1 || !ticker2) {
      setError('Both tickers are required');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/pair-trading/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-key-123'
        },
        body: JSON.stringify({
          ticker1: ticker1.toUpperCase(),
          ticker2: ticker2.toUpperCase(),
          days,
          entry_z: entryZ,
          exit_z: exitZ,
          use_adjusted: useAdjusted
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Analysis failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const spreadChartData = result ? {
    labels: result.spread_series.map(p => new Date(p.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Spread',
        data: result.spread_series.map(p => p.spread),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        yAxisID: 'y'
      },
      {
        label: 'Z-Score',
        data: result.spread_series.map(p => p.z_score),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        yAxisID: 'y1'
      }
    ]
  } : null;

  const priceChartData = result ? {
    labels: result.price_series.map(p => new Date(p.date).toLocaleDateString()),
    datasets: [
      {
        label: result.ticker1,
        data: result.price_series.map(p => p.ticker1),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        yAxisID: 'y'
      },
      {
        label: result.ticker2,
        data: result.price_series.map(p => p.ticker2),
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        yAxisID: 'y1'
      }
    ]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      tooltip: {
        enabled: true
      }
    },
    scales: {
      x: {
        display: true,
        ticks: {
          maxTicksLimit: 10
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <>
      <Head>
        <title>Pair Trading Analysis - Chat with Fundamentals</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <FontAwesomeIcon icon={faExchangeAlt} className="text-blue-600" />
              Pair Trading Analysis
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Statistical arbitrage using cointegration testing and z-score mean reversion
            </p>
          </div>

          {/* Input Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ticker 1
                </label>
                <input
                  type="text"
                  value={ticker1}
                  onChange={(e) => setTicker1(e.target.value)}
                  placeholder="AAPL"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ticker 2
                </label>
                <input
                  type="text"
                  value={ticker2}
                  onChange={(e) => setTicker2(e.target.value)}
                  placeholder="MSFT"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Days
                </label>
                <input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value))}
                  min="30"
                  max="1095"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Entry Z-Score
                </label>
                <input
                  type="number"
                  value={entryZ}
                  onChange={(e) => setEntryZ(parseFloat(e.target.value))}
                  step="0.1"
                  min="0.5"
                  max="5.0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Exit Z-Score
                </label>
                <input
                  type="number"
                  value={exitZ}
                  onChange={(e) => setExitZ(parseFloat(e.target.value))}
                  step="0.1"
                  min="0.1"
                  max="2.0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={analyzePair}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faCalculator} />
                  {loading ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="useAdjusted"
                checked={useAdjusted}
                onChange={(e) => setUseAdjusted(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="useAdjusted" className="text-sm text-gray-700 dark:text-gray-300">
                Use adjusted close prices
              </label>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 rounded-md text-red-700 dark:text-red-200">
                {error}
              </div>
            )}
          </div>

          {/* Results */}
          {result && (
            <>
              {/* Cointegration Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faInfoCircle} className="text-blue-600" />
                  Cointegration Test Results
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="text-2xl mb-1">
                      {result.cointegration.is_cointegrated ? (
                        <FontAwesomeIcon icon={faCheckCircle} className="text-green-600" />
                      ) : (
                        <FontAwesomeIcon icon={faTimesCircle} className="text-red-600" />
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Cointegrated</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      p = {result.cointegration.p_value.toFixed(4)}
                    </div>
                  </div>

                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      {result.cointegration.hedge_ratio.toFixed(4)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Hedge Ratio</div>
                  </div>

                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      {result.cointegration.half_life ? result.cointegration.half_life.toFixed(1) : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Half-Life (days)</div>
                  </div>

                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className={`text-xl font-bold ${
                      result.cointegration.current_z_score < -2 ? 'text-green-600' :
                      result.cointegration.current_z_score > 2 ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {result.cointegration.current_z_score.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Current Z-Score</div>
                    <div className="text-xs font-semibold mt-1">
                      {result.cointegration.signal}
                    </div>
                  </div>
                </div>
              </div>

              {/* Backtest Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Backtest Performance
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      {result.backtest.total_trades}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Trades</div>
                  </div>

                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      {result.backtest.win_rate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Win Rate</div>
                  </div>

                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className={`text-xl font-bold ${result.backtest.avg_profit_per_trade >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {result.backtest.avg_profit_per_trade >= 0 ? '+' : ''}{result.backtest.avg_profit_per_trade.toFixed(2)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Avg P&L/Trade</div>
                  </div>

                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className={`text-xl font-bold ${result.backtest.total_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {result.backtest.total_return >= 0 ? '+' : ''}{result.backtest.total_return.toFixed(2)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Return</div>
                  </div>

                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      {result.backtest.sharpe_ratio.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Sharpe Ratio</div>
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Spread Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Spread & Z-Score
                  </h2>
                  <div style={{ height: '300px' }}>
                    {spreadChartData && <Line data={spreadChartData} options={chartOptions} />}
                  </div>
                </div>

                {/* Price Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Price Series
                  </h2>
                  <div style={{ height: '300px' }}>
                    {priceChartData && <Line data={priceChartData} options={chartOptions} />}
                  </div>
                </div>
              </div>

              {/* Trades Table */}
              {result.backtest.trades.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Trade History
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Entry Date</th>
                          <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Exit Date</th>
                          <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Direction</th>
                          <th className="text-right py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Entry Z</th>
                          <th className="text-right py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Exit Z</th>
                          <th className="text-right py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Duration</th>
                          <th className="text-right py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.backtest.trades.slice(0, 20).map((trade, idx) => (
                          <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="py-2 px-4 text-sm text-gray-900 dark:text-white">
                              {new Date(trade.entry_date).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-4 text-sm text-gray-900 dark:text-white">
                              {new Date(trade.exit_date).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-4 text-sm">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                trade.direction === 'LONG' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {trade.direction}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-sm text-right text-gray-900 dark:text-white">
                              {trade.entry_z.toFixed(2)}
                            </td>
                            <td className="py-2 px-4 text-sm text-right text-gray-900 dark:text-white">
                              {trade.exit_z.toFixed(2)}
                            </td>
                            <td className="py-2 px-4 text-sm text-right text-gray-900 dark:text-white">
                              {trade.duration}d
                            </td>
                            <td className={`py-2 px-4 text-sm text-right font-semibold ${
                              trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {result.backtest.trades.length > 20 && (
                      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
                        Showing first 20 of {result.backtest.trades.length} trades
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
    </>
  );
}
