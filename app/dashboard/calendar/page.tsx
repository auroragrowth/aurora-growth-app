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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
          Economic Calendar
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
          Upcoming high-impact events that may affect your watchlist stocks
        </p>
      </div>

      <div className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          height: 'calc(100vh - 240px)',
          minHeight: '500px',
        }}>
        <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-3"
          style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <span className="text-lg">📅</span>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>
                Global Economic Events
              </p>
              <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                US · EU · GB · JP · CA · AU — filtered to high impact
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {[
              { dot: '#ef4444', label: 'High' },
              { dot: '#f59e0b', label: 'Medium' },
              { dot: 'var(--text-3)', label: 'Low' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.dot, display: 'inline-block', flexShrink: 0 }} />
                <span className="text-xs font-bold" style={{ color: 'var(--text-2)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div ref={ref} className="tradingview-widget-container"
          style={{ height: 'calc(100% - 57px)', width: '100%' }} />
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl"
        style={{ background: 'rgba(8,145,178,0.06)', border: '1px solid rgba(8,145,178,0.15)' }}>
        <span className="flex-shrink-0 mt-0.5" style={{ color: '#38d9f5' }}>💡</span>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Check this calendar before placing any Aurora orders. High-impact events —
          particularly Federal Reserve decisions, Non-Farm Payrolls, and CPI inflation
          data — can cause sharp short-term price movements. Consider waiting until after
          major events before entering a new position.
        </p>
      </div>
    </div>
  )
}
