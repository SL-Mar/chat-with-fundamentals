// PerfRatiosPanel.tsx

"use client";

import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { PerfRatiosResponse } from "../types/equity";

interface Props {
  ticker: string;
  years?: number;
}

/**
 * Displays Sharpe, Sortino, Max-Draw-Down and Calmar for the given ticker.
 * Turns the numbers green / orange / red against simple heuristic thresholds.
 */
const PerfRatiosPanel: React.FC<Props> = ({ ticker, years = 3 }) => {
  const [data, setData]   = useState<PerfRatiosResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    api
      .fetchPerfRatios(ticker, years)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [ticker, years]);

  if (error) return <div className="text-red-400">{error}</div>;
  if (!data) return <div>Loading performance ratios…</div>;

  const colour = (v: number, goodHigh = true) =>
    goodHigh
      ? { color: v >= 1 ? "limegreen" : "orange" }
      : { color: v <= -0.2 ? "red" : "orange" };

  return (
    <div className="grid grid-cols-2 gap-3 perf-grid">
      <span style={colour(data.sharpe)}>Sharpe: {data.sharpe.toFixed(2)}</span>
      <span style={colour(data.sortino)}>Sortino: {data.sortino.toFixed(2)}</span>
      <span style={colour(data.max_dd, false)}>
        Max-DD: {(data.max_dd * 100).toFixed(1)} %
      </span>
      <span style={colour(data.calmar)}>Calmar: {data.calmar.toFixed(2)}</span>
    </div>
  );
};

export default PerfRatiosPanel;
