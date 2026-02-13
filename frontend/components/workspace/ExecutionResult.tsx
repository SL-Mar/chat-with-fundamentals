import { useState } from 'react';
import { Artifact } from '../../types/chat';

interface Props {
  stdout?: string;
  stderr?: string;
  artifacts?: Artifact[];
  executionTimeMs?: number;
  formattedOutput?: string;
}

/**
 * Render basic markdown: tables, bold, headers, lists, checkmarks.
 */
function renderMarkdown(text: string): JSX.Element[] {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let tableLines: string[] = [];
  let inTable = false;

  const flushTable = () => {
    if (tableLines.length < 2) {
      tableLines.forEach((l, i) =>
        elements.push(<p key={`tl-${elements.length}-${i}`} className="text-sm text-gray-300">{l}</p>)
      );
      tableLines = [];
      return;
    }

    const headers = tableLines[0].split('|').map(h => h.trim()).filter(Boolean);
    // skip separator row (index 1)
    const rows = tableLines.slice(2).map(r => r.split('|').map(c => c.trim()).filter(Boolean));

    elements.push(
      <div key={`table-${elements.length}`} className="overflow-x-auto my-2">
        <table className="text-sm border-collapse w-full">
          <thead>
            <tr className="border-b border-gray-600">
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-1.5 text-left text-gray-400 font-medium text-xs whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-gray-800 hover:bg-gray-800/50">
                {row.map((cell, ci) => (
                  <td key={ci} className={`px-3 py-1.5 whitespace-nowrap ${cellClass(cell)}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Table detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (!inTable) inTable = true;
      tableLines.push(trimmed);
      continue;
    } else if (inTable) {
      inTable = false;
      flushTable();
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      elements.push(<h3 key={`h-${i}`} className="text-sm font-semibold text-white mt-3 mb-1">{trimmed.slice(4)}</h3>);
    } else if (trimmed.startsWith('## ')) {
      elements.push(<h2 key={`h-${i}`} className="text-base font-semibold text-white mt-3 mb-1">{trimmed.slice(3)}</h2>);
    } else if (trimmed.startsWith('# ')) {
      elements.push(<h1 key={`h-${i}`} className="text-lg font-bold text-white mt-3 mb-1">{trimmed.slice(2)}</h1>);
    }
    // List items
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <p key={`li-${i}`} className="text-sm text-gray-300 pl-4">
          <span className="text-gray-500 mr-1">•</span>
          {renderInline(trimmed.slice(2))}
        </p>
      );
    }
    // Empty line
    else if (trimmed === '') {
      elements.push(<div key={`br-${i}`} className="h-1" />);
    }
    // Normal text
    else {
      elements.push(<p key={`p-${i}`} className="text-sm text-gray-300">{renderInline(trimmed)}</p>);
    }
  }

  if (inTable) flushTable();
  return elements;
}

/**
 * Render inline markdown: **bold**
 */
function renderInline(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(<strong key={`b-${match.index}`} className="text-white font-medium">{match[1]}</strong>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : [text];
}

/**
 * Color-code table cell values.
 */
function cellClass(cell: string): string {
  const t = cell.trim();
  if (t === 'True' || t === '1' || t === '\u2713' || t === '\u2705') return 'text-emerald-400 font-medium';
  if (t === 'False' || t === '0' || t === '\u2717' || t === '\u274C') return 'text-red-400 font-medium';
  // Score coloring (single digit in 0-9 range)
  if (/^\d$/.test(t)) {
    const v = parseInt(t);
    if (v >= 7) return 'text-emerald-400 font-bold';
    if (v >= 5) return 'text-yellow-300 font-medium';
    if (v >= 3) return 'text-orange-400 font-medium';
    return 'text-red-400 font-medium';
  }
  return 'text-gray-300';
}

export default function ExecutionResult({ stdout, stderr, artifacts, executionTimeMs, formattedOutput }: Props) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="space-y-3">
      {executionTimeMs !== undefined && (
        <p className="text-xs text-gray-500">Executed in {executionTimeMs}ms</p>
      )}

      {/* Formatted output (primary) */}
      {formattedOutput && !showRaw && (
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">Results</p>
            {stdout && (
              <button
                onClick={() => setShowRaw(true)}
                className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
              >
                Raw output
              </button>
            )}
          </div>
          {renderMarkdown(formattedOutput)}
        </div>
      )}

      {/* Raw stdout (fallback or toggle) */}
      {stdout && (!formattedOutput || showRaw) && (
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">Raw Output</p>
            {formattedOutput && (
              <button
                onClick={() => setShowRaw(false)}
                className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
              >
                Formatted
              </button>
            )}
          </div>
          <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-96 font-mono">
            {stdout}
          </pre>
        </div>
      )}

      {stderr && (
        <div className="bg-red-900/20 rounded-lg border border-red-800 p-3">
          <p className="text-xs text-red-400 mb-1">Stderr</p>
          <pre className="text-sm text-red-300 whitespace-pre-wrap overflow-x-auto max-h-48">
            {stderr}
          </pre>
        </div>
      )}

      {artifacts && artifacts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Visualizations</p>
          {artifacts.map((a, i) => (
            <div key={i} className="bg-gray-900 rounded-lg border border-gray-700 p-2">
              <img
                src={`data:${a.mime_type};base64,${a.base64}`}
                alt={a.name}
                className="max-w-full rounded"
              />
              <p className="text-xs text-gray-500 mt-1">{a.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
