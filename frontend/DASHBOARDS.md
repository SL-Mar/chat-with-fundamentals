# Dashboard System Documentation

## Overview

The Chat with Fundamentals platform includes a comprehensive dashboard system with pre-built templates and configurable layouts for various analysis scenarios.

## Architecture

```
frontend/
├── types/
│   └── dashboard.ts              # TypeScript type definitions
├── config/
│   └── dashboardTemplates.ts     # Pre-built templates
├── pages/
│   ├── dashboards.tsx            # Template gallery
│   └── dashboard/[id].tsx        # Dashboard viewer (TODO)
└── components/
    └── dashboard/
        ├── DashboardGrid.tsx     # Grid layout component (TODO)
        ├── PanelRenderer.tsx     # Panel component renderer (TODO)
        └── DashboardEditor.tsx   # Drag-and-drop editor (TODO)
```

## Dashboard Templates

### 1. Technical Analysis Dashboard

**Focus:** Price action, technical indicators, volume analysis
**Best for:** Day traders, swing traders, technical analysts

**Panels:**
- Full-width candlestick chart with multiple timeframes (1M-MAX)
- Technical indicators (RSI, MACD, Bollinger Bands)
- Volatility forecast with EWMA
- Risk-adjusted performance metrics (Sharpe, Sortino, Calmar)
- Returns analysis vs. benchmark

**Grid Layout:** 12-column grid, 5 panels

---

### 2. Fundamental Analysis Dashboard

**Focus:** Financial metrics, earnings, corporate actions
**Best for:** Value investors, long-term investors, fundamental analysts

**Panels:**
- Company header with key information
- Financial metrics (P/E, P/B, ROE, margins)
- Long-term price chart (5+ years)
- Dividend history and yield trends
- Insider transaction tracking
- Analyst ratings and price targets

**Grid Layout:** 12-column grid, 6 panels

---

### 3. News & Sentiment Dashboard

**Focus:** Market sentiment, news flow, analyst opinions
**Best for:** Event-driven traders, news traders, sentiment analysts

**Panels:**
- Company header
- Recent price action (3-month chart)
- Sentiment analysis with mood indicators
- Latest news feed (20 articles)
- Analyst ratings and revisions

**Grid Layout:** 12-column grid, 5 panels

---

### 4. Multi-Stock Comparison Dashboard

**Focus:** Relative performance, sector analysis, peer comparison
**Best for:** Sector analysts, portfolio managers, relative value traders

**Panels:**
- Cumulative returns comparison (4 stocks vs benchmark)
- Individual performance metrics for each stock
- Side-by-side price comparison chart

**Grid Layout:** 12-column grid, 6 panels (4 comparison + 2 charts)

---

### 5. Market Overview Dashboard

**Focus:** Broad market view, indices, sectors, economic indicators
**Best for:** Macro traders, portfolio managers, market strategists

**Panels:**
- Major indices comparison (S&P 500, Dow, Nasdaq, Russell 2000)
- Macro indicators (10Y yield, VIX, DXY, oil)
- Interest rates and treasury yields
- Economic calendar (upcoming events)
- Earnings calendar (upcoming reports)

**Grid Layout:** 12-column grid, 5 panels

---

## Type System

### Core Types

```typescript
interface Dashboard {
  id: string;
  name: string;
  description?: string;
  category: DashboardCategory;
  gridConfig: GridConfig;
  panels: DashboardPanel[];
  isTemplate?: boolean;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface DashboardPanel {
  id: string;
  type: PanelType;
  layout: PanelLayout;
  config: PanelConfig;
  title?: string;
}

interface PanelLayout {
  x: number;      // X position (0-indexed)
  y: number;      // Y position (0-indexed)
  w: number;      // Width in grid units
  h: number;      // Height in grid units
  minW?: number;  // Minimum width
  minH?: number;  // Minimum height
  maxW?: number;  // Maximum width
  maxH?: number;  // Maximum height
  static?: boolean; // Non-movable?
}
```

### Available Panel Types

**Chart Panels:**
- `candlestick-chart` - EOD historical chart with 30+ years
- `intraday-chart` - Minute-level intraday data
- `comparison-chart` - Multi-stock comparison
- `cumulative-return-chart` - Cumulative returns vs benchmark
- `market-cap-history` - Market cap evolution

**Financial Data:**
- `company-header` - Company info banner
- `metrics` - Key financial metrics
- `performance-ratios` - Sharpe, Sortino, Calmar, Max DD
- `returns-analytics` - Return distribution and beta
- `vol-forecast` - Volatility forecast with EWMA

**News & Sentiment:**
- `news-list` - Latest news articles
- `sentiment-analysis` - News sentiment scoring
- `analyst-ratings` - Analyst ratings and price targets

**Corporate Actions:**
- `dividend-history` - Dividend payment history
- `insider-transactions` - Insider buying/selling
- `earnings-calendar` - Upcoming earnings dates

**Market Data:**
- `index-constituents` - Index holdings
- `etf-holdings` - ETF composition
- `macro-indicators` - Bond yields, VIX, etc.
- `interest-rates` - Treasury yield curve
- `economic-calendar` - Economic events

---

## Grid System

The dashboard uses **react-grid-layout** for responsive, draggable layouts.

### Grid Configuration

```typescript
interface GridConfig {
  cols: number;              // Number of columns (typically 12)
  rowHeight: number;         // Height of one grid unit (pixels)
  compactType?: 'vertical' | 'horizontal' | null;
  preventCollision?: boolean;
  isDraggable?: boolean;     // Allow drag-and-drop
  isResizable?: boolean;     // Allow resizing
  margin?: [number, number]; // [horizontal, vertical] spacing
  containerPadding?: [number, number];
}
```

**Standard Configuration:**
- 12 columns (responsive grid)
- 100px row height
- 16px margins between panels
- Vertical compaction (no gaps)

### Responsive Breakpoints

| Breakpoint | Columns | Min Width |
|------------|---------|-----------|
| Desktop    | 12      | 1200px    |
| Tablet     | 8       | 768px     |
| Mobile     | 4       | 480px     |

---

## Usage

### 1. Browse Templates

Visit `/dashboards` to see the template gallery.

### 2. Customize Template

```typescript
import { createDashboardFromTemplate, TECHNICAL_ANALYSIS_TEMPLATE } from '@/config/dashboardTemplates';

// Create dashboard for TSLA with custom name
const dashboard = createDashboardFromTemplate(
  TECHNICAL_ANALYSIS_TEMPLATE,
  'TSLA.US',
  'Tesla Technical Analysis'
);
```

### 3. Save Dashboard

```typescript
// Save to localStorage (Phase 3B)
localStorage.setItem('dashboards', JSON.stringify([dashboard]));

// Save to database (Phase 3B+)
await fetch('/api/dashboards', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(dashboard)
});
```

### 4. Load Dashboard

```typescript
// From localStorage
const dashboards = JSON.parse(localStorage.getItem('dashboards') || '[]');

// From database (future)
const response = await fetch('/api/dashboards');
const dashboards = await response.json();
```

---

## Future Enhancements (Phase 3B)

### Drag-and-Drop Editor
- Visual panel repositioning
- Resizing with handles
- Add/remove panels dynamically
- Real-time preview

### Dashboard Persistence
- Save to PostgreSQL database
- User authentication and ownership
- Share dashboards via URL
- Export/import dashboard JSON

### Advanced Features
- Panel linking (clicking one updates others)
- Global ticker selection
- Live data updates via WebSocket
- Dashboard themes (dark/light)
- Mobile-optimized layouts

---

## Implementation Status

| Feature | Status | Phase |
|---------|--------|-------|
| Type definitions | ✅ Complete | 3A |
| Pre-built templates | ✅ Complete | 3B |
| Template gallery UI | ✅ Complete | 3B |
| Dashboard viewer | 🚧 Pending | 3B |
| Drag-and-drop editor | 📋 Planned | 3B |
| Database persistence | 📋 Planned | 3B |
| Share via URL | 📋 Planned | 3B |

---

## Examples

### Example: Create Custom Dashboard

```typescript
import { Dashboard, DashboardPanel } from '@/types/dashboard';

const myDashboard: Dashboard = {
  id: 'my-dashboard-1',
  name: 'My Custom Dashboard',
  description: 'Custom layout for NVDA analysis',
  category: 'custom',
  gridConfig: {
    cols: 12,
    rowHeight: 100,
    isDraggable: true,
    isResizable: true,
    margin: [16, 16],
  },
  panels: [
    {
      id: 'main-chart',
      type: 'candlestick-chart',
      layout: { x: 0, y: 0, w: 12, h: 4 },
      config: { ticker: 'NVDA.US', period: '1Y' },
      title: 'NVDA Price Chart',
    },
    {
      id: 'perf-metrics',
      type: 'performance-ratios',
      layout: { x: 0, y: 4, w: 6, h: 2 },
      config: { ticker: 'NVDA.US', years: 3 },
    },
    // Add more panels...
  ],
};
```

### Example: Filter Templates by Category

```typescript
import { getTemplatesByCategory } from '@/config/dashboardTemplates';

const technicalTemplates = getTemplatesByCategory('technical-analysis');
// Returns: [TECHNICAL_ANALYSIS_TEMPLATE]
```

---

## Contributing

When adding new templates:

1. Add to `dashboardTemplates.ts`
2. Follow the naming convention: `{CATEGORY}_{VARIANT}_TEMPLATE`
3. Include default ticker and comprehensive description
4. Document panel purposes in comments
5. Test grid layout on multiple screen sizes

---

## Resources

- [react-grid-layout Documentation](https://github.com/react-grid-layout/react-grid-layout)
- [Grid Layout Examples](https://react-grid-layout.github.io/react-grid-layout/examples/0-showcase.html)
- Phase 3B ROADMAP section

---

**Last Updated:** January 2025
**Version:** 1.0.0
**Status:** Phase 3B In Progress
