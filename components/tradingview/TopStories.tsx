'use client'
import { useEffect, useRef } from 'react'

export default function TopStories({ ticker }: { ticker: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      feedMode: 'symbol',
      symbol: `NASDAQ:${ticker}`,
      isTransparent: true,
      displayMode: 'regular',
      width: '100%',
      height: 500,
      colorTheme: 'dark',
      locale: 'en'
    })

    containerRef.current.appendChild(script)
    return () => { if (containerRef.current) containerRef.current.innerHTML = '' }
  }, [ticker])

  return <div ref={containerRef} className="tradingview-widget-container" />
}
