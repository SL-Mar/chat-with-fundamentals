import { useEffect, useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import * as api from '../lib/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Settings() {
  const { settings, loading, fetchSettings, updateLLM } = useSettingsStore();
  const [health, setHealth] = useState<any>(null);
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
    api.getHealth().then(setHealth).catch(() => {});
  }, []);

  useEffect(() => {
    if (settings) {
      setProvider(settings.llm?.provider || 'ollama');
      setModel(settings.llm?.model || 'mistral:7b');
    }
  }, [settings]);

  const handleSaveLLM = async () => {
    setSaving(true);
    await updateLLM(provider, model);
    setSaving(false);
  };

  if (loading && !settings) return <LoadingSpinner size="lg" />;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* System Health */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h2 className="text-sm font-medium text-gray-400 mb-3">System Health</h2>
        {health ? (
          <div className="space-y-2">
            {Object.entries(health.checks || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-gray-300 capitalize">{key}</span>
                <span className={String(value).includes('healthy') ? 'text-green-400' : 'text-yellow-400'}>
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Loading health status...</p>
        )}
      </div>

      {/* LLM Configuration */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h2 className="text-sm font-medium text-gray-400 mb-3">LLM Configuration</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="ollama">Ollama (Local)</option>
              <option value="anthropic">Anthropic (Cloud)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
            />
            <p className="text-xs text-gray-600 mt-1">
              Ollama: mistral:7b, llama3.1:8b | Anthropic: claude-sonnet-4-20250514
            </p>
          </div>
          <button
            onClick={handleSaveLLM}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:opacity-50 transition-colors text-sm"
          >
            {saving ? 'Saving...' : 'Save LLM Settings'}
          </button>
        </div>
      </div>

      {/* API Keys Status */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h2 className="text-sm font-medium text-gray-400 mb-3">API Keys</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-300">EODHD</span>
            <span className={settings?.eodhd_key_set ? 'text-green-400' : 'text-red-400'}>
              {settings?.eodhd_key_set ? 'Configured' : 'Not set'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Anthropic</span>
            <span className={settings?.llm?.anthropic_key_set ? 'text-green-400' : 'text-yellow-400'}>
              {settings?.llm?.anthropic_key_set ? 'Configured' : 'Not set (optional)'}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-3">
          API keys are configured via .env file
        </p>
      </div>
    </div>
  );
}
