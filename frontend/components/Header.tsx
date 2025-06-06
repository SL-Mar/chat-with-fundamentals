// Header.tsx

'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome, faInfoCircle, faEnvelope,
  faBookOpen, faCog, faCodeBranch, faSignOutAlt, faHandshake
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
        <ul className="flex space-x-6 items-center">
          <li>
            <Link href="/" className="text-gray-800 dark:text-gray-200 hover:underline">
              <FontAwesomeIcon icon={faHome} className="mr-1" />
              Home
            </Link>
          </li>
          <li>
            <Link href="/gettingstarted" className="text-gray-800 dark:text-gray-200 hover:underline">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
              Getting Started
            </Link>
          </li>
          <li>
            <Link href="/contribute" className="text-gray-800 dark:text-gray-200 hover:underline">
              <FontAwesomeIcon icon={faHandshake} className="mr-1" />
              Contribute
            </Link>
          </li>
          <li>
            <Link href="/logs" className="text-gray-800 dark:text-gray-200 hover:underline">
              <FontAwesomeIcon icon={faCodeBranch} className="mr-1" />
              LLM Logs
            </Link>
          </li>
          <li>
            <Link href="/documentation" className="text-gray-800 dark:text-gray-200 hover:underline">
              <FontAwesomeIcon icon={faBookOpen} className="mr-1" />
              Documentation
            </Link>
          </li>
          <li>
            <Link href="/settings" className="text-gray-800 dark:text-gray-200 hover:underline">
              <FontAwesomeIcon icon={faCog} className="mr-1" />
              Settings
            </Link>
          </li>
          <li>
            <Link href="/contact" className="text-gray-800 dark:text-gray-200 hover:underline">
              <FontAwesomeIcon icon={faEnvelope} className="mr-1" />
              Contact
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
