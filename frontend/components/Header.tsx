// Header.tsx

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome, faInfoCircle, faEnvelope,
  faBookOpen, faCog, faCodeBranch, faSignOutAlt, faHandshake,
  faComments, faChartLine, faNewspaper, faCalendarAlt, faEye,
  faDashboard, faChartArea, faChartBar, faBuildingColumns,
  faGlobe, faFlask, faUserShield, faBars, faTimes
} from '@fortawesome/free-solid-svg-icons';

const Header = () => {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <header className="bg-gray-200 dark:bg-gray-800 shadow-md">
      <div className="container mx-auto px-4 py-4">
        {/* Header Title */}
        <div className="text-center mb-3">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
            Chat with Fundamentals
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Equity Research with EODHD APIs
          </p>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex justify-center mb-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-gray-800 dark:text-gray-200 p-2"
          >
            <FontAwesomeIcon icon={mobileMenuOpen ? faTimes : faBars} size="lg" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">

            {/* Column 1: Asset Classes */}
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3">
              <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-2 text-xs uppercase">
                🎯 Asset Classes
              </h3>
              <ul className="space-y-1">
                <li>
                  <Link href="/stocks" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center font-semibold">
                    <FontAwesomeIcon icon={faChartLine} className="mr-2 w-4" />
                    Stocks
                  </Link>
                </li>
                <li>
                  <Link href="/currencies" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center font-semibold">
                    <FontAwesomeIcon icon={faGlobe} className="mr-2 w-4" />
                    Currencies
                  </Link>
                </li>
                <li>
                  <Link href="/etfs" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center font-semibold">
                    <FontAwesomeIcon icon={faBuildingColumns} className="mr-2 w-4" />
                    ETFs
                  </Link>
                </li>
                <li>
                  <Link href="/macro" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center font-semibold">
                    <FontAwesomeIcon icon={faChartBar} className="mr-2 w-4" />
                    Macro Indicators
                  </Link>
                </li>
                <li>
                  <Link href="/portfolios" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center font-semibold">
                    <FontAwesomeIcon icon={faDashboard} className="mr-2 w-4" />
                    Portfolios
                  </Link>
                </li>
                <li className="pt-2 border-t border-gray-300 dark:border-gray-700 mt-2">
                  <Link href="/unified-chat" className="text-gray-800 dark:text-gray-200 hover:underline flex items-center">
                    <FontAwesomeIcon icon={faComments} className="mr-2 w-4" />
                    AI Chat
                  </Link>
                </li>
                <li>
                  <Link href="/screener" className="text-gray-800 dark:text-gray-200 hover:underline flex items-center">
                    <FontAwesomeIcon icon={faChartLine} className="mr-2 w-4" />
                    Screener
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2: Market Data */}
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3">
              <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-2 text-xs uppercase">
                📊 Market Data
              </h3>
              <ul className="space-y-1">
                <li>
                  <Link href="/economic-dashboard" className="text-gray-800 dark:text-gray-200 hover:underline flex items-center">
                    <FontAwesomeIcon icon={faGlobe} className="mr-2 w-4" />
                    Economic Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/etf-analyzer" className="text-gray-800 dark:text-gray-200 hover:underline flex items-center">
                    <FontAwesomeIcon icon={faBuildingColumns} className="mr-2 w-4" />
                    ETF Analyzer
                  </Link>
                </li>
                <li>
                  <Link href="/calendar" className="text-gray-800 dark:text-gray-200 hover:underline flex items-center">
                    <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 w-4" />
                    Calendar
                  </Link>
                </li>
                <li>
                  <Link href="/demo" className="text-gray-800 dark:text-gray-200 hover:underline flex items-center">
                    <FontAwesomeIcon icon={faChartLine} className="mr-2 w-4" />
                    Demo
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: System & Admin */}
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3">
              <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-2 text-xs uppercase">
                ⚙️ System
              </h3>
              <ul className="space-y-1">
                <li>
                  <Link href="/monitoring" className="text-gray-800 dark:text-gray-200 hover:underline flex items-center">
                    <FontAwesomeIcon icon={faEye} className="mr-2 w-4" />
                    Monitoring
                  </Link>
                </li>
                <li>
                  <Link href="/admin" className="text-gray-800 dark:text-gray-200 hover:underline flex items-center">
                    <FontAwesomeIcon icon={faUserShield} className="mr-2 w-4" />
                    Admin
                  </Link>
                </li>
                <li>
                  <Link href="/settings" className="text-gray-800 dark:text-gray-200 hover:underline flex items-center">
                    <FontAwesomeIcon icon={faCog} className="mr-2 w-4" />
                    Settings
                  </Link>
                </li>
                <li>
                  <Link href="/logs" className="text-gray-800 dark:text-gray-200 hover:underline flex items-center">
                    <FontAwesomeIcon icon={faCodeBranch} className="mr-2 w-4" />
                    Logs
                  </Link>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="text-red-500 dark:text-red-400 hover:underline flex items-center w-full text-left"
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} className="mr-2 w-4" />
                    Logout
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Information */}
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3">
              <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-2 text-xs uppercase">
                ℹ️ Information
              </h3>
              <ul className="space-y-1">
                <li>
                  <Link href="/" className="text-gray-800 dark:text-gray-200 hover:underline flex items-center">
                    <FontAwesomeIcon icon={faHome} className="mr-2 w-4" />
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/gettingstarted" className="text-gray-800 dark:text-gray-200 hover:underline flex items-center">
                    <FontAwesomeIcon icon={faInfoCircle} className="mr-2 w-4" />
                    Getting Started
                  </Link>
                </li>
                <li>
                  <Link href="/documentation" className="text-gray-800 dark:text-gray-200 hover:underline flex items-center">
                    <FontAwesomeIcon icon={faBookOpen} className="mr-2 w-4" />
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/contribute" className="text-gray-800 dark:text-gray-200 hover:underline flex items-center">
                    <FontAwesomeIcon icon={faHandshake} className="mr-2 w-4" />
                    Contribute
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-800 dark:text-gray-200 hover:underline flex items-center">
                    <FontAwesomeIcon icon={faEnvelope} className="mr-2 w-4" />
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/disclaimer" className="text-gray-800 dark:text-gray-200 hover:underline flex items-center">
                    <FontAwesomeIcon icon={faInfoCircle} className="mr-2 w-4" />
                    Disclaimer
                  </Link>
                </li>
              </ul>
            </div>

          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
