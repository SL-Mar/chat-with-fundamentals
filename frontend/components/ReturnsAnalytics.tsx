// components/ReturnsAnalytics.tsx – histogram vs normal + beta scatter with explicit typings
"use client";

import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from "chart.js";
import { Bar, Scatter } from "react-chartjs-2";
import { ReturnsResponse } from "../types/equity";

ChartJS.register(BarElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

interface Props {
  data: ReturnsResponse;
}

export default function ReturnsAnalytics({ data }: Props) {
  if (!data) return null;

  /* ─────────── Histogram bins ─────────── */
  const returns = data.returns.list;
  const nBins = 30;
  const min = Math.min(...returns);
  const max = Math.max(...returns);
  const binSize = (max - min) / nBins;
  const bins = Array.from({ length: nBins }, () => 0);
  returns.forEach((r) => {
    const idx = Math.min(Math.floor((r - min) / binSize), nBins - 1);
    bins[idx] += 1;
  });
  const binLabels = bins.map((_, i) => (min + binSize * i).toFixed(2));

  /* normal curve (scaled to bin count) */
  const { mean, std } = data.returns;
  const normal = binLabels.map((l) => {
    const x = parseFloat(l);
    const pdf =
      (1 / (std * Math.sqrt(2 * Math.PI))) *
      Math.exp(-0.5 * ((x - mean) / std) ** 2);
    return pdf * returns.length * binSize;
  });

  /* ─────────── Chart.js data & options with explicit types ─────────── */
  const histData: ChartData<"bar", number[], string> = {
    labels: binLabels,
    datasets: [
      {
        type: "bar",
        label: "Daily returns",
        data: bins,
        backgroundColor: "#3b82f6",
      },
      {
        type: "line",
        label: "Normal PDF (scaled)",
        data: normal,
        borderColor: "#f87171",
        backgroundColor: "transparent",
        pointRadius: 0,
        tension: 0.2,
        yAxisID: "y",
      },
    ],
  };

  const histOptions: ChartOptions<"bar"> = {
    responsive: true,
    plugins: { legend: { labels: { color: "#ccc" } } },
    scales: {
      x: { ticks: { color: "#888" } },
      y: { ticks: { color: "#888" } },
    },
  };

  /* ─────────── Scatter for beta ─────────── */
  const scatterData: ChartData<"scatter", { x: number; y: number }[], string> = {
    datasets: [
      {
        label: `${data.ticker} vs ${data.benchmark}`,
        data: data.scatter.x.map((x, i) => ({ x, y: data.scatter.y[i] })),
        backgroundColor: "#10b981",
        pointRadius: 3,
      },
    ],
  };

  const scatterOptions: ChartOptions<"scatter"> = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { mode: "nearest" },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: `${data.benchmark} returns`,
          color: "#ccc",
        },
        ticks: { color: "#888" },
      },
      y: {
        title: {
          display: true,
          text: `${data.ticker} returns`,
          color: "#ccc",
        },
        ticks: { color: "#888" },
      },
    },
  };

  /* ─────────── render ─────────── */
  return (
    <div className="space-y-6">
      {/* histogram */}
      <div className="bg-gray-900 border rounded p-4">
        <h4 className="mb-2 text-sm text-slate-200">
          Distribution of daily returns (last {data.years}y)
        </h4>
        <Bar data={histData} options={histOptions} />
      </div>

      {/* scatter */}
      <div className="bg-gray-900 border rounded p-4">
        <h4 className="mb-2 text-sm text-slate-200">
          Beta scatter (β={data.scatter.beta}, R²={data.scatter.r2})
        </h4>
        <Scatter data={scatterData} options={scatterOptions} />
      </div>
    </div>
  );
}
