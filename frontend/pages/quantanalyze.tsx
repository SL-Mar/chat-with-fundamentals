// app/quantanalyze/page.tsx
//--------------------------------------------------------------------
// Dashboard that fetches & visualises:
//   • 90-day OHLC combo
//   • Monte-Carlo fan + VaR(95 %)
//   • Return histogram + β/α scatter
//   • Cumulative return vs. benchmark
//   • EWMA σ + CVaR snapshot
//   • Performance ratios
//   • Dispersion & risk
//   • Momentum & trend
//   • Seasonality heat-map
//   • Rolling β / α / R²
//   • Liquidity & volume
//   • ATR-% & Channel widths  ← NEW
//--------------------------------------------------------------------

"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { useSearchParams } from "next/navigation";

import { api } from "../lib/api";
import { OLHCV } from "../types/models";
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

import ComboChartResponsive  from "../components/ComboChartResponsive";
import EquityChart           from "../components/EquityChart";
import ReturnsAnalytics      from "../components/ReturnsAnalytics";
import CumulativeReturnChart from "../components/CumulativeReturnChart";
import VolForecastCard       from "../components/VolForecastCard";
import PerfRatiosPanel       from "../components/PerfRatiosPanel";
import RiskMetricsCard       from "../components/RiskMetricsCard";
import MomentumSignalsCard   from "../components/MomentumSignalsCard";
import SeasonalityHeatmap    from "../components/SeasonalityHeatmap";
import RollingBetaChart      from "../components/RollingBetaChart";
import LiquidityCard         from "../components/LiquidityCard";
import VolBandsCard          from "../components/VolBandsCard";      // ← NEW

/* ------------------------------------------------------------------ */

export default function QuantAnalyzePage() {
  const params        = useSearchParams();
  const initialTicker = (params.get("ticker") || "AAPL").toUpperCase();

  /* ───────────────────── state ﹠ refs ──────────────────────────── */
  const [ticker, setTicker] = useState(initialTicker);
  const [input,  setInput]  = useState(initialTicker);

  /* payload state */
  const [ohlcv,  setOhlcv]    = useState<OLHCV[]>([]);
  const [sim,    setSim]      = useState< EquitySimulationResponse | null>(null);
  const [ret,    setRet]      = useState< ReturnsResponse        | null>(null);
  const [cum,    setCum]      = useState< EquityCumRetResponse   | null>(null);
  const [vSnap,  setVSnap]    = useState< VolForecastResponse    | null>(null);
  const [perf,   setPerf]     = useState< PerfRatiosResponse     | null>(null);
  const [risk,   setRisk]     = useState< RiskMetricsResponse    | null>(null);
  const [mom,    setMom]      = useState< MomentumResponse       | null>(null);
  const [season, setSeason]   = useState< SeasonalityResponse    | null>(null);
  const [roll,   setRoll]     = useState< RollingBetaResponse    | null>(null);
  const [liq,    setLiq]      = useState< LiquidityResponse      | null>(null);
  const [bands,  setBands]    = useState< VolBandResponse        | null>(null);

  /* loading flags */
  const [loading, setLoading] = useState({
    ohlcv:false, sim:false, ret:false, cum:false, vsnap:false,
    perf:false, risk:false, mom:false, season:false,
    roll:false, liq:false, bands:false,
  });

  /* error text */
  const [err, setErr] = useState< Record<string,string|undefined> >({});

  /* helper to update loading/error maps */
  const flag = (key:keyof typeof loading, v:boolean)=>setLoading(p=>({...p,[key]:v}));
  const boom = (key:keyof typeof loading, e:unknown)=> setErr(p=>({...p,[key]:
                        (e as any)?.message || String(e)}));

  /* ──────────────────── fetch helpers ──────────────────────────── */
  const fetchAll = (sym:string)=>{
    /* OHLCV */
    (async()=>{
      flag("ohlcv",true); try{
        const { data } = await api.fetchEODData(sym); setOhlcv(data);
      } catch(e){ boom("ohlcv",e);} finally{ flag("ohlcv",false);}
    })();
    /* Monte-Carlo */
    (async()=>{
      flag("sim",true); try{ setSim(await api.simulateEquity(sym)); }
      catch(e){ boom("sim",e);} finally{ flag("sim",false);}
    })();
    /* Daily returns */
    (async()=>{
      flag("ret",true); try{ setRet(await api.fetchReturns(sym)); }
      catch(e){ boom("ret",e);} finally{ flag("ret",false);}
    })();
    /* Cumulative */
    (async()=>{
      flag("cum",true); try{ setCum(await api.fetchCumRet(sym)); }
      catch(e){ boom("cum",e);} finally{ flag("cum",false);}
    })();
    /* Vol snapshot */
    (async()=>{
      flag("vsnap",true); try{ setVSnap(await api.fetchVolForecast(sym)); }
      catch(e){ boom("vsnap",e);} finally{ flag("vsnap",false);}
    })();
    /* Perf ratios */
    (async()=>{
      flag("perf",true); try{ setPerf(await api.fetchPerfRatios(sym)); }
      catch(e){ boom("perf",e);} finally{ flag("perf",false);}
    })();
    /* Risk metrics */
    (async()=>{
      flag("risk",true); try{ setRisk(await api.fetchRiskMetrics(sym)); }
      catch(e){ boom("risk",e);} finally{ flag("risk",false);}
    })();
    /* Momentum */
    (async()=>{
      flag("mom",true); try{ setMom(await api.fetchMomentum(sym)); }
      catch(e){ boom("mom",e);} finally{ flag("mom",false);}
    })();
    /* Seasonality */
    (async()=>{
      flag("season",true); try{ setSeason(await api.fetchSeasonality(sym)); }
      catch(e){ boom("season",e);} finally{ flag("season",false);}
    })();
    /* Rolling beta */
    (async()=>{
      flag("roll",true); try{ setRoll(await api.fetchRollingBeta(sym)); }
      catch(e){ boom("roll",e);} finally{ flag("roll",false);}
    })();
    /* Liquidity */
    (async()=>{
      flag("liq",true); try{ setLiq(await api.fetchLiquidity(sym)); }
      catch(e){ boom("liq",e);} finally{ flag("liq",false);}
    })();
    /* ATR / channel widths */
    (async()=>{
      flag("bands",true); try{ setBands(await api.fetchVolBands(sym)); }
      catch(e){ boom("bands",e);} finally{ flag("bands",false);}
    })();
  };

  /* trigger fetch on ticker change */
  useEffect(()=>{ fetchAll(ticker); },[ticker]);

  /* ───────── input handler ───────── */
  const onKey = (e:KeyboardEvent<HTMLInputElement>)=>{
    if(e.key==="Enter"){
      const next = input.trim().toUpperCase();
      if(next && next!==ticker) setTicker(next);
    }
  };

  /* convenient helpers */
  const wait = (k:keyof typeof loading)=>
      loading[k] && <p className="text-center text-blue-400">🔄 Loading…</p>;
  const fail = (k:keyof typeof loading)=>
      err[k] && <p className="text-center text-red-400">❌ {err[k]}</p>;

  /* ───────── JSX ───────── */
  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden">
      {/* top-bar */}
      <div className="p-4 flex items-end gap-4">
        <input
          className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white w-48"
          value={input}
          placeholder="Enter ticker (e.g. TSLA)"
          onChange={e=>setInput(e.target.value.toUpperCase())}
          onKeyDown={onKey}
        />
        <span className="text-slate-400 text-sm">Press Enter to load</span>
      </div>

      <div className="flex flex-1 overflow-hidden divide-x divide-slate-700">
        {/* left column */}
        <div className="w-1/2 p-4 overflow-auto">
          <ComboChartResponsive data={ohlcv} ticker={ticker} interval="1d"/>
          {wait("ohlcv")}{fail("ohlcv")}
        </div>

        {/* right column */}
        <div className="w-1/2 p-4 overflow-auto space-y-6">
          {/* Monte-Carlo */}
          {sim && <EquityChart equityCurve={sim.equity_curve}
                               monteCarlo={sim.monte_carlo}
                               var95={sim.var_95}/>}
          {wait("sim")}{fail("sim")}

          {/* Returns */}
          {ret && <ReturnsAnalytics data={ret}/>}
          {wait("ret")}{fail("ret")}

          {/* Cumulative */}
          {cum && <CumulativeReturnChart data={cum}/>}
          {wait("cum")}{fail("cum")}

          {/* Vol snapshot */}
          {vSnap && <VolForecastCard data={vSnap} ticker={ticker} lookback={250}/>}
          {wait("vsnap")}{fail("vsnap")}

          {/* Performance */}
          {perf && <PerfRatiosPanel data={perf} ticker={ticker} years={3}/>}
          {wait("perf")}{fail("perf")}

          {/* Risk */}
          {risk && <RiskMetricsCard data={risk} ticker={ticker}/>}
          {wait("risk")}{fail("risk")}

          {/* Momentum */}
          {mom && <MomentumSignalsCard data={mom} ticker={ticker}/>}
          {wait("mom")}{fail("mom")}

          {/* Seasonality */}
          {season && <SeasonalityHeatmap data={season} ticker={ticker}/>}
          {wait("season")}{fail("season")}

          {/* Rolling β */}
          {roll && <RollingBetaChart data={roll}/>}
          {wait("roll")}{fail("roll")}

          {/* Liquidity */}
          {liq && <LiquidityCard data={liq} ticker={ticker}/>}
          {wait("liq")}{fail("liq")}

          {/* ATR-% / Channel widths */}
          {bands && <VolBandsCard data={bands} ticker={ticker}/>}
          {wait("bands")}{fail("bands")}
        </div>
      </div>
    </div>
  );
}
