// components/RefreshPipelineControl.tsx - Data refresh pipeline controls
'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

interface PipelineStatus {
  is_running: boolean;
  last_run?: string;
  next_run?: string;
  status?: string;
}

export default function RefreshPipelineControl() {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);  // Fix race condition

  useEffect(() => {
    fetchStatus();
    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => {
      clearInterval(interval);
      // Clean up timeout on unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await api.fetchRefreshPipelineStatus();
      setStatus(data);
    } catch (err: any) {
      console.error('Failed to fetch pipeline status:', err);
      setMessage({ type: 'error', text: 'Failed to fetch pipeline status' });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, apiCall: () => Promise<any>) => {
    try {
      setActionLoading(action);
      setMessage(null);
      const result = await apiCall();
      setMessage({ type: 'success', text: result.message || `${action} completed successfully` });

      // Clear existing timeout to prevent race condition
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout to refresh status
      timeoutRef.current = setTimeout(fetchStatus, 1000);
    } catch (err: any) {
      console.error(`Failed to ${action}:`, err);
      setMessage({ type: 'error', text: err.message || `Failed to ${action}` });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Data Refresh Pipeline
        </h2>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh Status'}
        </button>
      </div>

      {/* Status Display */}
      {status && status.is_running !== undefined && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
              <p className={`text-lg font-semibold ${status.is_running ? 'text-green-600' : 'text-gray-600'}`}>
                {status.is_running ? '🟢 Running' : '🔴 Stopped'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Last Run</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDateTime(status.last_run)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Next Run</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDateTime(status.next_run)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div className={`mb-4 p-3 rounded ${
          message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
          message.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Pipeline Controls */}
      <div className="space-y-4">
        <div className="border-b dark:border-gray-700 pb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            Pipeline Control
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleAction('Start Pipeline', api.startRefreshPipeline)}
              disabled={actionLoading !== null || status?.is_running}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === 'Start Pipeline' ? 'Starting...' : '▶️ Start'}
            </button>
            <button
              onClick={() => handleAction('Stop Pipeline', api.stopRefreshPipeline)}
              disabled={actionLoading !== null || !status?.is_running}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === 'Stop Pipeline' ? 'Stopping...' : '⏹️ Stop'}
            </button>
          </div>
        </div>

        {/* Scheduled Refresh Triggers */}
        <div className="border-b dark:border-gray-700 pb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            Scheduled Refresh
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleAction('Trigger Daily Refresh', api.triggerDailyRefresh)}
              disabled={actionLoading !== null}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading === 'Trigger Daily Refresh' ? 'Running...' : '📅 Daily Refresh'}
            </button>
            <button
              onClick={() => handleAction('Trigger Weekly Refresh', api.triggerWeeklyRefresh)}
              disabled={actionLoading !== null}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {actionLoading === 'Trigger Weekly Refresh' ? 'Running...' : '📆 Weekly Refresh'}
            </button>
          </div>
        </div>

        {/* Individual Data Type Refresh */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            Refresh by Data Type
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={() => handleAction('Refresh OHLCV', api.triggerOHLCVRefresh)}
              disabled={actionLoading !== null}
              className="px-3 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {actionLoading === 'Refresh OHLCV' ? '⏳' : '📈 OHLCV'}
            </button>
            <button
              onClick={() => handleAction('Refresh Fundamentals', api.triggerFundamentalsRefresh)}
              disabled={actionLoading !== null}
              className="px-3 py-2 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"
            >
              {actionLoading === 'Refresh Fundamentals' ? '⏳' : '📊 Fundamentals'}
            </button>
            <button
              onClick={() => handleAction('Refresh News', api.triggerNewsRefresh)}
              disabled={actionLoading !== null}
              className="px-3 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
            >
              {actionLoading === 'Refresh News' ? '⏳' : '📰 News'}
            </button>
            <button
              onClick={() => handleAction('Refresh Dividends', api.triggerDividendsRefresh)}
              disabled={actionLoading !== null}
              className="px-3 py-2 text-sm bg-pink-600 text-white rounded hover:bg-pink-700 disabled:opacity-50"
            >
              {actionLoading === 'Refresh Dividends' ? '⏳' : '💰 Dividends'}
            </button>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>ℹ️ Info:</strong> The data refresh pipeline automatically updates market data from EODHD API.
          Daily refresh runs overnight, weekly refresh on Sundays. Use manual triggers for immediate updates.
        </p>
      </div>
    </div>
  );
}
