// components/VolForecastCard.tsx
"use client";

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

// register the bits of Chart.js we need
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

interface Props {
  data:    VolForecastResponse;   // ← pre-fetched
  ticker:  string;
  lookback: number;
}

export default function VolForecastCard({ data, ticker, lookback }: Props) {
  // build the spark-line
  const chartData: ChartData<"line", number[], string> = {
    labels: data.ewma_vol.map((_, i) => `${i + 1}`),
    datasets: [
      {
        label: "EWMA σ",
        data: data.ewma_vol,
        borderColor: "#0ea5e9",
        pointRadius: 0,
        tension: 0.25,
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

  const pct = (v: number) => (v * 100).toFixed(2) + "%";

  return (
    <div className="bg-gray-900 border border-slate-700 rounded p-4 h-64">
      <h4 className="mb-2 text-sm font-semibold text-slate-200">
        {ticker} Volatility (EWMA, last {lookback} days)
      </h4>

      <div className="h-3/5 mb-2">
        <Line data={chartData} options={options} />
      </div>

      <div className="flex justify-between text-sm text-slate-200">
        <div><strong>σₜ₊₁:</strong> {pct(data.sigma_t1)}</div>
        <div><strong>CVaR&nbsp;99 %:</strong> {pct(data.evt_cvar_99)}</div>
      </div>
    </div>
  );
}
