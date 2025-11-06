// Header.tsx - Clean navigation matching QuantCoderFS design
'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine, faGlobe, faBuildingColumns, faChartBar, faFileAlt,
  faDashboard, faComments, faFilter, faCog, faSignOutAlt, faDatabase
} from '@fortawesome/free-solid-svg-icons';

const Header = () => {
  const router = useRouter();
  const currentPath = router.pathname;

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:8000/shutdown', { method: 'POST' });
      setTimeout(() => {
        window.location.href = '/goodbye';
      }, 300);
    } catch (error) {
      console.error('Shutdown failed', error);
      window.location.href = '/goodbye';
    }
  };

  const isActive = (path: string) => currentPath.startsWith(path);

  return (
    <header className="bg-[#161b22] border-b border-[#30363d] px-6 py-4">
      <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
        {/* Left: Logo + Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#c9d1d9]">
              Chat with Fundamentals
            </h1>
            <p className="text-xs text-[#6e7681]">Multi-Asset Market Intelligence</p>
          </div>
        </div>

        {/* Right: Main Navigation */}
        <nav className="flex items-center space-x-6">
          {/* Asset Modules */}
          <Link
            href="/stocks"
            className={`flex items-center space-x-2 transition-colors text-sm font-medium ${
              isActive('/stocks')
                ? 'text-[#58a6ff]'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <FontAwesomeIcon icon={faChartLine} className="text-sm" />
            <span>Stocks</span>
          </Link>

          <Link
            href="/etfs"
            className={`flex items-center space-x-2 transition-colors text-sm font-medium ${
              isActive('/etfs')
                ? 'text-[#58a6ff]'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <FontAwesomeIcon icon={faBuildingColumns} className="text-sm" />
            <span>ETFs</span>
          </Link>

          <Link
            href="/currencies"
            className={`flex items-center space-x-2 transition-colors text-sm font-medium ${
              isActive('/currencies')
                ? 'text-[#58a6ff]'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <FontAwesomeIcon icon={faGlobe} className="text-sm" />
            <span>Currencies</span>
          </Link>

          <Link
            href="/macro-comparison"
            className={`flex items-center space-x-2 transition-colors text-sm font-medium ${
              isActive('/macro')
                ? 'text-[#58a6ff]'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <FontAwesomeIcon icon={faChartBar} className="text-sm" />
            <span>Macro</span>
          </Link>

          <Link
            href="/sec-filings"
            className={`flex items-center space-x-2 transition-colors text-sm font-medium ${
              isActive('/sec-filings')
                ? 'text-[#58a6ff]'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <FontAwesomeIcon icon={faFileAlt} className="text-sm" />
            <span>SEC Filings</span>
          </Link>

          {/* Divider */}
          <div className="h-4 w-px bg-[#30363d]" />

          {/* Tools */}
          <Link
            href="/portfolios"
            className={`flex items-center space-x-2 transition-colors text-sm ${
              isActive('/portfolios')
                ? 'text-[#58a6ff]'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <FontAwesomeIcon icon={faDashboard} className="text-sm" />
            <span>Portfolio</span>
          </Link>

          <Link
            href="/screener"
            className={`flex items-center space-x-2 transition-colors text-sm ${
              isActive('/screener')
                ? 'text-[#58a6ff]'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <FontAwesomeIcon icon={faFilter} className="text-sm" />
            <span>Screener</span>
          </Link>

          <Link
            href="/chat"
            className={`flex items-center space-x-2 transition-colors text-sm ${
              isActive('/chat')
                ? 'text-[#58a6ff]'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <FontAwesomeIcon icon={faComments} className="text-sm" />
            <span>AI Chat</span>
          </Link>

          {/* Divider */}
          <div className="h-4 w-px bg-[#30363d]" />

          {/* Database */}
          <Link
            href="/database-manager"
            className={`flex items-center space-x-2 transition-colors text-sm ${
              isActive('/database-manager')
                ? 'text-[#58a6ff]'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <FontAwesomeIcon icon={faDatabase} className="text-sm" />
            <span>Database</span>
          </Link>

          {/* Settings */}
          <Link
            href="/settings"
            className={`flex items-center space-x-2 transition-colors text-sm ${
              isActive('/settings')
                ? 'text-[#58a6ff]'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <FontAwesomeIcon icon={faCog} className="text-sm" />
            <span>Settings</span>
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 text-[#8b949e] hover:text-[#f85149] transition-colors"
            title="Exit application"
          >
            <FontAwesomeIcon icon={faSignOutAlt} className="text-base" />
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
