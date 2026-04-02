'use client'
import { useEffect, useRef } from 'react'

export default function MarketOverview() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      dateRange: '1D',
      showChart: true,
      locale: 'en',
      largeChartUrl: '',
      isTransparent: true,
      showSymbolLogo: true,
      showFloatingTooltip: true,
      width: '100%',
      height: 500,
      tabs: [
        {
          title: 'Indices',
          symbols: [
            { s: 'FOREXCOM:SPXUSD', d: 'S&P 500' },
            { s: 'NASDAQ:NDX', d: 'NASDAQ 100' },
            { s: 'FOREXCOM:DJI', d: 'Dow Jones' },
            { s: 'INDEX:VIX', d: 'VIX' },
          ]
        },
        {
          title: 'Top Stocks',
          symbols: [
            { s: 'NASDAQ:NVDA', d: 'NVIDIA' },
            { s: 'NASDAQ:AAPL', d: 'Apple' },
            { s: 'NASDAQ:MSFT', d: 'Microsoft' },
            { s: 'NASDAQ:META', d: 'Meta' },
          ]
        }
      ]
    })

    containerRef.current.appendChild(script)
    return () => { if (containerRef.current) containerRef.current.innerHTML = '' }
  }, [])

  return <div ref={containerRef} className="tradingview-widget-container" />
}
