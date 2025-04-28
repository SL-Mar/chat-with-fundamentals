'use client';

import React from 'react';
import Link from 'next/link';

const Contribute = () => {
  return (
    <div className="container mx-auto px-6 py-12 text-gray-300 min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-center text-blue-400">Contribute to Chat with Fundamentals</h1>

      <p className="text-lg text-center mb-12 max-w-4xl mx-auto leading-relaxed text-gray-400">
        Contributions are welcome! This project is open-sourced under the <strong>Apache 2.0 License</strong>.
        Development happens primarily on the <strong>dev branch</strong>; stable releases are merged into <strong>main</strong>.
      </p>

      {/* Three Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        
        {/* Left Column: Graphical + AI */}
        <div className="p-4">
          <h2 className="text-2xl font-semibold mb-6 text-blue-400">Focus Areas</h2>
          <ul className="list-disc list-inside space-y-4 text-lg leading-relaxed">
            <li>
              <strong>Graphical Improvements:</strong> refine or expand visual components, improve layout responsiveness and clarity.
            </li>
            <li>
              <strong>AI Workflow Enhancements:</strong> enrich executive research generation, optimize LLM interactions, add strategy templates.
            </li>
            <li>
              <strong>Workflow Integration:</strong> push executive summaries automatically to Notion databases.
            </li>
          </ul>
        </div>

        {/* Middle Column: Backend Calculations */}
        <div className="p-4 border-l border-r border-gray-700">
          <h2 className="text-2xl font-semibold mb-6 text-indigo-400">Backend Calculations</h2>
          <ul className="list-disc list-inside ml-4 space-y-3 text-base leading-relaxed">
            <li>Rolling volatility and Sharpe ratio plots</li>
            <li>Drawdown and underwater curve visualizations</li>
            <li>Volatility cones and forward-looking stats</li>
            <li>ACF (Autocorrelation) analysis</li>
            <li>Calendar heatmaps of returns</li>
            <li>Expected Shortfall (ES) vs VaR charts</li>
          </ul>
        </div>

        {/* Right Column: How to Contribute */}
        <div className="p-4">
          <h2 className="text-2xl font-semibold mb-6 text-green-400">How to Contribute</h2>
          <ol className="list-decimal list-inside space-y-4 text-lg leading-relaxed">
            <li>Fork the repository and create a feature branch based on <strong>dev</strong>.</li>
            <li>Submit small, focused Pull Requests with clear, concise descriptions.</li>
            <li>Follow project conventions: clean, readable code with minimal extra dependencies.</li>
            <li>If modifying a major feature, add a short test case or usage demo if possible.</li>
            <li>Contributions will be reviewed asynchronously before merging into <strong>dev</strong>.</li>
          </ol>
        </div>

      </div>

      {/* GitHub CTA */}
      <div className="text-center">
        <Link href="https://github.com/SL-Mar" target="_blank" className="text-blue-500 hover:underline text-lg">
          Visit GitHub →
        </Link>
      </div>

      <p className="text-sm text-gray-500 mt-12 text-center">
        &copy; {new Date().getFullYear()} SL Mar. All rights reserved.
      </p>
    </div>
  );
};

export default Contribute;
