// lib/api.ts – wrapper for backend endpoints

import { Executive_Summary, EODResult } from "../types/models";
import {
  EquitySimulationResponse,
  ReturnsResponse,
  EquityCumRetResponse,
  VolForecastResponse,      // ← NEW interface
  PerfRatiosResponse        // ← NEW interface
} from "../types/equity";

const BASE = "http://localhost:8000";

const getJSON = async <T>(url: string): Promise<T> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<T>;
};

export const api = {
  /* ────────── Fundamentals chat ────────── */
  async chatWithFundamentals(question: string): Promise<Executive_Summary> {
    const r = await fetch(`${BASE}/analyzer/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      `${BASE}/equity/returns?ticker=${ticker}&years=${years}&benchmark=${benchmark}`
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
};
