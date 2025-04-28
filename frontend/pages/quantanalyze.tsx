// app/quantanalyze/page.tsx – OHLC, Monte‑Carlo fan, returns dist, β‑scatter, cumulative return
"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { useSearchParams } from "next/navigation";

import { api } from "../lib/api";
import { OLHCV } from "../types/models";
import {
  EquitySimulationResponse,
  ReturnsResponse,
  EquityCumRetResponse,
} from "../types/equity";

import ComboChartResponsive from "../components/ComboChartResponsive";
import EquityChart from "../components/EquityChart";
import ReturnsAnalytics from "../components/ReturnsAnalytics";
import CumulativeReturnChart from "../components/CumulativeReturnChart";

export default function QuantAnalyzePage() {
  const params = useSearchParams();
  const initialTicker = params.get("ticker")?.toUpperCase() || "AAPL";

  /* ─────────── state ─────────── */
  const [ticker, setTicker] = useState(initialTicker);
  const [input, setInput] = useState(initialTicker);

  const [ohlcv, setOhlcv]       = useState<OLHCV[]>([]);
  const [sim, setSim]           = useState<EquitySimulationResponse | null>(null);
  const [retData, setRetData]   = useState<ReturnsResponse | null>(null);
  const [cumData, setCumData]   = useState<EquityCumRetResponse | null>(null);

  const [loading,   setLoading]   = useState(false);
  const [simLoading,setSimLoading]= useState(false);
  const [retLoading,setRetLoading]= useState(false);
  const [cumLoading,setCumLoading]= useState(false);

  const [error,   setError]   = useState<string|null>(null);
  const [simError,setSimError]= useState<string|null>(null);
  const [retError,setRetError]= useState<string|null>(null);
  const [cumError,setCumError]= useState<string|null>(null);

  /* ─────────── fetch helpers ─────────── */
  const fetchEOD = async (sym: string) => {
    setLoading(true); setError(null);
    try   { const { data } = await api.fetchEODData(sym); setOhlcv(data); }
    catch (e:any){ setError(e.message || "Failed to load EOD"); }
    finally { setLoading(false); }
  };

  const fetchSim = async (sym: string) => {
    setSimLoading(true); setSimError(null);
    try   { setSim(await api.simulateEquity(sym)); }
    catch (e:any){ setSimError(e.message || "Simulation error"); }
    finally { setSimLoading(false); }
  };

  const fetchReturns = async (sym: string) => {
    setRetLoading(true); setRetError(null);
    try   { setRetData(await api.fetchReturns(sym)); }
    catch (e:any){ setRetError(e.message || "Returns error"); }
    finally { setRetLoading(false); }
  };

  const fetchCum = async (sym: string) => {
    setCumLoading(true); setCumError(null);
    try   { setCumData(await api.fetchCumRet(sym)); }
    catch (e:any){ setCumError(e.message || "Cum‑return error"); }
    finally { setCumLoading(false); }
  };

  /* ─────────── side‑effects ─────────── */
  useEffect(() => {
    fetchEOD(ticker);
    fetchSim(ticker);
    fetchReturns(ticker);
    fetchCum(ticker);
  }, [ticker]);

  /* ─────────── handlers ─────────── */
  const onTickerKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const next = input.trim().toUpperCase();
      if (next && next !== ticker) setTicker(next);
    }
  };

  /* ─────────── render ─────────── */
  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden">
      {/* search bar */}
      <div className="p-4 flex items-end gap-4">
        <input
          className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white w-48"
          placeholder="Enter ticker (e.g. TSLA)"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={onTickerKey}
        />
        <span className="text-slate-400 text-sm">Press Enter to load</span>
      </div>

      {/* layout */}
      <div className="flex flex-1 overflow-hidden divide-x divide-slate-700">
        {/* left – 90‑day OHLC combo chart */}
        <div className="w-1/2 p-4 overflow-auto">
          <ComboChartResponsive data={ohlcv} ticker={ticker} interval="1d" />
          {loading && <p className="text-center text-blue-400 mt-4">🔄 Loading…</p>}
          {error   && <p className="text-center text-red-400  mt-4">❌ {error}</p>}
        </div>

        {/* right – analytics */}
        <div className="w-1/2 p-4 overflow-auto space-y-6">
          {sim && (
            <EquityChart
              equityCurve={sim.equity_curve}
              monteCarlo={sim.monte_carlo}
              var95={sim.var_95}
            />
          )}
          {simLoading && <p className="text-center text-blue-400">🔄 Simulating…</p>}
          {simError   && <p className="text-center text-red-400">❌ {simError}</p>}

          {retData && <ReturnsAnalytics data={retData} />}
          {retLoading && <p className="text-center text-blue-400">🔄 Loading returns…</p>}
          {retError   && <p className="text-center text-red-400">❌ {retError}</p>}

          {cumData && <CumulativeReturnChart data={cumData} />}
          {cumLoading && <p className="text-center text-blue-400">🔄 Loading cum‑returns…</p>}
          {cumError   && <p className="text-center text-red-400">❌ {cumError}</p>}
        </div>
      </div>
    </div>
  );
}
