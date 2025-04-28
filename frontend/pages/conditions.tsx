'use client';

import React from 'react';
import Link from 'next/link';

const TermsOfUse = () => {
  return (
    <div className="container mx-auto px-4 py-8 text-gray-400">
      <h1 className="text-3xl font-bold mb-6 text-center">Terms of Use</h1>

      <p className="mb-4">
        Welcome to <strong>Chat with Fundamentals</strong>. These Terms of Use govern your access to and use of the platform ("Platform").
        By using the Platform, you agree to be legally bound by these terms. If you do not agree, please discontinue use immediately.
      </p>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">1. Acceptance of Terms</h2>
        <p>
          By accessing or using Chat with Fundamentals, you confirm that you have read, understood, and agree to comply with these Terms of Use.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">2. User Conduct</h2>
        <p>
          You agree to use the Platform for lawful purposes only. Prohibited activities include:
        </p>
        <ul className="list-disc list-inside ml-4">
          <li>Unauthorized access or attempts to breach platform security.</li>
          <li>Distributing malware, spam, or malicious content.</li>
          <li>Violating applicable laws or regulations.</li>
          <li>Reverse-engineering, reselling, or misusing the platform.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">3. Intellectual Property</h2>
        <p>
          All content and features of Chat with Fundamentals, including code, graphics, and documentation, are the intellectual property
          of SL Mar or its licensors. The platform is released under the{' '}
          <a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Apache 2.0 License
          </a>.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">4. Local-First Design</h2>
        <p>
          Chat with Fundamentals follows a local-first model: all data processing occurs on your machine, and no personal data or queries are transmitted externally unless explicitly configured by the user.
          You retain full control over your data pipelines.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">5. Financial Disclaimer</h2>
        <p>
          Chat with Fundamentals is a research tool designed to assist in equity analysis and exploration. It does not provide financial advice, and should not be construed as an offer, solicitation, or recommendation.
          Please refer to our <Link href="/disclaimer" className="text-blue-600 hover:underline">Disclaimer</Link> for more information.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">6. No Warranty</h2>
        <p>
          The Platform is provided "as is" without warranties of any kind, express or implied. No guarantees are made regarding availability, accuracy, or fitness for any purpose.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">7. Limitation of Liability</h2>
        <p>
          SL Mar shall not be held liable for any direct, indirect, incidental, or consequential damages arising out of your use of the Platform.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">8. Changes to Terms</h2>
        <p>
          Terms of Use may be updated periodically. Continued use of the Platform after updates constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">9. Contact</h2>
        <p>
          For any questions, bug reports, or collaboration proposals, please write to:
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

export default TermsOfUse;
