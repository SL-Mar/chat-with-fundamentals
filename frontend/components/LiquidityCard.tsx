// components/LiquidityCard.tsx
"use client";

import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  ChartData,
  ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { LiquidityResponse } from "../types/equity";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
);

export default function LiquidityCard({ data, ticker }: {
  data: LiquidityResponse;
  ticker: string;
}) {
  /* helpers */
  const usd = (v: number) =>
    "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const pct = (v: number, d = 1) => (v * 100).toFixed(d) + "%";

  const trendColour =
    data.turnover_trend_pct > 0.10
      ? "text-lime-400"
      : data.turnover_trend_pct < -0.10
      ? "text-red-400"
      : "text-orange-400";

  /* chart data */
  const chartData: ChartData<"line"> = {
    labels: Array.from({ length: data.obv.length }, (_, i) => String(i + 1)),
    datasets: [
      {
        label: "OBV",
        data: data.obv,               // 0-to-1 normalised from backend
        borderColor: "#38bdf8",
        borderWidth: 1.2,
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  /* chart options */
  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { display: false },
      y: {
        grid: { color: "#1e293b80" },
        ticks: {
          color: "#94a3b8",
          callback: (v: any) => {
            const num = Number(v);
            const abs = Math.abs(num);

            // 0-1 range → percentage labels
            if (abs <= 1) return (num * 100).toFixed(0) + "%";

            // larger numbers → B / M / k
            return abs >= 1e9
              ? (num / 1e9).toFixed(1) + " B"
              : abs >= 1e6
              ? (num / 1e6).toFixed(1) + " M"
              : (num / 1e3).toFixed(0) + " k";
          },
        },
      },
    },
  };

  /* JSX */
  return (
    <div className="bg-gray-900 border border-slate-700 rounded p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-200">
        {ticker} • Liquidity &amp; Volume
      </h4>

      {/* OBV chart */}
      <div className="h-36 mb-4">
        <Line data={chartData} options={options} />
      </div>

      {/* metrics */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-slate-200">
        <span>Avg turnover&nbsp;30 d: {usd(data.avg_turnover_30d)}</span>
        <span>Avg turnover&nbsp;60 d: {usd(data.avg_turnover_60d)}</span>

        <span className={trendColour}>
          Trend&nbsp;(30 / 60): {pct(data.turnover_trend_pct)}
        </span>
        <span>Volume&nbsp;RSI: {pct(data.volume_rsi, 0)}</span>

        <span>MFI-14: {data.mfi14.toFixed(0)}</span>
      </div>
    </div>
  );
}
