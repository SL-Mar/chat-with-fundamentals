export interface OHLCVData {
  ticker: string;
  granularity: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjusted_close?: number;
}

export interface ChartData {
  datetime?: string;
  timestamp?: string;
  date?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
