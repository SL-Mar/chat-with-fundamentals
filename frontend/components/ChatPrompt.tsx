'use client'

import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMagnifyingGlassChart,
  faCircleXmark
} from '@fortawesome/free-solid-svg-icons'

interface ChatPromptFormProps {
  onSubmit: (query: string) => Promise<void> | void
  resetTrigger?: number
}

export default function ChatPromptForm({ onSubmit, resetTrigger }: ChatPromptFormProps) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (resetTrigger !== undefined) {
      setQuery('')
    }
  }, [resetTrigger])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    await onSubmit(query)
    setQuery('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-end gap-4">
        <input
          type="text"
          placeholder="Ask a question about a stock..."
          value={query}
          onChange={handleChange}
          className="h-12 p-2 w-full bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none"
        />
        <button
          type="submit"
          className="h-12 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
        >
          Submit
        </button>
      </div>
    </form>
  )
}
