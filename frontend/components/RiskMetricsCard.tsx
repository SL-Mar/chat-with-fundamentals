"use client";

import type { RiskMetricsResponse } from "../types/equity";

export default function RiskMetricsCard({ data, ticker }:{
  data: RiskMetricsResponse;
  ticker: string;
}) {
  const fmtPct = (v: number, d = 2) => (v * 100).toFixed(d) + "%";

  return (
    <div className="bg-gray-900 border border-slate-700 rounded p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-200">
        {ticker} Dispersion &amp; Risk (lookback {data.lookback}d)
      </h4>

      <div className="grid grid-cols-2 gap-y-1 text-sm text-slate-200">
        <span>σ&nbsp;30d&nbsp;: {fmtPct(data.rolling_sigma["30d"])}</span>
        <span>σ&nbsp;60d&nbsp;: {fmtPct(data.rolling_sigma["60d"])}</span>
        <span>σ&nbsp;90d&nbsp;: {fmtPct(data.rolling_sigma["90d"])}</span>
        <span>Parkinson&nbsp;: {fmtPct(data.range_vol.parkinson)}</span>
        <span>G-K&nbsp;range&nbsp;: {fmtPct(data.range_vol.garman_klass)}</span>
        <span>VaR&nbsp;95&nbsp;: {fmtPct(data.hist_var.p95)}</span>
        <span>CVaR&nbsp;95&nbsp;: {fmtPct(data.hist_cvar.p95)}</span>
        <span>VaR&nbsp;99&nbsp;: {fmtPct(data.hist_var.p99)}</span>
        <span>CVaR&nbsp;99&nbsp;: {fmtPct(data.hist_cvar.p99)}</span>
        <span>Max&nbsp;DD&nbsp;: {fmtPct(data.max_dd, 1)}</span>
        <span>Avg&nbsp;DD&nbsp;len&nbsp;: {data.avg_dd_len} d</span>
      </div>
    </div>
  );
}
