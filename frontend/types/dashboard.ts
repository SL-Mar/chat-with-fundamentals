/**
 * Dashboard Configuration Types
 *
 * Defines the structure for configurable dashboards with grid layouts.
 * Used by react-grid-layout for drag-and-drop functionality.
 */

export interface DashboardPanel {
  /** Unique identifier for this panel instance */
  id: string;

  /** Panel type (determines which component to render) */
  type: PanelType;

  /** Grid layout position and size */
  layout: PanelLayout;

  /** Panel-specific configuration */
  config: PanelConfig;

  /** Display title (optional override) */
  title?: string;
}

export interface PanelLayout {
  /** X position in grid units (0-indexed) */
  x: number;

  /** Y position in grid units (0-indexed) */
  y: number;

  /** Width in grid units */
  w: number;

  /** Height in grid units */
  h: number;

  /** Minimum width (optional) */
  minW?: number;

  /** Minimum height (optional) */
  minH?: number;

  /** Maximum width (optional) */
  maxW?: number;

  /** Maximum height (optional) */
  maxH?: number;

  /** Is this panel static (non-movable)? */
  static?: boolean;
}

export type PanelType =
  // Chart Panels
  | 'candlestick-chart'
  | 'intraday-chart'
  | 'comparison-chart'
  | 'cumulative-return-chart'
  | 'market-cap-history'

  // Financial Data Panels
  | 'company-header'
  | 'metrics'
  | 'performance-ratios'
  | 'returns-analytics'
  | 'vol-forecast'

  // News & Sentiment
  | 'news-list'
  | 'sentiment-analysis'
  | 'analyst-ratings'

  // Corporate Actions
  | 'dividend-history'
  | 'insider-transactions'
  | 'earnings-calendar'

  // Technical Analysis
  | 'technical-indicators'

  // Market Data
  | 'index-constituents'
  | 'etf-holdings'
  | 'macro-indicators'
  | 'interest-rates'
  | 'economic-calendar';

export interface PanelConfig {
  /** Stock ticker (for single-stock panels) */
  ticker?: string;

  /** Multiple tickers (for comparison panels) */
  tickers?: string[];

  /** Benchmark ticker for comparisons */
  benchmark?: string;

  /** Time period for analysis */
  period?: '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'MAX';

  /** Number of years for historical analysis */
  years?: number;

  /** Technical indicators to display */
  indicators?: string[];

  /** Index symbol (for index constituents) */
  index?: string;

  /** Date range for calendar views */
  fromDate?: string;
  toDate?: string;

  /** Number of items to display */
  limit?: number;

  /** Custom panel-specific options */
  options?: Record<string, any>;
}

export interface Dashboard {
  /** Unique dashboard identifier */
  id: string;

  /** Dashboard name */
  name: string;

  /** Description */
  description?: string;

  /** Dashboard category */
  category: DashboardCategory;

  /** Grid configuration */
  gridConfig: GridConfig;

  /** Panels in this dashboard */
  panels: DashboardPanel[];

  /** Is this a built-in template? */
  isTemplate?: boolean;

  /** Creator user ID (null for templates) */
  createdBy?: string | null;

  /** Creation timestamp */
  createdAt?: string;

  /** Last modified timestamp */
  updatedAt?: string;
}

export type DashboardCategory =
  | 'technical-analysis'
  | 'fundamental-analysis'
  | 'news-sentiment'
  | 'risk-analytics'
  | 'multi-stock'
  | 'market-overview'
  | 'custom';

export interface GridConfig {
  /** Number of columns in the grid */
  cols: number;

  /** Row height in pixels */
  rowHeight: number;

  /** Allow vertical compaction? */
  compactType?: 'vertical' | 'horizontal' | null;

  /** Prevent collision between panels? */
  preventCollision?: boolean;

  /** Is grid draggable? */
  isDraggable?: boolean;

  /** Is grid resizable? */
  isResizable?: boolean;

  /** Margin between panels [horizontal, vertical] */
  margin?: [number, number];

  /** Container padding [horizontal, vertical] */
  containerPadding?: [number, number];
}

export interface DashboardTemplate {
  /** Template identifier */
  id: string;

  /** Template name */
  name: string;

  /** Short description */
  description: string;

  /** Category */
  category: DashboardCategory;

  /** Preview image URL (optional) */
  previewImage?: string;

  /** Tags for searching */
  tags: string[];

  /** Default ticker (can be overridden) */
  defaultTicker?: string;

  /** Dashboard configuration */
  dashboard: Omit<Dashboard, 'id' | 'name' | 'description' | 'category'>;
}

export interface DashboardState {
  /** Currently active dashboard */
  activeDashboard: Dashboard | null;

  /** Is dashboard in edit mode? */
  isEditing: boolean;

  /** Available templates */
  templates: DashboardTemplate[];

  /** User's saved dashboards */
  savedDashboards: Dashboard[];

  /** Loading state */
  isLoading: boolean;

  /** Error message */
  error: string | null;
}
