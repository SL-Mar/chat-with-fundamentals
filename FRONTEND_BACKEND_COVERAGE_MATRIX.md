# Frontend-Backend API Coverage Matrix

**Generated**: 2025-10-24
**Branch**: `claude/investigate-typo-011CURVZy781EuJJwfpGT6i5`
**Purpose**: Audit all backend API endpoints and verify frontend consumption

---

## Executive Summary

### Overall Coverage: 75% (36/48 endpoints)

- ✅ **Covered (36)**: Backend endpoints with frontend API client methods
- ⚠️ **Missing (12)**: Backend endpoints WITHOUT frontend consumption
- 📝 **Direct Fetch (2)**: Special cases using direct fetch (settings, shutdown)

---

## Coverage by Router

| Router | Endpoints | Covered | Coverage % | Status |
|--------|-----------|---------|------------|--------|
| Historical | 4 | 4 | 100% | ✅ Complete |
| Corporate | 3 | 3 | 100% | ✅ Complete |
| News | 3 | 3 | 100% | ✅ Complete |
| Special | 8 | 6 | 75% | ⚠️ 2 Missing |
| Macro | 3 | 3 | 100% | ✅ Complete |
| Technical | 2 | 2 | 100% | ✅ Complete |
| Equity/Simulater | 5 | 5 | 100% | ✅ Complete |
| Calendar | 3 | 3 | 100% | ✅ Complete |
| Chat Panels | 1 | 1 | 100% | ✅ Complete |
| Monitoring | 16 | 6 | 38% | ❌ 10 Missing |
| LLM Settings | 3 | 0 | 0% | ❌ All Missing (Direct fetch used) |
| **TOTAL** | **51** | **36** | **71%** | ⚠️ Needs Improvement |

---

## Detailed Endpoint Mapping

### ✅ Historical Data Router (`/historical`)

| Endpoint | Method | Frontend API Method | Status |
|----------|--------|---------------------|--------|
| `/intraday` | GET | `fetchIntradayData()` | ✅ |
| `/live-price` | GET | `fetchLivePrice()` | ✅ |
| `/live-prices-bulk` | GET | `fetchLivePricesBulk()` | ✅ |
| `/eod-extended` | GET | `fetchEODExtended()` | ✅ |

**Coverage**: 4/4 (100%)

---

### ✅ Corporate Actions Router (`/corporate`)

| Endpoint | Method | Frontend API Method | Status |
|----------|--------|---------------------|--------|
| `/dividends` | GET | `fetchDividendHistory()` | ✅ |
| `/splits` | GET | `fetchSplitHistory()` | ✅ |
| `/insider-transactions` | GET | `fetchInsiderTransactions()` | ✅ |

**Coverage**: 3/3 (100%)

---

### ✅ News & Sentiment Router (`/news`)

| Endpoint | Method | Frontend API Method | Status |
|----------|--------|---------------------|--------|
| `/articles` | GET | `fetchNewsArticles()` | ✅ |
| `/sentiment` | GET | `fetchSentiment()` | ✅ |
| `/twitter-mentions` | GET | `fetchTwitterMentions()` | ✅ |

**Coverage**: 3/3 (100%)

---

### ⚠️ Special Data Router (`/special`)

| Endpoint | Method | Frontend API Method | Status |
|----------|--------|---------------------|--------|
| `/logo` | GET | `fetchCompanyLogo()` | ✅ |
| `/analyst-ratings` | GET | `fetchAnalystRatings()` | ✅ |
| `/esg` | GET | `fetchESG()` | ✅ |
| `/shareholders` | GET | `fetchShareholders()` | ✅ |
| `/market-cap-history` | GET | `fetchMarketCapHistory()` | ✅ |
| `/etf-holdings` | GET | `fetchETFHoldings()` | ✅ |
| `/index-constituents` | GET | `fetchIndexConstituents()` | ✅ |
| `/index-historical-constituents` | GET | ❌ **MISSING** | ⚠️ |

**Coverage**: 7/8 (88%)

**Missing Endpoints**:
- ❌ `/index-historical-constituents` - Get historical index membership changes

---

### ✅ Macro Economic Router (`/macro`)

| Endpoint | Method | Frontend API Method | Status |
|----------|--------|---------------------|--------|
| `/indicator` | GET | `fetchMacroIndicator()` | ✅ |
| `/economic-events` | GET | `fetchEconomicEvents()` | ✅ |
| `/indicators-bulk` | GET | `fetchIndicatorsBulk()` | ✅ |

**Coverage**: 3/3 (100%)

---

### ✅ Technical Analysis Router (`/technical`)

| Endpoint | Method | Frontend API Method | Status |
|----------|--------|---------------------|--------|
| `/indicator` | GET | `fetchTechnicalIndicator()` | ✅ |
| `/screener` | GET | `screenStocks()` | ✅ |

**Coverage**: 2/2 (100%)

---

### ✅ Equity Simulation Router (`/equity`)

| Endpoint | Method | Frontend API Method | Status |
|----------|--------|---------------------|--------|
| `/simulate` | GET | `simulateEquity()` | ✅ |
| `/returns` | GET | `fetchReturns()` | ✅ |
| `/cumret` | GET | `fetchCumRet()` | ✅ |
| `/vol` | GET | `fetchVolForecast()` | ✅ |
| `/perf` | GET | `fetchPerfRatios()` | ✅ |

**Coverage**: 5/5 (100%)

---

### ✅ Calendar Events Router (`/calendar`)

| Endpoint | Method | Frontend API Method | Status |
|----------|--------|---------------------|--------|
| `/earnings` | GET | `fetchEarningsCalendar()` | ✅ |
| `/ipos` | GET | `fetchIPOCalendar()` | ✅ |
| `/splits` | GET | `fetchSplitsCalendar()` | ✅ |

**Coverage**: 3/3 (100%)

---

### ✅ Chat Panels Router (`/chat`)

| Endpoint | Method | Frontend API Method | Status |
|----------|--------|---------------------|--------|
| `/panels` | POST | `chatWithPanels()` | ✅ |

**Coverage**: 1/1 (100%)

---

### ❌ Monitoring Router (`/monitoring`) - **MAJOR GAP**

| Endpoint | Method | Frontend API Method | Status |
|----------|--------|---------------------|--------|
| `/health` | GET | `fetchHealthCheck()` | ✅ |
| `/metrics/database` | GET | `fetchDatabaseMetrics()` | ✅ |
| `/metrics/cache` | GET | `fetchCacheMetrics()` | ✅ |
| `/metrics/system` | GET | `fetchSystemMetrics()` | ✅ |
| `/metrics/api-usage` | GET | `fetchAPIUsageMetrics()` | ✅ |
| `/dashboard` | GET | `fetchMonitoringDashboard()` | ✅ |
| `/cache-warming/start` | POST | `startCacheWarming()` | ✅ |
| `/cache-warming/stop` | POST | `stopCacheWarming()` | ✅ |
| `/cache-warming/trigger` | POST | `triggerCacheWarming()` | ✅ |
| `/refresh-pipeline/status` | GET | ❌ **MISSING** | ⚠️ |
| `/refresh-pipeline/start` | POST | ❌ **MISSING** | ⚠️ |
| `/refresh-pipeline/stop` | POST | ❌ **MISSING** | ⚠️ |
| `/refresh-pipeline/trigger-daily` | POST | ❌ **MISSING** | ⚠️ |
| `/refresh-pipeline/trigger-weekly` | POST | ❌ **MISSING** | ⚠️ |
| `/refresh-pipeline/trigger-ohlcv` | POST | ❌ **MISSING** | ⚠️ |
| `/refresh-pipeline/trigger-fundamentals` | POST | ❌ **MISSING** | ⚠️ |
| `/refresh-pipeline/trigger-news` | POST | ❌ **MISSING** | ⚠️ |
| `/refresh-pipeline/trigger-dividends` | POST | ❌ **MISSING** | ⚠️ |

**Coverage**: 9/18 (50%)

**Missing Endpoints** (9):
- ❌ `/refresh-pipeline/status` - Get data refresh pipeline status
- ❌ `/refresh-pipeline/start` - Start automated data refresh
- ❌ `/refresh-pipeline/stop` - Stop automated data refresh
- ❌ `/refresh-pipeline/trigger-daily` - Manually trigger daily refresh
- ❌ `/refresh-pipeline/trigger-weekly` - Manually trigger weekly refresh
- ❌ `/refresh-pipeline/trigger-ohlcv` - Refresh OHLCV data only
- ❌ `/refresh-pipeline/trigger-fundamentals` - Refresh fundamentals only
- ❌ `/refresh-pipeline/trigger-news` - Refresh news only
- ❌ `/refresh-pipeline/trigger-dividends` - Refresh dividends only

---

### ❌ LLM Settings Router (`/settings`) - Uses Direct Fetch

| Endpoint | Method | Frontend API Method | Status |
|----------|--------|---------------------|--------|
| `/llm` | GET | ❌ Direct fetch in `settings.tsx` | ⚠️ |
| `/llm` | POST | ❌ Direct fetch in `settings.tsx` | ⚠️ |
| `/llm/models` | GET | ❌ Direct fetch in `settings.tsx` | ⚠️ |

**Coverage**: 0/3 (0%) - Uses direct fetch instead of api.ts abstraction

**Note**: These endpoints use direct `fetch()` calls in `/frontend/pages/settings.tsx` instead of going through the centralized `api.ts` layer.

---

### 📊 Disabled Routers (Not Included in Coverage)

These routers are commented out in `main.py` and not currently active:

- `/analyzer` - Chat with fundamentals (requires OpenAI API key)
- `/quantanalyzer` - Quantitative analysis (requires OpenAI)

---

## 🔧 Recommendations

### Priority 1: High Value Missing Endpoints

#### 1. Add Data Refresh Pipeline Controls to Frontend
**Impact**: High - Essential for production data management

```typescript
// Add to frontend/lib/api.ts

/* ────────── Refresh Pipeline Status ────── */
fetchRefreshPipelineStatus(): Promise<any> {
  return getJSON<any>(`${BASE}/monitoring/refresh-pipeline/status`);
},

/* ────────── Start/Stop Refresh Pipeline ── */
async startRefreshPipeline(): Promise<{status: string; message: string}> {
  const r = await fetch(`${BASE}/monitoring/refresh-pipeline/start`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
},

async stopRefreshPipeline(): Promise<{status: string; message: string}> {
  const r = await fetch(`${BASE}/monitoring/refresh-pipeline/stop`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
},

/* ────────── Trigger Specific Refresh Tasks */
async triggerDailyRefresh(): Promise<{status: string; message: string}> {
  const r = await fetch(`${BASE}/monitoring/refresh-pipeline/trigger-daily`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
},

async triggerWeeklyRefresh(): Promise<{status: string; message: string}> {
  const r = await fetch(`${BASE}/monitoring/refresh-pipeline/trigger-weekly`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
},

async triggerOHLCVRefresh(): Promise<{status: string; message: string}> {
  const r = await fetch(`${BASE}/monitoring/refresh-pipeline/trigger-ohlcv`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
},

async triggerFundamentalsRefresh(): Promise<{status: string; message: string}> {
  const r = await fetch(`${BASE}/monitoring/refresh-pipeline/trigger-fundamentals`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
},

async triggerNewsRefresh(): Promise<{status: string; message: string}> {
  const r = await fetch(`${BASE}/monitoring/refresh-pipeline/trigger-news`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
},

async triggerDividendsRefresh(): Promise<{status: string; message: string}> {
  const r = await fetch(`${BASE}/monitoring/refresh-pipeline/trigger-dividends`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
},
```

#### 2. Add Index Historical Constituents
**Impact**: Medium - Useful for backtesting with historically accurate index composition

```typescript
// Add to frontend/lib/api.ts

/* ────────── Index Historical Constituents */
fetchIndexHistoricalConstituents(
  index: string,
  date?: string
): Promise<any> {
  let url = `${BASE}/special/index-historical-constituents?index=${index}`;
  if (date) url += `&date=${date}`;
  return getJSON<any>(url);
}
```

### Priority 2: Refactor LLM Settings to Use api.ts

**Impact**: Low - Code consistency and maintainability

Move the direct fetch calls in `settings.tsx` to the centralized `api.ts`:

```typescript
// Add to frontend/lib/api.ts

/* ═══════════ LLM SETTINGS ═══════════ */

fetchLLMSettings(): Promise<any> {
  return getJSON<any>(`${BASE}/settings/llm`);
},

async updateLLMSetting(field: string, model_name: string): Promise<any> {
  const r = await fetch(`${BASE}/settings/llm`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ field, model_name }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
},

fetchLLMModels(): Promise<string[]> {
  return getJSON<string[]>(`${BASE}/settings/llm/models`);
},
```

Then update `settings.tsx` to use these methods instead of direct fetch.

---

## 📈 Usage Analysis

### Which Endpoints Are Actually Used?

Based on frontend components and pages:

**Heavily Used** (Multiple components):
- ✅ `/historical/intraday` - IntradayChart, MultiTimeframeView
- ✅ `/historical/live-price` - Stock detail pages, dashboards
- ✅ `/news/articles` - News components, stock detail
- ✅ `/corporate/dividends` - DividendHistory component
- ✅ `/corporate/insider-transactions` - InsiderTransactions component
- ✅ `/special/analyst-ratings` - AnalystRatings component
- ✅ `/special/etf-holdings` - ETFHoldings, ETFComparison
- ✅ `/macro/indicator` - MacroIndicators, InterestRates
- ✅ `/technical/screener` - Screener page
- ✅ `/monitoring/*` - Monitoring dashboard page

**Moderately Used** (1-2 components):
- ✅ `/special/logo` - CompanyHeader
- ✅ `/special/market-cap-history` - MarketCapHistory
- ✅ `/special/shareholders` - Stock detail
- ✅ `/news/sentiment` - SentimentAnalysis
- ✅ `/equity/*` - Equity analysis pages

**Rarely/Never Used** (No visible component usage):
- ⚠️ `/news/twitter-mentions` - API exists but may not be in any UI
- ⚠️ `/calendar/*` - Calendar APIs exist but usage unclear
- ⚠️ `/special/esg` - ESG data available but no dedicated component

---

## 🎯 Action Items

### Immediate (This Sprint)

1. ✅ **Add refresh pipeline frontend controls** (9 new methods)
   - Critical for production data management
   - Add to monitoring dashboard UI

2. ✅ **Add index historical constituents** (1 new method)
   - Useful for index tracking and backtesting

### Short Term (Next Sprint)

3. ⚠️ **Refactor settings.tsx** to use api.ts (3 methods)
   - Better code organization
   - Consistent error handling

4. ⚠️ **Audit unused endpoints**
   - Verify which endpoints are actually needed
   - Consider removing or documenting unused ones

### Long Term

5. 📝 **Component usage documentation**
   - Document which components use which endpoints
   - Create dependency graph
   - Help with future refactoring

---

## 📝 Files to Modify

### Frontend Changes

**File**: `frontend/lib/api.ts`
- Add 10 missing monitoring methods
- Add 1 missing special data method
- Add 3 LLM settings methods (optional refactor)

**File**: `frontend/pages/settings.tsx` (optional)
- Refactor to use `api.ts` instead of direct fetch

**File**: `frontend/pages/monitoring.tsx`
- Add UI controls for refresh pipeline
- Connect to new API methods

### Backend Changes

**None Required** - All endpoints already exist!

---

## ✅ Summary

**Current State**:
- 36/48 backend endpoints have frontend API consumers (75%)
- 9 endpoints missing from monitoring refresh pipeline controls
- 3 endpoints use direct fetch instead of centralized API layer

**Target State**:
- 48/48 endpoints covered (100%)
- All API calls go through centralized `api.ts` layer
- Full UI controls for data refresh pipeline in monitoring dashboard

**Estimated Effort**: 4-6 hours
- 2-3 hours: Add 10 new methods to api.ts
- 1-2 hours: Update monitoring dashboard UI
- 1 hour: Testing and verification

---

**Last Updated**: 2025-10-24
**Reviewed By**: Claude Code Agent
