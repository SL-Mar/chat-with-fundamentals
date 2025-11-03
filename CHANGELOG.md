# Changelog

## [Unreleased] - 2025-11-03

### Added
- **Insider Transactions Display**: Added insider transactions panel in Overview tab showing SEC Form 4 filings
- **Database Management UI**: Comprehensive database stats dashboard with data availability metrics
  - Shows count of stocks with each data type (OHLCV, fundamentals, news, dividends, intraday)
  - Ticker inventory with compact table layout showing 1000+ tickers
  - Loading progress indicator for better UX
  - Filter to only show tickers with at least one dataset
- **Improved Asset Detail Layout**:
  - Consolidated all key metrics (P/E, EPS, Market Cap, etc.) into header
  - 50/50 split layout: Chart on left, Insider Transactions on right
  - Left-aligned metrics for better readability
  - Removed redundant metrics panels
- **Database Query Method**: Added `get_insider_transactions()` to ImprovedDatabaseQueries class

### Fixed
- **Live Price N/A Issue**: Fixed data format conversion when using database fallback (OHLCV → live price format)
- **Timestamp Display**: Simplified to show only timestamp without misleading market status indicators
- **Ticker Limit**: Increased database management page from 100 to 1000 tickers
- **Chart Constraints**: Removed max-width constraints to allow full-width utilization

### Changed
- **Overview Tab Layout**: Changed from full-width chart to side-by-side layout with insider transactions
- **AssetHeader Metrics**: Changed from grid to flexible horizontal layout, left-aligned
- **Database Stats Endpoint**: Added `data_availability` object showing counts by data type
- **Ticker Inventory**: Filter to only show companies with at least one dataset available

### Technical Details
- Modified `/backend/database/queries_improved.py`: Added InsiderTransaction import and query method
- Modified `/frontend/components/asset-detail/tabs/OverviewTab.tsx`: 50/50 grid layout with InsiderTransactions component
- Modified `/frontend/components/asset-detail/AssetHeader.tsx`: Consolidated metrics display, left-aligned layout
- Modified `/frontend/pages/database.tsx`: Table layout, loading indicator, increased limit to 1000
- Modified `/backend/routers/admin.py`: Added data availability stats, filtered ticker inventory
- Modified `/backend/services/data_service.py`: Fixed OHLCV to live price format conversion

### Known Issues
- Macro indicator pages may fail when EODHD API is unreachable (network connectivity issue)
- Insider transactions data requires proper API subscription level

## Previous Changes
See git history for earlier changes.
