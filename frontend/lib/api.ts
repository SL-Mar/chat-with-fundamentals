import { GeneratedCode } from '../types/code'

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8003'
const FILEMANAGER_BASE_URL = `${BASE_URL}/filemanager`
const CODER_BASE_URL = `${BASE_URL}/coder`
const SETTINGS_BASE_URL = `${BASE_URL}/settings`
const BACKTESTER_BASE_URL = `${BASE_URL}/backtester`

type FileFolder = 'articles' | 'codes'

const api = {
  /** 1️⃣ List all files in a given folder */
  async listFiles(folder: FileFolder): Promise<string[]> {
    const res = await fetch(`${FILEMANAGER_BASE_URL}?folder=${encodeURIComponent(folder)}`)
    if (!res.ok) {
      throw new Error(`Failed to list files in "${folder}"`)
    }
    const { files } = await res.json()
    return files || []
  },

  /** 2️⃣ Stream a PDF blob from the `articles` folder */
  async fetchPdfBlob(filename: string): Promise<Blob> {
    const res = await fetch(
      `${FILEMANAGER_BASE_URL}/pdf/${encodeURIComponent(filename)}?folder=articles`
    )
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to fetch PDF "${filename}": ${text}`)
    }
    return res.blob()
  },

  /** 3️⃣ Kick off Extract+Code by uploading a PDF */
  async generateCode(filename: string): Promise<GeneratedCode> {
    const pdfBlob = await this.fetchPdfBlob(filename)

    const form = new FormData()
    form.append('file', pdfBlob, filename)

    // Use AbortController with 5-minute timeout for long-running PDF processing
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000) // 5 minutes

    try {
      const res = await fetch(`${CODER_BASE_URL}/process`, {
        method: 'POST',
        body: form,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Failed to generate code')
      }
      return res.json()
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - code generation is taking too long. Check the backend logs or codes folder.')
      }
      throw error
    }
  },

  /** 4️⃣ Load a text/code file (.py, .txt) */
  async loadTextFile(
    filename: string,
    folder: FileFolder
  ): Promise<{ filename: string; content: string }> {
    const res = await fetch(
      `${FILEMANAGER_BASE_URL}/load/${encodeURIComponent(filename)}?folder=${encodeURIComponent(folder)}`
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to load text file "${filename}"`)
    }
    return res.json()
  },

  /**
   * 5️⃣ Smart file loader (PDFs → blob, Text → parsed JSON)
   */
  async loadFile(
    filename: string,
    folder: FileFolder
  ): Promise<{ filename: string; content: string } | Blob> {
    const isPdf = filename.toLowerCase().endsWith('.pdf')
    return isPdf
      ? this.fetchPdfBlob(filename)
      : this.loadTextFile(filename, folder)
  },

  /** 6️⃣ Delete a file from workspace */
  async deleteFile(filename: string, folder: FileFolder): Promise<void> {
    const res = await fetch(
      `${FILEMANAGER_BASE_URL}/${encodeURIComponent(filename)}?folder=${encodeURIComponent(folder)}`,
      { method: 'DELETE' }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to delete "${filename}"`)
    }
  },

  /** 7️⃣ Save generated code to `codes` folder */
  async saveFile(
    content: string,
    filename: string,
    folder: 'codes' = 'codes'
  ): Promise<void> {
    const res = await fetch(
      `${FILEMANAGER_BASE_URL}/save?folder=${encodeURIComponent(folder)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content }),
      }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to save code "${filename}"`)
    }
  },

  /** 8️⃣ Get active LLM models */
  async getActiveLLM(): Promise<{ manager: string; store: string }> {
    const res = await fetch(`${SETTINGS_BASE_URL}/llm/active`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to fetch active LLM models`)
    }
    return res.json()
  },

  /** 9️⃣ Update active LLM field */
  async updateLLM(field: 'manager' | 'store', model_name: string): Promise<{ manager: string; store: string }> {
    const res = await fetch(`${SETTINGS_BASE_URL}/llm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, model_name }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to update ${field} to ${model_name}`)
    }
    return res.json()
  },

  /** 🔟 List supported OpenAI models */
  async listSupportedModels(): Promise<string[]> {
    const res = await fetch(`${SETTINGS_BASE_URL}/llm/models`)
    if (!res.ok) {
      throw new Error('Failed to fetch supported LLM models')
    }
    return res.json()
  },

  /** 🔁 Trigger a background backtest */
  async triggerBacktest(filename: string, content: string): Promise<void> {
    const res = await fetch(`${BACKTESTER_BASE_URL}/trigger-backtest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, content }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Failed to trigger backtest')
    }
  },
}

export default api
