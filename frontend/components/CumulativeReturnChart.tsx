// CumulativeReturnChart.tsx

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
import { EquityCumRetResponse } from "../types/equity";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

interface Props { data: EquityCumRetResponse }

export default function CumulativeReturnChart({ data }: Props) {
  const labels = data.cumret.map(p => p.date);
  const seriesTic = data.cumret.map(p => p.tic);
  const seriesBmk = data.cumret.map(p => p.bmk);

  const chartData: ChartData<"line", number[], string> = {
    labels,
    datasets: [
      { label: data.ticker,   data: seriesTic, borderColor: "#0ea5e9", pointRadius: 0, tension: 0.2 },
      { label: data.benchmark, data: seriesBmk, borderColor: "#facc15", pointRadius: 0, tension: 0.2 },
    ],
  };

  const options: ChartOptions<"line"> = {
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: "#cbd5e1" } } },
    scales: { x: { ticks: { color: "#94a3b8" } }, y: { ticks: { color: "#94a3b8" } } },
  };

  return (
    <div className="bg-gray-900 border border-slate-700 rounded p-4 h-64">
      <h4 className="mb-2 text-sm font-semibold text-slate-200">
        Cumulative return vs {data.benchmark} (last {data.years} y)
      </h4>
      <Line data={chartData} options={options} className="h-full" />
    </div>
  );
}
