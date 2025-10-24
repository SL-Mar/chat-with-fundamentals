'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

// === Interfaces ===

interface LLMSetting {
  flow: string;
  manager: string;
  store: string;
}

// === Model Pricing Map ===

const MODEL_PRICING: Record<string, string> = {
  'gpt-4.1': 'Input $2.00 / Cached $0.50 / Output $8.00',
  'o1': 'Input $15.00 / Cached $7.50 / Output $60.00',
  'gpt-4o': 'Input $2.50 / Cached $1.25 / Output $10.00',
  'gpt-4o-mini': 'Input $0.15 / Cached $0.075 / Output $0.60',
  'gpt-3.5-turbo': 'Input $0.50 / Output $1.50',
};

export default function Settings() {
  const [settings, setSettings] = useState<LLMSetting[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  const fetchLLMSettings = async () => {
    try {
      const data = await api.fetchLLMSettings();
      setSettings(data);
    } catch (err) {
      console.error('Error fetching LLM settings:', err);
      setMessage('❌ Failed to fetch LLM settings');
    }
  };

  const fetchModelList = async () => {
    try {
      const data = await api.fetchLLMModels();
      setModels(data);
    } catch (err) {
      console.error('Error fetching model list:', err);
      setMessage('❌ Failed to fetch model list');
    }
  };

  const updateLLM = async (
    flow: string,
    field: 'manager' | 'store',
    model_name: string
  ) => {
    try {
      const updated = await api.updateLLMSetting(field, model_name);

      setMessage(`✅ Updated ${field} in ${flow} to ${model_name}`);
      setSettings((prev) =>
        prev.map((s) => (s.flow === flow ? updated : s))
      );
    } catch (err: any) {
      console.error('Error updating LLM:', err);
      setMessage(`❌ Failed to update: ${err.message || 'Unknown error'}`);
    }
  };

  useEffect(() => {
    fetchLLMSettings();
    fetchModelList();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-6">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h1 className="text-xl font-bold text-blue-600 mb-6">LLM Settings</h1>

        {settings.map((entry) => (
          <div key={entry.flow} className="mb-6">
            <h2 className="text-md font-semibold mb-2 capitalize">{entry.flow}</h2>

            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400 mr-4">Manager</span>
              <select
                value={entry.manager}
                onChange={(e) => updateLLM(entry.flow, 'manager', e.target.value)}
                className="p-2 rounded bg-gray-100 dark:bg-gray-700"
                title={MODEL_PRICING[entry.manager] || ''}
              >
                {models.map((model) => (
                  <option key={model} value={model} title={MODEL_PRICING[model]}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400 mr-4">Store</span>
              <select
                value={entry.store}
                onChange={(e) => updateLLM(entry.flow, 'store', e.target.value)}
                className="p-2 rounded bg-gray-100 dark:bg-gray-700"
                title={MODEL_PRICING[entry.store] || ''}
              >
                {models.map((model) => (
                  <option key={model} value={model} title={MODEL_PRICING[model]}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}

        {message && (
          <div className="mt-4 p-2 text-sm text-green-500 bg-green-100 rounded">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
