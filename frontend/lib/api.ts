import { Executive_Summary, EODResult } from "../types/models";
import {
  EquitySimulationResponse,
  ReturnsResponse,
  EquityCumRetResponse,
  VolForecastResponse,
  PerfRatiosResponse,
} from "../types/equity";
import { AcademicResponse } from "../types/research";

const BASE = "http://localhost:8001";

/* ──────────────── Helpers ──────────────── */
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
      msg = detail || msg;
    } catch {
      msg = await res.text();
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
};

/* ──────────────── API ──────────────── */
export const api = {
  /* ───── Fundamentals Chat ───── */
  chatWithFundamentals(question: string): Promise<Executive_Summary> {
    return postJSON(`${BASE}/analyzer/chat`, { user_query: question });
  },

  /* ───── Academic Research Report ───── */
  fetchResearchReport(query: string): Promise<AcademicResponse> {
    return postJSON(`${BASE}/researcher/report`, { user_query: query });
  },

  /* ───── Export Report as PDF ───── */
  async exportPDF(reportMarkdown: string): Promise<Blob> {
    if (typeof reportMarkdown !== "string" || reportMarkdown.trim() === "") {
      throw new Error("Invalid reportMarkdown: must be a non-empty string");
    }

    const res = await fetch(`${BASE}/researcher/export-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report_md: reportMarkdown }), // ✅ MATCHES backend ReportInput
    });

    if (!res.ok) {
      throw new Error(`Export failed: ${await res.text()}`);
    }

    return res.blob();
  },

  /* ───── EOD Quote Fetch ───── */
  fetchEODData(ticker: string): Promise<EODResult> {
    return getJSON(`${BASE}/quantanalyzer/eod?ticker=${ticker}`);
  },

  /* ───── Monte Carlo Simulation ───── */
  simulateEquity(ticker: string, horizon = 20): Promise<EquitySimulationResponse> {
    return getJSON(`${BASE}/equity/simulate?ticker=${ticker}&horizon=${horizon}`);
  },

  /* ───── Returns Distribution & Beta ───── */
  fetchReturns(ticker: string, years = 3, benchmark = "SPY"): Promise<ReturnsResponse> {
    return getJSON(`${BASE}/equity/returns?ticker=${ticker}&years=${years}&benchmark=${benchmark}`);
  },

  /* ───── Cumulative Return Curve ───── */
  fetchCumRet(ticker: string, years = 3, benchmark = "SPY"): Promise<EquityCumRetResponse> {
    return getJSON(`${BASE}/equity/cumret?ticker=${ticker}&years=${years}&benchmark=${benchmark}`);
  },

  /* ───── Volatility Forecast Snapshot ───── */
  fetchVolForecast(ticker: string, lookback = 250): Promise<VolForecastResponse> {
    return getJSON(`${BASE}/equity/vol?ticker=${ticker}&lookback=${lookback}`);
  },

  /* ───── Performance Ratios Snapshot ───── */
  fetchPerfRatios(ticker: string, years = 3): Promise<PerfRatiosResponse> {
    return getJSON(`${BASE}/equity/perf?ticker=${ticker}&years=${years}`);
  },
};
