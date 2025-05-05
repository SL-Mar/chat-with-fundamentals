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
};
