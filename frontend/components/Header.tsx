// Header.tsx

'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome, faInfoCircle, faEnvelope,
  faBookOpen, faCog, faCodeBranch, faSignOutAlt, faHandshake,
  faComments, faChartLine, faNewspaper, faCalendarAlt, faEye
} from '@fortawesome/free-solid-svg-icons';
// import { api } from '../lib/api'; // in case function are called

const Header = () => {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      fetch('http://localhost:8000/shutdown', { method: 'POST' });
  
      setTimeout(() => {
        window.location.href = '/goodbye';
      }, 300);
    } catch (error) {
      console.error('Shutdown failed', error);
      window.location.href = '/goodbye';
    }
  };
  
  
  return (
    <header className="flex flex-col items-center p-4 bg-gray-200 dark:bg-gray-800">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
        Chat with Fundamentals
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Equity Research with EODHD APIs
      </p>

      <nav className="mt-2 w-full flex justify-center">
        <ul className="flex flex-wrap justify-center gap-4 items-center">
          {/* Main Features */}
          <li>
            <Link href="/" className="text-gray-800 dark:text-gray-200 hover:underline">
              <FontAwesomeIcon icon={faHome} className="mr-1" />
              Home
            </Link>
          </li>
          <li>
            <Link href="/unified-chat" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              <FontAwesomeIcon icon={faComments} className="mr-1" />
              AI Chat
            </Link>
          </li>
          <li>
            <Link href="/screener" className="text-gray-800 dark:text-gray-200 hover:underline">
              <FontAwesomeIcon icon={faChartLine} className="mr-1" />
              Screener
            </Link>
          </li>
          <li>
            <Link href="/calendar" className="text-gray-800 dark:text-gray-200 hover:underline">
              <FontAwesomeIcon icon={faCalendarAlt} className="mr-1" />
              Calendar
            </Link>
          </li>
          <li>
            <Link href="/financials" className="text-gray-800 dark:text-gray-200 hover:underline">
              <FontAwesomeIcon icon={faChartLine} className="mr-1" />
              Financials
            </Link>
          </li>
          <li>
            <Link href="/monitoring" className="text-gray-800 dark:text-gray-200 hover:underline">
              <FontAwesomeIcon icon={faEye} className="mr-1" />
              Monitoring
            </Link>
          </li>

          {/* Divider */}
          <li className="text-gray-400">|</li>

          {/* Info & Settings */}
          <li>
            <Link href="/gettingstarted" className="text-gray-800 dark:text-gray-200 hover:underline">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
              Getting Started
            </Link>
          </li>
          <li>
            <Link href="/documentation" className="text-gray-800 dark:text-gray-200 hover:underline">
              <FontAwesomeIcon icon={faBookOpen} className="mr-1" />
              Docs
            </Link>
          </li>
          <li>
            <Link href="/settings" className="text-gray-800 dark:text-gray-200 hover:underline">
              <FontAwesomeIcon icon={faCog} className="mr-1" />
              Settings
            </Link>
          </li>

          {/* Divider */}
          <li className="text-gray-400">|</li>

          {/* System */}
          <li>
            <Link href="/logs" className="text-gray-800 dark:text-gray-200 hover:underline">
              <FontAwesomeIcon icon={faCodeBranch} className="mr-1" />
              Logs
            </Link>
          </li>
          <li>
            <button
              onClick={handleLogout}
              className="text-red-500 dark:text-red-400 hover:underline flex items-center"
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="mr-1" />
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
