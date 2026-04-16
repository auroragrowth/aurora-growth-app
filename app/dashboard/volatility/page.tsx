'use client'
import { useEffect, useRef, useState } from 'react'

const SYMBOLS = [
  {
    ticker: 'CBOE:VIX', label: 'VIX',
    desc: 'CBOE Volatility Index — the original fear gauge',
    note: 'The VIX measures expected 30-day S&P 500 volatility. Higher = more fear in the market.',
    colour: '#f87171',
  },
  {
    ticker: 'AMEX:SQQQ', label: 'SQQQ',
    desc: 'ProShares UltraPro Short QQQ — inverse 3x Nasdaq',
    note: 'SQQQ rises when Nasdaq falls sharply. High = fear in tech stocks.',
    colour: '#fb923c',
  },
  {
    ticker: 'AMEX:SPY', label: 'SPY',
    desc: 'S&P 500 ETF — broad market benchmark',
    note: 'When SPY falls sharply, watch VIX rise. Shows market context.',
    colour: '#38d9f5',
  },
  {
    ticker: 'AMEX:GLD', label: 'GLD',
    desc: 'Gold ETF — flight-to-safety indicator',
    note: 'Gold rises when investors flee risk assets. High GLD = fear/uncertainty.',
    colour: '#fbbf24',
  },
]

const INTERVALS = [
  { label: '1D', value: 'D' },
  { label: '1W', value: 'W' },
  { label: '1M', value: 'M' },
  { label: '4H', value: '240' },
]

const ZONES = [
  {
    range: 'VIX < 15', label: 'Low fear',
    desc: 'Markets calm — stocks near highs. Not Aurora entry territory.',
    colour: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)',
  },
  {
    range: 'VIX 15\u201325', label: 'Moderate',
    desc: 'Some uncertainty building. Aurora stocks may be approaching entry zones.',
    colour: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)',
  },
  {
    range: 'VIX 25\u201340', label: 'Elevated fear',
    desc: 'Investors nervous. Quality stocks pulling back. Aurora entries often triggered here.',
    colour: '#fb923c', bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.2)',
  },
  {
    range: 'VIX 40+', label: 'Extreme fear',
    desc: 'Maximum stress. Historically the best Aurora buying opportunities appear in this zone.',
    colour: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)',
  },
]

export default function VolatilityPage() {
  const chartRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState(SYMBOLS[0])
  const [chartInterval, setChartInterval] = useState('W')
  const [chartKey, setChartKey] = useState(0)

  useEffect(() => {
    const el = chartRef.current
    if (!el) return
    el.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol: selected.ticker,
      interval: chartInterval,
      timezone: 'Europe/London',
      theme: 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      height: '100%',
      width: '100%',
      backgroundColor: 'rgba(0,0,0,0)',
      gridColor: 'rgba(100,160,255,0.05)',
    })
    el.appendChild(script)
    return () => { if (el) el.innerHTML = '' }
  }, [selected.ticker, chartInterval, chartKey])

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
            Volatility Compass
          </h1>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(248,113,113,0.12)',
              color: '#f87171',
              border: '1px solid rgba(248,113,113,0.2)',
            }}>
            CBOE:VIX &middot; Fear Index
          </span>
        </div>
        <p className="text-sm leading-relaxed max-w-3xl"
          style={{ color: 'var(--text-2)' }}>
          The VIX (CBOE Volatility Index) measures the market&rsquo;s expectation of 30-day
          forward-looking volatility for the S&amp;P 500. Known as the fear gauge &mdash;
          it rises when investors are fearful and falls when markets are calm.
        </p>
      </div>

      {/* Fear zones */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ZONES.map(zone => (
          <div key={zone.range}
            className="p-3 rounded-xl border"
            style={{ background: zone.bg, borderColor: zone.border }}>
            <div className="flex items-center gap-1.5 mb-2">
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: zone.colour, display: 'inline-block', flexShrink: 0,
              }} />
              <p className="text-xs font-bold uppercase tracking-wider"
                style={{ color: zone.colour }}>
                {zone.range}
              </p>
            </div>
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-1)' }}>
              {zone.label}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
              {zone.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Chart card */}
      

      {/* Aurora tip */}
      <div className="flex items-start gap-3 p-4 rounded-xl"
        style={{
          background: 'rgba(52,211,153,0.06)',
          border: '1px solid rgba(52,211,153,0.18)',
        }}>
        <span style={{ color: '#34d399', fontSize: 18, flexShrink: 0 }}>&#128161;</span>
        <div>
          <p className="text-sm font-bold mb-1" style={{ color: '#34d399' }}>
            Aurora + Volatility
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Historically, the best Aurora entry opportunities have coincided with
            periods of high fear &mdash; VIX spiking, markets selling off, headlines
            full of doom. When a quality Aurora stock is pulling back through its
            ladder levels while VIX is elevated, that combination deserves close
            attention. Fear creates the discounts Aurora is designed to capture.
          </p>
        </div>
      </div>

    </div>
  )
}
