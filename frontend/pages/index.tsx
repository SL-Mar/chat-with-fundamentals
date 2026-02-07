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
  faCalendarDays, faBullseye, faEye, faFilter, faCog,
  faBrain, faFileAlt, faExchangeAlt, faBriefcase, faGlobe
} from '@fortawesome/free-solid-svg-icons'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900">
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
            className="inline-block px-8 py-4 bg-gray-700 text-white text-xl font-semibold rounded-lg hover:bg-gray-600 transition-colors shadow-lg"
          >
            <FontAwesomeIcon icon={faRocket} className="mr-2" />
            Launch AI Chat Assistant
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-20">
          <Link href="/stock-ai-analysis" className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-500 transition-colors cursor-pointer block">
            <div className="text-4xl mb-4 text-gray-400">
              <FontAwesomeIcon icon={faBrain} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Trading Signals</h3>
            <p className="text-gray-400">
              MarketSense AI: multi-agent BUY/HOLD/SELL recommendations from fundamentals, news, price dynamics and macro
            </p>
          </Link>

          <Link href="/sec-filings" className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-500 transition-colors cursor-pointer block">
            <div className="text-4xl mb-4 text-gray-400">
              <FontAwesomeIcon icon={faFileAlt} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">SEC Filings</h3>
            <p className="text-gray-400">
              Search and analyze 10-K/10-Q filings with RAG-powered Q&A and interactive PDF viewer
            </p>
          </Link>

          <Link href="/stocks" className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-500 transition-colors cursor-pointer block">
            <div className="text-4xl mb-4 text-gray-400">
              <FontAwesomeIcon icon={faChartLine} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Stock Research</h3>
            <p className="text-gray-400">
              Fundamentals, technicals, news sentiment, Monte Carlo simulation and risk metrics
            </p>
          </Link>

          <Link href="/portfolios" className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-500 transition-colors cursor-pointer block">
            <div className="text-4xl mb-4 text-gray-400">
              <FontAwesomeIcon icon={faBriefcase} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Portfolios</h3>
            <p className="text-gray-400">
              Share-based tracking with MVO, Black-Litterman, Monte Carlo VaR and rebalancing recommendations
            </p>
          </Link>

          <Link href="/pair-trading" className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-500 transition-colors cursor-pointer block">
            <div className="text-4xl mb-4 text-gray-400">
              <FontAwesomeIcon icon={faExchangeAlt} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Pair Trading</h3>
            <p className="text-gray-400">
              Cointegration analysis, z-score monitoring, hedge ratios and trading signal generation
            </p>
          </Link>

          <Link href="/currencies" className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-500 transition-colors cursor-pointer block">
            <div className="text-4xl mb-4 text-gray-400">
              <FontAwesomeIcon icon={faGlobe} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Currencies</h3>
            <p className="text-gray-400">
              Forex pair analysis with historical data, technicals and macro indicator comparison
            </p>
          </Link>
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
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
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
