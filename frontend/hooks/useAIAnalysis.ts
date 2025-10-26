// hooks/useAIAnalysis.ts
/**
 * Shared hook for AI analysis across all asset types
 */

import { useState } from 'react';
import { api } from '../lib/api';

export type AssetType = 'stock' | 'currency' | 'etf' | 'macro' | 'portfolio';

export interface UseAIAnalysisResult {
  result: any | null;
  loading: boolean;
  error: string | null;
  runAnalysis: (assetId: string | number, deepResearch?: boolean) => Promise<void>;
  clearError: () => void;
}

export function useAIAnalysis(assetType: AssetType): UseAIAnalysisResult {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async (assetId: string | number, deepResearch: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      let response;
      switch (assetType) {
        case 'stock':
          response = await api.analyzeStock(assetId as string, deepResearch);
          break;
        case 'currency':
          response = await api.analyzeCurrency(assetId as string, deepResearch);
          break;
        case 'etf':
          response = await api.analyzeETF(assetId as string, deepResearch);
          break;
        case 'macro':
          response = await api.analyzeMacro(assetId as string, deepResearch);
          break;
        case 'portfolio':
          response = await api.analyzePortfolio(assetId as number, deepResearch);
          break;
        default:
          throw new Error(`Unknown asset type: ${assetType}`);
      }

      setResult(response);
    } catch (err: any) {
      console.error(`AI analysis failed for ${assetType}:`, err);
      const userMessage = err.message || `Failed to analyze ${assetType}. Please try again.`;
      setError(userMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return { result, loading, error, runAnalysis, clearError };
}
