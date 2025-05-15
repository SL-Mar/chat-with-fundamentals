// components/VolBandsCard.tsx
"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { VolBandResponse } from "../types/equity";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip
);

/* ---------- responsive <Line> wrapper ---------------------------------- */
function useDimensions() {
  const ref = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDim({ w: width, h: height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return [ref, dim] as const;
}

function MiniLine({ series, color }: { series: number[]; color: string }) {
  const [wrapRef, { w, h }] = useDimensions();

  // Chart only when we have positive geometry
  if (w === 0 || h === 0) {
    return <div ref={wrapRef} className="w-full h-14" />;
  }

  const data = {
    labels: series.map((_, i) => i),
    datasets: [
      {
        data: series,
        borderColor: color,
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.25,
      },
    ],
  };

  const options = {
    responsive: false,          // we'll set explicit w/h
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: {
        label: ctx => (ctx.parsed.y * 100).toFixed(2) + " %",
      } },
    },
    scales: {
      x: { display: false },
      y: {
        ticks: {
          color: "#64748b",
          callback: (v: number) => v * 100 + " %",
        },
        grid: { color: "#1e293b30" },
      },
    },
  } as const;

  return (
    <div ref={wrapRef} style={{ width: w, height: h }}>
      <Line data={data} options={options} width={w} height={h} />
    </div>
  );
}

/* ---------- card component --------------------------------------------- */
export default function VolBandsCard({
  data,
  ticker,
}: {
  data: VolBandResponse;
  ticker: string;
}) {
  const pct = (v: number) => (v * 100).toFixed(1) + "%";

  return (
    <div className="bg-gray-900 border border-slate-700 rounded p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-200">
        {ticker} • Volatility&nbsp;Structure
      </h4>

      <div className="mb-1 text-xs text-slate-400">ATR-14 / Close</div>
      <MiniLine series={data.atr_pct}   color="#38bdf8" />

      <div className="mt-3 mb-1 text-xs text-slate-400">
        Keltner width (EMA20 ± 2 ATR)
      </div>
      <MiniLine series={data.kelt_pct}  color="#facc15" />

      <div className="mt-3 mb-1 text-xs text-slate-400">
        Donchian width (20-day)
      </div>
      <MiniLine series={data.donch_pct} color="#f43f5e" />

      <div className="mt-3 grid grid-cols-3 gap-2 text-sm text-slate-200">
        <span>ATR %:&nbsp;{pct(data.atr_pct.at(-1)!)}</span>
        <span>Kelt:&nbsp;{pct(data.kelt_pct.at(-1)!)}</span>
        <span>Donch:&nbsp;{pct(data.donch_pct.at(-1)!)}</span>
      </div>
    </div>
  );
}
