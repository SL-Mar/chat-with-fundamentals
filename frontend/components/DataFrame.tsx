'use client'

import { EODResult } from '../types/models'
import { saveAs } from 'file-saver'

interface DataframeProps {
  data: EODResult[]
}

function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return ''

  const header = Object.keys(data[0]).join(',')
  const rows = data.map(row =>
    Object.values(row)
      .map(value => `"${value}"`)
      .join(',')
  )
  return [header, ...rows].join('\n')
}

function handleDownload(ticker: string, data: any[]) {
  const csv = convertToCSV(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  saveAs(blob, `${ticker}_ohlcv.csv`)
}

export default function Dataframe({ data }: DataframeProps) {
  const filtered = data.filter(d => d.data.length > 0)

  if (filtered.length === 0) {
    return (
      <div className="text-gray-500 text-center italic mt-4">
        No OHLCV data available.
      </div>
    )
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-inner overflow-auto">

      {filtered.map((item) => (
        <div key={item.ticker} className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-white font-bold">{item.ticker}</h3>
            <button
              onClick={() => handleDownload(item.ticker, item.data)}
              className="text-sm text-blue-400 hover:underline"
            >
              ⬇ Download CSV
            </button>
          </div>
          <table className="w-full text-sm text-gray-300 border border-gray-600 mb-2">
            <thead>
              <tr className="bg-gray-700 text-left">
                <th className="p-2 border border-gray-600">date</th>
                <th className="p-2 border border-gray-600">open</th>
                <th className="p-2 border border-gray-600">High</th>
                <th className="p-2 border border-gray-600">Low</th>
                <th className="p-2 border border-gray-600">Close</th>
                <th className="p-2 border border-gray-600">AdjClose</th>
                <th className="p-2 border border-gray-600">Volume</th>
              </tr>
            </thead>
            <tbody>
              {item.data.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-700">
                  <td className="p-2 border border-gray-600">{row.date}</td>
                  <td className="p-2 border border-gray-600">{row.open}</td>
                  <td className="p-2 border border-gray-600">{row.high}</td>
                  <td className="p-2 border border-gray-600">{row.low}</td>
                  <td className="p-2 border border-gray-600">{row.close}</td>
                  <td className="p-2 border border-gray-600">{row.adjusted_close}</td>
                  <td className="p-2 border border-gray-600">{row.volume}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
