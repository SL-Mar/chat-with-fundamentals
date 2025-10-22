import { useState, useEffect } from 'react';
import Head from 'next/head';
import { api } from '../lib/api';

export default function MonitoringPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await api.fetchMonitoringDashboard();
      setDashboard(data);
      setLastUpdated(new Date().toLocaleTimeString());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const triggerCacheWarming = async () => {
    try {
      const result = await api.triggerCacheWarming();
      alert(result.message);
      await fetchDashboard(); // Refresh dashboard
    } catch (err: any) {
      alert('Failed to trigger cache warming: ' + err.message);
    }
  };

  useEffect(() => {
    fetchDashboard();

    // Auto-refresh every 30 seconds if enabled
    const interval = autoRefresh ? setInterval(fetchDashboard, 30000) : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'running': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      case 'stopped': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    const color = status === 'healthy' || status === 'running' ? 'bg-green-100 text-green-800'
      : status === 'degraded' ? 'bg-yellow-100 text-yellow-800'
      : status === 'unhealthy' ? 'bg-red-100 text-red-800'
      : 'bg-gray-100 text-gray-800';

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${color}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <>
      <Head>
        <title>System Monitoring - Chat with Fundamentals</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System Monitoring Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Real-time metrics and health status
                {lastUpdated && <span className="ml-2 text-sm">(Last updated: {lastUpdated})</span>}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchDashboard}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded ${autoRefresh ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                Auto-Refresh: {autoRefresh ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="max-w-7xl mx-auto mb-6">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {dashboard && (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Quick Stats</h2>
                {getStatusBadge(dashboard.overall_status)}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Companies"
                  value={dashboard.quick_stats?.companies || 0}
                  icon="🏢"
                />
                <StatCard
                  label="OHLCV Records"
                  value={(dashboard.quick_stats?.ohlcv_records || 0).toLocaleString()}
                  icon="📈"
                />
                <StatCard
                  label="Database Size"
                  value={dashboard.quick_stats?.database_size || 'N/A'}
                  icon="💾"
                />
                <StatCard
                  label="API Calls (24h)"
                  value={dashboard.quick_stats?.api_calls_24h || 0}
                  icon="📡"
                />
              </div>
            </div>

            {/* Health Checks */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Health Checks</h2>
              <div className="space-y-3">
                {dashboard.health?.checks && Object.entries(dashboard.health.checks).map(([key, check]: [string, any]) => (
                  <div key={key} className="flex justify-between items-center border-b pb-2">
                    <span className="font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(check.status)}
                      <span className="text-sm text-gray-600">{check.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Database Metrics */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Database Metrics</h2>
                <div className="space-y-3">
                  <MetricRow
                    label="Total Companies"
                    value={dashboard.database?.table_counts?.companies || 0}
                  />
                  <MetricRow
                    label="OHLCV Records"
                    value={(dashboard.database?.table_counts?.ohlcv_records || 0).toLocaleString()}
                  />
                  <MetricRow
                    label="News Articles"
                    value={dashboard.database?.table_counts?.news || 0}
                  />
                  <MetricRow
                    label="Dividends"
                    value={dashboard.database?.table_counts?.dividends || 0}
                  />
                  <MetricRow
                    label="Insider Transactions"
                    value={dashboard.database?.table_counts?.insider_transactions || 0}
                  />
                  <MetricRow
                    label="Database Size"
                    value={dashboard.database?.database_size || 'N/A'}
                  />
                </div>
              </div>

              {/* Cache Metrics */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Cache Metrics</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Redis Status</span>
                    {getStatusBadge(dashboard.cache?.redis?.status || 'unknown')}
                  </div>
                  {dashboard.cache?.redis?.status === 'available' && (
                    <>
                      <MetricRow
                        label="Memory Used"
                        value={dashboard.cache?.redis?.memory_used || 'N/A'}
                      />
                      <MetricRow
                        label="Keys Count"
                        value={dashboard.cache?.redis?.keys_count || 0}
                      />
                      <MetricRow
                        label="Connected Clients"
                        value={dashboard.cache?.redis?.connected_clients || 0}
                      />
                    </>
                  )}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Cache Warming</span>
                      {getStatusBadge(dashboard.cache?.cache_warming?.status || 'unknown')}
                    </div>
                    <MetricRow
                      label="Scheduled Jobs"
                      value={dashboard.cache?.cache_warming?.scheduled_jobs || 0}
                    />
                    <button
                      onClick={triggerCacheWarming}
                      className="mt-2 w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                      🔥 Trigger Cache Warming
                    </button>
                  </div>
                </div>
              </div>

              {/* System Resources */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">System Resources</h2>
                <div className="space-y-3">
                  <ProgressMetric
                    label="CPU Usage"
                    value={dashboard.system?.cpu?.percent || 0}
                    max={100}
                    unit="%"
                  />
                  <ProgressMetric
                    label="Memory Usage"
                    value={dashboard.system?.memory?.percent || 0}
                    max={100}
                    unit="%"
                    detail={`${dashboard.system?.memory?.used_gb || 0} GB / ${dashboard.system?.memory?.total_gb || 0} GB`}
                  />
                  <ProgressMetric
                    label="Disk Usage"
                    value={dashboard.system?.disk?.percent || 0}
                    max={100}
                    unit="%"
                    detail={`${dashboard.system?.disk?.used_gb || 0} GB / ${dashboard.system?.disk?.total_gb || 0} GB`}
                  />
                  <MetricRow
                    label="Process Memory"
                    value={`${dashboard.system?.process?.memory_mb || 0} MB`}
                  />
                  <MetricRow
                    label="Process Threads"
                    value={dashboard.system?.process?.threads || 0}
                  />
                </div>
              </div>

              {/* Connection Pool */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Connection Pool</h2>
                <div className="space-y-3">
                  <MetricRow
                    label="Pool Size"
                    value={dashboard.database?.connection_pool?.size || 0}
                  />
                  <MetricRow
                    label="In Use"
                    value={dashboard.database?.connection_pool?.checked_out || 0}
                  />
                  <MetricRow
                    label="Available"
                    value={dashboard.database?.connection_pool?.checked_in || 0}
                  />
                  <MetricRow
                    label="Overflow"
                    value={`${dashboard.database?.connection_pool?.overflow || 0} / ${dashboard.database?.connection_pool?.capacity || 0}`}
                  />
                  <ProgressMetric
                    label="Utilization"
                    value={dashboard.database?.connection_pool?.checked_out || 0}
                    max={dashboard.database?.connection_pool?.capacity || 60}
                    unit=" connections"
                  />
                </div>
              </div>
            </div>

            {/* API Usage */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">API Usage (Last 24h)</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Total Ingestions"
                  value={dashboard.api_usage?.last_24h?.total_ingestions || 0}
                  icon="📊"
                />
                <StatCard
                  label="Successful"
                  value={dashboard.api_usage?.last_24h?.successful || 0}
                  icon="✅"
                  color="text-green-600"
                />
                <StatCard
                  label="Failed"
                  value={dashboard.api_usage?.last_24h?.failed || 0}
                  icon="❌"
                  color="text-red-600"
                />
                <StatCard
                  label="Estimated Cost"
                  value={`$${(dashboard.api_usage?.last_24h?.estimated_cost_usd || 0).toFixed(2)}`}
                  icon="💰"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Helper Components

function StatCard({ label, value, icon, color = 'text-gray-900' }: any) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
      </div>
      <p className="text-sm text-gray-600 mt-2">{label}</p>
    </div>
  );
}

function MetricRow({ label, value }: any) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function ProgressMetric({ label, value, max, unit, detail }: any) {
  const percent = Math.min((value / max) * 100, 100);
  const color = percent > 80 ? 'bg-red-500' : percent > 60 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold">{value}{unit}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${percent}%` }}></div>
      </div>
      {detail && <p className="text-xs text-gray-500 mt-1">{detail}</p>}
    </div>
  );
}
