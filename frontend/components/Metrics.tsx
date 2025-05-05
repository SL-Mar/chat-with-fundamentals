'use client'

import React from 'react'
import { Set_Metrics } from '../types/models'
import { formatNumber, convertNumericKeysToArray } from '../lib/format'

interface MetricsTableProps {
  data: Set_Metrics[]
}

export default function MetricsTable({ data }: MetricsTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-gray-500 text-center italic mt-4">
        No financial metrics available.
      </div>
    )
  }

  return (
    <>
      {data.map((item) => (
        <div key={item.Ticker} className="mb-6">
          <h3 className="text-white font-bold mb-2">{item.Ticker}</h3>
          <p className="text-sm text-gray-400 mb-2 italic">{item.State}</p>

          <table className="w-full text-sm text-gray-300 border border-gray-600 mb-4">
            <thead>
              <tr className="bg-gray-700 text-left">
                <th className="p-2 border border-gray-600 w-1/3">Metric</th>
                <th className="p-2 border border-gray-600">Value</th>
              </tr>
            </thead>
            <tbody>
              {item.Metrics.map((metric, i) => {
                let nestedTable: React.ReactNode | null = null
                let inlineDisplay: React.ReactNode = null

                try {
                  const parsed = JSON.parse(metric.Value)
                  const normalized = convertNumericKeysToArray(parsed)

                  if (
                    Array.isArray(normalized) &&
                    normalized.length > 0 &&
                    typeof normalized[0] === 'object'
                  ) {
                    // Array of records (show separately)
                    nestedTable = (
                      <div className="overflow-x-auto mt-2">
                        <table className="text-xs border border-gray-600 w-full">
                          <thead className="bg-gray-800">
                            <tr>
                              {Object.keys(normalized[0]).map((col, idx) => (
                                <th
                                  key={idx}
                                  className="p-2 border border-gray-600 text-indigo-300 whitespace-nowrap"
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {normalized.map((row: any, rowIdx: number) => (
                              <tr key={rowIdx} className="even:bg-gray-900">
                                {Object.values(row).map((val, colIdx) => (
                                  <td
                                    key={colIdx}
                                    className="p-2 border border-gray-700 whitespace-nowrap"
                                  >
                                    {formatNumber(val)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                    inlineDisplay = (
                      <span className="italic text-gray-400">
                        See full table below
                      </span>
                    )
                  } else if (
                    typeof normalized === 'object' &&
                    normalized !== null
                  ) {
                    const pairs = Object.entries(normalized).slice(0, 4)
                    inlineDisplay = (
                      <ul className="text-xs space-y-1">
                        {pairs.map(([key, val]) => (
                          <li key={key}>
                            <span className="text-indigo-300">{key}</span>:{' '}
                            {formatNumber(val)}
                          </li>
                        ))}
                      </ul>
                    )
                  } else {
                    inlineDisplay = formatNumber(normalized)
                  }
                } catch {
                  inlineDisplay = metric.Value || 'NA'
                }

                return (
                  <React.Fragment key={`${item.Ticker}-${metric.Metric}-${i}`}>
                    <tr className="align-top hover:bg-gray-800">
                      <td className="p-2 border border-gray-600 font-mono text-indigo-300">
                        {metric.Metric}
                      </td>
                      <td className="p-2 border border-gray-600">
                        {inlineDisplay}
                      </td>
                    </tr>
                    {nestedTable && (
                      <tr>
                        <td colSpan={2}>{nestedTable}</td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </>
  )
}

