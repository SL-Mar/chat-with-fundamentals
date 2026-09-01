import React from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

const Contact = () => {
  return (
    <div className="container mx-auto px-4 py-8 text-gray-400 text-center">
      <h1 className="text-3xl font-bold mb-6 text-blue-600">Contact</h1>
      <p className="mb-6 text-lg">
        For project updates, research posts, and source code, follow QuantCoder FS on GitHub and slmar.co.
      </p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-blue-600">Connect with Us</h2>
        <div className="flex justify-center space-x-6">
          <a
            href="https://github.com/SL-Mar"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
          >
            <FontAwesomeIcon icon={faGithub} className="text-gray-400 hover:text-blue-600" size="2x" />
          </a>
          <a
            href="https://slmar.co"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="slmar.co"
            className="text-xl font-medium text-gray-400 hover:text-blue-600"
          >
            slmar.co
          </a>
        </div>
      </section>

      <div className="text-center mt-6">
        <Link href="/" className="text-blue-600 hover:underline">
          Return to Home
        </Link>
      </div>

      <p className="text-sm text-gray-400 mt-8 text-center">
        &copy; {new Date().getFullYear()} SL Mar. All rights reserved.
      </p>
    </div>
  );
};

export default Contact;
