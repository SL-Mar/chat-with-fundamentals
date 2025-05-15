// components/PerfRatiosPanel.tsx
"use client";

import type { PerfRatiosResponse } from "../types/equity";

interface Props {
  data:   PerfRatiosResponse;  // ← pre-fetched in the page
  ticker: string;
  years:  number;
}

/* Simple traffic-light colouring */
const colour = (v: number, goodHigh = true) =>
  goodHigh
    ? { color: v >= 1 ? "limegreen" : "orange" }
    : { color: v <= -0.2 ? "red" : "orange" };

export default function PerfRatiosPanel({ data, ticker, years }: Props) {
  return (
    <div className="bg-gray-900 border border-slate-700 rounded p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-200">
        {ticker} Performance Ratios (last {years} y)
      </h4>

      <div className="grid grid-cols-2 gap-3 text-sm text-slate-200">
        <span style={colour(data.sharpe)}>Sharpe: {data.sharpe.toFixed(2)}</span>
        <span style={colour(data.sortino)}>Sortino: {data.sortino.toFixed(2)}</span>
        <span style={colour(data.max_dd, false)}>
          Max-DD: {(data.max_dd * 100).toFixed(1)} %
        </span>
        <span style={colour(data.calmar)}>Calmar: {data.calmar.toFixed(2)}</span>
      </div>
    </div>
  );
}
