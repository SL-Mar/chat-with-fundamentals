// components/EconomicCalendar.tsx - Economic events calendar (FOMC, CPI, jobs reports)
'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface EconomicCalendarProps {
  defaultCountry?: string;
  days?: number;
}

export default function EconomicCalendar({ defaultCountry = 'US', days = 30 }: EconomicCalendarProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry);
  const [viewMode, setViewMode] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    fetchEvents();
  }, [selectedCountry, viewMode]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date();
      let from_date: string;
      let to_date: string;

      if (viewMode === 'upcoming') {
        from_date = today.toISOString().split('T')[0];
        const future = new Date(today);
        future.setDate(future.getDate() + days);
        to_date = future.toISOString().split('T')[0];
      } else {
        to_date = today.toISOString().split('T')[0];
        const past = new Date(today);
        past.setDate(past.getDate() - days);
        from_date = past.toISOString().split('T')[0];
      }

      const response = await api.fetchEconomicEvents(
        from_date,
        to_date,
        selectedCountry,
        100
      );

      const eventsArray = response?.events || [];
      setEvents(eventsArray);
    } catch (err: any) {
      console.error('Failed to fetch economic events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getImpact = (event: any): 'high' | 'medium' | 'low' => {
    const eventName = (event.event || event.name || '').toLowerCase();
    const highImpactKeywords = ['fomc', 'fed', 'gdp', 'employment', 'payroll', 'cpi', 'inflation', 'interest rate'];
    const mediumImpactKeywords = ['retail sales', 'manufacturing', 'housing', 'consumer confidence'];

    if (highImpactKeywords.some((keyword) => eventName.includes(keyword))) {
      return 'high';
    } else if (mediumImpactKeywords.some((keyword) => eventName.includes(keyword))) {
      return 'medium';
    }
    return 'low';
  };

  const getImpactColor = (impact: 'high' | 'medium' | 'low'): string => {
    switch (impact) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
    }
  };

  const getImpactBadge = (impact: 'high' | 'medium' | 'low'): string => {
    switch (impact) {
      case 'high':
        return 'bg-red-500/20 text-red-400';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'low':
        return 'bg-green-500/20 text-green-400';
    }
  };

  // Group events by date
  const eventsByDate = events.reduce((acc: any, event: any) => {
    const date = event.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {});

  const sortedDates = Object.keys(eventsByDate).sort((a, b) => {
    if (viewMode === 'upcoming') {
      return new Date(a).getTime() - new Date(b).getTime();
    } else {
      return new Date(b).getTime() - new Date(a).getTime();
    }
  });

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Economic Calendar</h3>

        <div className="flex gap-2">
          {/* View Mode Toggle */}
          <div className="flex gap-1 bg-slate-700 rounded p-1">
            <button
              onClick={() => setViewMode('upcoming')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                viewMode === 'upcoming'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setViewMode('past')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                viewMode === 'past'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Past
            </button>
          </div>

          {/* Country Selector */}
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="px-3 py-1 bg-slate-700 text-white rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
            <option value="JP">Japan</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="CA">Canada</option>
            <option value="CN">China</option>
            <option value="">All Countries</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-700 rounded"></div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-8 text-red-400 text-sm">
          Failed to load economic events: {error}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm">
          No economic events found for the selected filters
        </div>
      )}

      {!loading && !error && events.length > 0 && (
        <div className="space-y-4">
          {sortedDates.map((date) => (
            <div key={date}>
              {/* Date Header */}
              <div className="flex items-center gap-2 mb-2">
                <div className="text-sm font-semibold text-white">{formatDate(date)}</div>
                <div className="flex-1 border-b border-slate-700"></div>
                <div className="text-xs text-slate-400">
                  {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
              </div>

              {/* Events for this date */}
              <div className="space-y-2 mb-3">
                {eventsByDate[date].map((event: any, idx: number) => {
                  const impact = getImpact(event);
                  const hasActual = event.actual !== null && event.actual !== undefined;
                  const hasForecast = event.forecast !== null && event.forecast !== undefined;
                  const hasPrevious = event.previous !== null && event.previous !== undefined;

                  return (
                    <div
                      key={idx}
                      className="bg-slate-700/50 rounded p-3 hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-white">
                              {event.event || event.name}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs ${getImpactBadge(impact)}`}>
                              {impact}
                            </span>
                            {event.country && (
                              <span className="text-xs text-slate-400">{event.country}</span>
                            )}
                          </div>
                        </div>
                        {event.time && (
                          <div className="text-xs text-slate-400">{event.time}</div>
                        )}
                      </div>

                      {/* Event Data */}
                      {(hasActual || hasForecast || hasPrevious) && (
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          {hasActual && (
                            <div>
                              <div className="text-slate-400">Actual</div>
                              <div className={`font-semibold ${event.actual > (event.forecast || event.previous || 0) ? 'text-green-400' : event.actual < (event.forecast || event.previous || 0) ? 'text-red-400' : 'text-white'}`}>
                                {event.actual}
                              </div>
                            </div>
                          )}
                          {hasForecast && (
                            <div>
                              <div className="text-slate-400">Forecast</div>
                              <div className="font-semibold text-white">{event.forecast}</div>
                            </div>
                          )}
                          {hasPrevious && (
                            <div>
                              <div className="text-slate-400">Previous</div>
                              <div className="font-semibold text-slate-300">{event.previous}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Impact Legend */}
      {!loading && !error && events.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="text-xs text-slate-400 mb-2">Impact Legend</div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              <span className="text-xs text-slate-400">High Impact (FOMC, GDP, CPI, Jobs)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
              <span className="text-xs text-slate-400">Medium Impact (Retail, Housing)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-xs text-slate-400">Low Impact (Other)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
