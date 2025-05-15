'use client';

import React, { useState } from 'react';
import { AcademicResponse } from '../types/research';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { CodeComponent } from 'react-markdown/lib/ast-to-react';
import { api } from '../lib/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faFilePdf, faCoins } from '@fortawesome/free-solid-svg-icons';

interface Props {
  response: AcademicResponse;
}

const code: CodeComponent = ({ inline, className, children, ...props }) => {
  return inline ? (
    <code className="bg-gray-700 text-pink-300 px-1 py-0.5 rounded">
      {children}
    </code>
  ) : (
    <pre className="bg-gray-800 text-pink-300 p-4 rounded overflow-x-auto">
      <code className={className} {...props}>
        {children}
      </code>
    </pre>
  );
};

export default function ResearchReportViewer({ response }: Props) {
  const { full_report, metadata } = response;
  const [copied, setCopied] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(full_report || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPdf = async () => {
    try {
      if (!full_report || typeof full_report !== 'string') {
        throw new Error('No valid full report available for PDF export.');
      }

      const blob = await api.exportPDF(full_report);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'gpt_research_report.pdf';
      link.click();
      window.URL.revokeObjectURL(url);

      setPdfReady(true);
      setTimeout(() => setPdfReady(false), 2000);
    } catch (error) {
      console.error('PDF download failed:', error);
    }
  };

  return (
    <div className="w-full px-8 max-w-screen-2xl mx-auto">
      {/* Controls */}
      <div className="flex justify-end gap-4 mb-6">
        <button
          onClick={copyToClipboard}
          className="text-sm text-blue-400 hover:text-blue-200 flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faCopy} /> {copied ? 'Copied!' : 'Copy Text'}
        </button>
        <button
          onClick={downloadPdf}
          className="text-sm text-blue-400 hover:text-blue-200 flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faFilePdf} /> {pdfReady ? 'Downloaded!' : 'Export PDF'}
        </button>
      </div>

      {/* Metadata */}
      {metadata && (
        <div className="text-sm text-gray-400 mb-4">
          <p className="mb-1">
            <FontAwesomeIcon icon={faCoins} className="mr-1" />
            <strong>LLM Estimated Cost:</strong> ${metadata.costs?.toFixed(4) || 'N/A'}
          </p>
        </div>
      )}

      {/* Full Markdown Report */}
      {full_report && (
        <div className="prose prose-invert max-w-none bg-gray-800 p-10 rounded-md border border-gray-700 overflow-x-auto space-y-6">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              a: (props) => (
                <a
                  {...props}
                  className="text-blue-400 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              ),
              code,
              h1: ({ node, ...props }) => (
                <h1 className="text-3xl text-white font-bold mt-6 mb-4" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-2xl text-white font-semibold mt-5 mb-3" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-xl text-white font-medium mt-4 mb-2" {...props} />
              ),
              h4: ({ node, ...props }) => (
                <h4 className="text-lg text-white font-medium mt-4 mb-2" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="text-base text-gray-200 mb-4 whitespace-pre-wrap" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc list-inside text-gray-200 mb-4" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal list-inside text-gray-200 mb-4" {...props} />
              ),
            }}
          >
            {full_report}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
