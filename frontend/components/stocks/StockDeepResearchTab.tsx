// components/stocks/StockDeepResearchTab.tsx
'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface StockDeepResearchTabProps {
  ticker: string;
}

interface ResearchReport {
  query: string;
  report: string;
  timestamp: string;
}

export default function StockDeepResearchTab({ ticker }: StockDeepResearchTabProps) {
  const [query, setQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentReport, setCurrentReport] = useState<ResearchReport | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const formattedReport = `${data.report || 'No report generated'}

---

## Sources

${data.sources && data.sources.length > 0 ? data.sources.map((url: string, idx: number) => `
${idx + 1}. [${url}](${url})
`).join('\n') : 'No sources available'}

---
*Generated at ${new Date().toLocaleString()} via GPT-Researcher (recursive web search + AI analysis)*
`;

      setCurrentReport({
        query: researchQuery,
        report: formattedReport,
        timestamp: new Date().toISOString(),
      });

      setQuery(''); // Clear query after successful generation

    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
      console.error('Error generating research:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Query Input */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          🔬 Deep Research
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          Generate comprehensive research reports on {ticker} using MarketSense AI
          with Tavily web search integration.
        </p>

        <div className="space-y-3">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`e.g., "Provide a comprehensive analysis of ${ticker} including financial performance, competitive positioning, and growth prospects"`}
            className="w-full h-24 bg-slate-700 border border-slate-600 rounded p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            disabled={isGenerating}
          />

          <button
            onClick={() => handleGenerate()}
            disabled={isGenerating || !query.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isGenerating && (
              <span className="animate-spin">⏳</span>
            )}
            {isGenerating ? 'Generating Research...' : 'Generate Report'}
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-900/20 border border-red-500 rounded p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Research Templates */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h4 className="text-md font-semibold mb-3">
          Quick Templates
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              title: 'Stock Deep Dive',
              template: 'deep_dive',
              description: 'Comprehensive analysis including financials, competition, and outlook',
            },
            {
              title: 'Industry Analysis',
              template: 'industry',
              description: 'Industry trends, major players, and growth outlook',
            },
            {
              title: 'Risk Assessment',
              template: 'risk',
              description: 'Regulatory, competitive, and operational risks',
            },
            {
              title: 'Growth Opportunities',
              template: 'growth',
              description: 'Potential growth drivers in the next 1-3 years',
            },
          ].map((template) => (
            <button
              key={template.template}
              onClick={() => handleGenerate(template.template)}
              disabled={isGenerating}
              className="text-left p-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-sm font-medium text-blue-400">
                {template.title}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {template.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isGenerating && (
        <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
          <div className="text-6xl mb-4 animate-pulse">🔬</div>
          <h3 className="text-xl font-bold mb-2">Generating Research Report...</h3>
          <p className="text-slate-400">
            Analyzing multiple data sources with MarketSense AI agents
          </p>
        </div>
      )}

      {/* Current Report Display */}
      {currentReport && !isGenerating && (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold">
              Latest Report
            </h4>
            <span className="px-3 py-1.5 bg-green-900/20 text-green-400 rounded text-sm flex items-center gap-2">
              ✓ Generated {new Date(currentReport.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <div className="text-xs text-slate-400 mb-2">
            Query: {currentReport.query}
          </div>

          <div className="bg-slate-900 rounded p-8 border border-slate-700 overflow-y-auto" style={{ maxHeight: '700px' }}>
            <div className="prose prose-invert max-w-none">
              <style jsx global>{`
                .prose h1 {
                  color: #e2e8f0;
                  font-size: 2rem;
                  font-weight: 700;
                  margin-top: 0;
                  margin-bottom: 1.5rem;
                  padding-bottom: 0.75rem;
                  border-bottom: 2px solid #334155;
                }
                .prose h2 {
                  color: #cbd5e1;
                  font-size: 1.5rem;
                  font-weight: 600;
                  margin-top: 2.5rem;
                  margin-bottom: 1rem;
                  padding-bottom: 0.5rem;
                  border-bottom: 1px solid #334155;
                }
                .prose h3 {
                  color: #94a3b8;
                  font-size: 1.25rem;
                  font-weight: 600;
                  margin-top: 2rem;
                  margin-bottom: 0.75rem;
                }
                .prose p {
                  color: #cbd5e1;
                  line-height: 1.8;
                  margin-bottom: 1.25rem;
                  font-size: 1rem;
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
                  margin-top: 1rem;
                  margin-bottom: 1.5rem;
                  padding-left: 1.5rem;
                }
                .prose li {
                  color: #cbd5e1;
                  margin-bottom: 0.5rem;
                  line-height: 1.7;
                }
                .prose code {
                  color: #fbbf24;
                  background: #1e293b;
                  padding: 0.125rem 0.375rem;
                  border-radius: 0.25rem;
                  font-size: 0.875em;
                  font-family: 'Courier New', monospace;
                }
                .prose blockquote {
                  border-left: 4px solid #3b82f6;
                  padding-left: 1rem;
                  color: #94a3b8;
                  font-style: italic;
                  margin: 1.5rem 0;
                }
                .prose hr {
                  border-color: #334155;
                  margin: 2rem 0;
                }
                .prose table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 1.5rem 0;
                }
                .prose th {
                  background: #1e293b;
                  color: #e2e8f0;
                  font-weight: 600;
                  padding: 0.75rem;
                  text-align: left;
                  border: 1px solid #334155;
                }
                .prose td {
                  padding: 0.75rem;
                  border: 1px solid #334155;
                  color: #cbd5e1;
                }
                .prose tr:hover {
                  background: #1e293b;
                }
              `}</style>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {currentReport.report}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!currentReport && !isGenerating && (
        <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
          <div className="text-6xl mb-4">🔬</div>
          <h3 className="text-xl font-bold mb-2">Deep Research with MarketSense AI</h3>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Leverage multi-agent AI analysis powered by Tavily research to get comprehensive
            insights combining fundamentals, news, price dynamics, and macro environment analysis.
          </p>
        </div>
      )}
    </div>
  );
}
