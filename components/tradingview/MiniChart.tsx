'use client'
import { useEffect, useRef } from 'react'
import { getTVSymbol } from '@/lib/tv-symbol'

export default function MiniChart({ ticker }: { ticker: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol: getTVSymbol(ticker),
      width: 200,
      height: 100,
      locale: 'en',
      dateRange: '1M',
      colorTheme: 'dark',
      isTransparent: true,
      autosize: false,
      largeChartUrl: `https://dev.auroragrowth.co.uk/dashboard/stocks/${ticker}`
    })

    containerRef.current.appendChild(script)
    return () => { if (containerRef.current) containerRef.current.innerHTML = '' }
  }, [ticker])

  return <div ref={containerRef} className="tradingview-widget-container" />
}
