'use client';

import React from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCog, faEye, faClipboard, faBook, faLink, faCheckCircle, faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

export default function Settings() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          <FontAwesomeIcon icon={faCog} className="mr-3" />
          Settings
        </h1>

        {/* System Information */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">System Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Frontend</p>
              <p className="text-white font-medium">Next.js 13 (Pages Router)</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Backend</p>
              <p className="text-white font-medium">FastAPI + Python</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Database</p>
              <p className="text-white font-medium">PostgreSQL + TimescaleDB</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Cache</p>
              <p className="text-white font-medium">Redis</p>
            </div>
          </div>
        </div>

        {/* Environment */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Environment</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">API URL</span>
              <code className="text-indigo-400 bg-gray-900 px-3 py-1 rounded">
                {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
              </code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Authentication</span>
              <span className={`px-3 py-1 rounded flex items-center ${process.env.NEXT_PUBLIC_APP_API_KEY ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                <FontAwesomeIcon
                  icon={process.env.NEXT_PUBLIC_APP_API_KEY ? faCheckCircle : faExclamationTriangle}
                  className="mr-2"
                />
                {process.env.NEXT_PUBLIC_APP_API_KEY ? 'Enabled' : 'Development Mode'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/monitoring"
              className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <div>
                <p className="text-white font-medium">System Monitoring</p>
                <p className="text-gray-400 text-sm">View metrics and health</p>
              </div>
              <span className="text-2xl text-indigo-400">
                <FontAwesomeIcon icon={faEye} />
              </span>
            </Link>
            <Link
              href="/logs"
              className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <div>
                <p className="text-white font-medium">View Logs</p>
                <p className="text-gray-400 text-sm">Real-time log stream</p>
              </div>
              <span className="text-2xl text-indigo-400">
                <FontAwesomeIcon icon={faClipboard} />
              </span>
            </Link>
            <Link
              href="/documentation"
              className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <div>
                <p className="text-white font-medium">Documentation</p>
                <p className="text-gray-400 text-sm">API docs and guides</p>
              </div>
              <span className="text-2xl text-indigo-400">
                <FontAwesomeIcon icon={faBook} />
              </span>
            </Link>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <div>
                <p className="text-white font-medium">API Docs (Swagger)</p>
                <p className="text-gray-400 text-sm">Interactive API explorer</p>
              </div>
              <span className="text-2xl text-indigo-400">
                <FontAwesomeIcon icon={faLink} />
              </span>
            </a>
          </div>
        </div>

        {/* About */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">About</h2>
          <p className="text-gray-400 mb-4">
            Chat with Fundamentals is an AI-powered financial analysis platform providing real-time market data,
            comprehensive fundamental analysis, and intelligent chat assistance for equity research.
          </p>
          <div className="flex gap-4">
            <a
              href="https://github.com/SL-Mar"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300"
            >
              GitHub
            </a>
            <Link href="/contribute" className="text-indigo-400 hover:text-indigo-300">
              Contribute
            </Link>
            <Link href="/disclaimer" className="text-indigo-400 hover:text-indigo-300">
              Disclaimer
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
