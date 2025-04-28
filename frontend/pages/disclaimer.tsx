'use client';

import React from 'react';
import Link from 'next/link';

const Disclaimer = () => {
  return (
    <div className="container mx-auto px-4 py-8 text-gray-400">
      <h1 className="text-3xl font-bold mb-6 text-center">Disclaimer</h1>

      <p className="mb-4">
        The content and tools provided on <strong>Chat with Fundamentals</strong> are intended for educational and research purposes only.
        This platform does not offer financial, legal, or tax advice of any kind.
      </p>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">1. No Financial Advice</h2>
        <p>
          Chat with Fundamentals is not operated by a licensed financial advisor. Insights, research tools, and
          executive summaries provided on the Platform or Substack are informational only.
          Nothing should be construed as a recommendation to invest, trade, or make financial decisions.
          Always consult a qualified financial advisor before acting on any information.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">2. Accuracy of Information</h2>
        <p>
          While efforts are made to provide accurate and timely information, no guarantees are offered.
          Some data is sourced from third parties and may occasionally be outdated or inaccurate.
          Chat with Fundamentals does not assume responsibility for external data errors.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">3. Use of Tools and Algorithms</h2>
        <p>
          All tools, simulations, and algorithmic outputs are exploratory in nature.
          They are intended for prototyping, research, and educational purposes only.
          They should not be used for live trading without independent validation and professional oversight.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">4. Third-Party Links and APIs</h2>
        <p>
          This Platform may link to external websites or use third-party APIs for financial data.
          We do not endorse or control external services and are not responsible for their accuracy, availability, or practices.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">5. Local-First Philosophy</h2>
        <p>
          Chat with Fundamentals is designed with a local-first model: no user data is collected, and all workflows are executed
          locally unless otherwise configured by the user. Users retain full control over their research pipeline.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">6. License</h2>
        <p>
          Chat with Fundamentals is distributed under the{' '}
          <a
            href="https://www.apache.org/licenses/LICENSE-2.0"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Apache 2.0 License
          </a>, offering flexibility for personal and professional use with attribution.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">7. Refer to Terms of Use</h2>
        <p>
          For legally binding conditions—including warranty disclaimers and limitations of liability—please review our
          <Link href="/terms" className="text-blue-600 hover:underline"> Terms of Use</Link>.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">8. Contact</h2>
        <p>
          For questions, suggestions, or bug reports, please contact:
        </p>
        <p className="font-medium">
          Email: <a href="mailto:smr.laignel@gmail.com" className="text-blue-600 hover:underline">smr.laignel@gmail.com</a>
        </p>
      </section>

      <p className="text-sm text-gray-400 mt-8 text-center">
        &copy; {new Date().getFullYear()} SL Mar. All rights reserved.
      </p>
      <div className="text-center mt-4">
        <Link href="/" className="text-gray-400 hover:underline">Return to Home</Link>
      </div>
    </div>
  );
};

export default Disclaimer;
