// lib/format.ts

export function formatNumber(value: any): string {
  if (value == null || value === '' || value === 'null') return '—'

  const num = Number(value)
  if (isNaN(num)) return String(value)

  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`
  return `$${num.toFixed(2)}`
}

export function convertNumericKeysToArray(obj: any): any[] {
  if (typeof obj !== 'object' || obj === null) return obj

  const keys = Object.keys(obj)
  if (keys.every(k => /^\d{4}-\d{2}-\d{2}$/.test(k))) {
    return keys.map(k => ({
      date: k,
      ...obj[k]
    }))
  }

  return obj
}
