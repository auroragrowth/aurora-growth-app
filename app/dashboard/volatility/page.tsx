'use client'
import { useEffect, useRef, useState } from 'react'

const SYMBOLS = [
  {
    ticker: 'AMEX:UVXY', label: 'UVXY',
    desc: 'ProShares Ultra VIX Short-Term Futures — moves with VIX (free on TradingView)',
    note: 'UVXY rises when market fear rises. Use as a VIX proxy.',
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
    note: 'When SPY falls sharply, watch UVXY rise. Shows market context.',
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
    range: 'UVXY < 10', label: 'Low fear',
    desc: 'Markets calm — stocks near highs. Not Aurora entry territory.',
    colour: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)',
  },
  {
    range: 'UVXY 10\u201320', label: 'Moderate',
    desc: 'Some uncertainty building. Aurora stocks may be approaching entry zones.',
    colour: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)',
  },
  {
    range: 'UVXY 20\u201340', label: 'Elevated fear',
    desc: 'Investors nervous. Quality stocks pulling back. Aurora entries often triggered here.',
    colour: '#fb923c', bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.2)',
  },
  {
    range: 'UVXY 40+', label: 'Extreme fear',
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
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-6xl mx-auto space-y-6">

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
            UVXY &middot; Fear Proxy
          </span>
        </div>
        <p className="text-sm leading-relaxed max-w-3xl"
          style={{ color: 'var(--text-2)' }}>
          The VIX index is not available as a free TradingView chart.
          Instead Aurora uses <strong style={{ color: 'var(--text-1)' }}>UVXY</strong> &mdash;
          a volatility ETF that closely tracks short-term VIX futures and is freely available.
          When UVXY rises, market fear is rising. When UVXY is low, markets are calm.
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
      <div className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          height: '460px',
        }}>

        {/* Chart header */}
        <div className="px-5 py-3.5 border-b flex items-center justify-between flex-wrap gap-2"
          style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-1 p-1 rounded-xl"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
            {SYMBOLS.map(sym => (
              <button key={sym.ticker}
                onClick={() => setSelected(sym)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: selected.ticker === sym.ticker ? `${sym.colour}18` : 'transparent',
                  color: selected.ticker === sym.ticker ? sym.colour : 'var(--text-3)',
                  border: selected.ticker === sym.ticker
                    ? `1px solid ${sym.colour}35` : '1px solid transparent',
                }}>
                {sym.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
              {INTERVALS.map(iv => (
                <button key={iv.value}
                  onClick={() => setChartInterval(iv.value)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: chartInterval === iv.value ? 'rgba(56,217,245,0.12)' : 'transparent',
                    color: chartInterval === iv.value ? '#38d9f5' : 'var(--text-3)',
                    border: chartInterval === iv.value
                      ? '1px solid rgba(56,217,245,0.25)' : '1px solid transparent',
                  }}>
                  {iv.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setChartKey(k => k + 1)}
              className="text-xs px-2.5 py-1.5 rounded-xl transition-all"
              style={{
                background: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                color: 'var(--text-3)',
              }}>
              &#128260;
            </button>
          </div>
        </div>

        {/* Symbol description bar */}
        <div className="px-5 py-2 border-b flex items-center gap-3"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-hover)' }}>
          <span style={{ fontSize: 14 }}>&#128202;</span>
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>
              {selected.label} &mdash; {selected.desc}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {selected.note}
            </p>
          </div>
        </div>

        {/* TradingView chart */}
        <div ref={chartRef}
          key={`${selected.ticker}-${chartInterval}-${chartKey}`}
          className="tradingview-widget-container"
          style={{ height: 'calc(100% - 90px)', width: '100%', background: 'transparent' }}
        />
      </div>

      {/* VIX explanation */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>
            Why UVXY instead of VIX?
          </p>
        </div>
        <div className="p-5 space-y-3">
          {[
            {
              q: 'What is the VIX?',
              a: 'The VIX (CBOE Volatility Index) measures the market\u2019s expectation of 30-day forward-looking volatility for the S&P 500. Known as the \u201cfear gauge\u201d, it rises when investors are nervous and falls when markets are calm.',
            },
            {
              q: 'Why can\u2019t we show VIX directly?',
              a: 'The CBOE:VIX index is not available on the free tier of TradingView\u2019s embedded chart widgets \u2014 it requires a paid data subscription. Rather than leave this page empty, Aurora uses UVXY as a real-time proxy.',
            },
            {
              q: 'What is UVXY?',
              a: 'UVXY (ProShares Ultra VIX Short-Term Futures ETF) tracks short-term VIX futures at 1.5x leverage. It rises when market fear rises and falls when markets are calm \u2014 giving you the same directional signal as VIX in real time.',
            },
            {
              q: 'How does Aurora use this?',
              a: 'Aurora does not use UVXY as a direct entry signal. Instead it provides context \u2014 when UVXY is elevated and a quality stock is pulling back, that combination suggests the pullback is driven by broad market fear rather than company-specific problems. These conditions have historically produced strong Aurora entry opportunities.',
            },
          ].map(item => (
            <div key={item.q} className="p-3 rounded-xl"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-1)' }}>
                {item.q}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>

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
            periods of high fear &mdash; UVXY spiking, markets selling off, headlines
            full of doom. When a quality Aurora stock is pulling back through its
            ladder levels while UVXY is elevated, that combination deserves close
            attention. Fear creates the discounts Aurora is designed to capture.
          </p>
        </div>
      </div>

    </div>
  )
}
