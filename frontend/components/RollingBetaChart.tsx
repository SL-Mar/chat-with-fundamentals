"use client";

import {
  Chart as ChartJS,
  LineElement, CategoryScale, LinearScale, PointElement,
  Tooltip, Legend,
  ChartData, ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { RollingBetaResponse } from "../types/equity";

ChartJS.register(LineElement, CategoryScale, LinearScale,
                 PointElement, Tooltip, Legend);

export default function RollingBetaChart({ data }:{
  data: RollingBetaResponse;
}){
  /* ─── data ─── */
  const chartData: ChartData<"line"> = {
    labels: data.dates,
    datasets: [
      {
        label: "β",
        data:  data.beta,
        borderColor: "#0ea5e9",           // cyan-500
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
      },
      {
        label: "α",
        data:  data.alpha,
        borderColor: "#facc15",           // yellow-400
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        yAxisID: "yAlpha",                // ← right axis
      },
      {
        label: "R²",
        data:  data.r2,
        borderColor: "#f43f5e",           // rose-500
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  /* ─── options ─── */
  const options: ChartOptions<"line"> = {
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#cbd5e1" } },
    },
    scales: {
      x: {
        ticks: { color: "#94a3b8", maxTicksLimit: 6 },
      },
      y: {                                     // left axis (β & R²)
        ticks: { color: "#94a3b8" },
        title: { display: true, text: "β / R²", color: "#94a3b8" },
      },
      yAlpha: {                                // right axis (α)
        position: "right",
        grid: { drawOnChartArea: false },
        ticks: { color: "#facc15" },
        title: { display: true, text: "α (ann %)", color: "#facc15" },
      },
    },
  };

  return (
    <div className="bg-gray-900 border border-slate-700 rounded p-4 h-64">
      <h4 className="mb-2 text-sm font-semibold text-slate-200">
        Rolling β / α / R² ({data.window}-day) — Info ratio&nbsp;
        {data.info_ratio.toFixed(2)}
      </h4>
      <div className="h-[85%]">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
