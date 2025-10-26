// data/mockData.ts
/**
 * Mock data used across the application
 * In production, this would be replaced with real API calls
 */

// Stock peer comparison suggestions
export const SUGGESTED_PEERS: Record<string, string[]> = {
  'AAPL.US': ['MSFT.US', 'GOOGL.US', 'META.US', 'AMZN.US'],
  'MSFT.US': ['AAPL.US', 'GOOGL.US', 'ORCL.US', 'IBM.US'],
  'TSLA.US': ['F.US', 'GM.US', 'NIO.US', 'RIVN.US'],
  'JPM.US': ['BAC.US', 'WFC.US', 'C.US', 'GS.US'],
  'GOOGL.US': ['AAPL.US', 'MSFT.US', 'META.US', 'AMZN.US'],
  'AMZN.US': ['AAPL.US', 'MSFT.US', 'WMT.US', 'GOOGL.US'],
};

// Sample portfolios
export interface Portfolio {
  id: number;
  name: string;
  description: string;
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  assetCount: number;
}

export const SAMPLE_PORTFOLIOS: Portfolio[] = [
  {
    id: 1,
    name: 'Growth Portfolio',
    description: 'High-growth tech and innovation stocks',
    totalValue: 125000,
    dayChange: 1250,
    dayChangePercent: 1.01,
    assetCount: 15
  },
  {
    id: 2,
    name: 'Dividend Income',
    description: 'Stable dividend-paying stocks and REITs',
    totalValue: 85000,
    dayChange: -320,
    dayChangePercent: -0.38,
    assetCount: 22
  },
  {
    id: 3,
    name: 'Balanced Portfolio',
    description: 'Mix of stocks, bonds, and ETFs',
    totalValue: 200000,
    dayChange: 500,
    dayChangePercent: 0.25,
    assetCount: 35
  },
];

// Sample portfolio holdings
export interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  value: number;
  gainLoss: number;
  gainLossPercent: number;
  weight: number;
}

export const SAMPLE_HOLDINGS: Holding[] = [
  {
    symbol: 'AAPL.US',
    name: 'Apple Inc.',
    quantity: 100,
    avgCost: 150,
    currentPrice: 175,
    value: 17500,
    gainLoss: 2500,
    gainLossPercent: 16.67,
    weight: 35
  },
  {
    symbol: 'MSFT.US',
    name: 'Microsoft Corporation',
    quantity: 50,
    avgCost: 300,
    currentPrice: 350,
    value: 17500,
    gainLoss: 2500,
    gainLossPercent: 16.67,
    weight: 35
  },
  {
    symbol: 'GOOGL.US',
    name: 'Alphabet Inc.',
    quantity: 100,
    avgCost: 120,
    currentPrice: 150,
    value: 15000,
    gainLoss: 3000,
    gainLossPercent: 25,
    weight: 30
  },
];

// Popular stocks for the stocks hub page
export const POPULAR_STOCKS = [
  { ticker: 'AAPL.US', name: 'Apple Inc.' },
  { ticker: 'MSFT.US', name: 'Microsoft Corporation' },
  { ticker: 'GOOGL.US', name: 'Alphabet Inc.' },
  { ticker: 'AMZN.US', name: 'Amazon.com Inc.' },
  { ticker: 'NVDA.US', name: 'NVIDIA Corporation' },
  { ticker: 'META.US', name: 'Meta Platforms Inc.' },
  { ticker: 'TSLA.US', name: 'Tesla Inc.' },
  { ticker: 'BRK-B.US', name: 'Berkshire Hathaway Inc.' },
  { ticker: 'JPM.US', name: 'JPMorgan Chase & Co.' },
  { ticker: 'V.US', name: 'Visa Inc.' },
  { ticker: 'WMT.US', name: 'Walmart Inc.' },
  { ticker: 'JNJ.US', name: 'Johnson & Johnson' },
];

// Market indices
export const MARKET_INDICES = [
  { ticker: 'SPY.US', name: 'S&P 500 ETF' },
  { ticker: 'QQQ.US', name: 'Nasdaq 100 ETF' },
  { ticker: 'DIA.US', name: 'Dow Jones ETF' },
  { ticker: 'IWM.US', name: 'Russell 2000 ETF' },
];

// Popular currency pairs
export const POPULAR_CURRENCY_PAIRS = [
  { pair: 'EUR/USD', name: 'Euro / US Dollar', region: 'Major' },
  { pair: 'GBP/USD', name: 'British Pound / US Dollar', region: 'Major' },
  { pair: 'USD/JPY', name: 'US Dollar / Japanese Yen', region: 'Major' },
  { pair: 'USD/CHF', name: 'US Dollar / Swiss Franc', region: 'Major' },
  { pair: 'AUD/USD', name: 'Australian Dollar / US Dollar', region: 'Major' },
  { pair: 'USD/CAD', name: 'US Dollar / Canadian Dollar', region: 'Major' },
  { pair: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', region: 'Major' },
  { pair: 'EUR/GBP', name: 'Euro / British Pound', region: 'Cross' },
  { pair: 'EUR/JPY', name: 'Euro / Japanese Yen', region: 'Cross' },
  { pair: 'GBP/JPY', name: 'British Pound / Japanese Yen', region: 'Cross' },
];

// Crypto pairs
export const CRYPTO_PAIRS = [
  { pair: 'BTC/USD', name: 'Bitcoin / US Dollar', region: 'Crypto' },
  { pair: 'ETH/USD', name: 'Ethereum / US Dollar', region: 'Crypto' },
  { pair: 'BNB/USD', name: 'Binance Coin / US Dollar', region: 'Crypto' },
];

// Popular ETFs
export const POPULAR_ETFS = [
  { symbol: 'SPY.US', name: 'SPDR S&P 500 ETF Trust', category: 'Equity - Broad Market' },
  { symbol: 'QQQ.US', name: 'Invesco QQQ Trust', category: 'Equity - Technology' },
  { symbol: 'IWM.US', name: 'iShares Russell 2000 ETF', category: 'Equity - Small Cap' },
  { symbol: 'DIA.US', name: 'SPDR Dow Jones Industrial Average ETF', category: 'Equity - Large Cap' },
  { symbol: 'VTI.US', name: 'Vanguard Total Stock Market ETF', category: 'Equity - Broad Market' },
  { symbol: 'VOO.US', name: 'Vanguard S&P 500 ETF', category: 'Equity - Large Cap' },
  { symbol: 'AGG.US', name: 'iShares Core U.S. Aggregate Bond ETF', category: 'Fixed Income' },
  { symbol: 'TLT.US', name: 'iShares 20+ Year Treasury Bond ETF', category: 'Fixed Income' },
  { symbol: 'GLD.US', name: 'SPDR Gold Shares', category: 'Commodities' },
  { symbol: 'VNQ.US', name: 'Vanguard Real Estate ETF', category: 'Real Estate' },
  { symbol: 'XLE.US', name: 'Energy Select Sector SPDR Fund', category: 'Sector - Energy' },
  { symbol: 'XLF.US', name: 'Financial Select Sector SPDR Fund', category: 'Sector - Financial' },
];

// Macro indicators
export const MACRO_INDICATORS = [
  { id: 'GDP', name: 'Gross Domestic Product', country: 'USA', category: 'Growth' },
  { id: 'CPI', name: 'Consumer Price Index (Inflation)', country: 'USA', category: 'Inflation' },
  { id: 'UNEMPLOYMENT', name: 'Unemployment Rate', country: 'USA', category: 'Employment' },
  { id: 'INTEREST_RATE', name: 'Federal Funds Rate', country: 'USA', category: 'Monetary Policy' },
  { id: 'RETAIL_SALES', name: 'Retail Sales', country: 'USA', category: 'Consumption' },
  { id: 'PMI', name: 'Purchasing Managers Index', country: 'USA', category: 'Manufacturing' },
  { id: 'HOUSING_STARTS', name: 'Housing Starts', country: 'USA', category: 'Real Estate' },
  { id: 'TRADE_BALANCE', name: 'Trade Balance', country: 'USA', category: 'Trade' },
  { id: 'INDUSTRIAL_PRODUCTION', name: 'Industrial Production', country: 'USA', category: 'Manufacturing' },
  { id: 'CONSUMER_CONFIDENCE', name: 'Consumer Confidence Index', country: 'USA', category: 'Sentiment' },
];
