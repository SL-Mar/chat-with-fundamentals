// components/TechnicalIndicators.tsx
import { useState, useEffect } from "react";
import { api } from "../lib/api";

interface TechnicalIndicatorsProps {
  ticker: string;
}

export default function TechnicalIndicators({ ticker }: TechnicalIndicatorsProps) {
  const [rsi, setRsi] = useState<number | null>(null);
  const [sma50, setSma50] = useState<number | null>(null);
  const [sma200, setSma200] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;
    fetchIndicators();
  }, [ticker]);

  const fetchIndicators = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch RSI (14-period)
      const rsiData = await api.fetchTechnicalIndicator(ticker, "rsi", 14);
      if (rsiData && rsiData.length > 0) {
        const latest = rsiData[rsiData.length - 1];
        setRsi(latest.rsi || null);
      }

      // Fetch SMA 50
      const sma50Data = await api.fetchTechnicalIndicator(ticker, "sma", 50);
      if (sma50Data && sma50Data.length > 0) {
        const latest = sma50Data[sma50Data.length - 1];
        setSma50(latest.sma || null);
      }

      // Fetch SMA 200
      const sma200Data = await api.fetchTechnicalIndicator(ticker, "sma", 200);
      if (sma200Data && sma200Data.length > 0) {
        const latest = sma200Data[sma200Data.length - 1];
        setSma200(latest.sma || null);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load indicators");
    } finally {
      setLoading(false);
    }
  };

  const getRsiColor = (value: number | null) => {
    if (value === null) return "text-slate-400";
    if (value > 70) return "text-red-400"; // Overbought
    if (value < 30) return "text-green-400"; // Oversold
    return "text-yellow-400"; // Neutral
  };

  const getRsiLabel = (value: number | null) => {
    if (value === null) return "";
    if (value > 70) return "(Overbought)";
    if (value < 30) return "(Oversold)";
    return "(Neutral)";
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Technical Indicators</h3>
        <p className="text-sm text-blue-400">🔄 Loading indicators...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Technical Indicators</h3>
        <p className="text-sm text-red-400">❌ {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3">Technical Indicators</h3>

      <div className="space-y-2">
        {/* RSI */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">RSI (14)</span>
          <span className={`text-sm font-semibold ${getRsiColor(rsi)}`}>
            {rsi !== null ? `${rsi.toFixed(2)} ${getRsiLabel(rsi)}` : "-"}
          </span>
        </div>

        {/* SMA 50 */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">SMA 50</span>
          <span className="text-sm font-semibold text-blue-400">
            {sma50 !== null ? `$${sma50.toFixed(2)}` : "-"}
          </span>
        </div>

        {/* SMA 200 */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">SMA 200</span>
          <span className="text-sm font-semibold text-blue-400">
            {sma200 !== null ? `$${sma200.toFixed(2)}` : "-"}
          </span>
        </div>

        {/* Trend indication */}
        {sma50 !== null && sma200 !== null && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Trend</span>
              <span
                className={`text-sm font-semibold ${
                  sma50 > sma200 ? "text-green-400" : "text-red-400"
                }`}
              >
                {sma50 > sma200 ? "🔼 Bullish" : "🔽 Bearish"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {sma50 > sma200
                ? "SMA 50 above SMA 200 (Golden Cross territory)"
                : "SMA 50 below SMA 200 (Death Cross territory)"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
