# TODO - Next Session

## 1. Harmonize Ticker Format Across Application
**Priority: HIGH**

### Current Issue
- Inconsistent ticker formats throughout the application
- Some places use bare tickers (e.g., "AAPL"), others use exchange suffixes (e.g., "AAPL.US")

### Required Changes
- **Stocks & ETFs**: Always use exchange suffix format (EODHD standard)
  - Example: `AAPL.US`, `SPY.US`, `QQQ.US`
- **Forex**: Always use `.FOREX` suffix (EODHD standard)
  - Example: `EURUSD.FOREX`, `GBPUSD.FOREX`, `USDJPY.FOREX`

### Files to Update
- Frontend display components
- API request/response handlers
- Database query results
- Inventory lists
- Search/autocomplete functions

### Benefits
- Consistency with EODHD API terminology
- Eliminates ambiguity in ticker identification
- Easier debugging and data tracking

---

## 2. Add Settings Database Card
**Priority: MEDIUM**

### Rationale
- Currently showing 5 database cards
- 6 databases would create symmetric layout (2 rows × 3 columns)
- Better visual balance on the Database Manager page

### Implementation
- Create new card for Settings/Configuration database
- Could include:
  - User preferences
  - System configurations
  - API keys metadata (not the actual keys)
  - Application settings
  - Cache settings

### Design
- Match existing card style
- Show relevant metadata (records count, size, etc.)
- Consider what actions make sense for settings DB

---

## 3. Fix Portfolio Database Storage Bug
**Priority: HIGH**

### Current Issue
- One portfolio exists with 3 stocks
- Data can be retrieved successfully
- **Unknown storage location** - portfolio is not visible in expected location

### Investigation Needed
1. Check where `portfolios.db` is actually located
   - Expected: `/home/slmar/projects/chat-with-fundamentals/backend/portfolios.db`
   - Search entire project for `.db` files
2. Verify database connection string in backend
3. Check if multiple portfolio databases exist
4. Verify frontend is querying correct database path

### Files to Check
- `/home/slmar/projects/chat-with-fundamentals/backend/routers/database_stats.py` (line 404-407)
- Portfolio database configuration
- SQLite connection initialization
- Frontend portfolio API calls

### Expected Fix
- Locate actual database file
- Ensure single source of truth for portfolio storage
- Update references if path is incorrect
- Add logging to track portfolio operations

---

## 4. Enhance Macro Indicators - Country Comparisons
**Priority: MEDIUM**

### Current State
- Macro indicators show individual country curves
- Example: Germany 10Y bond yield over time

### Proposed Enhancement
- **Add comparison views between countries**
- Focus on **interest rate spreads**

### Examples
- US 10Y vs Germany 10Y (spread analysis)
- UK vs US interest rates
- Multi-country overlay charts

### Implementation Ideas
1. Add "Compare Countries" button/toggle
2. Multi-select dropdown for countries
3. Calculate and display spreads
4. Highlight spread widening/narrowing
5. Add spread statistics (mean, std dev, current vs historical)

### Use Cases
- Identify arbitrage opportunities
- Track monetary policy divergence
- Analyze capital flows
- Bond market analysis

---

## Recent Fixes Completed (Current Session)

✅ **Fixed Population Bug**
- Removed invalid `ceo`, `sector`, `industry` parameters from Company model creation
- File: `/home/slmar/projects/chat-with-fundamentals/backend/routers/dataset_populate.py:291-297`

✅ **Fixed Forex Classification**
- Updated asset type detection to correctly identify `.FOREX` suffix
- File: `/home/slmar/projects/chat-with-fundamentals/backend/routers/database_inventory.py:28-43`

✅ **Added Fundamentals Note**
- Clarified fundamentals only available for stocks (not ETFs/forex)
- File: `/home/slmar/projects/chat-with-fundamentals/frontend/pages/database-manager.tsx:1082-1084`

✅ **Connected Add Tickers Buttons**
- All "Add Tickers" buttons now functional
- Support both ETF constituent selection and manual ticker entry

---

## Notes

- All database metadata now harmonized (Assets, Records, From, To, Size)
- Forex pairs now correctly display in yellow color
- Population workflow fully functional for all asset types
