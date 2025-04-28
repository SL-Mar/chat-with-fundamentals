'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStopwatch } from '@fortawesome/free-solid-svg-icons'
import {
  createChart,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  LogicalRange,
} from 'lightweight-charts'

interface OhlcvData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface ChartProps {
  data: OhlcvData[]
  theme?: 'light' | 'dark'
  ticker: string
}

export default function Chart({ data, theme = 'dark', ticker }: ChartProps) {
  const router = useRouter()
  const priceRef = useRef<HTMLDivElement | null>(null)
  const volumeRef = useRef<HTMLDivElement | null>(null)

  const priceChart = useRef<IChartApi | null>(null)
  const volumeChart = useRef<IChartApi | null>(null)

  const candleSeries = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeries = useRef<ISeriesApi<'Histogram'> | null>(null)

  const isDark = theme === 'dark'
  const background = isDark ? '#0f172a' : '#ffffff'
  const textColor = isDark ? '#cbd5e1' : '#111111'
  const gridColor = isDark ? '#1e293b' : '#e0e0e0'
  const borderColor = isDark ? '#475569' : '#999999'

  const handleKnowMoreClick = () => {
    // Save the EOD data locally
    localStorage.setItem('quantanalyze-last-ohlcv', JSON.stringify(data))
    // Redirect to quantanalyze page
    router.push(`/quantanalyze?ticker=${ticker}`)
  }

  useLayoutEffect(() => {
    if (!priceRef.current || !volumeRef.current) return

    const price = createChart(priceRef.current, {
      width: priceRef.current.clientWidth,
      height: 320,
      layout: { background: { color: background }, textColor },
      crosshair: { mode: CrosshairMode.Normal },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      timeScale: { borderColor, timeVisible: true },
      rightPriceScale: { borderColor, scaleMargins: { top: 0.1, bottom: 0.3 } },
    })

    const volume = createChart(volumeRef.current, {
      width: volumeRef.current.clientWidth,
      height: 120,
      layout: { background: { color: background }, textColor },
      crosshair: { mode: CrosshairMode.Normal },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      timeScale: { borderColor, timeVisible: true },
      rightPriceScale: { borderColor, scaleMargins: { top: 0.6, bottom: 0 } },
    })

    priceChart.current = price
    volumeChart.current = volume

    candleSeries.current = price.addCandlestickSeries({
      upColor: '#4ade80',
      downColor: '#f87171',
      wickUpColor: '#4ade80',
      wickDownColor: '#f87171',
      borderVisible: false,
    })

    volumeSeries.current = volume.addHistogramSeries({
      priceFormat: { type: 'volume' },
      color: '#8884d8',
    })

    requestAnimationFrame(() => {
      price.resize(priceRef.current!.clientWidth, 320)
      volume.resize(volumeRef.current!.clientWidth, 120)
    })

    return () => {
      price.remove()
      volume.remove()
    }
  }, [theme])

  useEffect(() => {
    if (!priceChart.current || !volumeChart.current || !candleSeries.current || !volumeSeries.current) return

    const candleData = data.map(d => ({
      time: Math.floor(new Date(d.date).getTime() / 1000) as UTCTimestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))

    const volumeData = data.map(d => ({
      time: Math.floor(new Date(d.date).getTime() / 1000) as UTCTimestamp,
      value: d.volume / 1_000_000,
      color: d.close >= d.open ? '#4ade80' : '#f87171',
    }))

    candleSeries.current.setData(candleData)
    volumeSeries.current.setData(volumeData)

    const priceTime = priceChart.current.timeScale()
    const volumeTime = volumeChart.current.timeScale()

    priceTime.subscribeVisibleLogicalRangeChange((range: LogicalRange | null) => {
      if (range) volumeTime.setVisibleLogicalRange(range)
    })

    const initialRange = priceTime.getVisibleLogicalRange()
    if (initialRange) volumeTime.setVisibleLogicalRange(initialRange)

    priceTime.fitContent()
    volumeTime.fitContent()
  }, [data])

  return (
    <div className="w-full max-w-[1400px] mx-auto border border-slate-700 rounded-xl overflow-hidden p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-slate-200">{ticker} - End of Day</h3>
        <button
          onClick={handleKnowMoreClick}
          className="px-3 py-1 text-sm rounded border border-slate-600 text-slate-200 hover:bg-slate-700"
        >
          <FontAwesomeIcon icon={faStopwatch} className="mr-2 text-yellow-400" />
          <span>Know More</span>
        </button>
      </div>

      <div ref={priceRef} style={{ width: '100%', height: 320 }} />
      <div ref={volumeRef} style={{ width: '100%', height: 120 }} />
    </div>
  )
}
