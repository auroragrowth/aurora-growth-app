'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getTVSymbol } from '@/lib/tradingview'
import Tooltip from '@/components/ui/Tooltip'

function TVChart({ symbol, height }: { symbol: string; height: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || !symbol) return
    el.innerHTML = ''
    setReady(false)

    const inner = document.createElement('div')
    inner.className = 'tradingview-widget-container__widget'
    inner.style.height = `${height}px`
    inner.style.width = '100%'
    el.appendChild(inner)

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: 'D',
      timezone: 'America/New_York',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: 'rgba(0,0,0,0)',
      isTransparent: true,
      allow_symbol_change: false,
      hide_top_toolbar: false,
      withdateranges: true,
      save_image: false,
    })
    script.onload = () => setReady(true)
    el.appendChild(script)

    return () => { if (el) el.innerHTML = '' }
  }, [symbol, height])

  return (
    <div style={{ position: 'relative', height: `${height}px`, width: '100%' }}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/2">
          <div className="w-8 h-8 border-2 border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      )}
      <div ref={ref} style={{ height: `${height}px`, width: '100%' }} />
    </div>
  )
}

function TVWidget({ src, config, height }: { src: string; config: object; height: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ''
    const inner = document.createElement('div')
    inner.className = 'tradingview-widget-container__widget'
    inner.style.height = `${height}px`
    inner.style.width = '100%'
    el.appendChild(inner)
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.innerHTML = JSON.stringify(config)
    el.appendChild(script)
    return () => { if (el) el.innerHTML = '' }
  }, [src, JSON.stringify(config)])
  return <div ref={ref} style={{ height: `${height}px`, width: '100%' }} />
}

export default function StockPageClient({ ticker }: { ticker: string }) {
  const router = useRouter()
  const tvSymbol = getTVSymbol(ticker)

  const [search, setSearch] = useState('')
  const [inWatchlist, setInWatchlist] = useState(false)
  const [stockData, setStockData] = useState<any>(null)
  const [scannerData, setScannerData] = useState<any>(null)
  const [analysis, setAnalysis] = useState<string>('')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [watchlistMode, setWatchlistMode] = useState('live')
  const [alertModal, setAlertModal] = useState(false)
  const [alertPrice, setAlertPrice] = useState('')
  const [alertType, setAlertType] = useState<'above'|'below'>('below')

  useEffect(() => {
    fetch(`/api/market/quote?ticker=${ticker}`)
      .then(r => r.json())
      .then(setStockData)
      .catch(() => {})

    fetch(`/api/scanner/stock?ticker=${ticker}`)
      .then(r => r.json())
      .then(setScannerData)
      .catch(() => {})

    fetch(`/api/watchlist/check?symbol=${ticker}`)
      .then(r => r.json())
      .then(d => {
        setInWatchlist(d.inWatchlist)
        setWatchlistMode(d.mode || 'live')
      })
      .catch(() => {})
  }, [ticker])

  const toggleWatchlist = async () => {
    if (inWatchlist) {
      await fetch(`/api/watchlist/${ticker}`, { method: 'DELETE' })
      setInWatchlist(false)
    } else {
      await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: ticker,
          company_name: scannerData?.company || stockData?.name || ticker,
          source: scannerData?.scanner_type === 'core'
            ? 'Aurora Core'
            : scannerData?.scanner_type === 'alternative'
            ? 'Aurora Alternative'
            : 'My List'
        })
      })
      setInWatchlist(true)
    }
  }

  const loadAnalysis = async () => {
    setAnalysisLoading(true)
    try {
      const res = await fetch(`/api/intelligence?ticker=${ticker}`)
      const data = await res.json()
      setAnalysis(data.analysis || '')
    } catch {}
    setAnalysisLoading(false)
  }

  useEffect(() => { loadAnalysis() }, [ticker])

  const score = scannerData?.score || scannerData?.aurora_score
  const scoreBadge = score >= 25
    ? { label: 'STRONG', color: 'text-green-400 bg-green-500/10 border-green-500/30' }
    : score >= 18
    ? { label: 'BUILDING', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' }
    : score
    ? { label: 'WATCH', color: 'text-red-400 bg-red-500/10 border-red-500/30' }
    : null

  const price = stockData?.price || parseFloat(scannerData?.price || '0')
  const change = stockData?.changePercent || 0

  return (
    <div className="min-h-screen">

      {/* TOP SEARCH BAR */}
      <div className="border-b border-white/10 bg-[#080f1e]/80 backdrop-blur px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()}
            className="text-white/40 hover:text-white transition-colors text-sm flex items-center gap-1">
            ← Back
          </button>
          <div className="flex-1 flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value.toUpperCase())}
              onKeyDown={e => {
                if (e.key === 'Enter' && search.trim()) {
                  router.push(`/dashboard/stocks/${search.trim()}`)
                  setSearch('')
                }
              }}
              placeholder="Search any stock... (press Enter)"
              className="w-full max-w-xs bg-white/5 border border-white/10 rounded-xl
              px-4 py-2 text-white text-sm placeholder-white/30
              focus:outline-none focus:border-cyan-400/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg">{ticker}</span>
            {scannerData?.company && (
              <span className="text-white/40 text-sm hidden md:block">
                — {scannerData.company}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* MAIN CHART - FULL WIDTH, TALL */}
      <div className="w-full bg-[#070d1b]">
        <TVChart symbol={tvSymbol} height={600} />
      </div>

      {/* STOCK INFO BAR */}
      <div className="border-b border-white/10 px-6 py-4 bg-[#080f1e]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">

          {/* Price block */}
          <div className="flex items-center gap-6">
            <div>
              <p className="text-3xl font-bold text-white">
                ${price > 0 ? price.toFixed(2) : '—'}
              </p>
              <p className={`text-sm font-medium ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)}% today
              </p>
            </div>

            {score && scoreBadge && (
              <div className={`px-3 py-1.5 rounded-xl border text-sm font-bold ${scoreBadge.color}`}>
                <Tooltip text={`Aurora score out of 30. ${scoreBadge.label} = ${score >= 25 ? '25+' : score >= 18 ? '18-24' : 'below 18'}`}>
                  <span>✦ {score}/30 {scoreBadge.label}</span>
                </Tooltip>
              </div>
            )}

            {scannerData?.high_52w && (
              <div className="hidden md:block">
                <p className="text-white/30 text-xs">52W High</p>
                <p className="text-white/70 text-sm font-bold">
                  ${parseFloat(scannerData.high_52w).toFixed(2)}
                </p>
              </div>
            )}

            {scannerData?.pct_below_high_52w && (
              <div className="hidden md:block">
                <p className="text-white/30 text-xs">Below 52W High</p>
                <p className="text-red-400 text-sm font-bold">
                  -{parseFloat(scannerData.pct_below_high_52w).toFixed(1)}%
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleWatchlist}
              className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
                inWatchlist
                  ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
              }`}
            >
              {inWatchlist ? '★ In Watchlist' : '☆ Add to Watchlist'}
              <span className="text-xs ml-1 opacity-50">
                ({watchlistMode})
              </span>
            </button>

            <button
              onClick={() => setAlertModal(true)}
              className="px-4 py-2 rounded-xl border border-white/10
              bg-white/5 text-white/60 text-sm font-bold hover:bg-white/10 transition-all"
            >
              🔔 Alert
            </button>

            <button
              onClick={() => router.push(`/dashboard/investments/calculator?ticker=${ticker}`)}
              className="px-4 py-2 rounded-xl text-sm font-bold
              bg-gradient-to-r from-cyan-400 to-purple-500 text-white
              hover:opacity-90 transition-opacity"
            >
              📊 Invest
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT BELOW CHART */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* 4 metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Market Cap',
              value: stockData?.marketCap
                ? stockData.marketCap > 1e12
                  ? `$${(stockData.marketCap/1e12).toFixed(2)}T`
                  : stockData.marketCap > 1e9
                  ? `$${(stockData.marketCap/1e9).toFixed(2)}B`
                  : `$${(stockData.marketCap/1e6).toFixed(0)}M`
                : scannerData?.market_cap || '—',
              tip: 'Total market value of the company'
            },
            {
              label: '52W High',
              value: scannerData?.high_52w
                ? `$${parseFloat(scannerData.high_52w).toFixed(2)}`
                : '—',
              tip: 'Highest price in the last 52 weeks'
            },
            {
              label: '% Below High',
              value: scannerData?.pct_below_high_52w
                ? `-${parseFloat(scannerData.pct_below_high_52w).toFixed(1)}%`
                : '—',
              tip: 'How far the stock is from its 52-week high. Aurora ladders activate as this increases.',
              red: true
            },
            {
              label: 'Aurora Score',
              value: score ? `${score}/30` : '—',
              tip: 'Aurora momentum score out of 30. STRONG=25+, BUILDING=18-24, WATCH=below 18'
            },
          ].map((c, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-1 mb-1">
                <p className="text-white/40 text-xs uppercase tracking-wider">{c.label}</p>
                <Tooltip text={c.tip}><span/></Tooltip>
              </div>
              <p className={`text-xl font-bold ${c.red ? 'text-red-400' : 'text-white'}`}>
                {c.value}
              </p>
            </div>
          ))}
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT - Technical Analysis + Fundamental */}
          <div className="lg:col-span-2 space-y-6">

            {/* Technical Analysis widget */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-4 pt-4 pb-2 border-b border-white/5">
                <h2 className="text-white font-bold text-sm">Technical Analysis</h2>
              </div>
              <TVWidget
                src="https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js"
                height={400}
                config={{
                  interval: '1D',
                  width: '100%',
                  isTransparent: true,
                  height: 400,
                  symbol: tvSymbol,
                  showIntervalTabs: true,
                  displayMode: 'single',
                  locale: 'en',
                  colorTheme: 'dark'
                }}
              />
            </div>

            {/* Fundamental Data */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-4 pt-4 pb-2 border-b border-white/5">
                <h2 className="text-white font-bold text-sm">Fundamental Data</h2>
              </div>
              <TVWidget
                src="https://s3.tradingview.com/external-embedding/embed-widget-financials.js"
                height={450}
                config={{
                  isTransparent: true,
                  displayMode: 'regular',
                  width: '100%',
                  height: 450,
                  colorTheme: 'dark',
                  symbol: tvSymbol,
                  locale: 'en'
                }}
              />
            </div>
          </div>

          {/* RIGHT - Aurora Intelligence + News */}
          <div className="space-y-6">

            {/* Aurora Intelligence */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-bold text-sm">✦ Aurora Intelligence</h2>
                <button
                  onClick={loadAnalysis}
                  disabled={analysisLoading}
                  className="text-white/30 hover:text-white/60 text-xs transition-colors"
                >
                  {analysisLoading ? '...' : '↻ Refresh'}
                </button>
              </div>
              {analysisLoading ? (
                <div className="space-y-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-3 bg-white/5 rounded animate-pulse" />
                  ))}
                </div>
              ) : analysis ? (
                <div className="space-y-4">
                  {analysis.split('##').filter(Boolean).map((section, i) => {
                    const lines = section.trim().split('\n')
                    const title = lines[0].trim()
                    const content = lines.slice(1).join('\n').trim()
                    return (
                      <div key={i}>
                        <p className="text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
                          {title}
                        </p>
                        <p className="text-white/60 text-sm leading-relaxed">{content}</p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-white/30 text-sm">
                  Loading Aurora Intelligence...
                </p>
              )}
            </div>

            {/* News */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-4 pt-4 pb-2 border-b border-white/5">
                <h2 className="text-white font-bold text-sm">Latest News</h2>
              </div>
              <TVWidget
                src="https://s3.tradingview.com/external-embedding/embed-widget-timeline.js"
                height={400}
                config={{
                  feedMode: 'symbol',
                  symbol: tvSymbol,
                  isTransparent: true,
                  displayMode: 'regular',
                  width: '100%',
                  height: 400,
                  colorTheme: 'dark',
                  locale: 'en'
                }}
              />
            </div>

            {/* Company Profile */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-4 pt-4 pb-2 border-b border-white/5">
                <h2 className="text-white font-bold text-sm">Company Profile</h2>
              </div>
              <TVWidget
                src="https://s3.tradingview.com/external-embedding/embed-widget-symbol-profile.js"
                height={300}
                config={{
                  width: '100%',
                  height: 300,
                  isTransparent: true,
                  colorTheme: 'dark',
                  symbol: tvSymbol,
                  locale: 'en'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ALERT MODAL */}
      {alertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm bg-[#080f1e] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">🔔 Set Price Alert — {ticker}</h3>
              <button onClick={() => setAlertModal(false)} className="text-white/40 hover:text-white">×</button>
            </div>
            <p className="text-white/40 text-sm mb-4">
              Current price: ${price > 0 ? price.toFixed(2) : '—'}
            </p>
            <div className="space-y-3 mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setAlertType('above')}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                    alertType === 'above'
                      ? 'bg-green-500/20 border-green-500/30 text-green-400'
                      : 'bg-white/5 border-white/10 text-white/40'
                  }`}
                >
                  📈 Above
                </button>
                <button
                  onClick={() => setAlertType('below')}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                    alertType === 'below'
                      ? 'bg-red-500/20 border-red-500/30 text-red-400'
                      : 'bg-white/5 border-white/10 text-white/40'
                  }`}
                >
                  📉 Below
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
                <input
                  type="number"
                  value={alertPrice}
                  onChange={e => setAlertPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/10 rounded-xl
                  pl-7 pr-4 py-2.5 text-white text-sm focus:outline-none
                  focus:border-cyan-400/50"
                />
              </div>
            </div>
            <p className="text-white/30 text-xs mb-4">
              ✅ Telegram connected — you will receive a message when this level is hit
            </p>
            <div className="flex gap-2">
              <button onClick={() => setAlertModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm">
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!alertPrice) return
                  await fetch('/api/alerts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      symbol: ticker,
                      company_name: scannerData?.company || ticker,
                      alert_type: alertType,
                      target_price: parseFloat(alertPrice),
                      current_price: price
                    })
                  })
                  setAlertModal(false)
                  setAlertPrice('')
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold
                bg-gradient-to-r from-cyan-400 to-blue-500 text-white"
              >
                Set Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
