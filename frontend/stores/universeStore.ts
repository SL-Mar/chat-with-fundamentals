import { create } from 'zustand';
import { Universe } from '../types/universe';
import * as api from '../lib/api';

interface UniverseStore {
  universes: Universe[];
  loading: boolean;
  error: string | null;
  fetchUniverses: () => Promise<void>;
  deleteUniverse: (id: string) => Promise<void>;
}

export const useUniverseStore = create<UniverseStore>((set) => ({
  universes: [],
  loading: false,
  error: null,

  fetchUniverses: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.listUniverses();
      set({ universes: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  deleteUniverse: async (id: string) => {
    await api.deleteUniverse(id);
    set((state) => ({
      universes: state.universes.filter((u) => u.id !== id),
    }));
  },
}));
