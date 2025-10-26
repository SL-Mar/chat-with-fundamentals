// constants/marketSense.ts
/**
 * MarketSense AI configuration constants
 */

export const AGENT_WEIGHTS = {
  FUNDAMENTALS: 0.30,
  NEWS: 0.25,
  PRICE_DYNAMICS: 0.25,
  MACRO: 0.20,
} as const;

export const SIGNAL_THRESHOLDS = {
  STRONG_BUY: 8.0,
  BUY: 6.5,
  HOLD_UPPER: 3.5,
  SELL: 2.0,
} as const;

export const REFRESH_INTERVALS = [
  { value: 1, label: '1s' },
  { value: 5, label: '5s' },
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
] as const;

export const MAX_CONSOLE_LOGS = 200;

export const WEBSOCKET_HEARTBEAT_INTERVAL = 30000; // 30 seconds
