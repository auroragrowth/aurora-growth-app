'use client'
import { useEffect, useRef } from 'react'
import { getTVSymbol } from '@/lib/tv-symbol'

export default function CompanyProfile({ ticker }: { ticker: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-profile.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      width: '100%',
      height: 500,
      isTransparent: true,
      colorTheme: 'dark',
      symbol: getTVSymbol(ticker),
      locale: 'en'
    })

    containerRef.current.appendChild(script)
    return () => { if (containerRef.current) containerRef.current.innerHTML = '' }
  }, [ticker])

  return <div ref={containerRef} className="tradingview-widget-container" />
}
