'use client';

import Link from 'next/link';

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-10 text-blue-600">
          QuantCoder FS – Documentation
        </h1>

        <p className="text-lg leading-relaxed mb-6 text-justify">
          <strong>QuantCoder FS</strong> is a local-first research platform that automates the extraction of algorithmic trading strategies from financial research articles. It transforms PDF-based content into executable Python code for the <strong>QuantConnect LEAN engine</strong>, and optionally runs a local backtest to verify the strategy.
        </p>

        <h2 className="text-2xl font-semibold text-center text-blue-600 mt-12 mb-4">Core Features</h2>
        <ul className="list-disc list-inside space-y-2 text-base ml-4">
          <li>Load and analyze PDF research articles using a built-in article parser.</li>
          <li>Extract strategy logic using LLM agents tailored to trading context.</li>
          <li>Perform automatic syntax validation via Python AST parsing.</li>
          <li>Run <code>lean build</code> (if available) to check full LEAN compatibility.</li>
          <li>Backtest the strategy using the local QuantConnect LEAN engine.</li>
          <li>Display logs and errors from backtests in a live console.</li>
          <li>Store generated code and metadata in your local workspace.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-center text-blue-600 mt-12 mb-4">Workflow Summary</h2>
        <p className="text-base leading-relaxed mb-4">
          The core workflow starts with a finance-focused PDF (e.g., a research note or academic paper) and progresses through five stages:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-base ml-4">
          <li>Parse the PDF to extract and structure relevant strategy text.</li>
          <li>Interpret strategy components (e.g., signals, indicators, logic).</li>
          <li>Generate valid QuantConnect Python code from the extracted logic.</li>
          <li>Validate the code syntax and optionally run <code>lean build</code>.</li>
          <li>Run a backtest and display results in the terminal output.</li>
        </ol>

        <h2 className="text-2xl font-semibold text-center text-blue-600 mt-12 mb-4">Disclaimer</h2>
        <p className="text-base leading-relaxed mb-6 text-justify">
          QuantCoder FS is a research and prototyping tool. It is not a financial advisor and does not provide investment advice. Outputs are for educational purposes only and must be independently reviewed and tested before live deployment.
        </p>

        <div className="text-center mt-10 space-y-2">
          <Link
            href="https://slmar.co/quantmar.html"
            target="_blank"
            className="text-blue-600 hover:underline text-sm block"
          >
            → Browse Strategy Notes on slmar.co
          </Link>
          <Link
            href="https://slmar.co/quantmar.html"
            target="_blank"
            className="text-blue-600 hover:underline text-sm block"
          >
            → Read Development Notes and Technical Updates
          </Link>
        </div>
      </div>
    </div>
  );
}
