'use client';

import Link from 'next/link';

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 px-6 py-12">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Chat with Fundamentals</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Version 1.0 — 28 April 2025</p>
        </div>

        {/* Data Sources */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-blue-400 mb-2">Data Sources</h2>
          <p className="text-sm mb-2">
            Chat with Fundamentals uses professional-grade data from the <strong>EODHD APIs</strong>, including:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Fundamentals API: financial ratios, KPIs, and sector information.</li>
            <li>Historical API: daily OHLCV price data.</li>
            <li>News API: real-time headlines for each stock ticker.</li>
          </ul>
        </div>

        {/* AI Workflow */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-blue-400 mb-2">AI Workflow</h2>
          <p className="text-sm mb-2">
            The AI engine processes your financial queries, retrieves market data, and generates a research-grade executive summary.
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Analyze the user query to identify target stocks.</li>
            <li>Fetch fundamentals, historical prices, and news headlines.</li>
            <li>Generate an executive research note using <strong>LLMs</strong>.</li>
          </ul>
        </div>

        {/* Visualizations */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-blue-400 mb-2">Visualizations</h2>
          <p className="text-sm mb-4">
            Chat with Fundamentals automatically generates the following analysis charts:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>OHLCV Chart</strong> — candlestick price chart with volume and moving averages.</li>
            <li><strong>Monte Carlo Simulation</strong> — 1,000 projected equity paths over 20 trading days.</li>
            <li><strong>Returns Distribution</strong> — histogram of daily returns compared to a normal distribution.</li>
            <li><strong>Beta Scatterplot</strong> — regression of stock returns versus SPY to visualize β and R².</li>
            <li><strong>Cummulative returns</strong> — 3Y equity curve against SPY taken as benchmark.</li>
            <li><strong>Volatility profile</strong> — 3Y profile and risk ratios.</li>
          </ul>
        </div>

        {/* Logging & Data Saving */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-blue-400 mb-2">Logging and Data Saving</h2>
          <p className="text-sm mb-2">
            All backend operations are fully logged and can be monitored live. Logs are streamed via WebSocket to the frontend and saved locally.
          </p>
          <p className="text-sm">
            OHLCV Dataframes and JSON raw input can be saved locally.
          </p>
        </div>

        {/* Substack link */}
        <div className="text-center">
          <Link
            href="https://quantcoderfs.substack.com/"
            target="_blank"
            className="text-blue-600 hover:underline text-sm"
          >
            Visit Substack for full documentation and updates →
          </Link>
        </div>
      </div>
    </div>
  );
}
