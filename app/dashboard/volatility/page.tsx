'use client'
import { useEffect, useRef } from 'react'

function TVChart({ symbol, interval, id, height }: { symbol: string; interval: string; id: string; height: number | string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol,
      interval,
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      save_image: false,
      backgroundColor: 'rgba(7,24,48,0)',
      gridColor: 'rgba(100,160,255,0.06)',
      width: '100%',
      height: '100%',
    })
    el.appendChild(script)
    return () => { if (el) el.innerHTML = '' }
  }, [symbol, interval, id])
  return <div ref={ref} className="tradingview-widget-container" style={{ height, width: '100%' }} />
}

const ZONES = [
  { range: '0 – 12',  label: 'EXTREME CALM',  desc: 'Complacency. Markets quiet, ladders patient.', colour: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
  { range: '12 – 20', label: 'NORMAL',        desc: 'Healthy baseline. Typical market conditions.', colour: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)' },
  { range: '20 – 30', label: 'ELEVATED',      desc: 'Caution. Volatility rising, opportunities forming.', colour: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
  { range: '30 – 40', label: 'HIGH FEAR',     desc: 'Stress. Aurora ladder steps activating.', colour: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
  { range: '40+',     label: 'EXTREME FEAR',  desc: 'Panic. Historically the best buying conditions.', colour: '#dc2626', bg: 'rgba(220,38,38,0.10)', border: 'rgba(220,38,38,0.30)' },
]

const HISTORY = [
  { date: 'Mar 2020', peak: 82.69, event: 'COVID-19 crash',         recovery: 'S&P +100% in 1yr' },
  { date: 'Apr 2025', peak: 52.33, event: 'Tariff escalation',      recovery: 'Recovered in 4mo' },
  { date: 'Feb 2018', peak: 50.30, event: 'Volmageddon (XIV)',      recovery: 'S&P +30% in 1yr' },
  { date: 'Aug 2015', peak: 40.74, event: 'China market crash',     recovery: 'S&P +20% in 1yr' },
  { date: 'Aug 2024', peak: 38.57, event: 'Yen carry trade unwind', recovery: 'S&P +25% in 6mo' },
  { date: 'Oct 2022', peak: 34.53, event: 'Rate hike fears',        recovery: 'S&P +40% in 1yr' },
]

export default function VolatilityPage() {
  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
          Volatility Compass
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
          The VIX is the market&rsquo;s &ldquo;fear gauge&rdquo; — track it to see when Aurora opportunities are forming
        </p>
      </div>

      {/* What is the VIX */}
      <div className="rounded-2xl p-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: '#38d9f5' }}>✦</span>
          <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#38d9f5' }}>
            What is the VIX?
          </span>
        </div>
        <p className="text-sm leading-7" style={{ color: 'var(--text-2)' }}>
          The <strong style={{ color: 'var(--text-1)' }}>CBOE Volatility Index (VIX)</strong> is a real-time market index
          representing the market&rsquo;s expectation of <strong style={{ color: 'var(--text-1)' }}>30-day forward-looking volatility</strong> for
          the S&amp;P 500. Known as the &ldquo;<em>fear index</em>&rdquo; or &ldquo;<em>fear gauge</em>&rdquo;, it measures market sentiment,
          risk, and investor stress. A <strong style={{ color: '#ef4444' }}>high VIX</strong> indicates expected volatility — markets
          are nervous and bracing for large price swings. A <strong style={{ color: '#10b981' }}>low VIX</strong> suggests stability and
          calm. The VIX is derived from S&amp;P 500 options prices and has historically averaged around 19–20 since 1990.
        </p>
      </div>

      {/* Live VIX chart */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', height: 560 }}>
        <div className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border)' }}>
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>
              VIX — Live Chart
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
              CBOE Volatility Index · Daily · The higher the line, the more fear in the market
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(56,217,245,0.1)',
              color: '#38d9f5',
              border: '1px solid rgba(56,217,245,0.2)'
            }}>
            CBOE:VIX · LIVE
          </span>
        </div>
        <div style={{ height: 'calc(100% - 57px)' }}>
          <TVChart symbol="CBOE:VIX" interval="D" id="vix-main" height="100%" />
        </div>
      </div>

      {/* Fear zones */}
      <div className="rounded-2xl p-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <span style={{ color: '#38d9f5' }}>✦</span>
          <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#38d9f5' }}>
            Reading the Fear Gauge
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {ZONES.map(z => (
            <div key={z.label}
              className="p-4 rounded-xl"
              style={{ background: z.bg, border: `1px solid ${z.border}` }}>
              <div className="text-xs font-bold mb-1" style={{ color: z.colour }}>
                VIX {z.range}
              </div>
              <div className="text-sm font-bold mb-2" style={{ color: 'var(--text-1)' }}>
                {z.label}
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                {z.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* S&P 500 comparison */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', height: 480 }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>
            S&amp;P 500 — The Inverse Relationship
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
            When the S&amp;P falls, the VIX usually spikes. That&rsquo;s when Aurora ladders go to work.
          </p>
        </div>
        <div style={{ height: 'calc(100% - 57px)' }}>
          <TVChart symbol="FOREXCOM:SPXUSD" interval="W" id="spx-compare" height="100%" />
        </div>
      </div>

      {/* How Aurora uses it */}
      <div className="rounded-2xl p-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: '#38d9f5' }}>✦</span>
          <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#38d9f5' }}>
            How Aurora Uses the VIX
          </span>
        </div>
        <p className="text-sm leading-7" style={{ color: 'var(--text-2)' }}>
          Aurora&rsquo;s ladder strategy is <strong style={{ color: 'var(--text-1)' }}>built for volatility</strong>. When the VIX spikes,
          stock prices typically drop sharply — and that&rsquo;s exactly when staged ladder entries get filled at meaningful discounts.
          In calm markets (VIX under 15), Aurora is patient. In elevated and fear zones (VIX above 25), Aurora becomes
          opportunistic. The biggest spikes in the VIX&rsquo;s history have all been followed by significant
          market recoveries — every single one. Aurora&rsquo;s job is to make sure you&rsquo;re positioned to benefit.
        </p>
      </div>

      {/* History table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>
            Historical VIX Spikes
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
            Every major spike has been followed by a significant market recovery
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Date</th>
                <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>VIX Peak</th>
                <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Event</th>
                <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Recovery</th>
              </tr>
            </thead>
            <tbody>
              {HISTORY.map(row => (
                <tr key={row.date} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-5 py-3 font-medium" style={{ color: 'var(--text-1)' }}>{row.date}</td>
                  <td className="px-5 py-3 font-bold" style={{ color: '#ef4444' }}>{row.peak.toFixed(2)}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-2)' }}>{row.event}</td>
                  <td className="px-5 py-3 font-semibold" style={{ color: '#10b981' }}>{row.recovery}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tip footer */}
      <div className="flex items-start gap-3 p-4 rounded-xl"
        style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
        <span className="flex-shrink-0 mt-0.5" style={{ color: '#34d399' }}>💡</span>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
          The best Aurora entry opportunities have historically coincided with periods of elevated fear — VIX above 25 to 30.
          When quality stocks are pulling back and the VIX is high, that combination is worth paying close attention to.
          Fear creates the discounts that Aurora is designed to capture.
        </p>
      </div>

    </div>
  )
}
