// lib/api.ts – front-end REST helpers for the 8001 backend
//-----------------------------------------------------------------------

import {
  Executive_Summary,
  EODResult,
} from "../types/models";
import {
  EquitySimulationResponse,
  ReturnsResponse,
  EquityCumRetResponse,
  VolForecastResponse,
  PerfRatiosResponse,
  RiskMetricsResponse,
  MomentumResponse,
  SeasonalityResponse,
  RollingBetaResponse,
  LiquidityResponse,
  VolBandResponse,
} from "../types/equity";
import { AcademicResponse } from "../types/research";

/* ───────────────── base URL (env-override → 8001 default) ───────────────── */
const BASE =
  (process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
    "http://localhost:8001") as string;

/* ─────────────────── internal JSON helpers ──────────────────────────────── */
const getJSON = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
};

const postJSON = async <T>(url: string, body: object): Promise<T> => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let msg = "Request failed";
    try {
      const { detail } = await res.json();
      if (detail) msg = detail;
    } catch {
      msg = await res.text();
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
};

/* ───────────────────────── public API wrapper ───────────────────────────── */
export const api = {
  /* ───── Fundamentals chat ───── */
  chatWithFundamentals(question: string): Promise<Executive_Summary> {
    return postJSON(`${BASE}/analyzer/chat`, { user_query: question });
  },

  /* ───── Academic research ───── */
  fetchResearchReport(query: string): Promise<AcademicResponse> {
    return postJSON(`${BASE}/researcher/report`, { user_query: query });
  },

  /* ───── Export report as PDF ───── */
  async exportPDF(reportMarkdown: string): Promise<Blob> {
    if (!reportMarkdown.trim())
      throw new Error("reportMarkdown is empty");

    const res = await fetch(`${BASE}/researcher/export-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report_md: reportMarkdown }),
    });

    if (!res.ok) throw new Error(`Export failed: ${await res.text()}`);
    return res.blob();
  },

  /* ───── EOD OHLCV quote fetch (served by the other micro-service) ───── */
  fetchEODData(ticker: string): Promise<EODResult> {
    const qs = new URLSearchParams({ ticker: ticker.toUpperCase() });
    return getJSON(`${BASE}/quantanalyzer/eod?${qs.toString()}`);
  },

  /* ───────────────────── /equity analytics ───────────────────── */

  /* Monte-Carlo simulation */
  simulateEquity(
    ticker: string,
    horizon = 20,
    seed?: number
  ): Promise<EquitySimulationResponse> {
    const qs = new URLSearchParams({
      ticker: ticker.toUpperCase(),
      horizon: String(horizon),
      ...(seed !== undefined ? { seed: String(seed) } : {}),
    });
    return getJSON(`${BASE}/equity/simulate?${qs.toString()}`);
  },

  /* Daily returns + CAPM β/α scatter */
  fetchReturns(
    ticker: string,
    years = 3,
    benchmark = "SPY"
  ): Promise<ReturnsResponse> {
    const qs = new URLSearchParams({
      ticker: ticker.toUpperCase(),
      years: String(years),
      benchmark: benchmark.toUpperCase(),
    });
    return getJSON(`${BASE}/equity/returns?${qs.toString()}`);
  },

  /* Cumulative gross return curves */
  fetchCumRet(
    ticker: string,
    years = 3,
    benchmark = "SPY"
  ): Promise<EquityCumRetResponse> {
    const qs = new URLSearchParams({
      ticker: ticker.toUpperCase(),
      years: String(years),
      benchmark: benchmark.toUpperCase(),
    });
    return getJSON(`${BASE}/equity/cumret?${qs.toString()}`);
  },

  /* EWMA σ forecast + empirical CVaR(99 %) */
  fetchVolForecast(
    ticker: string,
    lookback = 250
  ): Promise<VolForecastResponse> {
    const qs = new URLSearchParams({
      ticker: ticker.toUpperCase(),
      lookback: String(lookback),
    });
    return getJSON(`${BASE}/equity/vol?${qs.toString()}`);
  },

  /* Sharpe / Sortino / Max-DD / Calmar */
  fetchPerfRatios(
    ticker: string,
    years = 3
  ): Promise<PerfRatiosResponse> {
    const qs = new URLSearchParams({
      ticker: ticker.toUpperCase(),
      years: String(years),
    });
    return getJSON(`${BASE}/equity/perf?${qs.toString()}`);
  },

  /* Dispersion & tail-risk snapshot */
  fetchRiskMetrics(
    ticker: string,
    lookback = 252
  ): Promise<RiskMetricsResponse> {
    const qs = new URLSearchParams({
      ticker: ticker.toUpperCase(),
      lookback: String(lookback),
    });
    return getJSON(`${BASE}/equity/risk?${qs.toString()}`);
  },

  /* Momentum & trend snapshot */
  fetchMomentum(
    ticker: string,
    lookback = 300
  ): Promise<MomentumResponse> {
    const qs = new URLSearchParams({
      ticker: ticker.toUpperCase(),
      lookback: String(lookback),
    });
    return getJSON(`${BASE}/equity/momentum?${qs.toString()}`);
  },

  /* Seasonality heat-map */
  fetchSeasonality(
    ticker: string,
    years = 10
  ): Promise<SeasonalityResponse> {
    const qs = new URLSearchParams({
      ticker: ticker.toUpperCase(),
      years: String(years),
    });
    return getJSON(`${BASE}/equity/seasonality?${qs.toString()}`);
  },

  /* Rolling β / α / R² */
  fetchRollingBeta(
    ticker: string,
    benchmark = "SPY",
    window = 252
  ): Promise<RollingBetaResponse> {
    const qs = new URLSearchParams({
      ticker: ticker.toUpperCase(),
      benchmark: benchmark.toUpperCase(),
      window: String(window),
    });
    return getJSON(`${BASE}/equity/rolling_beta?${qs.toString()}`);
  },

  /* Volume + liquidity metrics */
  fetchLiquidity(
    ticker: string,
    lookback = 260
  ): Promise<LiquidityResponse> {
    const qs = new URLSearchParams({
      ticker: ticker.toUpperCase(),
      lookback: String(lookback),
    });
    return getJSON(`${BASE}/equity/liquidity?${qs.toString()}`);
  },

  /* ATR-%  +  Channel-widths (Keltner & Donchian) */
  fetchVolBands(
    ticker: string,
    lookback = 260
  ): Promise<VolBandResponse> {
    const qs = new URLSearchParams({
      ticker: ticker.toUpperCase(),
      lookback: String(lookback),
    });
    /* ✅ underscore matches FastAPI router */
    return getJSON(`${BASE}/equity/vol_bands?${qs.toString()}`);
  },
};
