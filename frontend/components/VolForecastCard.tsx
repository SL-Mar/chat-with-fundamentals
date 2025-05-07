// VolForecastCard.tsx

"use client";

import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { VolForecastResponse } from "../types/equity";
import { api } from "../lib/api";

// register Chart.js components
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

interface Props {
  ticker: string;
  lookback?: number; // how many days of EWMA history to chart
}

export default function VolForecastCard({ ticker, lookback = 250 }: Props) {
  const [data, setData]   = useState<VolForecastResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    api
      .fetchVolForecast(ticker, lookback)
      .then(setData)
      .catch(e => setError(e.message));
  }, [ticker, lookback]);

  if (error) return <div className="text-red-400">{error}</div>;
  if (!data)  return <div>Loading volatility…</div>;

  // build the sparkline
  const chartData: ChartData<"line", number[], string> = {
    labels: data.ewma_vol.map((_, i) => `${i + 1}`),
    datasets: [
      {
        label: "EWMA σ",
        data: data.ewma_vol,
        borderColor: "#0ea5e9",
        pointRadius: 0,
        tension: 0.2,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#cbd5e1" } },
      tooltip: {
        callbacks: {
          label: ctx => (ctx.parsed.y * 100).toFixed(2) + "%",
        },
      },
    },
    scales: {
      x: { display: false },
      y: {
        ticks: {
          color: "#94a3b8",
          callback: v => (Number(v) * 100).toFixed(1) + "%",
        },
      },
    },
  };

  // convert decimals to percent strings
  const toPct = (v: number) => (v * 100).toFixed(2) + "%";

  return (
    <div className="bg-gray-900 border border-slate-700 rounded p-4 h-64">
      <h4 className="mb-2 text-sm font-semibold text-slate-200">
        {ticker} Volatility (EWMA, last {lookback} days)
      </h4>

      <div className="h-3/5 mb-2">
        <Line data={chartData} options={options} />
      </div>

      <div className="flex justify-between text-sm text-slate-200">
        <div>
          <strong>σₜ₊₁:</strong> {toPct(data.sigma_t1)}
        </div>
        <div>
          <strong>CVaR 99 %:</strong> {toPct(data.evt_cvar_99)}
        </div>
      </div>
    </div>
  );
}
