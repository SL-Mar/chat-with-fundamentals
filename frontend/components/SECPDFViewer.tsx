// components/SECPDFViewer.tsx - Document Viewer for SEC Filings
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileAlt, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';

interface SECPDFViewerProps {
  ticker: string | null;
  filingType: string | null;
  filingDate: string | null;
  highlightText?: string;
  onClose?: () => void;
}

export default function SECPDFViewer({ ticker, filingType, filingDate, highlightText, onClose }: SECPDFViewerProps) {
  const API_URL = 'http://localhost:8000';

  // Build document URL (HTML endpoint)
  const documentUrl = ticker && filingType && filingDate && filingDate !== 'unknown'
    ? `${API_URL}/sec-filings/view/${ticker}/${filingType}/${filingDate}`
    : null;

  if (!documentUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
        <FontAwesomeIcon icon={faFileAlt} className="text-6xl text-gray-400 mb-4" />
        <p className="text-gray-500 dark:text-gray-400 text-center px-4">
          {ticker && filingType && filingDate === 'unknown'
            ? 'Filing date unavailable. Please re-index this company to enable document viewing.'
            : 'Select a filing to view document'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faFileAlt} className="text-blue-600" />
          <span className="font-semibold text-sm">
            {ticker} - {filingType} ({filingDate})
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Open in New Tab */}
          <a
            href={documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-1"
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} />
            Open in New Tab
          </a>

          {/* Close */}
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Document Content - Iframe */}
      <div className="flex-1 overflow-hidden bg-white">
        <iframe
          src={documentUrl}
          className="w-full h-full border-0"
          title={`${ticker} ${filingType} ${filingDate}`}
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}
