// EquityChart.tsx
// Render MC simulation

"use client";

import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import type { ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";
import { addDays, format } from "date-fns";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Filler, Tooltip, Legend);

export interface EquityPoint {
  date: string;
  close: number;
}

export interface MonteCarloPayload {
  paths: number[][];
  percentiles: {
    p5: number[];
    p50: number[];
    p95: number[];
  };
}

interface Props {
  equityCurve: EquityPoint[];
  monteCarlo: MonteCarloPayload;
  var95: number;
}

export default function EquityChart({ equityCurve, monteCarlo, var95 }: Props) {
  /* ─────────── historical series ─────────── */
  const histLabels = equityCurve.map((d) => d.date);
  const histValues = equityCurve.map((d) => d.close);

  /* ─────────── forecast labels ─────────── */
  const fwdLen = monteCarlo.percentiles.p50.length;
  const lastDate = new Date(histLabels.at(-1)!);
  const fwdLabels = Array.from({ length: fwdLen }, (_, i) =>
    format(addDays(lastDate, i + 1), "yyyy-MM-dd")
  );

  const labels = [...histLabels, ...fwdLabels];
  const pad = (n: number) => Array(n).fill(null);

  /* ─────────── dataset helpers ─────────── */
  const makeForecastDS = (
    label: string,
    color: string,
    series: number[],
    fill?: "-1" | "+1"
  ) => ({
    label,
    data: [...pad(histValues.length - 1), histValues.at(-1), ...series],
    borderColor: color,
    backgroundColor: color + "20",
    borderDash: label === "MC P50" ? [4, 4] : [],
    fill: fill || false,
    tension: 0.3,
    pointRadius: 0,
  });

  /* ─────────── chart data ─────────── */
  const data = {
    labels,
    datasets: [
      {
        label: "Equity Curve",
        data: [...histValues, ...pad(fwdLen)],
        borderColor: "#0ea5e9",
        backgroundColor: "transparent",
        tension: 0.3,
        pointRadius: 0,
      },
      makeForecastDS("MC P50", "#10b981", monteCarlo.percentiles.p50),
      makeForecastDS("MC P95", "#22c55e", monteCarlo.percentiles.p95, "-1"),
      makeForecastDS("MC P5", "#dc2626", monteCarlo.percentiles.p5, "+1"),
    ],
  };

  /* ─────────── options ─────────── */
  const options: ChartOptions<"line"> = {
    responsive: true,
    plugins: {
      legend: { labels: { color: "#ccc" } },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: { ticks: { color: "#888" } },
      y: { ticks: { color: "#888" } },
    },
  };

  /* ─────────── JSX ─────────── */
  return (
    <div className="border rounded p-4 space-y-4 bg-gray-900 text-white">
      <div className="text-sm">
        <strong>Historical VaR 95 %:</strong> {var95}
      </div>
      <Line data={data} options={options} />
    </div>
  );
}
