'use client'

import React from 'react'

interface RawOutputViewerProps {
  data: any
}

export default function RawOutputViewer({ data }: RawOutputViewerProps) {
  if (!data) {
    return (
      <div className="text-gray-500 text-center italic mt-4">
        No output available yet.
      </div>
    )
  }

  const handleDownload = () => {
    const filename = data?.Tickers?.[0] ? `raw_output_${data.Tickers[0]}.json` : 'raw_output.json'
    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 overflow-auto">
      <div className="flex justify-end mb-2">
        <button
          onClick={handleDownload}
          className="text-sm text-blue-400 hover:underline"
        >
          ⬇ Download JSON
        </button>
      </div>
      <pre className="whitespace-pre-wrap text-gray-300 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}
