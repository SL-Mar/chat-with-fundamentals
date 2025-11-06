// pages/sec-filings.tsx - SEC Filings RAG Analysis
'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileAlt,
  faSearch,
  faRobot,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle,
  faDownload,
  faChartLine,
  faCalendar,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import SECPDFViewer from '../components/SECPDFViewer';
import AgentConsole from '../components/AgentConsole';

type FilingType = '10-K' | '10-Q' | '8-K';

interface SearchResult {
  content: string;
  metadata: {
    ticker: string;
    filing_type: string;
    filing_date: string;
    source: string;
  };
}

interface QAResponse {
  answer: string;
  sources: Array<{
    filing_type: string;
    filing_date: string;
    excerpt: string;
  }>;
  ticker: string;
  query: string;
}

export default function SECFilingsPage() {
  // State
  const [ticker, setTicker] = useState('');
  const [selectedFilingTypes, setSelectedFilingTypes] = useState<FilingType[]>(['10-K', '10-Q']);
  const [limitPerType, setLimitPerType] = useState(2);
  const [indexing, setIndexing] = useState(false);
  const [indexStatus, setIndexStatus] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'search' | 'qa'>('qa');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [qaResponse, setQAResponse] = useState<QAResponse | null>(null);

  const [indexedCompanies, setIndexedCompanies] = useState<string[]>([]);
  const [stats, setStats] = useState<{ ticker: string; total_chunks: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Document viewer state
  const [viewingTicker, setViewingTicker] = useState<string | null>(null);
  const [viewingFilingType, setViewingFilingType] = useState<string | null>(null);
  const [viewingFilingDate, setViewingFilingDate] = useState<string | null>(null);

  const API_URL = 'http://localhost:8000';

  // Handlers
  const handleIndexFilings = async () => {
    if (!ticker.trim()) {
      setError('Please enter a ticker symbol');
      return;
    }

    try {
      setIndexing(true);
      setError(null);
      setIndexStatus(null);

      const response = await fetch(`${API_URL}/sec-filings/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: ticker.toUpperCase(),
          filing_types: selectedFilingTypes,
          limit_per_type: limitPerType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to index filings');
      }

      const data = await response.json();
      setIndexStatus(data.message);

      // Refresh indexed companies list
      fetchIndexedCompanies();

      // Poll for stats after a delay
      setTimeout(() => fetchStats(ticker.toUpperCase()), 10000);

    } catch (err: any) {
      setError(err.message || 'Failed to index filings');
    } finally {
      setIndexing(false);
    }
  };

  const handleSearch = async () => {
    if (!ticker.trim() || !query.trim()) {
      setError('Please enter both ticker and query');
      return;
    }

    try {
      setSearching(true);
      setError(null);
      setSearchResults([]);
      setQAResponse(null);

      const endpoint = mode === 'qa' ? '/sec-filings/qa' : '/sec-filings/search';

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: ticker.toUpperCase(),
          query: query,
          k: 5,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Search failed');
      }

      const data = await response.json();

      if (mode === 'qa') {
        setQAResponse(data);
      } else {
        setSearchResults(data);
      }

    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const fetchStats = async (tickerSymbol: string) => {
    try {
      const response = await fetch(`${API_URL}/sec-filings/stats/${tickerSymbol}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchIndexedCompanies = async () => {
    try {
      const response = await fetch(`${API_URL}/sec-filings/indexed-companies`);
      if (response.ok) {
        const data = await response.json();
        setIndexedCompanies(data.companies || []);
      }
    } catch (err) {
      console.error('Failed to fetch indexed companies:', err);
    }
  };

  const toggleFilingType = (type: FilingType) => {
    setSelectedFilingTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleViewDocument = (ticker: string, filingType: string, filingDate: string) => {
    setViewingTicker(ticker);
    setViewingFilingType(filingType);
    setViewingFilingDate(filingDate);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <main className="max-w-[1920px] mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <FontAwesomeIcon icon={faFileAlt} className="text-blue-600" />
            SEC Filings Analysis
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Download, index, and analyze SEC filings using AI-powered semantic search
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 bg-red-900/20 border border-red-700 rounded-lg p-3 flex items-start gap-3">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 mt-1" />
            <div>
              <p className="font-semibold text-sm text-red-300">Error</p>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Status Display */}
        {indexStatus && (
          <div className="mb-4 bg-blue-900/20 border border-blue-700 rounded-lg p-3 flex items-start gap-3">
            <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500 mt-1" />
            <div>
              <p className="font-semibold text-sm text-blue-300">Status</p>
              <p className="text-sm text-blue-400">{indexStatus}</p>
            </div>
          </div>
        )}

        {/* 3-Column Layout */}
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-240px)]">
          {/* Left Column: Controls + Agent Console */}
          <div className="col-span-3 flex flex-col gap-4 overflow-hidden">
            {/* Indexing Controls */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700 overflow-y-auto">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <FontAwesomeIcon icon={faDownload} className="text-green-600" />
                Index Filings
              </h2>

              {/* Ticker Input */}
              <div className="mb-3">
                <label className="block text-xs font-semibold mb-1">Ticker Symbol</label>
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  placeholder="e.g., AAPL"
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filing Types */}
              <div className="mb-3">
                <label className="block text-xs font-semibold mb-1">Filing Types</label>
                <div className="space-y-1">
                  {(['10-K', '10-Q', '8-K'] as FilingType[]).map((type) => (
                    <div key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        id={type}
                        checked={selectedFilingTypes.includes(type)}
                        onChange={() => toggleFilingType(type)}
                        className="mr-2 h-3 w-3 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={type} className="text-xs">
                        {type} {type === '10-K' && '(Annual)'}
                        {type === '10-Q' && '(Quarterly)'}
                        {type === '8-K' && '(Events)'}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Limit */}
              <div className="mb-3">
                <label className="block text-xs font-semibold mb-1">
                  Filings per Type: {limitPerType}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={limitPerType}
                  onChange={(e) => setLimitPerType(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Index Button */}
              <button
                onClick={handleIndexFilings}
                disabled={indexing || !ticker.trim()}
                className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {indexing ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    Indexing...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faDownload} />
                    Index Filings
                  </>
                )}
              </button>

              {/* Stats */}
              {stats && stats.ticker === ticker.toUpperCase() && (
                <div className="mt-3 p-2 bg-green-900/20 border border-green-700 rounded-lg">
                  <p className="text-xs text-green-300">
                    <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                    Indexed: <strong>{stats.total_chunks}</strong> chunks
                  </p>
                </div>
              )}

              {/* Indexed Companies */}
              <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                  <FontAwesomeIcon icon={faChartLine} className="text-purple-600" />
                  Indexed Companies
                </h3>
                <button
                  onClick={fetchIndexedCompanies}
                  className="text-xs text-blue-500 hover:text-blue-400 mb-2"
                >
                  Refresh List
                </button>
                {indexedCompanies.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {indexedCompanies.map((company) => (
                      <button
                        key={company}
                        onClick={() => {
                          setTicker(company);
                          fetchStats(company);
                        }}
                        className="px-2 py-1 bg-purple-600/20 border border-purple-600 rounded-full text-xs hover:bg-purple-600/30 transition-colors"
                      >
                        {company}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No indexed companies yet</p>
                )}
              </div>
            </div>

            {/* Agent Console */}
            <div className="flex-1 min-h-0">
              <AgentConsole maxLogs={100} autoScroll={true} />
            </div>
          </div>

          {/* Middle Column: Search/Q&A + Results */}
          <div className="col-span-5 flex flex-col gap-4 overflow-hidden">
            {/* Search Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <FontAwesomeIcon icon={mode === 'qa' ? faRobot : faSearch} className="text-blue-600" />
                {mode === 'qa' ? 'Ask Questions (Q&A)' : 'Semantic Search'}
              </h2>

              {/* Mode Toggle */}
              <div className="mb-3 flex gap-2">
                <button
                  onClick={() => setMode('qa')}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg font-semibold transition-colors ${
                    mode === 'qa'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <FontAwesomeIcon icon={faRobot} className="mr-1" />
                  Q&A Mode
                </button>
                <button
                  onClick={() => setMode('search')}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg font-semibold transition-colors ${
                    mode === 'search'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <FontAwesomeIcon icon={faSearch} className="mr-1" />
                  Search Mode
                </button>
              </div>

              {/* Query Input */}
              <div className="mb-3">
                <label className="block text-xs font-semibold mb-1">
                  {mode === 'qa' ? 'Your Question' : 'Search Query'}
                </label>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    mode === 'qa'
                      ? 'e.g., What are the main risk factors mentioned in recent filings?'
                      : 'e.g., revenue breakdown by product category'
                  }
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Search Button */}
              <button
                onClick={handleSearch}
                disabled={searching || !ticker.trim() || !query.trim()}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {searching ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    Searching...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={mode === 'qa' ? faRobot : faSearch} />
                    {mode === 'qa' ? 'Ask Question' : 'Search Filings'}
                  </>
                )}
              </button>
            </div>

            {/* Results - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              {/* Q&A Results */}
              {qaResponse && mode === 'qa' && (
                <div className="space-y-4">
                  {/* Answer */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-md font-bold mb-3 flex items-center gap-2">
                      <FontAwesomeIcon icon={faRobot} className="text-green-600" />
                      Answer
                    </h3>
                    <div className="p-3 bg-green-900/10 border border-green-700 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{qaResponse.answer}</p>
                    </div>
                  </div>

                  {/* Sources */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-md font-semibold mb-3 flex items-center gap-2">
                      <FontAwesomeIcon icon={faFileAlt} className="text-blue-600" />
                      Sources
                    </h4>
                    <div className="space-y-2">
                      {qaResponse.sources.map((source, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleViewDocument(qaResponse.ticker, source.filing_type, source.filing_date)}
                          className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-blue-500 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">
                              {source.filing_type}
                            </span>
                            <FontAwesomeIcon icon={faCalendar} className="text-gray-500 text-xs" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {source.filing_date}
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 dark:text-gray-300">{source.excerpt}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && mode === 'search' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-md font-bold mb-3 flex items-center gap-2">
                    <FontAwesomeIcon icon={faSearch} className="text-blue-600" />
                    Search Results ({searchResults.length})
                  </h3>

                  <div className="space-y-3">
                    {searchResults.map((result, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleViewDocument(result.metadata.ticker, result.metadata.filing_type, result.metadata.filing_date)}
                        className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-purple-500 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-purple-600 text-white text-xs font-semibold rounded">
                            {result.metadata.filing_type}
                          </span>
                          <FontAwesomeIcon icon={faCalendar} className="text-gray-500 text-xs" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {result.metadata.filing_date}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {result.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Document Viewer */}
          <div className="col-span-4 overflow-hidden">
            <SECPDFViewer
              ticker={viewingTicker}
              filingType={viewingFilingType}
              filingDate={viewingFilingDate}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
