// lib/api.ts – wrapper for backend endpoints

import { Executive_Summary, EODResult } from "../types/models";
import {
  EquitySimulationResponse,
  ReturnsResponse,EquityCumRetResponse,
} from "../types/equity";

const BASE = "http://localhost:8000";

const getJSON = async <T>(url: string): Promise<T> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
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
    return r.json();
  },

  /* ────────── End‑of‑Day quotes ────────── */
  async fetchEODData(ticker: string): Promise<EODResult> {
    return getJSON<EODResult>(`${BASE}/quantanalyzer/eod?ticker=${ticker}`);
  },

  /* ────────── Monte‑Carlo simulation ───── */
  async simulateEquity(
    ticker: string,
    horizon = 20
  ): Promise<EquitySimulationResponse> {
    return getJSON<EquitySimulationResponse>(
      `${BASE}/equity/simulate?ticker=${ticker}&horizon=${horizon}`
    );
  },

  /* ────────── Returns distribution & beta */
  async fetchReturns(
    ticker: string,
    years = 3,
    benchmark = "SPY"
  ): Promise<ReturnsResponse> {
    return getJSON<ReturnsResponse>(
      `${BASE}/equity/returns?ticker=${ticker}&years=${years}&benchmark=${benchmark}`
    );
  },


  async fetchCumRet(ticker: string, years = 3, benchmark = "SPY"): Promise<EquityCumRetResponse> {
    const url = `${BASE}/equity/cumret?ticker=${ticker}&years=${years}&benchmark=${benchmark}`
    return getJSON<EquityCumRetResponse>(url)
  }
};
