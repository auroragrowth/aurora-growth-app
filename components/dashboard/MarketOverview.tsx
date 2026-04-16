'use client'
import { useState, useEffect, useRef } from 'react'

interface SymbolItem {
  ticker: string
  label: string
  category: string
  description: string
}

const DEFAULT_SYMBOLS: SymbolItem[] = [
  // Indices — free on TradingView
  { ticker: 'SP:SPX',        label: 'S&P 500',    category: 'Index',    description: 'US large cap benchmark' },
  { ticker: 'NASDAQ:QQQ',    label: 'QQQ',         category: 'Index',    description: 'Nasdaq 100 ETF' },
  { ticker: 'AMEX:SPY',      label: 'SPY',         category: 'Index',    description: 'S&P 500 ETF' },
  { ticker: 'AMEX:IWM',      label: 'IWM',         category: 'Index',    description: 'Russell 2000 small cap' },
  // Volatility proxy — free
  { ticker: 'AMEX:UVXY',     label: 'UVXY',        category: 'Vol',      description: 'VIX proxy (leveraged)' },
  { ticker: 'AMEX:SQQQ',     label: 'SQQQ',        category: 'Vol',      description: 'Inverse QQQ 3x' },
  // Aurora stocks
  { ticker: 'NASDAQ:NVDA',   label: 'NVDA',        category: 'Aurora',   description: 'Nvidia Corp' },
  { ticker: 'NASDAQ:ALAB',   label: 'ALAB',        category: 'Aurora',   description: 'Astera Labs' },
  { ticker: 'NASDAQ:CRDO',   label: 'CRDO',        category: 'Aurora',   description: 'Credo Technology' },
  { ticker: 'NASDAQ:MSFT',   label: 'MSFT',        category: 'Aurora',   description: 'Microsoft Corp' },
  { ticker: 'NASDAQ:AAPL',   label: 'AAPL',        category: 'Aurora',   description: 'Apple Inc' },
  { ticker: 'NASDAQ:AMZN',   label: 'AMZN',        category: 'Aurora',   description: 'Amazon' },
  { ticker: 'NASDAQ:TSLA',   label: 'TSLA',        category: 'Aurora',   description: 'Tesla' },
  { ticker: 'NASDAQ:META',   label: 'META',        category: 'Aurora',   description: 'Meta Platforms' },
  // Commodities / other free
  { ticker: 'AMEX:GLD',      label: 'GLD',         category: 'Macro',    description: 'Gold ETF' },
  { ticker: 'AMEX:TLT',      label: 'TLT',         category: 'Macro',    description: '20yr Treasury ETF' },
  { ticker: 'AMEX:USO',      label: 'USO',         category: 'Macro',    description: 'Oil ETF' },
  { ticker: 'FX:GBPUSD',     label: 'GBP/USD',     category: 'Macro',    description: 'Pound / Dollar' },
]

const CATEGORIES = ['Index', 'Vol', 'Aurora', 'Macro']

const CATEGORY_COLOUR: Record<string, string> = {
  Index:  '#38d9f5',
  Vol:    '#f87171',
  Aurora: '#a78bfa',
  Macro:  '#fbbf24',
}

const INTERVALS = [
  { label: '1D',  value: 'D' },
  { label: '1W',  value: 'W' },
  { label: '1M',  value: 'M' },
  { label: '4H',  value: '240' },
  { label: '1H',  value: '60' },
]

export default function MarketOverview() {
  const [selected, setSelected] = useState('AMEX:SPY')
  const [chartInterval, setChartInterval] = useState('D')
  const [filter, setFilter] = useState('All')
  const [chartKey, setChartKey] = useState(0)
  const chartRef = useRef<HTMLDivElement>(null)

  // Build and destroy chart when symbol or interval changes
  useEffect(() => {
    const el = chartRef.current
    if (!el) return
    el.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol: selected,
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
      studies: ['RSI@tv-basicstudies'],
    })

    el.appendChild(script)

    return () => {
      if (el) el.innerHTML = ''
    }
  }, [selected, chartInterval, chartKey])

  const handleSelect = (ticker: string) => {
    if (ticker === selected) {
      setChartKey(k => k + 1)
    } else {
      setSelected(ticker)
    }
  }

  const filtered = filter === 'All'
    ? DEFAULT_SYMBOLS
    : DEFAULT_SYMBOLS.filter(s => s.category === filter)

  const currentSymbol = DEFAULT_SYMBOLS.find(s => s.ticker === selected)

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-3"
        style={{ borderColor: 'var(--border)' }}>
        <div>
          <h2 className="font-bold" style={{ color: 'var(--text-1)' }}>
            Market Overview
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
            {currentSymbol
              ? `${currentSymbol.label} — ${currentSymbol.description}`
              : 'Select a symbol below'}
          </p>
        </div>
        {/* Interval selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
          {INTERVALS.map(iv => (
            <button key={iv.value}
              onClick={() => setChartInterval(iv.value)}
              className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
              style={{
                background: chartInterval === iv.value
                  ? 'rgba(56,217,245,0.15)' : 'transparent',
                color: chartInterval === iv.value ? '#38d9f5' : 'var(--text-3)',
                border: chartInterval === iv.value
                  ? '1px solid rgba(56,217,245,0.25)' : '1px solid transparent',
              }}>
              {iv.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">

        {/* Symbol picker — left sidebar */}
        <div className="lg:w-48 flex-shrink-0 border-b lg:border-b-0 lg:border-r"
          style={{ borderColor: 'var(--border)' }}>

          {/* Category filter */}
          <div className="flex lg:flex-wrap gap-1 p-2 border-b overflow-x-auto"
            style={{ borderColor: 'var(--border)' }}>
            {['All', ...CATEGORIES].map(cat => (
              <button key={cat}
                onClick={() => setFilter(cat)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                style={{
                  background: filter === cat
                    ? `${CATEGORY_COLOUR[cat] || '#38d9f5'}18`
                    : 'transparent',
                  color: filter === cat
                    ? (CATEGORY_COLOUR[cat] || '#38d9f5')
                    : 'var(--text-3)',
                  border: filter === cat
                    ? `1px solid ${CATEGORY_COLOUR[cat] || '#38d9f5'}35`
                    : '1px solid transparent',
                }}>
                {cat}
              </button>
            ))}
          </div>

          {/* Symbol list */}
          <div className="flex lg:flex-col flex-row overflow-x-auto lg:overflow-y-auto"
            style={{ maxHeight: '380px' }}>
            {filtered.map(sym => {
              const isActive = selected === sym.ticker
              const cc = CATEGORY_COLOUR[sym.category] || '#38d9f5'
              return (
                <button key={sym.ticker}
                  onClick={() => handleSelect(sym.ticker)}
                  className="flex items-center gap-2 px-3 py-2.5 text-left
                    transition-all flex-shrink-0 lg:flex-shrink border-b lg:border-b last:border-b-0"
                  style={{
                    borderColor: 'var(--border)',
                    background: isActive ? `${cc}12` : 'transparent',
                    borderLeft: isActive
                      ? `3px solid ${cc}`
                      : '3px solid transparent',
                    minWidth: 140,
                  }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate"
                      style={{ color: isActive ? cc : 'var(--text-1)' }}>
                      {sym.label}
                    </p>
                    <p className="text-xs truncate hidden lg:block"
                      style={{ color: 'var(--text-3)', fontSize: 10 }}>
                      {sym.description}
                    </p>
                  </div>
                  <span className="text-xs flex-shrink-0 hidden lg:block"
                    style={{
                      color: cc, fontSize: 9, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                    {sym.category}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Chart area */}
        <div className="flex-1" style={{ minHeight: '400px', height: '420px' }}>
          <div ref={chartRef}
            key={`${selected}-${chartInterval}-${chartKey}`}
            className="tradingview-widget-container"
            style={{ height: '100%', width: '100%' }}
          />
        </div>

      </div>

      {/* Footer note */}
      <div className="px-4 py-2 border-t flex items-center justify-between"
        style={{ borderColor: 'var(--border)' }}>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
          Charts powered by TradingView · Click any symbol to rebuild chart · VIX proxy via UVXY
        </p>
        <button
          onClick={() => setChartKey(k => k + 1)}
          className="text-xs px-2.5 py-1 rounded-lg transition-all"
          style={{
            background: 'var(--bg-hover)',
            border: '1px solid var(--border)',
            color: 'var(--text-3)',
          }}>
          🔄 Rebuild
        </button>
      </div>

    </div>
  )
}
