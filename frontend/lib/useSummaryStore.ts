// useSummaryStore.ts
import { create } from 'zustand'

interface SummaryState {
  selectedFilename: string | null
  summary: { filename: string; summary: string } | null
  pdfFile: File | null              // <-- Add this
  setSelectedFilename: (filename: string) => void
  setSummary: (summary: { filename: string; summary: string }) => void
  setPdfFile: (file: File | null) => void // <-- Add a setter
}

export const useSummaryStore = create<SummaryState>((set) => ({
  selectedFilename: null,
  summary: null,
  pdfFile: null, // initialize to null
  setSelectedFilename: (filename) => set({ selectedFilename: filename }),
  setSummary: (summary) => set({ summary }),
  setPdfFile: (file) => set({ pdfFile: file }),
}))
