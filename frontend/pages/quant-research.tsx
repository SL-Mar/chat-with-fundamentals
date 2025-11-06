// pages/quant-research.tsx - Quant Research RAG System
import { useState, useEffect } from 'react';
import Head from 'next/head';
import AgentConsole from '../components/AgentConsole';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faSearch, faBook, faFileAlt, faArrowRight } from '@fortawesome/free-solid-svg-icons';

interface Document {
  title: string;
  authors: string;
  year: number;
  category: string;
  tags: string;
  indexed_at: string;
}

interface SearchResult {
  title: string;
  authors: string;
  year: number;
  category: string;
  excerpt: string;
}

export default function QuantResearchPage() {
  const API_URL = 'http://localhost:8000';

  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<{ total_chunks: number } | null>(null);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadAuthors, setUploadAuthors] = useState('');
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
  const [uploadCategory, setUploadCategory] = useState('general');
  const [uploadTags, setUploadTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Search state
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    loadDocuments();
    loadStats();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await fetch(`${API_URL}/quant-research/documents`, {
        headers: { 'X-API-Key': 'test-key-123' }
      });
      const data = await response.json();
      setDocuments(data.documents);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_URL}/quant-research/stats`, {
        headers: { 'X-API-Key': 'test-key-123' }
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const uploadDocument = async () => {
    if (!uploadFile || !uploadTitle) {
      setUploadError('File and title are required');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle);
      if (uploadAuthors) formData.append('authors', uploadAuthors);
      if (uploadYear) formData.append('year', uploadYear.toString());
      formData.append('category', uploadCategory);
      if (uploadTags) formData.append('tags', uploadTags);

      const response = await fetch(`${API_URL}/quant-research/upload`, {
        method: 'POST',
        headers: { 'X-API-Key': 'test-key-123' },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      // Reset form
      setUploadFile(null);
      setUploadTitle('');
      setUploadAuthors('');
      setUploadYear(new Date().getFullYear());
      setUploadCategory('general');
      setUploadTags('');

      // Reload documents after a delay (indexing happens in background)
      setTimeout(() => {
        loadDocuments();
        loadStats();
      }, 2000);

    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const searchResearch = async () => {
    if (!query) {
      setSearchError('Query is required');
      return;
    }

    setSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setAnswer('');

    try {
      const response = await fetch(`${API_URL}/quant-research/qa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-key-123'
        },
        body: JSON.stringify({ query, k: 5 })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Search failed');
      }

      const data = await response.json();
      setAnswer(data.answer);
      setSearchResults(data.sources);

    } catch (err: any) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      <Head>
        <title>Quant Research - Chat with Fundamentals</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <FontAwesomeIcon icon={faBook} className="text-blue-600" />
              Quant Research Library
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Upload research papers, strategy documents, and query them with AI
            </p>
          </div>

          {/* Stats */}
          {stats && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Total Indexed Chunks</span>
                <span className="text-2xl font-bold text-blue-600">{stats.total_chunks}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Upload & Documents */}
            <div className="lg:col-span-1 space-y-6">
              {/* Upload Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faUpload} />
                  Upload Document
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      PDF File *
                    </label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="w-full text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer bg-gray-50 dark:bg-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="Document title"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Authors
                    </label>
                    <input
                      type="text"
                      value={uploadAuthors}
                      onChange={(e) => setUploadAuthors(e.target.value)}
                      placeholder="Author names"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Year
                    </label>
                    <input
                      type="number"
                      value={uploadYear}
                      onChange={(e) => setUploadYear(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="general">General</option>
                      <option value="strategy">Strategy</option>
                      <option value="risk">Risk Management</option>
                      <option value="portfolio">Portfolio Theory</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={uploadTags}
                      onChange={(e) => setUploadTags(e.target.value)}
                      placeholder="momentum, mean-reversion"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <button
                    onClick={uploadDocument}
                    disabled={uploading || !uploadFile || !uploadTitle}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Uploading...' : 'Upload & Index'}
                  </button>

                  {uploadError && (
                    <div className="p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 rounded-md text-red-700 dark:text-red-200 text-sm">
                      {uploadError}
                    </div>
                  )}
                </div>
              </div>

              {/* Documents List */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faFileAlt} />
                  Indexed Documents ({documents.length})
                </h2>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {documents.map((doc, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                      <div className="font-semibold text-sm text-gray-900 dark:text-white">{doc.title}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {doc.authors} ({doc.year})
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 rounded text-blue-800 dark:text-blue-200">
                          {doc.category}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Middle Column: Q&A */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 h-full flex flex-col">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faSearch} />
                  Ask a Question
                </h2>

                <div className="flex-1 flex flex-col">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="What are effective momentum strategies?"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none mb-4"
                  />

                  <button
                    onClick={searchResearch}
                    disabled={searching || !query}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed mb-4 flex items-center justify-center gap-2"
                  >
                    <FontAwesomeIcon icon={faSearch} />
                    {searching ? 'Searching...' : 'Search'}
                  </button>

                  {searchError && (
                    <div className="p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 rounded-md text-red-700 dark:text-red-200 text-sm mb-4">
                      {searchError}
                    </div>
                  )}

                  {answer && (
                    <div className="flex-1 overflow-y-auto">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Answer:</h3>
                      <div className="prose dark:prose-invert max-w-none text-sm">
                        {answer.split('\n').map((paragraph, idx) => (
                          <p key={idx} className="mb-2">{paragraph}</p>
                        ))}
                      </div>

                      {searchResults.length > 0 && (
                        <>
                          <h3 className="font-semibold text-gray-900 dark:text-white mt-4 mb-2">Sources:</h3>
                          <div className="space-y-2">
                            {searchResults.map((result, idx) => (
                              <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                                <div className="font-semibold text-sm text-gray-900 dark:text-white">
                                  {result.title}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  {result.authors} ({result.year})
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Agent Console */}
            <div className="lg:col-span-1">
              <AgentConsole />
            </div>
          </div>
        </div>
    </>
  );
}
