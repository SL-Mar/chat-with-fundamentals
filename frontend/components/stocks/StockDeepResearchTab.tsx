// components/stocks/StockDeepResearchTab.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface StockDeepResearchTabProps {
  ticker: string;
}

interface ResearchReport {
  query: string;
  report: string;
  timestamp: string;
  sources?: string[];
}

export default function StockDeepResearchTab({ ticker }: StockDeepResearchTabProps) {
  const [query, setQuery] = useState(`Provide a comprehensive analysis of ${ticker} including financial performance, competitive positioning, and growth prospects`);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentReport, setCurrentReport] = useState<ResearchReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [progressMessage, setProgressMessage] = useState('Initializing...');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Timer for elapsed time during research
  useEffect(() => {
    if (isGenerating) {
      startTimeRef.current = Date.now();
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isGenerating]);

  // WebSocket for progress updates
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const wsUrl = apiUrl.replace(/^http/, 'ws');
    const apiKey = process.env.NEXT_PUBLIC_APP_API_KEY || '';
    const wsEndpoint = apiKey
      ? `${wsUrl}/api/v2/ws/agent-console?token=${encodeURIComponent(apiKey)}`
      : `${wsUrl}/api/v2/ws/agent-console`;

    let ws: WebSocket | null = null;

    if (isGenerating) {
      ws = new WebSocket(wsEndpoint);

      ws.onmessage = (event) => {
        if (event.data === 'pong') return;

        try {
          const log = JSON.parse(event.data);
          if (log.agent === 'gpt_researcher') {
            setProgressMessage(log.message);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [isGenerating]);

  const handleGenerate = async (template?: string) => {
    try {
      setIsGenerating(true);
      setError(null);

      let researchQuery = query;

      // Define templates (available for both usage and display)
      const templates: Record<string, string> = {
        deep_dive: `Deep Dive: Provide a comprehensive deep dive analysis of ${ticker} including:
- Detailed financial performance analysis (revenue, profitability, cash flow)
- Business model and competitive positioning
- Management quality and corporate governance
- Growth outlook and strategic initiatives
- Risk factors and challenges`,

        industry: `Industry Analysis: Analyze the industry and competitive landscape for ${ticker}:
- Industry trends and growth drivers
- Major competitors and market share analysis
- Barriers to entry and competitive advantages
- Regulatory environment and policy impacts
- Future outlook for the sector`,

        risk: `Risk Assessment: Conduct a comprehensive risk assessment for ${ticker}:
- Regulatory and compliance risks
- Competitive threats and market disruption risks
- Operational and execution risks
- Financial and liquidity risks
- Macroeconomic and geopolitical risks
- ESG (Environmental, Social, Governance) risks`,

        growth: `Growth Opportunities: Identify growth opportunities and catalysts for ${ticker}:
- New product launches and innovation pipeline
- Market expansion opportunities (geographic, demographic)
- Strategic partnerships and M&A potential
- Emerging trends that could benefit the company
- Expected growth drivers over the next 1-3 years`
      };

      // Use template if provided
      if (template) {
        researchQuery = templates[template] || query;
      }

      if (!researchQuery.trim()) {
        setError('Please enter a research query or select a template');
        setIsGenerating(false);
        return;
      }

      // Call the GPT-Researcher deep research endpoint
      const apiKey = localStorage.getItem('apiKey');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(
        `${apiUrl}/api/v2/deep-research?query=${encodeURIComponent(researchQuery)}&ticker=${ticker}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey || '',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate research report');
      }

      const data = await response.json();

      // Format the report from GPT-Researcher
      setCurrentReport({
        query: researchQuery,
        report: data.report || 'No report generated',
        timestamp: new Date().toISOString(),
        sources: data.sources || []
      });

      setQuery(''); // Clear query after successful generation

    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
      console.error('Error generating research:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Query Input Panel */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex gap-3 items-center">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`e.g., "Provide a comprehensive analysis of ${ticker} including financial performance, competitive positioning, and growth prospects"`}
            className="flex-1 h-16 bg-slate-700 border border-slate-600 rounded p-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 resize-none"
            disabled={isGenerating}
          />

          <div className="flex gap-2">
            <select
              onChange={(e) => e.target.value && handleGenerate(e.target.value)}
              disabled={isGenerating}
              className="px-3 py-2 bg-slate-700 border border-slate-600 text-slate-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              value=""
            >
              <option value="">Templates...</option>
              <option value="deep_dive">Deep Dive</option>
              <option value="industry">Industry</option>
              <option value="risk">Risk</option>
              <option value="growth">Growth</option>
            </select>

            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating || !query.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin">⏳</span>
                  {formatTime(elapsedTime)}
                </>
              ) : (
                'Generate Report'
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 bg-red-900/20 border border-red-500 rounded p-2">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Inline Progress Message */}
        {isGenerating && (
          <div className="mt-3 text-sm text-slate-400 flex items-center gap-2">
            <span className="animate-pulse">🔬</span>
            <span>{progressMessage}</span>
          </div>
        )}
      </div>

      {/* Report Display - Full Width */}
      {currentReport && !isGenerating && (
        <div className="flex-1 overflow-y-auto bg-slate-800 rounded-lg border border-slate-700">
          {/* Report Header */}
          <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 z-10">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold">Research Report</h4>
                <div className="text-xs text-slate-400 mt-1">
                  Query: {currentReport.query}
                </div>
              </div>
              <span className="px-3 py-1.5 bg-green-900/20 text-green-400 rounded text-sm flex items-center gap-2">
                ✓ {new Date(currentReport.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Report Content - Two Column Layout */}
          <div className="p-6">
            <div className="columns-1 lg:columns-2 gap-8 prose prose-invert max-w-none">
              <style jsx global>{`
                .prose h1 {
                  color: #e2e8f0;
                  font-size: 1.75rem;
                  font-weight: 700;
                  margin-top: 0;
                  margin-bottom: 1.25rem;
                  padding-bottom: 0.5rem;
                  border-bottom: 2px solid #334155;
                  break-after: avoid;
                }
                .prose h2 {
                  color: #cbd5e1;
                  font-size: 1.35rem;
                  font-weight: 600;
                  margin-top: 2rem;
                  margin-bottom: 0.75rem;
                  padding-bottom: 0.35rem;
                  border-bottom: 1px solid #334155;
                  break-after: avoid;
                }
                .prose h3 {
                  color: #94a3b8;
                  font-size: 1.15rem;
                  font-weight: 600;
                  margin-top: 1.5rem;
                  margin-bottom: 0.5rem;
                  break-after: avoid;
                }
                .prose p {
                  color: #cbd5e1;
                  line-height: 1.7;
                  margin-bottom: 1rem;
                  font-size: 0.95rem;
                }
                .prose strong {
                  color: #f1f5f9;
                  font-weight: 600;
                }
                .prose a {
                  color: #60a5fa;
                  text-decoration: none;
                  border-bottom: 1px solid transparent;
                  transition: all 0.2s;
                }
                .prose a:hover {
                  color: #93c5fd;
                  border-bottom-color: #60a5fa;
                }
                .prose ul, .prose ol {
                  margin-top: 0.75rem;
                  margin-bottom: 1.25rem;
                  padding-left: 1.5rem;
                  break-inside: avoid;
                }
                .prose li {
                  color: #cbd5e1;
                  margin-bottom: 0.35rem;
                  line-height: 1.6;
                }
                .prose code {
                  color: #fbbf24;
                  background: #1e293b;
                  padding: 0.125rem 0.375rem;
                  border-radius: 0.25rem;
                  font-size: 0.85em;
                  font-family: 'Courier New', monospace;
                }
                .prose blockquote {
                  border-left: 4px solid #3b82f6;
                  padding-left: 1rem;
                  color: #94a3b8;
                  font-style: italic;
                  margin: 1.25rem 0;
                  break-inside: avoid;
                }
                .prose hr {
                  border-color: #334155;
                  margin: 1.5rem 0;
                  break-after: always;
                }
                .prose table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 1.25rem 0;
                  break-inside: avoid;
                }
                .prose th {
                  background: #1e293b;
                  color: #e2e8f0;
                  font-weight: 600;
                  padding: 0.6rem;
                  text-align: left;
                  border: 1px solid #334155;
                  font-size: 0.9rem;
                }
                .prose td {
                  padding: 0.6rem;
                  border: 1px solid #334155;
                  color: #cbd5e1;
                  font-size: 0.9rem;
                }
                .prose tr:hover {
                  background: #1e293b;
                }
              `}</style>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {currentReport.report}
              </ReactMarkdown>
            </div>

            {/* Sources Section */}
            {currentReport.sources && currentReport.sources.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-700 break-before-page">
                <h4 className="text-md font-bold mb-3">Sources</h4>
                <div className="columns-1 lg:columns-2 gap-6">
                  <ul className="space-y-2">
                    {currentReport.sources.map((url, idx) => (
                      <li key={idx} className="text-sm break-inside-avoid">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          {idx + 1}. {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!currentReport && !isGenerating && (
        <div className="flex-1 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700">
          <div className="text-center p-12">
            <div className="text-6xl mb-4">🔬</div>
            <h3 className="text-xl font-bold mb-2">Deep Research Ready</h3>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Generate comprehensive research reports powered by GPT-Researcher with recursive web search and AI analysis.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
