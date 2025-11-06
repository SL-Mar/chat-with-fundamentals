// pages/macro-comparison.tsx - Multi-country macro indicators comparison
'use client';

import MacroIndicators from '../components/MacroIndicators';

export default function MacroComparisonPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Macro Indicators Comparison</h1>
              <p className="text-slate-400">
                Compare treasury yields and money market rates across countries
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href="/calendar"
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
              >
                📅 Calendar
              </a>
              <a
                href="/economic-dashboard"
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
              >
                💹 Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <MacroIndicators />
    </div>
  );
}
