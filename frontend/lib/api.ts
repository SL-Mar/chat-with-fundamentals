// lib/api.ts – wrapper for backend endpoints

import { Executive_Summary, EODResult } from "../types/models";
import {
  EquitySimulationResponse,
  ReturnsResponse,
  EquityCumRetResponse,
  VolForecastResponse,      // ← NEW interface
  PerfRatiosResponse        // ← NEW interface
} from "../types/equity";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Get API key from environment variable (set in .env.local for development)
const API_KEY = process.env.NEXT_PUBLIC_APP_API_KEY || "";

/**
 * Helper function to create authenticated fetch headers
 */
const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // Add API key header if available
  if (API_KEY) {
    headers["X-API-Key"] = API_KEY;
  }

  return headers;
};

const getJSON = async <T>(url: string): Promise<T> => {
  const r = await fetch(url, {
    headers: getHeaders(),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<T>;
};

export const api = {
  /* ────────── Fundamentals chat ────────── */
  async chatWithFundamentals(question: string): Promise<Executive_Summary> {
    const r = await fetch(`${BASE}/analyzer/chat`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ user_query: question }),
    });
    if (!r.ok) {
      const { detail } = await r.json();
      throw new Error(detail || "Fundamentals error");
    }
    return r.json() as Promise<Executive_Summary>;
  },

  /* ────────── End-of-Day quotes ────────── */
  fetchEODData(ticker: string): Promise<EODResult> {
    return getJSON<EODResult>(`${BASE}/quantanalyzer/eod?ticker=${ticker}`);
  },

  /* ────────── Monte-Carlo simulation ───── */
  simulateEquity(
    ticker: string,
    horizon = 20
  ): Promise<EquitySimulationResponse> {
    return getJSON<EquitySimulationResponse>(
      `${BASE}/equity/simulate?ticker=${ticker}&horizon=${horizon}`
    );
  },

  /* ────────── Returns distribution & beta */
  fetchReturns(
    ticker: string,
    years = 3,
    benchmark = "SPY"
  ): Promise<ReturnsResponse> {
    return getJSON<ReturnsResponse>(
      `${BASE}/quantanalyzer/returns?ticker=${ticker}&years=${years}&benchmark=${benchmark}`
    );
  },

  /* ────────── Cumulative curve ─────────── */
  fetchCumRet(
    ticker: string,
    years = 3,
    benchmark = "SPY"
  ): Promise<EquityCumRetResponse> {
    return getJSON<EquityCumRetResponse>(
      `${BASE}/equity/cumret?ticker=${ticker}&years=${years}&benchmark=${benchmark}`
    );
  },

  /* ────────── NEW • Volatility snapshot ── */
  fetchVolForecast(
    ticker: string,
    lookback = 250
  ): Promise<VolForecastResponse> {
    return getJSON<VolForecastResponse>(
      `${BASE}/equity/vol?ticker=${ticker}&lookback=${lookback}`
    );
  },

  /* ────────── NEW • Performance ratios ─── */
  fetchPerfRatios(
    ticker: string,
    years = 3
  ): Promise<PerfRatiosResponse> {
    return getJSON<PerfRatiosResponse>(
      `${BASE}/equity/perf?ticker=${ticker}&years=${years}`
    );
  },

  /* ────────── Technical Indicators ──────── */
  fetchTechnicalIndicator(
    ticker: string,
    function_name: string,
    period = 50,
    options?: { from_date?: string; to_date?: string; fastperiod?: number; slowperiod?: number; signalperiod?: number }
  ): Promise<any> {
    let url = `${BASE}/technical/indicator?ticker=${ticker}&function=${function_name}&period=${period}`;
    if (options?.from_date) url += `&from_date=${options.from_date}`;
    if (options?.to_date) url += `&to_date=${options.to_date}`;
    if (options?.fastperiod) url += `&fastperiod=${options.fastperiod}`;
    if (options?.slowperiod) url += `&slowperiod=${options.slowperiod}`;
    if (options?.signalperiod) url += `&signalperiod=${options.signalperiod}`;
    return getJSON<any>(url);
  },

  /* ────────── Stock Screener ──────────── */
  screenStocks(
    filters?: string,
    signals?: string,
    sort?: string,
    limit = 50,
    offset = 0
  ): Promise<any> {
    let url = `${BASE}/technical/screener?limit=${limit}&offset=${offset}`;
    if (filters) url += `&filters=${encodeURIComponent(filters)}`;
    if (signals) url += `&signals=${encodeURIComponent(signals)}`;
    if (sort) url += `&sort=${encodeURIComponent(sort)}`;
    return getJSON<any>(url);
  },

  /* ────────── Earnings Calendar ─────────── */
  fetchEarningsCalendar(
    from_date?: string,
    to_date?: string,
    symbols?: string
  ): Promise<any> {
    let url = `${BASE}/calendar/earnings?`;
    if (from_date) url += `from_date=${from_date}&`;
    if (to_date) url += `to_date=${to_date}&`;
    if (symbols) url += `symbols=${symbols}&`;
    return getJSON<any>(url);
  },

  /* ────────── IPO Calendar ─────────────── */
  fetchIPOCalendar(
    from_date?: string,
    to_date?: string
  ): Promise<any> {
    let url = `${BASE}/calendar/ipos?`;
    if (from_date) url += `from_date=${from_date}&`;
    if (to_date) url += `to_date=${to_date}&`;
    return getJSON<any>(url);
  },

  /* ────────── Splits Calendar ──────────── */
  fetchSplitsCalendar(
    from_date?: string,
    to_date?: string
  ): Promise<any> {
    let url = `${BASE}/calendar/splits?`;
    if (from_date) url += `from_date=${from_date}&`;
    if (to_date) url += `to_date=${to_date}&`;
    return getJSON<any>(url);
  },

  /* ═══════════ NEW: SPECIAL DATA ENDPOINTS ═══════════ */

  /* ────────── Company Logo ─────────────── */
  fetchCompanyLogo(ticker: string): Promise<{ ticker: string; logo_url: string }> {
    return getJSON<{ ticker: string; logo_url: string }>(
      `${BASE}/special/logo?ticker=${ticker}`
    );
  },

  /* ────────── Analyst Ratings ──────────── */
  fetchAnalystRatings(ticker: string): Promise<any> {
    return getJSON<any>(`${BASE}/special/analyst-ratings?ticker=${ticker}`);
  },

  /* ────────── ESG Scores ───────────────── */
  fetchESG(ticker: string): Promise<any> {
    return getJSON<any>(`${BASE}/special/esg?ticker=${ticker}`);
  },

  /* ────────── Shareholders ─────────────── */
  fetchShareholders(
    ticker: string,
    holder_type: "institutions" | "funds" = "institutions"
  ): Promise<any> {
    return getJSON<any>(
      `${BASE}/special/shareholders?ticker=${ticker}&holder_type=${holder_type}`
    );
  },

  /* ────────── Market Cap History ───────── */
  fetchMarketCapHistory(
    ticker: string,
    from_date?: string,
    to_date?: string
  ): Promise<any> {
    let url = `${BASE}/special/market-cap-history?ticker=${ticker}`;
    if (from_date) url += `&from_date=${from_date}`;
    if (to_date) url += `&to_date=${to_date}`;
    return getJSON<any>(url);
  },

  /* ────────── Financial Statements ───────── */
  fetchFinancials(
    ticker: string,
    statement: "balance_sheet" | "income_statement" | "cash_flow" = "balance_sheet",
    period: "yearly" | "quarterly" = "yearly"
  ): Promise<any> {
    return getJSON<any>(
      `${BASE}/special/financials?ticker=${ticker}&statement=${statement}&period=${period}`
    );
  },

  /* ────────── ETF Holdings ─────────────── */
  fetchETFHoldings(ticker: string): Promise<any> {
    return getJSON<any>(`${BASE}/special/etf-holdings?symbol=${ticker}`);
  },

  /* ────────── Index Constituents ────────── */
  fetchIndexConstituents(index: string): Promise<any> {
    return getJSON<any>(`${BASE}/special/index-constituents?index=${index}`);
  },

  /* ═══════════ NEW: CORPORATE ACTIONS ═══════════ */

  /* ────────── Dividend History ─────────── */
  fetchDividendHistory(
    ticker: string,
    from_date?: string,
    to_date?: string
  ): Promise<any> {
    let url = `${BASE}/corporate/dividends?ticker=${ticker}`;
    if (from_date) url += `&from_date=${from_date}`;
    if (to_date) url += `&to_date=${to_date}`;
    return getJSON<any>(url);
  },

  /* ────────── Split History ────────────── */
  fetchSplitHistory(
    ticker: string,
    from_date?: string,
    to_date?: string
  ): Promise<any> {
    let url = `${BASE}/corporate/splits?ticker=${ticker}`;
    if (from_date) url += `&from_date=${from_date}`;
    if (to_date) url += `&to_date=${to_date}`;
    return getJSON<any>(url);
  },

  /* ────────── Insider Transactions ──────── */
  fetchInsiderTransactions(ticker: string, limit = 50): Promise<any> {
    return getJSON<any>(
      `${BASE}/corporate/insider-transactions?ticker=${ticker}&limit=${limit}`
    );
  },

  /* ═══════════ NEW: NEWS & SENTIMENT ═══════════ */

  /* ────────── News Articles ────────────── */
  fetchNewsArticles(
    symbol?: string,
    tag?: string,
    limit = 10,
    offset = 0
  ): Promise<any> {
    let url = `${BASE}/news/articles?limit=${limit}&offset=${offset}`;
    if (symbol) url += `&symbol=${symbol}`;
    if (tag) url += `&tag=${tag}`;
    return getJSON<any>(url);
  },

  /* ────────── Sentiment Analysis ────────── */
  fetchSentiment(ticker: string): Promise<any> {
    return getJSON<any>(`${BASE}/news/sentiment?ticker=${ticker}`);
  },

  /* ────────── Twitter Mentions ──────────── */
  fetchTwitterMentions(symbol: string): Promise<any> {
    return getJSON<any>(`${BASE}/news/twitter-mentions?symbol=${symbol}`);
  },

  /* ═══════════ NEW: HISTORICAL PRICE DATA ═══════════ */

  /* ────────── Intraday Prices ──────────── */
  fetchIntradayData(
    ticker: string,
    interval: string = "5m",
    from_timestamp?: number,
    to_timestamp?: number
  ): Promise<any> {
    let url = `${BASE}/historical/intraday?ticker=${ticker}&interval=${interval}`;
    if (from_timestamp) url += `&from_timestamp=${from_timestamp}`;
    if (to_timestamp) url += `&to_timestamp=${to_timestamp}`;
    return getJSON<any>(url);
  },

  /* ────────── Live Price (Single) ──────── */
  fetchLivePrice(ticker: string): Promise<any> {
    return getJSON<any>(`${BASE}/historical/live-price?ticker=${ticker}`);
  },

  /* ────────── Live Prices (Bulk) ────────── */
  fetchLivePricesBulk(symbols: string[]): Promise<any> {
    const symbolsStr = symbols.join(',');
    return getJSON<any>(`${BASE}/historical/live-prices-bulk?symbols=${symbolsStr}`);
  },

  /* ────────── Company Highlights ──────────── */
  fetchCompanyHighlights(ticker: string): Promise<any> {
    return getJSON<any>(`${BASE}/special/company-highlights?ticker=${ticker}`);
  },

  /* ────────── EOD Extended ──────────────── */
  fetchEODExtended(
    ticker: string,
    period: string = "d",
    from_date?: string,
    to_date?: string
  ): Promise<any> {
    let url = `${BASE}/historical/eod-extended?ticker=${ticker}&period=${period}`;
    if (from_date) url += `&from_date=${from_date}`;
    if (to_date) url += `&to_date=${to_date}`;
    return getJSON<any>(url);
  },

  /* ═══════════ NEW: MACROECONOMIC DATA ═══════════ */

  /* ────────── Macro Indicator ───────────── */
  fetchMacroIndicator(
    country: string,
    indicator: string,
    from_date?: string,
    to_date?: string
  ): Promise<any> {
    let url = `${BASE}/macro/indicator?country=${country}&indicator=${indicator}`;
    if (from_date) url += `&from_date=${from_date}`;
    if (to_date) url += `&to_date=${to_date}`;
    return getJSON<any>(url);
  },

  /* ────────── Economic Events ───────────── */
  fetchEconomicEvents(
    from_date?: string,
    to_date?: string,
    country?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any> {
    let url = `${BASE}/macro/economic-events?limit=${limit}&offset=${offset}`;
    if (from_date) url += `&from_date=${from_date}`;
    if (to_date) url += `&to_date=${to_date}`;
    if (country) url += `&country=${country}`;
    return getJSON<any>(url);
  },

  /* ────────── Bulk Indicators ───────────── */
  fetchIndicatorsBulk(
    country: string = "USA",
    from_date?: string,
    to_date?: string
  ): Promise<any> {
    let url = `${BASE}/macro/indicators-bulk?country=${country}`;
    if (from_date) url += `&from_date=${from_date}`;
    if (to_date) url += `&to_date=${to_date}`;
    return getJSON<any>(url);
  },

  /* ────────── Macro Indicators (Wrapper) ──── */
  fetchMacroIndicators(indicators: string[]): Promise<any> {
    // This is a wrapper that could fetch multiple indicators
    // For now, just return indicators-bulk data
    return this.fetchIndicatorsBulk("USA");
  },

  /* ────────── Economic Calendar (Wrapper) ─── */
  fetchEconomicCalendar(from_date?: string, to_date?: string): Promise<any> {
    return this.fetchEconomicEvents(from_date, to_date);
  },

  /* ────────── Logo (Wrapper) ──────────────── */
  fetchLogo(ticker: string): Promise<any> {
    return this.fetchCompanyLogo(ticker);
  },

  /* ────────── Historical Constituents (Wrapper) */
  fetchHistoricalConstituents(index: string, date?: string): Promise<any> {
    return this.fetchIndexHistoricalConstituents(index, date);
  },

  /* ═══════════ NEW: CHAT WITH DYNAMIC PANELS ═══════════ */

  /* ────────── Chat with Panels ──────────── */
  chatWithPanels(message: string, history: any[] = []): Promise<{message: string; panels: any[]}> {
    return fetch(`${BASE}/chat/panels`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message, history })
    }).then(res => res.json());
  },

  /* ═══════════ NEW: MONITORING & METRICS (Phase 2C) ═══════════ */

  /* ────────── Health Check ──────────────── */
  fetchHealthCheck(): Promise<any> {
    return getJSON<any>(`${BASE}/monitoring/health`);
  },

  /* ────────── Database Metrics ──────────── */
  fetchDatabaseMetrics(): Promise<any> {
    return getJSON<any>(`${BASE}/monitoring/metrics/database`);
  },

  /* ────────── Cache Metrics ─────────────── */
  fetchCacheMetrics(): Promise<any> {
    return getJSON<any>(`${BASE}/monitoring/metrics/cache`);
  },

  /* ────────── System Metrics ────────────── */
  fetchSystemMetrics(): Promise<any> {
    return getJSON<any>(`${BASE}/monitoring/metrics/system`);
  },

  /* ────────── API Usage Metrics ──────────── */
  fetchAPIUsageMetrics(): Promise<any> {
    return getJSON<any>(`${BASE}/monitoring/metrics/api-usage`);
  },

  /* ────────── Dashboard (All Metrics) ────── */
  fetchMonitoringDashboard(): Promise<any> {
    return getJSON<any>(`${BASE}/monitoring/dashboard`);
  },

  /* ────────── Intraday Metrics ──────────── */
  fetchIntradayMetrics(): Promise<any> {
    return getJSON<any>(`${BASE}/monitoring/metrics/intraday`);
  },

  /* ────────── Trigger Cache Warming ────────── */
  async triggerCacheWarming(): Promise<{status: string; message: string}> {
    const r = await fetch(`${BASE}/monitoring/cache-warming/trigger`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ────────── Start Cache Warming Service ─── */
  async startCacheWarming(): Promise<{status: string; message: string}> {
    const r = await fetch(`${BASE}/monitoring/cache-warming/start`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ────────── Stop Cache Warming Service ──── */
  async stopCacheWarming(): Promise<{status: string; message: string}> {
    const r = await fetch(`${BASE}/monitoring/cache-warming/stop`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ═══════════ NEW: DATA REFRESH PIPELINE (Phase 2D) ═══════════ */

  /* ────────── Get Refresh Pipeline Status ─── */
  fetchRefreshPipelineStatus(): Promise<any> {
    return getJSON<any>(`${BASE}/monitoring/refresh-pipeline/status`);
  },

  /* ────────── Start Refresh Pipeline ────────── */
  async startRefreshPipeline(): Promise<{status: string; message: string}> {
    const r = await fetch(`${BASE}/monitoring/refresh-pipeline/start`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ────────── Stop Refresh Pipeline ─────────── */
  async stopRefreshPipeline(): Promise<{status: string; message: string}> {
    const r = await fetch(`${BASE}/monitoring/refresh-pipeline/stop`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ────────── Trigger Daily Refresh ─────────── */
  async triggerDailyRefresh(): Promise<{status: string; message: string}> {
    const r = await fetch(`${BASE}/monitoring/refresh-pipeline/trigger-daily`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ────────── Trigger Weekly Refresh ────────── */
  async triggerWeeklyRefresh(): Promise<{status: string; message: string}> {
    const r = await fetch(`${BASE}/monitoring/refresh-pipeline/trigger-weekly`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ────────── Trigger OHLCV Refresh ─────────── */
  async triggerOHLCVRefresh(): Promise<{status: string; message: string}> {
    const r = await fetch(`${BASE}/monitoring/refresh-pipeline/trigger-ohlcv`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ────────── Trigger Fundamentals Refresh ──── */
  async triggerFundamentalsRefresh(): Promise<{status: string; message: string}> {
    const r = await fetch(`${BASE}/monitoring/refresh-pipeline/trigger-fundamentals`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ────────── Trigger News Refresh ──────────── */
  async triggerNewsRefresh(): Promise<{status: string; message: string}> {
    const r = await fetch(`${BASE}/monitoring/refresh-pipeline/trigger-news`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ────────── Trigger Dividends Refresh ───────── */
  async triggerDividendsRefresh(): Promise<{status: string; message: string}> {
    const r = await fetch(`${BASE}/monitoring/refresh-pipeline/trigger-dividends`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ═══════════ ADMIN - DATABASE MANAGEMENT ═══════════ */

  /* ────────── Get Database Stats ────────────────────── */
  fetchDatabaseStats(): Promise<any> {
    return getJSON<any>(`${BASE}/admin/database-stats`);
  },

  /* ────────── Populate US Companies ─────────────────── */
  async populateCompanies(limit: number = 1500): Promise<any> {
    const r = await fetch(`${BASE}/admin/populate-companies?limit=${limit}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ────────── Populate from ETF Holdings ─────────────── */
  async populateFromETF(
    etfTicker: string,
    exchange: string = 'US',
    maxHoldings?: number,
    minWeight?: number
  ): Promise<any> {
    const body: any = { etf_ticker: etfTicker, exchange };
    if (maxHoldings !== undefined) body.max_holdings = maxHoldings;
    if (minWeight !== undefined) body.min_weight = minWeight;

    const r = await fetch(`${BASE}/admin/populate-from-etf`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ────────── Get Ticker Inventory ──────────────────── */
  async fetchTickerInventory(search?: string, filterMissing: boolean = false, limit: number = 100, offset: number = 0): Promise<any> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      filter_missing: filterMissing.toString(),
    });
    if (search) params.append('search', search);

    return getJSON<any>(`${BASE}/admin/ticker-inventory?${params}`);
  },

  /* ────────── Refresh Single Ticker ─────────────────── */
  async refreshTicker(ticker: string, dataTypes: string[]): Promise<any> {
    const r = await fetch(`${BASE}/admin/refresh-ticker`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ticker, data_types: dataTypes }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ═══════════ SPECIAL DATA (Additional) ═══════════ */

  /* ────────── Index Historical Constituents ─── */
  fetchIndexHistoricalConstituents(
    index: string,
    date?: string
  ): Promise<any> {
    let url = `${BASE}/special/index-historical-constituents?index=${index}`;
    if (date) url += `&date=${date}`;
    return getJSON<any>(url);
  },

  /* ═══════════ LLM SETTINGS ═══════════ */

  /* ────────── Get LLM Settings ──────────────── */
  fetchLLMSettings(): Promise<any> {
    return getJSON<any>(`${BASE}/settings/llm`);
  },

  /* ────────── Update LLM Setting ────────────── */
  async updateLLMSetting(field: string, model_name: string): Promise<any> {
    const r = await fetch(`${BASE}/settings/llm`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ field, model_name }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ────────── Get Available LLM Models ───────── */
  fetchLLMModels(): Promise<string[]> {
    return getJSON<string[]>(`${BASE}/settings/llm/models`);
  },

  /* ═══════════ NEW: MARKETSENSE AI ANALYSIS ═══════════ */

  /* ────────── Stock AI Analysis ──────────────── */
  async analyzeStock(ticker: string, deepResearch: boolean = false): Promise<any> {
    const r = await fetch(`${BASE}/api/v2/stocks/${ticker}/ai-analysis?deep_research=${deepResearch}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!r.ok) {
      const error = await r.json();
      throw new Error(error.detail || 'AI analysis failed');
    }
    return r.json();
  },

  /* ────────── Stock AI Analysis History ───────── */
  fetchStockAnalysisHistory(ticker: string, limit: number = 10): Promise<any> {
    return getJSON<any>(`${BASE}/api/v2/stocks/${ticker}/ai-analysis/history?limit=${limit}`);
  },

  /* ────────── Currency AI Analysis ────────────── */
  async analyzeCurrency(pair: string, deepResearch: boolean = false): Promise<any> {
    const r = await fetch(`${BASE}/api/v2/currencies/${pair}/ai-analysis?deep_research=${deepResearch}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!r.ok) {
      const error = await r.json();
      throw new Error(error.detail || 'AI analysis failed');
    }
    return r.json();
  },

  /* ────────── ETF AI Analysis ──────────────────── */
  async analyzeETF(symbol: string, deepResearch: boolean = false): Promise<any> {
    const r = await fetch(`${BASE}/api/v2/etfs/${symbol}/ai-analysis?deep_research=${deepResearch}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!r.ok) {
      const error = await r.json();
      throw new Error(error.detail || 'AI analysis failed');
    }
    return r.json();
  },

  /* ────────── Macro AI Analysis ─────────────────── */
  async analyzeMacro(indicator: string, deepResearch: boolean = false): Promise<any> {
    const r = await fetch(`${BASE}/api/v2/macro/${indicator}/ai-analysis?deep_research=${deepResearch}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!r.ok) {
      const error = await r.json();
      throw new Error(error.detail || 'AI analysis failed');
    }
    return r.json();
  },

  /* ────────── Portfolio AI Analysis ──────────────── */
  async analyzePortfolio(portfolioId: number, deepResearch: boolean = false): Promise<any> {
    const r = await fetch(`${BASE}/api/v2/portfolios/${portfolioId}/ai-analysis?deep_research=${deepResearch}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!r.ok) {
      const error = await r.json();
      throw new Error(error.detail || 'AI analysis failed');
    }
    return r.json();
  },

  /* ═══════════ PORTFOLIO MANAGEMENT ═══════════ */

  /* ────────── List Portfolios ──────────────── */
  fetchPortfolios(): Promise<any> {
    return getJSON<any>(`${BASE}/api/portfolios`);
  },

  /* ────────── Get Portfolio Details ──────────── */
  fetchPortfolio(portfolioId: number): Promise<any> {
    return getJSON<any>(`${BASE}/api/portfolios/${portfolioId}`);
  },

  /* ────────── Create Portfolio ──────────────── */
  async createPortfolio(name: string, description?: string): Promise<any> {
    const r = await fetch(`${BASE}/api/portfolios`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, description }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ────────── Update Portfolio ──────────────── */
  async updatePortfolio(portfolioId: number, name?: string, description?: string): Promise<any> {
    const r = await fetch(`${BASE}/api/portfolios/${portfolioId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ name, description }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ────────── Delete Portfolio ──────────────── */
  async deletePortfolio(portfolioId: number): Promise<any> {
    const r = await fetch(`${BASE}/api/portfolios/${portfolioId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ────────── Add Stock to Portfolio ──────────── */
  async addStockToPortfolio(portfolioId: number, ticker: string, weight?: number, shares?: number): Promise<any> {
    const r = await fetch(`${BASE}/api/portfolios/${portfolioId}/stocks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ticker, weight, shares }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ────────── Remove Stock from Portfolio ──────── */
  async removeStockFromPortfolio(portfolioId: number, stockId: number): Promise<any> {
    const r = await fetch(`${BASE}/api/portfolios/${portfolioId}/stocks/${stockId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ────────── Update Portfolio Weights ──────────── */
  async updatePortfolioWeights(portfolioId: number, weights: Record<string, number>): Promise<any> {
    const r = await fetch(`${BASE}/api/portfolios/${portfolioId}/weights`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ weights }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ────────── Update Individual Stock Weight ──────────── */
  async updateStockWeight(portfolioId: number, ticker: string, weight: number): Promise<any> {
    const r = await fetch(`${BASE}/api/portfolios/${portfolioId}/stocks/${ticker}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ ticker, weight }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ────────── Update Portfolio Shares (Auto-calculates Weights) ──────────── */
  async updatePortfolioShares(portfolioId: number, shares: Record<string, number>): Promise<any> {
    const r = await fetch(`${BASE}/api/portfolios/${portfolioId}/shares`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ shares }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ────────── Convert Weights to Shares ──────────── */
  async convertWeightsToShares(
    portfolioId: number,
    weights: Record<string, number>,
    portfolioValue: number
  ): Promise<{shares: Record<string, number>, total_value: number, current_prices: Record<string, number>}> {
    const r = await fetch(`${BASE}/api/portfolios/${portfolioId}/weights-to-shares`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ weights, portfolio_value: portfolioValue }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ────────── Actual Portfolio Analysis (based on shares) ──────────── */
  async fetchActualPortfolioAnalysis(
    portfolioId: number,
    startDate?: string,
    endDate?: string,
    useAdjusted: boolean = true
  ): Promise<any> {
    const params = new URLSearchParams({
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate }),
      use_adjusted: String(useAdjusted),
    });

    const r = await fetch(`${BASE}/api/portfolios/${portfolioId}/analysis/actual?${params}`, {
      headers: getHeaders(),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  /* ────────── Equal-Weight Analysis ──────────── */
  fetchEqualWeightAnalysis(
    portfolioId: number,
    startDate?: string,
    endDate?: string,
    useAdjusted: boolean = true
  ): Promise<any> {
    let url = `${BASE}/api/portfolios/${portfolioId}/analysis/equal-weight?use_adjusted=${useAdjusted}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    return getJSON<any>(url);
  },

  /* ────────── Optimized Portfolio Analysis ──────── */
  fetchOptimizedPortfolio(
    portfolioId: number,
    method: string = "mvo", // "mvo", "min_variance", "black_litterman"
    startDate?: string,
    endDate?: string,
    useAdjusted: boolean = true
  ): Promise<any> {
    let url = `${BASE}/api/portfolios/${portfolioId}/analysis/optimized?method=${method}&use_adjusted=${useAdjusted}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    return getJSON<any>(url);
  },

  /* ────────── Monte Carlo Simulation ──────────── */
  fetchMonteCarloSimulation(
    portfolioId: number,
    numSimulations: number = 1000,
    timeHorizonDays: number = 252,
    initialValue: number = 10000,
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    let url = `${BASE}/api/portfolios/${portfolioId}/risk/monte-carlo?num_simulations=${numSimulations}&time_horizon_days=${timeHorizonDays}&initial_value=${initialValue}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    return getJSON<any>(url);
  },

  /* ────────── VaR Analysis ──────────────────── */
  fetchVaRAnalysis(
    portfolioId: number,
    confidenceLevel: number = 0.95,
    timeHorizonDays: number = 1,
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    let url = `${BASE}/api/portfolios/${portfolioId}/risk/var?confidence_level=${confidenceLevel}&time_horizon_days=${timeHorizonDays}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    return getJSON<any>(url);
  },
};
