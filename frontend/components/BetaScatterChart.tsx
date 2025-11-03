// components/BetaScatterChart.tsx - Beta regression scatter plot
"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from "chart.js";
import { Scatter } from "react-chartjs-2";
import { ReturnsResponse } from "../types/equity";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

interface Props {
  data: ReturnsResponse;
}

export default function BetaScatterChart({ data }: Props) {
  if (!data) return null;

  /* ─────────── Scatter for beta regression ─────────── */
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
        title: { display: true, text: `${data.benchmark} returns`, color: "#ccc" },
        ticks: { color: "#888" },
      },
      y: {
        title: { display: true, text: `${data.ticker} returns`, color: "#ccc" },
        ticks: { color: "#888" },
      },
    },
  };

  return (
    <div className="bg-gray-900 border rounded p-4">
      <h4 className="mb-2 text-sm text-slate-200">
        Beta scatter (β={data.scatter.beta.toFixed(4)}, α={data.scatter.alpha.toFixed(4)}, R²={data.scatter.r2.toFixed(4)})
      </h4>
      <Scatter data={scatterData} options={scatterOptions} />

      {/* Beta interpretation */}
      <div className="mt-4 text-xs text-slate-400 space-y-1">
        <p>
          <strong>Beta (β = {data.scatter.beta.toFixed(2)}):</strong>{" "}
          {data.scatter.beta > 1.2
            ? "High volatility - stock moves more than market"
            : data.scatter.beta > 0.8
            ? "Moderate volatility - moves similarly to market"
            : "Low volatility - less sensitive to market movements"}
        </p>
        <p>
          <strong>R² = {(data.scatter.r2 * 100).toFixed(1)}%:</strong>{" "}
          {data.scatter.r2 > 0.7
            ? "Strong correlation with benchmark"
            : data.scatter.r2 > 0.4
            ? "Moderate correlation with benchmark"
            : "Weak correlation - other factors drive returns"}
        </p>
      </div>
    </div>
  );
}
