import React from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub, faMedium } from '@fortawesome/free-brands-svg-icons';

const Goodbye = () => {
  return (
    <div className="container mx-auto px-4 py-8 text-gray-400 flex flex-col items-center min-h-screen">
      <div className="max-w-2xl w-full text-center">

        <h1 className="text-4xl font-bold text-white mb-6">Goodbye</h1>
        <p className="text-lg mb-6">
          Thank you for using <strong>Chat with Fundamentals</strong>.
        </p>
        <p className="text-base mb-10">
          This session has ended. 
        </p>

        {/* Social links */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">Connect</h3>
          <div className="flex justify-center items-center space-x-6">
            <a
              href="https://medium.com/@sl_mar/about"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FontAwesomeIcon icon={faMedium} className="text-gray-400 hover:text-blue-600" size="2x" />
            </a>
            <a
              href="https://github.com/SL-Mar"
              target="_blank"
              rel="noopener noreferrer"
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
        </div>

        <p className="text-sm text-gray-500 mt-4">
          &copy; {new Date().getFullYear()} SL Mar. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Goodbye;
