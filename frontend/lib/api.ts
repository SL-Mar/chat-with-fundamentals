import { CreateUniverseRequest, Universe, UniverseProgress } from '../types/universe';
import { ChatRequest, ChatResponse } from '../types/chat';
import { OHLCVData } from '../types/chart';
import { FactorDefinition } from '../types/factor';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Health
export async function getHealth() {
  return fetchJSON<{ status: string; checks: Record<string, string> }>('/api/health');
}

// Universes
export async function createUniverse(data: CreateUniverseRequest) {
  return fetchJSON<{ id: string; status: string }>('/api/universes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listUniverses() {
  return fetchJSON<Universe[]>('/api/universes');
}

export async function getUniverse(id: string) {
  return fetchJSON<Universe>(`/api/universes/${id}`);
}

export async function deleteUniverse(id: string) {
  return fetchJSON<{ status: string }>(`/api/universes/${id}`, { method: 'DELETE' });
}

export async function refreshUniverse(id: string) {
  return fetchJSON<{ status: string }>(`/api/universes/${id}/refresh`, { method: 'POST' });
}

export async function getUniverseProgress(id: string) {
  return fetchJSON<UniverseProgress>(`/api/universes/${id}/progress`);
}

export async function getOHLCV(
  universeId: string,
  ticker?: string,
  granularity?: string,
  from?: string,
  to?: string,
  limit?: number
) {
  const params = new URLSearchParams();
  if (ticker) params.set('ticker', ticker);
  if (granularity) params.set('granularity', granularity);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (limit) params.set('limit', String(limit));
  return fetchJSON<OHLCVData[]>(`/api/universes/${universeId}/data/ohlcv?${params}`);
}

export async function getFundamentals(
  universeId: string,
  ticker?: string,
  fields?: string,
  page?: number,
  pageSize?: number
) {
  const params = new URLSearchParams();
  if (ticker) params.set('ticker', ticker);
  if (fields) params.set('fields', fields);
  if (page) params.set('page', String(page));
  if (pageSize) params.set('page_size', String(pageSize));
  return fetchJSON<{ total: number; page: number; page_size: number; data: any[] }>(
    `/api/universes/${universeId}/data/fundamentals?${params}`
  );
}

export async function getUniverseTickers(universeId: string) {
  return fetchJSON<{ ticker: string; company_name?: string }[]>(
    `/api/universes/${universeId}/data/tickers`
  );
}

// Chat
export async function sendChatMessage(universeId: string, data: ChatRequest) {
  return fetchJSON<ChatResponse>(`/api/universes/${universeId}/chat`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Settings
export async function getSettings() {
  return fetchJSON<any>('/api/settings');
}

export async function updateLLMSettings(data: { provider?: string; model?: string }) {
  return fetchJSON<{ status: string }>('/api/settings/llm', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateDefaults(data: { default_granularities?: string[] }) {
  return fetchJSON<{ status: string }>('/api/settings/defaults', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getSectors() {
  return fetchJSON<string[]>('/api/sectors');
}

export async function getFactorCatalog() {
  return fetchJSON<FactorDefinition[]>('/api/factors/catalog');
}
