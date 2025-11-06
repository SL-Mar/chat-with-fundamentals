/**
 * Ticker Formatting Utilities
 *
 * Provides consistent ticker formatting across the application.
 * Ensures compliance with EODHD API standards.
 */

/**
 * Asset type classification
 */
export type AssetType = 'stock' | 'etf' | 'forex' | 'crypto' | 'unknown';

/**
 * Parsed ticker information
 */
export interface ParsedTicker {
  symbol: string;           // Base symbol (e.g., 'AAPL', 'EURUSD')
  exchange: string | null;  // Exchange code (e.g., 'US', 'FOREX')
  fullTicker: string;       // Complete ticker with exchange (e.g., 'AAPL.US')
  displayTicker: string;    // Ticker for UI display
  assetType: AssetType;     // Classified asset type
}

/**
 * Format ticker for EODHD API calls
 * Ensures ticker has proper exchange suffix
 *
 * @param ticker - Raw ticker input
 * @param defaultExchange - Default exchange if none specified (default: 'US')
 * @returns Formatted ticker with exchange suffix (e.g., 'AAPL.US', 'EURUSD.FOREX')
 */
export function formatTickerForAPI(ticker: string, defaultExchange: string = 'US'): string {
  if (!ticker) return '';

  const normalized = ticker.toUpperCase().trim();

  // Already has exchange suffix
  if (normalized.includes('.')) {
    return normalized;
  }

  // Auto-detect forex pairs (6 characters, common pattern)
  // Examples: EURUSD, GBPJPY, USDJPY
  if (normalized.length === 6 && /^[A-Z]{6}$/.test(normalized)) {
    const commonCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'CNY', 'HKD', 'SGD', 'SEK', 'NOK', 'DKK'];
    const first = normalized.substring(0, 3);
    const second = normalized.substring(3, 6);

    if (commonCurrencies.includes(first) && commonCurrencies.includes(second)) {
      return `${normalized}.FOREX`;
    }
  }

  // Default to provided exchange
  return `${normalized}.${defaultExchange}`;
}

/**
 * Get display ticker for UI
 * Strategy: ALWAYS show exchange suffix for clarity and consistency
 *
 * @param ticker - Ticker with or without exchange
 * @returns Formatted ticker for display (always with exchange suffix)
 */
export function getDisplayTicker(ticker: string): string {
  if (!ticker) return '';

  // Ensure ticker has exchange suffix
  const fullTicker = formatTickerForAPI(ticker);

  // Return with exchange suffix for consistency
  return fullTicker;
}

/**
 * Get bare ticker symbol without exchange suffix
 * Use this ONLY when interacting with third-party services that don't support exchange suffixes
 * (e.g., TradingView)
 *
 * @param ticker - Ticker with or without exchange
 * @returns Bare symbol without exchange (e.g., 'AAPL' from 'AAPL.US')
 */
export function getBareTicker(ticker: string): string {
  if (!ticker) return '';

  const normalized = ticker.toUpperCase().trim();

  if (normalized.includes('.')) {
    return normalized.split('.')[0];
  }

  return normalized;
}

/**
 * Parse ticker into components
 *
 * @param ticker - Ticker to parse
 * @returns Parsed ticker information
 */
export function parseTicker(ticker: string): ParsedTicker {
  if (!ticker) {
    return {
      symbol: '',
      exchange: null,
      fullTicker: '',
      displayTicker: '',
      assetType: 'unknown'
    };
  }

  const normalized = ticker.toUpperCase().trim();
  let symbol: string;
  let exchange: string | null;

  if (normalized.includes('.')) {
    [symbol, exchange] = normalized.split('.');
  } else {
    symbol = normalized;
    exchange = null;
  }

  const fullTicker = formatTickerForAPI(ticker);
  const assetType = classifyAssetType(fullTicker);

  return {
    symbol,
    exchange,
    fullTicker,
    displayTicker: fullTicker,  // Always show with exchange
    assetType
  };
}

/**
 * Classify asset type from ticker
 *
 * @param ticker - Full ticker with exchange
 * @returns Asset type classification
 */
export function classifyAssetType(ticker: string): AssetType {
  if (!ticker) return 'unknown';

  const normalized = ticker.toUpperCase();

  // Forex detection
  if (normalized.includes('.FOREX') || normalized.includes('.FX')) {
    return 'forex';
  }

  // Crypto detection
  if (normalized.includes('.CC') || normalized.includes('BTC') || normalized.includes('ETH')) {
    return 'crypto';
  }

  // Check if symbol is 6-char forex pair
  const symbol = normalized.split('.')[0];
  if (symbol.length === 6 && /^[A-Z]{6}$/.test(symbol)) {
    const commonCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'CNY', 'HKD', 'SGD', 'SEK', 'NOK', 'DKK'];
    const first = symbol.substring(0, 3);
    const second = symbol.substring(3, 6);

    if (commonCurrencies.includes(first) && commonCurrencies.includes(second)) {
      return 'forex';
    }
  }

  // ETF detection (common ETF tickers)
  const etfTickers = ['SPY', 'QQQ', 'VOO', 'VTI', 'IWM', 'DIA', 'EEM', 'GLD', 'SLV', 'TLT', 'IEF', 'LQD', 'HYG'];
  if (etfTickers.includes(symbol)) {
    return 'etf';
  }

  // Default to stock
  return 'stock';
}

/**
 * Get asset type badge color for UI
 *
 * @param assetType - Asset type
 * @returns Tailwind CSS color classes
 */
export function getAssetTypeBadgeColor(assetType: AssetType): string {
  switch (assetType) {
    case 'stock':
      return 'bg-blue-500 text-white';
    case 'etf':
      return 'bg-purple-500 text-white';
    case 'forex':
      return 'bg-yellow-500 text-gray-900';
    case 'crypto':
      return 'bg-orange-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

/**
 * Validate ticker format
 *
 * @param ticker - Ticker to validate
 * @returns True if valid ticker format
 */
export function isValidTicker(ticker: string): boolean {
  if (!ticker) return false;

  // Pattern: 1-10 alphanumeric characters, optional .EXCHANGE suffix
  const pattern = /^[A-Z0-9]{1,10}(\.[A-Z]{2,10})?$/i;
  return pattern.test(ticker.trim());
}

/**
 * Sanitize ticker input by removing dangerous characters
 *
 * @param ticker - Raw ticker input
 * @returns Sanitized ticker (alphanumeric + dot only)
 */
export function sanitizeTicker(ticker: string): string {
  if (!ticker) return '';
  return ticker.toUpperCase().replace(/[^A-Z0-9.]/g, '');
}
