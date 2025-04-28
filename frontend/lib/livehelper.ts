// lib/livehelper.ts

export function getRangeForInterval(interval: string): { from: number; to: number } {
    const now = new Date()
    const to = Math.floor(now.getTime() / 1000)
    const from = new Date(now)
  
    switch (interval) {
      case '1m':
        from.setDate(from.getDate() - 120) // max 120 days
        break
      case '5m':
        from.setDate(from.getDate() - 600) // max 600 days
        break
      case '1h':
        from.setDate(from.getDate() - 7200) // max 7200 days
        break
      default:
        throw new Error(`Unsupported interval '${interval}'. Only '1m', '5m', '1h' are allowed.`)
    }
  
    return {
      from: Math.floor(from.getTime() / 1000),
      to,
    }
  }
  