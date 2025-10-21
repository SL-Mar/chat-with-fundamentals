// pages/calendar.tsx - Earnings, IPOs, and Splits Calendar
"use client";

import { useState, useEffect } from "react";
import { api } from "../lib/api";

type CalendarView = "earnings" | "ipos" | "splits";

export default function CalendarPage() {
  const [view, setView] = useState<CalendarView>("earnings");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date range (default: next 30 days)
  const today = new Date().toISOString().split("T")[0];
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(future);
  const [symbolFilter, setSymbolFilter] = useState("");

  useEffect(() => {
    fetchData();
  }, [view]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      let result;
      if (view === "earnings") {
        result = await api.fetchEarningsCalendar(
          fromDate,
          toDate,
          symbolFilter || undefined
        );
        setData(result.earnings || []);
      } else if (view === "ipos") {
        result = await api.fetchIPOCalendar(fromDate, toDate);
        setData(result.ipos || []);
      } else if (view === "splits") {
        result = await api.fetchSplitsCalendar(fromDate, toDate);
        setData(result.splits || []);
      }
    } catch (e: any) {
      setError(e.message || "Calendar fetch error");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Financial Calendar</h1>

      {/* View Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setView("earnings")}
          className={`px-4 py-2 rounded ${
            view === "earnings"
              ? "bg-blue-600"
              : "bg-slate-700 hover:bg-slate-600"
          }`}
        >
          Earnings
        </button>
        <button
          onClick={() => setView("ipos")}
          className={`px-4 py-2 rounded ${
            view === "ipos" ? "bg-blue-600" : "bg-slate-700 hover:bg-slate-600"
          }`}
        >
          IPOs
        </button>
        <button
          onClick={() => setView("splits")}
          className={`px-4 py-2 rounded ${
            view === "splits"
              ? "bg-blue-600"
              : "bg-slate-700 hover:bg-slate-600"
          }`}
        >
          Splits
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          {view === "earnings" && (
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Symbols (comma-separated)
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded"
                value={symbolFilter}
                onChange={(e) => setSymbolFilter(e.target.value)}
                placeholder="AAPL,MSFT,GOOGL"
              />
            </div>
          )}
          <div className="flex items-end">
            <button
              onClick={fetchData}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
            >
              {loading ? "Loading..." : "Fetch"}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded p-4 mb-6">
          ❌ {error}
        </div>
      )}

      {/* Results */}
      {!loading && data.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            {view.charAt(0).toUpperCase() + view.slice(1)} ({data.length} events)
          </h2>

          <div className="overflow-x-auto">
            {view === "earnings" && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-4">Date</th>
                    <th className="text-left py-2 px-4">Ticker</th>
                    <th className="text-left py-2 px-4">Company</th>
                    <th className="text-left py-2 px-4">Time</th>
                    <th className="text-right py-2 px-4">Estimate</th>
                    <th className="text-right py-2 px-4">Actual</th>
                    <th className="text-right py-2 px-4">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-2 px-4">{formatDate(item.report_date)}</td>
                      <td className="py-2 px-4 font-mono font-semibold text-blue-400">
                        {item.code}
                      </td>
                      <td className="py-2 px-4">{item.name || "-"}</td>
                      <td className="py-2 px-4 text-sm">
                        {item.before_after_market === "bmo" ? "Before Market" : "After Market"}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {item.estimate !== null ? `$${item.estimate}` : "-"}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {item.actual !== null ? `$${item.actual}` : "-"}
                      </td>
                      <td
                        className={`py-2 px-4 text-right ${
                          item.difference > 0
                            ? "text-green-400"
                            : item.difference < 0
                            ? "text-red-400"
                            : ""
                        }`}
                      >
                        {item.difference !== null ? item.difference.toFixed(2) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {view === "ipos" && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-4">Date</th>
                    <th className="text-left py-2 px-4">Ticker</th>
                    <th className="text-left py-2 px-4">Company</th>
                    <th className="text-left py-2 px-4">Exchange</th>
                    <th className="text-right py-2 px-4">Price Range</th>
                    <th className="text-left py-2 px-4">Currency</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-2 px-4">{formatDate(item.start_date)}</td>
                      <td className="py-2 px-4 font-mono font-semibold text-blue-400">
                        {item.code}
                      </td>
                      <td className="py-2 px-4">{item.name || "-"}</td>
                      <td className="py-2 px-4">{item.exchange || "-"}</td>
                      <td className="py-2 px-4 text-right">
                        {item.price_from && item.price_to
                          ? `$${item.price_from} - $${item.price_to}`
                          : "-"}
                      </td>
                      <td className="py-2 px-4">{item.currency || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {view === "splits" && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-4">Date</th>
                    <th className="text-left py-2 px-4">Ticker</th>
                    <th className="text-left py-2 px-4">Exchange</th>
                    <th className="text-left py-2 px-4">Split Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-2 px-4">{formatDate(item.date)}</td>
                      <td className="py-2 px-4 font-mono font-semibold text-blue-400">
                        {item.code}
                      </td>
                      <td className="py-2 px-4">{item.exchange || "-"}</td>
                      <td className="py-2 px-4 font-semibold">{item.split || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="text-center text-slate-400 py-12">
          No {view} found for the selected date range
        </div>
      )}
    </div>
  );
}
