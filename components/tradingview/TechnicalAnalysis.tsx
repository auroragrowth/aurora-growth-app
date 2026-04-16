'use client'
import { useEffect, useRef } from 'react'
import { getTVSymbol } from '@/lib/tv-symbol'

export default function TechnicalAnalysis({ ticker }: { ticker: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      interval: '1D',
      width: '100%',
      isTransparent: true,
      height: 650,
      symbol: getTVSymbol(ticker),
      showIntervalTabs: true,
      displayMode: 'single',
      locale: 'en',
      colorTheme: 'dark'
    })

    containerRef.current.appendChild(script)
    return () => { if (containerRef.current) containerRef.current.innerHTML = '' }
  }, [ticker])

  return <div ref={containerRef} className="tradingview-widget-container" />
}
