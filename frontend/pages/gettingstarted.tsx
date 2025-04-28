'use client';

import React from 'react';
import Link from 'next/link';

const About = () => {
  return (
    <div className="container mx-auto px-4 py-8 text-gray-400 flex justify-center items-center min-h-screen">
      <div className="max-w-2xl text-justify">
        <h1 className="text-3xl font-bold mb-6 text-center">Getting Access to EODHD APIs</h1>

        <p className="text-lg leading-relaxed mb-4">
          <strong>Chat with Fundamentals</strong> is powered by two external services:
        </p>

        <ul className="list-disc list-inside mb-6 space-y-2">
          <li>
            <strong>OpenAI</strong> to access GPT models.
          </li>
          <li>
            <strong>EODHD APIs</strong> to fetch Historical End-of-Day (EOD) data, financial news, and fundamental company data.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 text-center">EODHD API Access</h2>

        <p className="text-lg leading-relaxed mb-4">
          I am affiliated with <strong>EODHD APIs</strong>. 
          If you would like to support my work at no extra cost to you, you can subscribe through the affiliated links below:
        </p>

        <ul className="list-disc list-inside mb-6 space-y-3">
          <li>
            <a
              href="https://eodhd.com/lp/historical-eod-api?via=slmar"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Historical EOD API Subscription (includes Financial News) →
            </a>
          </li>
          <li>
            <a
              href="https://eodhd.com/lp/fundamental-data-api?via=slmar"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Fundamentals Data API Subscription →
            </a>
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 text-center">Guidance and Cost Overview</h2>

        <div className="bg-gray-800 rounded-lg p-4 text-sm leading-relaxed space-y-4 mb-8">
          <p>
            • An executive summary generated with the <strong>o1 model</strong> typically costs about <strong>$0.07</strong> in OpenAI credits and consumes approximately <strong>400 EODHD API calls</strong>. 
            Each EODHD API subscription includes <strong>100,000 API calls per day</strong> and <strong>1,000 API calls per minute</strong>, providing ample capacity for active use.
          </p>
          <p>
            • The <strong>Quant Analysis page</strong> (equity analytics and Monte Carlo simulation) does not use any LLMs and only requires access to <strong>Historical EOD Data</strong>. 
            It costs about <strong>6 API calls per stock analyzed</strong> and can be tested with the <strong>free EODHD tier</strong>, which allows <strong>20 API calls per day</strong>.
          </p>
        </div>

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
