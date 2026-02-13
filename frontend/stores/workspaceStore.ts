import { create } from 'zustand';

type Tab = 'overview' | 'charts' | 'chat' | 'factors' | 'fundamentals';

interface WorkspaceStore {
  activeTab: Tab;
  selectedTicker: string | null;
  setActiveTab: (tab: Tab) => void;
  setSelectedTicker: (ticker: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  activeTab: 'overview',
  selectedTicker: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedTicker: (ticker) => set({ selectedTicker: ticker }),
}));
