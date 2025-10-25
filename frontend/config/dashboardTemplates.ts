/**
 * Pre-built Dashboard Templates
 *
 * Collection of professional dashboard layouts for common analysis scenarios.
 * Users can load these templates and customize with their own tickers.
 */

import { DashboardTemplate, Dashboard } from '../types/dashboard';

/**
 * Template 1: Technical Analysis Dashboard
 *
 * Focus: Price action, technical indicators, volume analysis
 * Best for: Day traders, swing traders, technical analysts
 */
export const TECHNICAL_ANALYSIS_TEMPLATE: DashboardTemplate = {
  id: 'technical-analysis-v1',
  name: 'Technical Analysis',
  description: 'Comprehensive technical analysis with charts, indicators, and volume metrics',
  category: 'technical-analysis',
  tags: ['trading', 'technical', 'charts', 'indicators'],
  defaultTicker: 'AAPL.US',
  dashboard: {
    gridConfig: {
      cols: 12,
      rowHeight: 100,
      compactType: 'vertical',
      isDraggable: true,
      isResizable: true,
      margin: [16, 16],
      containerPadding: [16, 16],
    },
    panels: [
      // Main candlestick chart (full width, top)
      {
        id: 'main-chart',
        type: 'candlestick-chart',
        layout: { x: 0, y: 0, w: 12, h: 4, minH: 3, minW: 6 },
        config: {
          ticker: 'AAPL.US',
          period: '1Y',
        },
        title: 'Price Chart',
      },
      // Technical indicators (left column)
      {
        id: 'tech-indicators',
        type: 'technical-indicators',
        layout: { x: 0, y: 4, w: 6, h: 3, minH: 2, minW: 4 },
        config: {
          ticker: 'AAPL.US',
          indicators: ['RSI', 'MACD', 'Bollinger Bands'],
        },
        title: 'Technical Indicators',
      },
      // Volume analysis (right column)
      {
        id: 'vol-forecast',
        type: 'vol-forecast',
        layout: { x: 6, y: 4, w: 6, h: 3, minH: 2, minW: 4 },
        config: {
          ticker: 'AAPL.US',
          lookback: 250,
        },
        title: 'Volatility Forecast',
      },
      // Performance ratios (bottom left)
      {
        id: 'perf-ratios',
        type: 'performance-ratios',
        layout: { x: 0, y: 7, w: 6, h: 2, minH: 2, minW: 4 },
        config: {
          ticker: 'AAPL.US',
          years: 3,
        },
        title: 'Risk-Adjusted Performance',
      },
      // Returns analytics (bottom right)
      {
        id: 'returns-analytics',
        type: 'returns-analytics',
        layout: { x: 6, y: 7, w: 6, h: 2, minH: 2, minW: 4 },
        config: {
          ticker: 'AAPL.US',
          years: 3,
          benchmark: 'SPY.US',
        },
        title: 'Returns Analysis',
      },
    ],
    isTemplate: true,
    createdBy: null,
  },
};

/**
 * Template 2: Fundamental Analysis Dashboard
 *
 * Focus: Financial metrics, earnings, corporate actions
 * Best for: Value investors, long-term investors, fundamental analysts
 */
export const FUNDAMENTAL_ANALYSIS_TEMPLATE: DashboardTemplate = {
  id: 'fundamental-analysis-v1',
  name: 'Fundamental Analysis',
  description: 'Deep dive into company fundamentals, financials, and corporate actions',
  category: 'fundamental-analysis',
  tags: ['fundamentals', 'value investing', 'earnings', 'dividends'],
  defaultTicker: 'MSFT.US',
  dashboard: {
    gridConfig: {
      cols: 12,
      rowHeight: 100,
      compactType: 'vertical',
      isDraggable: true,
      isResizable: true,
      margin: [16, 16],
      containerPadding: [16, 16],
    },
    panels: [
      // Company header (full width)
      {
        id: 'company-header',
        type: 'company-header',
        layout: { x: 0, y: 0, w: 12, h: 1, static: true },
        config: {
          ticker: 'MSFT.US',
        },
      },
      // Key metrics (left side)
      {
        id: 'key-metrics',
        type: 'metrics',
        layout: { x: 0, y: 1, w: 6, h: 3, minH: 2, minW: 4 },
        config: {
          ticker: 'MSFT.US',
        },
        title: 'Key Metrics',
      },
      // Long-term price chart (right side)
      {
        id: 'longterm-chart',
        type: 'candlestick-chart',
        layout: { x: 6, y: 1, w: 6, h: 3, minH: 3, minW: 4 },
        config: {
          ticker: 'MSFT.US',
          period: '5Y',
        },
        title: 'Long-term Performance',
      },
      // Dividend history (bottom left)
      {
        id: 'dividend-history',
        type: 'dividend-history',
        layout: { x: 0, y: 4, w: 6, h: 3, minH: 2, minW: 4 },
        config: {
          ticker: 'MSFT.US',
          limit: 20,
        },
        title: 'Dividend History',
      },
      // Insider transactions (bottom middle)
      {
        id: 'insider-transactions',
        type: 'insider-transactions',
        layout: { x: 6, y: 4, w: 6, h: 3, minH: 2, minW: 4 },
        config: {
          ticker: 'MSFT.US',
          limit: 15,
        },
        title: 'Insider Transactions',
      },
      // Analyst ratings (bottom)
      {
        id: 'analyst-ratings',
        type: 'analyst-ratings',
        layout: { x: 0, y: 7, w: 12, h: 2, minH: 2, minW: 6 },
        config: {
          ticker: 'MSFT.US',
        },
        title: 'Analyst Ratings & Price Targets',
      },
    ],
    isTemplate: true,
    createdBy: null,
  },
};

/**
 * Template 3: News & Sentiment Dashboard
 *
 * Focus: Market sentiment, news flow, analyst opinions
 * Best for: Event-driven traders, news traders, sentiment analysts
 */
export const NEWS_SENTIMENT_TEMPLATE: DashboardTemplate = {
  id: 'news-sentiment-v1',
  name: 'News & Sentiment',
  description: 'Real-time news, sentiment analysis, and market mood tracking',
  category: 'news-sentiment',
  tags: ['news', 'sentiment', 'analysts', 'events'],
  defaultTicker: 'TSLA.US',
  dashboard: {
    gridConfig: {
      cols: 12,
      rowHeight: 100,
      compactType: 'vertical',
      isDraggable: true,
      isResizable: true,
      margin: [16, 16],
      containerPadding: [16, 16],
    },
    panels: [
      // Company header
      {
        id: 'company-header',
        type: 'company-header',
        layout: { x: 0, y: 0, w: 12, h: 1, static: true },
        config: {
          ticker: 'TSLA.US',
        },
      },
      // Price chart (smaller, for context)
      {
        id: 'context-chart',
        type: 'candlestick-chart',
        layout: { x: 0, y: 1, w: 8, h: 3, minH: 2, minW: 6 },
        config: {
          ticker: 'TSLA.US',
          period: '3M',
        },
        title: 'Recent Price Action',
      },
      // Sentiment summary (right side)
      {
        id: 'sentiment',
        type: 'sentiment-analysis',
        layout: { x: 8, y: 1, w: 4, h: 3, minH: 2, minW: 3 },
        config: {
          ticker: 'TSLA.US',
        },
        title: 'Sentiment Analysis',
      },
      // News list (left, larger)
      {
        id: 'news-list',
        type: 'news-list',
        layout: { x: 0, y: 4, w: 8, h: 4, minH: 3, minW: 6 },
        config: {
          ticker: 'TSLA.US',
          limit: 20,
        },
        title: 'Latest News',
      },
      // Analyst ratings (right)
      {
        id: 'analyst-ratings',
        type: 'analyst-ratings',
        layout: { x: 8, y: 4, w: 4, h: 4, minH: 3, minW: 3 },
        config: {
          ticker: 'TSLA.US',
        },
        title: 'Analyst Ratings',
      },
    ],
    isTemplate: true,
    createdBy: null,
  },
};

/**
 * Template 4: Multi-Stock Comparison Dashboard
 *
 * Focus: Relative performance, sector analysis, peer comparison
 * Best for: Sector analysts, portfolio managers, relative value traders
 */
export const MULTI_STOCK_COMPARISON_TEMPLATE: DashboardTemplate = {
  id: 'multi-stock-comparison-v1',
  name: 'Multi-Stock Comparison',
  description: 'Compare multiple stocks side-by-side for relative analysis',
  category: 'multi-stock',
  tags: ['comparison', 'relative', 'peers', 'sector'],
  defaultTicker: 'AAPL.US',
  dashboard: {
    gridConfig: {
      cols: 12,
      rowHeight: 100,
      compactType: 'vertical',
      isDraggable: true,
      isResizable: true,
      margin: [16, 16],
      containerPadding: [16, 16],
    },
    panels: [
      // Cumulative returns comparison (top, full width)
      {
        id: 'cumulative-returns',
        type: 'cumulative-return-chart',
        layout: { x: 0, y: 0, w: 12, h: 4, minH: 3, minW: 8 },
        config: {
          tickers: ['AAPL.US', 'MSFT.US', 'GOOGL.US', 'AMZN.US'],
          period: '1Y',
          benchmark: 'SPY.US',
        },
        title: 'Cumulative Returns Comparison',
      },
      // Performance ratios - Stock 1
      {
        id: 'perf-ratios-1',
        type: 'performance-ratios',
        layout: { x: 0, y: 4, w: 3, h: 2, minH: 2, minW: 3 },
        config: {
          ticker: 'AAPL.US',
          years: 3,
        },
        title: 'AAPL Performance',
      },
      // Performance ratios - Stock 2
      {
        id: 'perf-ratios-2',
        type: 'performance-ratios',
        layout: { x: 3, y: 4, w: 3, h: 2, minH: 2, minW: 3 },
        config: {
          ticker: 'MSFT.US',
          years: 3,
        },
        title: 'MSFT Performance',
      },
      // Performance ratios - Stock 3
      {
        id: 'perf-ratios-3',
        type: 'performance-ratios',
        layout: { x: 6, y: 4, w: 3, h: 2, minH: 2, minW: 3 },
        config: {
          ticker: 'GOOGL.US',
          years: 3,
        },
        title: 'GOOGL Performance',
      },
      // Performance ratios - Stock 4
      {
        id: 'perf-ratios-4',
        type: 'performance-ratios',
        layout: { x: 9, y: 4, w: 3, h: 2, minH: 2, minW: 3 },
        config: {
          ticker: 'AMZN.US',
          years: 3,
        },
        title: 'AMZN Performance',
      },
      // Comparison chart (bottom)
      {
        id: 'comparison-chart',
        type: 'comparison-chart',
        layout: { x: 0, y: 6, w: 12, h: 3, minH: 2, minW: 8 },
        config: {
          tickers: ['AAPL.US', 'MSFT.US', 'GOOGL.US', 'AMZN.US'],
          period: '1Y',
        },
        title: 'Price Comparison',
      },
    ],
    isTemplate: true,
    createdBy: null,
  },
};

/**
 * Template 5: Market Overview Dashboard
 *
 * Focus: Broad market view, indices, sectors, economic indicators
 * Best for: Macro traders, portfolio managers, market strategists
 */
export const MARKET_OVERVIEW_TEMPLATE: DashboardTemplate = {
  id: 'market-overview-v1',
  name: 'Market Overview',
  description: 'Comprehensive market snapshot with indices, sectors, and macro indicators',
  category: 'market-overview',
  tags: ['market', 'indices', 'macro', 'overview'],
  dashboard: {
    gridConfig: {
      cols: 12,
      rowHeight: 100,
      compactType: 'vertical',
      isDraggable: true,
      isResizable: true,
      margin: [16, 16],
      containerPadding: [16, 16],
    },
    panels: [
      // Major indices comparison (top)
      {
        id: 'indices-chart',
        type: 'comparison-chart',
        layout: { x: 0, y: 0, w: 12, h: 3, minH: 2, minW: 8 },
        config: {
          tickers: ['^GSPC', '^DJI', '^IXIC', '^RUT'],
          period: '1Y',
        },
        title: 'Major Indices (S&P 500, Dow, Nasdaq, Russell 2000)',
      },
      // Macro indicators (left)
      {
        id: 'macro-indicators',
        type: 'macro-indicators',
        layout: { x: 0, y: 3, w: 6, h: 3, minH: 2, minW: 4 },
        config: {
          indicators: ['10Y_YIELD', 'VIX', 'DXY', 'OIL'],
        },
        title: 'Macro Indicators',
      },
      // Interest rates (right)
      {
        id: 'interest-rates',
        type: 'interest-rates',
        layout: { x: 6, y: 3, w: 6, h: 3, minH: 2, minW: 4 },
        config: {},
        title: 'Interest Rates & Yields',
      },
      // Economic calendar (bottom left)
      {
        id: 'economic-calendar',
        type: 'economic-calendar',
        layout: { x: 0, y: 6, w: 6, h: 3, minH: 2, minW: 4 },
        config: {
          limit: 10,
        },
        title: 'Economic Calendar',
      },
      // Earnings calendar (bottom right)
      {
        id: 'earnings-calendar',
        type: 'earnings-calendar',
        layout: { x: 6, y: 6, w: 6, h: 3, minH: 2, minW: 4 },
        config: {
          limit: 15,
        },
        title: 'Upcoming Earnings',
      },
    ],
    isTemplate: true,
    createdBy: null,
  },
};

/**
 * All available dashboard templates
 */
export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  TECHNICAL_ANALYSIS_TEMPLATE,
  FUNDAMENTAL_ANALYSIS_TEMPLATE,
  NEWS_SENTIMENT_TEMPLATE,
  MULTI_STOCK_COMPARISON_TEMPLATE,
  MARKET_OVERVIEW_TEMPLATE,
];

/**
 * Get template by ID
 */
export function getTemplateById(templateId: string): DashboardTemplate | undefined {
  return DASHBOARD_TEMPLATES.find((t) => t.id === templateId);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): DashboardTemplate[] {
  return DASHBOARD_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Create dashboard from template with custom ticker
 */
export function createDashboardFromTemplate(
  template: DashboardTemplate,
  ticker?: string,
  customName?: string
): Dashboard {
  const targetTicker = ticker || template.defaultTicker || 'AAPL.US';

  return {
    id: `dashboard-${Date.now()}`,
    name: customName || `${template.name} - ${targetTicker}`,
    description: template.description,
    category: template.category,
    ...template.dashboard,
    panels: template.dashboard.panels.map((panel) => ({
      ...panel,
      config: {
        ...panel.config,
        ticker: panel.config.ticker ? targetTicker : undefined,
        tickers: panel.config.tickers
          ? panel.config.tickers.map(() => targetTicker)
          : undefined,
      },
    })),
    isTemplate: false,
    createdBy: 'user', // TODO: Replace with actual user ID
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
