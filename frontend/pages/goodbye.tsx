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

        {/* Substack CTA */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Follow the Project</h2>
          <p className="mb-4">
            Subscribe for updates, walkthroughs, and research notes:
          </p>
          <a
            href="https://quantcoderfs.substack.com/s/chat-with-fundamentals"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 shadow"
          >
            Visit Substack
          </a>
        </div>

        {/* Social links */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">Connect</h3>
          <div className="flex justify-center space-x-6">
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
