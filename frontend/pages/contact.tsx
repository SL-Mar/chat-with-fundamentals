import React from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub, faMedium } from '@fortawesome/free-brands-svg-icons';

const AboutAndContact = () => {
  return (
    <div className="container mx-auto px-4 py-8 text-gray-400 flex flex-col items-center min-h-screen">
      <div className="max-w-2xl w-full">

        {/* About Section */}
        <section className="mb-12">
          <h1 className="text-3xl font-bold mb-6 text-center">About the application</h1>
          <p className="text-lg leading-relaxed mb-4 text-justify">
          Chat with Fundamentals is designed to streamline equity research and analysis workflows within a local-first model. Users fully own their 
          data pipelines, minimize reliance on third-party services, and customize their tools to match personal needs and risk profiles. As always, 
          users are encouraged to exercise independent judgment and due diligence when applying insights generated through this platform.
          </p>
        </section>

        {/* Contact Section */}
        <section className="mb-12 text-center">
          <h2 className="text-3xl font-bold mb-6">Contact</h2>
          <p className="mb-6">
            Feel free to reach out if you want to:
          </p>

          {/* Centered bullet points */}
          <div className="flex justify-center">
            <ul className="list-disc list-inside text-left space-y-2">
              <li>Signal a bug or technical issue</li>
              <li>Propose a feature upgrade</li>
              <li>Explore collaboration opportunities</li>
              <li>Give feedback or suggestions</li>
            </ul>
          </div>

          {/* Social links */}
          <div className="mt-8 mb-6">
            <h3 className="text-2xl font-semibold mb-4">Connect with Me</h3>
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
        </section>

        {/* Footer */}
        <div className="text-center space-y-4">
          <Link href="/" className="text-blue-600 hover:underline">
            Return to Home
          </Link>
          <p className="text-sm text-gray-400 mt-4">
            &copy; {new Date().getFullYear()} SL Mar. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  );
};

export default AboutAndContact;
