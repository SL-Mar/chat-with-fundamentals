import { create } from 'zustand';
import * as api from '../lib/api';

interface SettingsStore {
  settings: any;
  loading: boolean;
  fetchSettings: () => Promise<void>;
  updateLLM: (provider: string, model: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: null,
  loading: false,

  fetchSettings: async () => {
    set({ loading: true });
    try {
      const data = await api.getSettings();
      set({ settings: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  updateLLM: async (provider: string, model: string) => {
    await api.updateLLMSettings({ provider, model });
    const data = await api.getSettings();
    set({ settings: data });
  },
}));
