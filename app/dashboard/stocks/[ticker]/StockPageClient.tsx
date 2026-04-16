'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Tooltip from '@/components/ui/Tooltip'
import AuroraStockCalculator from '@/components/stocks/AuroraStockCalculator'
import { getTVSymbol } from '@/lib/tv-symbol'

/* ────────────────────────────────────────────
   TradingView Widget Helpers
   ──────────────────────────────────────────── */

function TVChart({ symbol, height }: { symbol: string; height: number }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !symbol) return
    el.innerHTML = ''

    const container = document.createElement('div')
    container.className = 'tradingview-widget-container'
    container.style.height = `${height}px`
    container.style.width = '100%'

    const inner = document.createElement('div')
    inner.className = 'tradingview-widget-container__widget'
    inner.style.height = '100%'
    inner.style.width = '100%'
    container.appendChild(inner)

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.type = 'text/javascript'
    script.textContent = JSON.stringify({
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
    container.appendChild(script)
    el.appendChild(container)

    return () => { el.innerHTML = '' }
  }, [symbol, height])

  return <div ref={ref} style={{ height: `${height}px`, width: '100%', overflow: 'hidden' }} />
}

function TVWidget({ src, config, height }: { src: string; config: Record<string, unknown>; height: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const configStr = useMemo(() => JSON.stringify(config), [config])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ''

    const container = document.createElement('div')
    container.className = 'tradingview-widget-container'
    container.style.height = `${height}px`
    container.style.width = '100%'

    const inner = document.createElement('div')
    inner.className = 'tradingview-widget-container__widget'
    inner.style.height = '100%'
    inner.style.width = '100%'
    container.appendChild(inner)

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.type = 'text/javascript'
    script.textContent = configStr
    container.appendChild(script)
    el.appendChild(container)

    return () => { el.innerHTML = '' }
  }, [src, configStr, height])

  return <div ref={ref} style={{ height: `${height}px`, width: '100%' }} />
}

/* ────────────────────────────────────────────
   Stock Page
   ──────────────────────────────────────────── */

export default function StockPageClient({ ticker }: { ticker: string }) {
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [inWatchlist, setInWatchlist] = useState(false)
  const [stockData, setStockData] = useState<any>(null)
  const [analysis, setAnalysis] = useState<string>('')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [watchlistMode, setWatchlistMode] = useState('live')
  const [alertModal, setAlertModal] = useState(false)
  const [alertPrice, setAlertPrice] = useState('')
  const [alertType, setAlertType] = useState<'above' | 'below'>('below')
  const [investModal, setInvestModal] = useState(false)
  const [ladderData, setLadderData] = useState<any>(null)
  const [capital, setCapital] = useState(1000)
  const [placingOrders, setPlacingOrders] = useState(false)
  const [orderResults, setOrderResults] = useState<any[]>([])

  // Remember last visited ticker for sidebar Chart link
  useEffect(() => {
    if (ticker) localStorage.setItem('aurora_last_ticker', ticker)
  }, [ticker])

  useEffect(() => {
    if (!ticker) return

    fetch(`/api/scanner/stock?ticker=${ticker}`)
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) setStockData(data)
      })
      .catch(() => {})

    fetch(`/api/watchlist/check?symbol=${ticker}`)
      .then(r => r.json())
      .then(data => {
        if (data) {
          setInWatchlist(data.inWatchlist || false)
          setWatchlistMode(data.mode || 'live')
        }
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
          company_name: stockData?.company || ticker,
          source: stockData?.scannerType === 'core'
            ? 'Aurora Core'
            : stockData?.scannerType === 'alternative'
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

  const score = stockData?.score
  const scoreBadge = score >= 25
    ? { label: 'STRONG', color: 'text-green-400 bg-green-500/10 border-green-500/30' }
    : score >= 18
    ? { label: 'BUILDING', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' }
    : score
    ? { label: 'WATCH', color: 'text-red-400 bg-red-500/10 border-red-500/30' }
    : null

  const price = stockData?.price || 0
  const change = stockData?.changePct || 0

  return (
    <div className="min-h-screen">

      {/* TOP SEARCH BAR */}
      <div className="border-b border-white/10 bg-[#080f1e]/80 backdrop-blur px-6 py-3">
        <div className="mx-auto flex items-center gap-3">
          <button onClick={() => router.back()}
            className="text-white/40 hover:text-white transition-colors text-sm flex items-center gap-1">
            &larr; Back
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
            {stockData?.company && (
              <span className="text-white/40 text-sm hidden md:block">
                &mdash; {stockData.company}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* STOCK INFO BAR */}
      <div className="border-b border-white/10 px-6 py-4 bg-[#080f1e]">
        <div className="mx-auto flex flex-wrap items-center justify-between gap-4">

          {/* Price block */}
          <div className="flex items-center gap-6">
            <div>
              <p className="text-3xl font-bold text-white">
                ${price > 0 ? price.toFixed(2) : '\u2014'}
              </p>
              <p className={`text-sm font-medium ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)}% today
              </p>
            </div>

            {score && scoreBadge && (
              <div className={`px-3 py-1.5 rounded-xl border text-sm font-bold ${scoreBadge.color}`}>
                <Tooltip text={`Aurora score out of 30. ${scoreBadge.label} = ${score >= 25 ? '25+' : score >= 18 ? '18-24' : 'below 18'}`}>
                  <span>{'\u2726'} {score}/30 {scoreBadge.label}</span>
                </Tooltip>
              </div>
            )}

            {stockData?.high52w && (
              <div className="hidden md:block">
                <p className="text-white/30 text-xs">52W High</p>
                <p className="text-white/70 text-sm font-bold">
                  ${stockData.high52w.toFixed(2)}
                </p>
              </div>
            )}

            {stockData?.pctBelowHigh52w != null && (
              <div className="hidden md:block">
                <p className="text-white/30 text-xs">Below 52W High</p>
                <p className="text-red-400 text-sm font-bold">
                  -{stockData.pctBelowHigh52w}%
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
              {inWatchlist ? '\u2605 In Watchlist' : '\u2606 Add to Watchlist'}
              <span className="text-xs ml-1 opacity-50">
                ({watchlistMode})
              </span>
            </button>

            <button
              onClick={() => setAlertModal(true)}
              className="px-4 py-2 rounded-xl border border-white/10
              bg-white/5 text-white/60 text-sm font-bold hover:bg-white/10 transition-all"
            >
              Alert
            </button>

            <button
              onClick={() => {
                setInvestModal(true)
                setOrderResults([])
                setLadderData(null)
                fetch(`/api/aurora/analyse?ticker=${ticker}&capital=${capital}`)
                  .then(r => r.json())
                  .then(setLadderData)
                  .catch(() => {})
              }}
              className="aurora-btn aurora-btn-primary"
            >
              Make Investment
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="mx-auto px-6 py-6 space-y-6">

        {/* 4 metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Market Cap',
              value: stockData?.marketCapFormatted || '\u2014',
              tip: 'Total market value of the company'
            },
            {
              label: '52W High',
              value: stockData?.high52w ? `$${stockData.high52w.toFixed(2)}` : '\u2014',
              tip: 'Highest price in the last 52 weeks'
            },
            {
              label: '% Below High',
              value: stockData?.pctBelowHigh52w != null ? `-${stockData.pctBelowHigh52w}%` : '\u2014',
              tip: 'How far the stock is from its 52-week high.',
              red: true
            },
            {
              label: 'Aurora Score',
              value: score ? `${score}/30` : '\u2014',
              tip: 'Aurora momentum score out of 30. STRONG=25+, BUILDING=18-24, WATCH=below 18'
            },
          ].map((c, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-1 mb-1">
                <p className="text-white/40 text-xs uppercase tracking-wider">{c.label}</p>
                <Tooltip text={c.tip}><span /></Tooltip>
              </div>
              <p className={`text-xl font-bold ${'red' in c && c.red ? 'text-red-400' : 'text-white'}`}>
                {c.value}
              </p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 pt-4 pb-2 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-sm">Chart</h2>
              <span className="text-white/30 text-xs">{ticker}</span>
            </div>
            <span className="text-white/20 text-xs">TradingView</span>
          </div>
          <TVChart symbol={getTVSymbol(ticker)} height={500} />
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* LEFT — Fundamental Data */}
          <div className="space-y-6">

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
                  symbol: getTVSymbol(ticker),
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
                  symbol: getTVSymbol(ticker),
                  locale: 'en'
                }}
              />
            </div>
          </div>

          {/* RIGHT — Calculator + Intelligence + News + Profile */}
          <div className="space-y-6">

            {/* Aurora Calculator */}
            {stockData && price > 0 && (
              <AuroraStockCalculator
                ticker={ticker}
                currentPrice={price}
                lastPeak={stockData.mostRecentHatPrice || null}
                lastPeakDate={stockData.mostRecentHatDate || null}
                dropFromPeak={stockData.dropFromHatPct || null}
              />
            )}

            {/* Aurora Intelligence */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-bold text-sm">{'\u2726'} Aurora Intelligence</h2>
                <button
                  onClick={loadAnalysis}
                  disabled={analysisLoading}
                  className="text-white/30 hover:text-white/60 text-xs transition-colors"
                >
                  {analysisLoading ? '...' : '\u21bb Refresh'}
                </button>
              </div>
              {analysisLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => (
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

            

            
          </div>
        </div>
      </div>

      {/* ALERT MODAL */}
      {alertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm bg-[#080f1e] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">Set Price Alert &mdash; {ticker}</h3>
              <button onClick={() => setAlertModal(false)} className="text-white/40 hover:text-white">&times;</button>
            </div>
            <p className="text-white/40 text-sm mb-4">
              Current price: ${price > 0 ? price.toFixed(2) : '\u2014'}
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
                  Above
                </button>
                <button
                  onClick={() => setAlertType('below')}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                    alertType === 'below'
                      ? 'bg-red-500/20 border-red-500/30 text-red-400'
                      : 'bg-white/5 border-white/10 text-white/40'
                  }`}
                >
                  Below
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
              Telegram connected &mdash; you will receive a message when this level is hit
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
                      symbol: getTVSymbol(ticker),
                      company_name: stockData?.company || ticker,
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

      {/* INVESTMENT MODAL */}
      {investModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-lg bg-[#080f1e] border border-white/10 rounded-2xl my-4">

            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10">
              <div>
                <h3 className="text-white font-bold text-lg">Make Investment &mdash; {ticker}</h3>
                <p className="text-white/40 text-sm">Aurora Investment Ladder</p>
              </div>
              <button onClick={() => { setInvestModal(false); setOrderResults([]) }}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20
                text-white text-xl flex items-center justify-center transition-all">&times;</button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-white/40 text-xs uppercase tracking-wider mb-1 block">
                  Total Capital to Deploy
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
                  <input type="number" value={capital}
                    onChange={e => setCapital(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl
                    pl-7 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50" />
                </div>
                <button onClick={() => {
                  setLadderData(null)
                  fetch(`/api/aurora/analyse?ticker=${ticker}&capital=${capital}`)
                    .then(r => r.json()).then(setLadderData).catch(() => {})
                }} className="mt-2 text-cyan-400 text-xs hover:underline">
                  Recalculate &rarr;
                </button>
              </div>

              {!ladderData && (
                <div className="flex items-center justify-center py-6">
                  <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-white/40 text-sm ml-3">Loading Aurora analysis...</span>
                </div>
              )}

              {ladderData && !ladderData.error && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/40 text-xs uppercase tracking-wider">
                        Aurora {ladderData.calculatorType || ''} Ladder
                      </p>
                      <p className="text-white/40 text-xs">
                        Peak: ${ladderData.recentPeakPrice?.toFixed(2) || '\u2014'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {ladderData.entryLines?.map((line: any) => {
                        const alreadyPassed = ladderData.currentPrice <= line.entryPrice
                        const isCombined = ladderData.combinedBuyLines?.includes(line.step)
                        return (
                          <div key={line.step}
                            className={`flex items-center justify-between p-3 rounded-xl border text-sm ${
                              isCombined
                                ? 'bg-amber-500/10 border-amber-500/30'
                                : alreadyPassed
                                ? 'bg-cyan-500/10 border-cyan-500/30'
                                : 'bg-white/5 border-white/10'
                            }`}>
                            <span className="text-white/60">Step {line.step}</span>
                            <span className="text-cyan-400 font-bold font-mono">${line.entryPrice?.toFixed(2)}</span>
                            <span className="text-white/50">${line.allocation?.toFixed(0)}</span>
                            <span className="text-white/50">{line.plannedShares?.toFixed(2)} shares</span>
                            {isCombined && <span className="text-amber-400 text-xs font-bold">COMBINED</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {ladderData.combinedBuyNeeded && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <p className="text-amber-400 text-xs font-bold mb-1">
                        Combined Buy &mdash; Steps {ladderData.combinedBuyLines?.join(' + ')}
                      </p>
                      <p className="text-amber-400/70 text-xs">
                        Combining ${ladderData.combinedBuyAllocation?.toFixed(2)} &rarr;
                        buying {ladderData.combinedBuyShares?.toFixed(2)} shares
                        at ${ladderData.currentPrice?.toFixed(2)}
                      </p>
                    </div>
                  )}

                  {ladderData.bep && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                      <span className="text-green-400 text-sm font-bold">BEP</span>
                      <span className="text-green-400 font-bold font-mono">${ladderData.bep?.toFixed(2)}</span>
                      <span className="text-green-400/60 text-xs">Blended entry price</span>
                    </div>
                  )}

                  {orderResults.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-white/40 text-xs uppercase tracking-wider">
                        Order Results &mdash; {orderResults.filter((r: any) => r.success).length} of {orderResults.length} placed
                      </p>
                      {orderResults.map((r: any, i: number) => (
                        <div key={i} className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                          r.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
                        }`}>
                          <span className="text-white/60">Step {r.step}</span>
                          <span className={r.success ? 'text-green-400' : 'text-red-400'}>
                            {r.success ? 'Placed' : r.error || 'Failed'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {ladderData?.error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 text-sm">{ladderData.error}</p>
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => { setInvestModal(false); setOrderResults([]) }}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button
                disabled={!ladderData || !!ladderData?.error || placingOrders || orderResults.length > 0}
                onClick={async () => {
                  if (!ladderData) return
                  setPlacingOrders(true)
                  const results: any[] = []
                  const lines = ladderData.combinedBuyNeeded
                    ? [{ step: 'Combined', quantity: ladderData.combinedBuyShares, limitPrice: ladderData.currentPrice }]
                    : (ladderData.entryLines || []).map((l: any) => ({
                        step: l.step, quantity: l.plannedShares, limitPrice: l.entryPrice
                      }))
                  for (const line of lines) {
                    if (results.length > 0) await new Promise(r => setTimeout(r, 2000))
                    try {
                      const res = await fetch('/api/broker/place-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          ticker, quantity: Math.max(0.01, Number(line.quantity?.toFixed(2))),
                          limitPrice: Number(line.limitPrice?.toFixed(2)),
                          accountMode: 'live', ladderStep: line.step
                        })
                      })
                      const data = await res.json()
                      results.push({ step: line.step, success: res.ok && data.success, error: data.error })
                    } catch (e: any) {
                      results.push({ step: line.step, success: false, error: e.message })
                    }
                    setOrderResults([...results])
                  }
                  setPlacingOrders(false)
                }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  orderResults.length > 0
                    ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                    : 'bg-gradient-to-r from-cyan-400 to-purple-500 text-white hover:opacity-90'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {placingOrders ? 'Placing orders...'
                  : orderResults.length > 0
                  ? `${orderResults.filter((r: any) => r.success).length}/${orderResults.length} placed`
                  : ladderData?.combinedBuyNeeded
                  ? `Buy ${ladderData.combinedBuyShares?.toFixed(2)} shares now`
                  : `Place ${ladderData?.entryLines?.length || 0} limit orders`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
