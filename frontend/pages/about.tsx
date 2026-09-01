import React from 'react';
import Link from 'next/link';

const About = () => {
  return (
    <div className="container mx-auto px-4 py-8 text-gray-400 flex justify-center items-center min-h-screen">
      <div className="max-w-2xl text-justify">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">About QuantCoder FS</h1>

        <p className="text-lg leading-relaxed mb-4">
          QuantCoder FS is a local-first application that automates the transformation of financial research articles into executable Python code for the QuantConnect LEAN engine. It parses PDFs, extracts trading logic, and generates ready-to-backtest algorithms—streamlining the path from research to strategy implementation.
        </p>

        <p className="text-lg leading-relaxed mb-4">
          The application runs locally but requires access to the OpenAI API for code generation and analysis. It processes PDF articles, extracts trading logic using LLM agents, and supports syntax validation and optional backtesting via a local installation of the QuantConnect LEAN engine.
        </p>

        <p className="text-lg leading-relaxed mb-4">
          Strategy ideas tested in the platform are occasionally documented in published research notes, where implementation examples are shared with the broader community.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2 text-blue-600 text-center">Background</h2>
        <p className="text-base leading-relaxed mb-4">
          Publishing original equity and strategy research. Developing proprietary AI-powered quantitative tools. Master Mariner transitioning full-time to markets, initially trained in theoretical physics.
        </p>
        <p className="text-base leading-relaxed mb-6 text-center">
          <a
            href="https://slmar.co"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Visit slmar.co →
          </a>
        </p>

        <div className="text-center mt-6">
          <Link href="/" className="text-blue-600 hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default About;
