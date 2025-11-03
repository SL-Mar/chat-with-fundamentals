// components/HistogramChart.tsx - Returns distribution histogram
"use client";

import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { ReturnsResponse } from "../types/equity";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

interface Props {
  data: ReturnsResponse;
}

export default function HistogramChart({ data }: Props) {
  if (!data) return null;

  /* ─────────── Histogram bins ─────────── */
  const returns = data.returns.list;
  const nBins = 30;
  const min = Math.min(...returns);
  const max = Math.max(...returns);
  const binSize = (max - min) / nBins;
  const bins = Array(nBins).fill(0);
  returns.forEach(r => {
    const idx = Math.min(Math.floor((r - min) / binSize), nBins - 1);
    bins[idx] += 1;
  });
  const binLabels = bins.map((_, i) => (min + binSize * i).toFixed(2));

  /* ─────────── Chart.js histogram data ─────────── */
  const histData: ChartData<"bar", number[], string> = {
    labels: binLabels,
    datasets: [
      {
        type: "bar",
        label: "Daily returns",
        data: bins,
        backgroundColor: "#3b82f6",
      },
    ],
  };

  const histOptions: ChartOptions<"bar"> = {
    responsive: true,
    plugins: {
      legend: { labels: { color: "#ccc" } },
    },
    scales: {
      x: { ticks: { color: "#888" } },
      y: { ticks: { color: "#888" } },
    },
  };

  return (
    <div className="bg-gray-900 border rounded p-4">
      <h4 className="mb-2 text-sm text-slate-200">
        Distribution of daily returns (last {data.years}y)
      </h4>
      <Bar data={histData} options={histOptions} />
    </div>
  );
}
