import { useState } from 'react';
import { Highlight, themes } from 'prism-react-renderer';

interface Props {
  code: string;
  language?: string;
}

export default function CodeBlock({ code, language = 'python' }: Props) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const lineCount = code.trim().split('\n').length;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-lg border border-gray-700 overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{expanded ? '▼' : '▶'}</span>
          <span className="text-xs text-gray-400">{language}</span>
          <span className="text-xs text-gray-600">{lineCount} lines</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); handleCopy(); }}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {expanded && (
        <Highlight theme={themes.nightOwl} code={code.trim()} language={language}>
          {({ style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className="p-4 text-sm overflow-x-auto"
              style={{ ...style, margin: 0, background: 'rgb(17, 24, 39)' }}
            >
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  <span className="inline-block w-8 text-right mr-4 text-gray-600 select-none text-xs">
                    {i + 1}
                  </span>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      )}
    </div>
  );
}
