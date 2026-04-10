'use client'
import { useEffect, useRef } from 'react'

export default function CalendarPage() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      isTransparent: true,
      width: '100%',
      height: '100%',
      locale: 'en',
      importanceFilter: '-1,0,1',
      countryFilter: 'us,eu,gb,jp,ca,au'
    })
    el.appendChild(script)
    return () => { if (el) el.innerHTML = '' }
  }, [])

  return (
    <div className="px-4 py-8 mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Economic Calendar</h1>
        <p className="text-white/40 text-sm mt-1">
          Upcoming high-impact events that may affect your watchlist stocks
        </p>
      </div>

      {/* Calendar card */}
      <div className="rounded-[32px] border border-cyan-500/12 bg-[linear-gradient(180deg,rgba(8,20,43,0.98),rgba(3,12,28,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.32)] overflow-hidden"
        style={{
          height: 'calc(100vh - 220px)',
          minHeight: '500px',
        }}>

        {/* Card header */}
        <div className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <span className="text-lg">{'\u{1F4C5}'}</span>
            <div>
              <p className="text-white font-bold text-sm">Global Economic Events</p>
              <p className="text-white/30 text-xs">
                US &middot; EU &middot; GB &middot; JP &middot; CA &middot; AU &mdash; filtered to high impact
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[
              { dot: 'bg-red-400', label: 'High' },
              { dot: 'bg-amber-400', label: 'Medium' },
              { dot: 'bg-white/30', label: 'Low' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                <span className="text-white/30 text-xs">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* TradingView widget */}
        <div ref={ref}
          className="tradingview-widget-container"
          style={{ height: 'calc(100% - 57px)', width: '100%' }}
        />
      </div>

      {/* Tip */}
      <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-[rgba(8,20,43,0.9)] p-4">
        <span className="text-cyan-400 flex-shrink-0 mt-0.5">{'\u{1F4A1}'}</span>
        <p className="text-white/40 text-xs leading-relaxed">
          Check this calendar before placing any Aurora orders.
          High-impact events &mdash; particularly Federal Reserve decisions,
          Non-Farm Payrolls, and CPI inflation data &mdash; can cause sharp
          short-term price movements. Consider waiting until after
          major events before entering a new position.
        </p>
      </div>

    </div>
  )
}
