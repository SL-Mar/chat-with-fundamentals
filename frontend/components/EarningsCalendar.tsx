// components/EarningsCalendar.tsx - Compact earnings calendar for stock detail page
import { useState, useEffect } from "react";
import { api } from "../lib/api";

interface EarningsCalendarProps {
  ticker: string;
}

export default function EarningsCalendar({ ticker }: EarningsCalendarProps) {
  const [earnings, setEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;
    fetchEarnings();
  }, [ticker]);

  const fetchEarnings = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get next 90 days of earnings for this symbol
      const today = new Date().toISOString().split("T")[0];
      const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const result = await api.fetchEarningsCalendar(today, future, ticker);
      setEarnings(result.earnings || []);
    } catch (e: any) {
      setError(e.message || "Failed to load earnings calendar");
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

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Upcoming Earnings</h3>
        <p className="text-sm text-blue-400">🔄 Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Upcoming Earnings</h3>
        <p className="text-sm text-red-400">❌ {error}</p>
      </div>
    );
  }

  if (earnings.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Upcoming Earnings</h3>
        <p className="text-sm text-slate-400">No upcoming earnings in next 90 days</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3">Upcoming Earnings</h3>

      <div className="space-y-3">
        {earnings.slice(0, 3).map((event: any, idx: number) => (
          <div key={idx} className="border-b border-slate-700 pb-2 last:border-b-0">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-semibold text-blue-400">
                  {formatDate(event.report_date)}
                </div>
                <div className="text-xs text-slate-400">
                  {event.before_after_market === "bmo" ? "Before Market" : "After Market"}
                </div>
              </div>
              <div className="text-right">
                {event.estimate !== null && (
                  <div className="text-xs text-slate-400">
                    Est: ${event.estimate}
                  </div>
                )}
                {event.actual !== null && (
                  <div className="text-xs font-semibold text-white">
                    Actual: ${event.actual}
                  </div>
                )}
                {event.difference !== null && event.difference !== 0 && (
                  <div
                    className={`text-xs font-semibold ${
                      event.difference > 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {event.difference > 0 ? "+" : ""}
                    {event.difference.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {earnings.length > 3 && (
          <div className="text-xs text-slate-500 text-center pt-1">
            +{earnings.length - 3} more earnings in next 90 days
          </div>
        )}
      </div>
    </div>
  );
}
