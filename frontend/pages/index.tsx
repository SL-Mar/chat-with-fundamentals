/*
 * Copyright 2024 - SL MAR - Sebastien M. LAIGNEL
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faRocket, faComments, faChartLine, faChartArea,
  faCalendarDays, faBullseye, faEye, faFilter, faCog
} from '@fortawesome/free-solid-svg-icons'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900">
      <div className="container mx-auto px-4 py-20">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-6">
            Chat with Fundamentals
          </h1>
          <p className="text-2xl text-gray-300 mb-8">
            AI-Powered Financial Analysis & Research Platform
          </p>
          <Link
            href="/unified-chat"
            className="inline-block px-8 py-4 bg-indigo-600 text-white text-xl font-semibold rounded-lg hover:bg-indigo-500 transition-colors shadow-lg"
          >
            <FontAwesomeIcon icon={faRocket} className="mr-2" />
            Launch AI Chat Assistant
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-20">
          {/* Feature 1 */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-indigo-500 transition-colors">
            <div className="text-4xl mb-4 text-indigo-400">
              <FontAwesomeIcon icon={faComments} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">AI Chat Assistant</h3>
            <p className="text-gray-400">
              Dual-mode chat: Quick queries from database or comprehensive AI analysis with full reports
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-indigo-500 transition-colors">
            <div className="text-4xl mb-4 text-indigo-400">
              <FontAwesomeIcon icon={faChartLine} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Real-Time Data</h3>
            <p className="text-gray-400">
              Access live prices, OHLCV data, fundamentals, news, and market intelligence
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-indigo-500 transition-colors">
            <div className="text-4xl mb-4 text-indigo-400">
              <FontAwesomeIcon icon={faChartArea} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Technical Analysis</h3>
            <p className="text-gray-400">
              Advanced indicators, screening tools, and customizable charts for technical traders
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-indigo-500 transition-colors">
            <div className="text-4xl mb-4 text-indigo-400">
              <FontAwesomeIcon icon={faCalendarDays} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Events Calendar</h3>
            <p className="text-gray-400">
              Track earnings, IPOs, splits, and dividends across all major exchanges
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-indigo-500 transition-colors">
            <div className="text-4xl mb-4 text-indigo-400">
              <FontAwesomeIcon icon={faBullseye} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Corporate Actions</h3>
            <p className="text-gray-400">
              Monitor dividends, splits, and insider transactions with detailed analysis
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-indigo-500 transition-colors">
            <div className="text-4xl mb-4 text-indigo-400">
              <FontAwesomeIcon icon={faEye} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">System Monitoring</h3>
            <p className="text-gray-400">
              Real-time dashboards for database, cache, and API usage metrics
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-20">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-gray-400 mb-8">
            Choose your preferred tool from the navigation menu
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link
              href="/unified-chat"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
            >
              <FontAwesomeIcon icon={faComments} className="mr-2" />
              AI Chat
            </Link>
            <Link
              href="/screener"
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <FontAwesomeIcon icon={faFilter} className="mr-2" />
              Stock Screener
            </Link>
            <Link
              href="/calendar"
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <FontAwesomeIcon icon={faCalendarDays} className="mr-2" />
              Events Calendar
            </Link>
            <Link
              href="/monitoring"
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <FontAwesomeIcon icon={faEye} className="mr-2" />
              Monitoring
            </Link>
            <Link
              href="/admin"
              className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 transition-colors"
            >
              <FontAwesomeIcon icon={faCog} className="mr-2" />
              Admin
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
