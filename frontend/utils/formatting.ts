// utils/formatting.ts
/**
 * Shared formatting utilities for the multi-asset platform
 */

export const formatCurrency = (value: number | undefined, decimals: number = 2): string => {
  if (value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatNumber = (num: number | undefined, suffix: string = ''): string => {
  if (num === undefined) return 'N/A';
  if (num >= 1_000_000_000_000) return `$${(num / 1_000_000_000_000).toFixed(2)}T${suffix}`;
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B${suffix}`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M${suffix}`;
  return `${num.toFixed(2)}${suffix}`;
};

export const getSignalColor = (signal: string): string => {
  switch (signal) {
    case 'STRONG_BUY': return 'bg-green-600 text-white';
    case 'BUY': return 'bg-green-500 text-white';
    case 'HOLD': return 'bg-yellow-500 text-gray-900';
    case 'SELL': return 'bg-red-500 text-white';
    case 'STRONG_SELL': return 'bg-red-600 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

export const getSignalIcon = (signal: string): string => {
  switch (signal) {
    case 'STRONG_BUY': return '↑↑';
    case 'BUY': return '↑';
    case 'HOLD': return '→';
    case 'SELL': return '↓';
    case 'STRONG_SELL': return '↓↓';
    default: return '•';
  }
};

export const getScoreColor = (score: number): string => {
  if (score >= 8) return 'text-green-400';
  if (score >= 6.5) return 'text-green-300';
  if (score >= 3.5) return 'text-yellow-400';
  if (score >= 2) return 'text-red-300';
  return 'text-red-400';
};

export const getPriceChangeColor = (change: number): string => {
  if (change > 0) return 'text-green-400';
  if (change < 0) return 'text-red-400';
  return 'text-slate-400';
};

export const formatTimestamp = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return timestamp;
  }
};
