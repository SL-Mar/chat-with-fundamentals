import React from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub, faMedium, faLinkedin } from '@fortawesome/free-brands-svg-icons';

const AboutAndContact = () => {
  return (
    <div className="container mx-auto px-4 py-8 text-gray-400 flex flex-col items-center min-h-screen">
      <div className="max-w-2xl w-full">

        {/* About Section */}
        <section className="mb-12">
          <h1 className="text-3xl font-bold mb-6 text-center">About Me</h1>
          <p className="text-lg leading-relaxed mb-4 text-justify">
            I am a master mariner with a background in theoretical physics. I built Chat with Fundamentals to streamline my research and equity analysis workflows. 
            I believe strongly in the local-first model: own your data pipeline, avoid paying for services you can replicate, and tailor your tools to your unique needs and risk profile.
            As always, apply your own due diligence when using this platform in your decision-making process.
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

          {/* Email section */}
          <div className="mb-8 mt-8">
            <h3 className="text-2xl font-semibold mb-2">Email</h3>
            <p className="font-medium mb-2">
              <a href="mailto:smr.laignel@gmail.com" className="text-blue-600 hover:underline">
                smr.laignel@gmail.com
              </a>
            </p>
            <a
              href="mailto:smr.laignel@gmail.com"
              className="inline-block mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow"
            >
              Write to Me
            </a>
          </div>

          {/* Social links */}
          <div className="mb-6">
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
              <a
                href="https://www.linkedin.com/in/smr-laignel/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FontAwesomeIcon icon={faLinkedin} className="text-gray-400 hover:text-blue-600" size="2x" />
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
