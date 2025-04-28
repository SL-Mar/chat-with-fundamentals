'use client'

import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import RawOutputViewer from '../components/RawOutputViewer'
import MetricsTable from '../components/Metrics'
import NewsList from '../components/NewsList'
import QuoteChart from '../components/Chart'
import Dataframe from '../components/DataFrame'
import ChatPromptForm from '../components/ChatPrompt'
import TileCard from '../components/TileCard'
import { Executive_Summary, Candle } from '../types/models'
import { faChartLine, faListAlt, faNewspaper, faTable, faFileAlt, faCode, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const STORAGE_KEYS = {
  data: 'fundamentals-last-data'
}

export default function Chat() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Executive_Summary | null>(null)
  const [resetCounter, setResetCounter] = useState(0)
  const [showRawJson, setShowRawJson] = useState(false)

  useEffect(() => {
    const storedData = localStorage.getItem(STORAGE_KEYS.data)
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData)
        setData(parsed)
      } catch (e) {
        console.error('Failed to parse stored data:', e)
      }
    }
  }, [])

  const handleQuery = async (user_query: string) => {
    setLoading(true)
    setError(null)

    try {
      const result = await api.chatWithFundamentals(user_query)
      setData(result)
      localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(result))
      console.log('🧪 Full data object:', result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const clearSession = () => {
    localStorage.removeItem(STORAGE_KEYS.data)
    setData(null)
    setResetCounter((prev) => prev + 1)
  }

  const buildLeftTiles = (data: Executive_Summary) => {
    const tiles: React.ReactNode[] = []

    tiles.push(
      <TileCard key="summary" title="Executive Summary" icon={faFileAlt} fixedHeight>
        <p className="whitespace-pre-wrap text-base leading-relaxed text-gray-100">
          {data.Ex_summary || 'No summary available.'}
        </p>
      </TileCard>
    )

    data.Metrics?.DataSet?.forEach((metricSet, idx) => {
      tiles.push(
        <TileCard key={`metrics-${idx}`} title={`Financial Metrics – ${metricSet.Ticker}`} icon={faListAlt} fixedHeight>
          <MetricsTable data={[metricSet]} />
        </TileCard>
      )
    })

    data.Quote?.DataSet?.forEach((quoteSet, idx) => {
      const ticker = quoteSet.ticker
      tiles.push(
        <React.Fragment key={`quote-${idx}`}>
          <TileCard title={`Quote Chart – ${ticker}`} icon={faChartLine}>
            <QuoteChart data={quoteSet.data} ticker={ticker} />
          </TileCard>
          <TileCard title={`OHLCV Data – ${ticker}`} icon={faTable} fixedHeight>
            <Dataframe data={[quoteSet]} />
          </TileCard>
        </React.Fragment>
      )
    })

    return tiles
  }

  const buildRightTiles = (data: Executive_Summary) => {
    const tiles: React.ReactNode[] = []

    data.News?.DataSet?.forEach((newsSet, idx) => {
      tiles.push(
        <TileCard key={`news-${idx}`} title={`Financial News – ${newsSet.Ticker}`} icon={faNewspaper}>
          <div className="flex-1">
            <NewsList data={[newsSet]} />
          </div>
        </TileCard>
      )
    })

    return tiles
  }

  return (
    <div className="flex flex-col h-screen w-full bg-gray-900 text-white overflow-hidden">
      {/* Chat Input with Clear Button */}
      <div className="p-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <ChatPromptForm onSubmit={handleQuery} resetTrigger={resetCounter} />
          </div>
          <button
            onClick={clearSession}
            className="flex items-center gap-2 h-12 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
          >
            <FontAwesomeIcon icon={faTrash} /> Clear
          </button>
        </div>
      </div>

      {/* Main Content Two-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column */}
        <div className="w-1/2 p-4 space-y-4 overflow-y-auto">
          {loading ? (
            <div className="text-center text-gray-400 mt-10">🔄 Loading...</div>
          ) : error ? (
            <div className="text-center text-red-500 mt-10">Error: {error}</div>
          ) : data ? (
            buildLeftTiles(data)
          ) : null}
        </div>

        {/* Right Column */}
        <div className="w-1/2 p-4 flex flex-col overflow-y-auto border-l border-gray-800">
          {data && buildRightTiles(data)}
        </div>
      </div>

      {/* Raw JSON Collapsible Section */}
      {data && (
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={() => setShowRawJson(prev => !prev)}
            className="w-full text-left px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md"
          >
            {showRawJson ? 'Hide Raw JSON' : 'Show Raw JSON'}
          </button>
          {showRawJson && (
            <TileCard title="Raw JSON Output" icon={faCode} fullHeight>
              <RawOutputViewer data={data} />
            </TileCard>
          )}
        </div>
      )}
    </div>
  )
}
