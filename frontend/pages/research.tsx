'use client'

import React, { useState, useEffect } from 'react'
import { AcademicResponse } from '../types/research'
import { api } from '../lib/api'
import ResearchReportViewer from '../components/ResearchReportViewer'
import ChatPrompt from '../components/ChatPrompt'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash } from '@fortawesome/free-solid-svg-icons'

const STORAGE_KEY = 'research-last-report'

export default function ResearchPage() {
  const [data, setData] = useState<AcademicResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetCount, setResetCount] = useState(0)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setData(JSON.parse(stored))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  const handleQuery = async (query: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.fetchResearchReport(query)
      setData(res)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res))
    } catch (e: any) {
      setError(e.message || 'Failed to fetch report')
    } finally {
      setLoading(false)
    }
  }

  const clearSession = () => {
    localStorage.removeItem(STORAGE_KEY)
    setData(null)
    setResetCount((c) => c + 1)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white px-4 py-6 space-y-4">
      {/* Input and Clear */}
      <div className="flex gap-4">
        <div className="flex-1">
          <ChatPrompt onSubmit={handleQuery} resetTrigger={resetCount} />
        </div>
        <button
          onClick={clearSession}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
        >
          <FontAwesomeIcon icon={faTrash} />
          Clear
        </button>
      </div>

      {/* Main Display */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-gray-400 mt-8 text-center">🔄 Generating report...</p>
        ) : error ? (
          <p className="text-red-400 mt-8 text-center">❌ {error}</p>
        ) : data ? (
          <ResearchReportViewer response={data} />
        ) : (
          <p className="text-gray-500 mt-8 text-center">Start by asking a research question above.</p>
        )}
      </div>
    </div>
  )
}
