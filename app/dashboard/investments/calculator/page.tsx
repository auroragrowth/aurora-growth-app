'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Tooltip from '@/components/ui/Tooltip'
import type { AuroraLadderResult } from '@/lib/aurora/calculator'

function CalculatorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [ticker, setTicker] = useState(searchParams.get('ticker') || '')
  const [tickerInput, setTickerInput] = useState(searchParams.get('ticker') || '')
  const [capital, setCapital] = useState(1000)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AuroraLadderResult | null>(null)
  const [error, setError] = useState('')
  const [watchlistStocks, setWatchlistStocks] = useState<any[]>([])
  const [brokerMode, setBrokerMode] = useState('live')
  const [showPeaks, setShowPeaks] = useState(false)
  const [peaks, setPeaks] = useState<any[]>([])
  const [pullbacks, setPullbacks] = useState<any[]>([])

  // Load watchlist
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/watchlist', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
        const text = await res.text()
        console.log('[Calculator] Watchlist response:', text.slice(0, 100))
        const data = JSON.parse(text)
        const stocks = Array.isArray(data) ? data : []
        console.log('[Calculator] Stocks loaded:', stocks.length)
        setWatchlistStocks(stocks)

        // Set mode indicator
        if (stocks.length === 0) {
          setBrokerMode('unknown')
        }
      } catch (e) {
        console.error('[Calculator] Watchlist error:', e)
        setWatchlistStocks([])
      }

      // Also fetch current mode
      try {
        const modeRes = await fetch('/api/broker/mode', {
          credentials: 'include'
        })
        const modeData = await modeRes.json()
        setBrokerMode(modeData.mode || 'live')
      } catch {}
    }
    load()
  }, [])

  // Auto-run if ticker in URL
  useEffect(() => {
    const urlTicker = searchParams.get('ticker')
    if (urlTicker) {
      setTicker(urlTicker)
      setTickerInput(urlTicker)
      runAnalysis(urlTicker, capital)
    }
  }, [])

  const runAnalysis = useCallback(async (t: string, cap: number) => {
    if (!t) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch(
        `/api/aurora/analyse?ticker=${t.toUpperCase()}&capital=${cap}`
      )
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
      setPeaks(data.peaks || [])
      setPullbacks(data.pullbacks || [])
    } catch (e: any) {
      setError(e.message || 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSubmit = () => {
    const t = tickerInput.toUpperCase().trim()
    if (!t) return
    setTicker(t)
    runAnalysis(t, capital)
    router.replace(`/dashboard/investments/calculator?ticker=${t}`, { scroll: false })
  }

  const ladderTypeColor = (type: number) => {
    if (type <= 40) return 'text-green-400'
    if (type <= 60) return 'text-amber-400'
    return 'text-red-400'
  }

  const formatPrice = (p: number) => `$${p.toFixed(2)}`

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          ✦ Investment Ladder Calculator
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Aurora methodology — automatic peak detection and ladder selection
        </p>
      </div>

      {/* Input Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6"
        style={{ height: '545px', width: '100%', minHeight: '545px' }}>

        {/* Controls row */}
        <div className="flex flex-wrap gap-3 mb-6">

          {/* Watchlist dropdown */}
          <div className="flex-1 min-w-48">
            <label className="text-white/40 text-xs uppercase tracking-wider mb-1 block">
              {brokerMode === 'demo'
                ? '🟡 Demo Watchlist'
                : '🟢 Live Watchlist'
              } ({watchlistStocks.length} stocks)
            </label>
            <select
              value={ticker}
              onChange={e => {
                const val = e.target.value
                setTicker(val)
                setTickerInput(val)
                if (val) runAnalysis(val, capital)
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl
              px-4 py-2.5 text-white text-sm focus:outline-none
              focus:border-cyan-400/50"
            >
              <option value="">
                {watchlistStocks.length === 0
                  ? 'Loading watchlist...'
                  : 'Select from watchlist...'
                }
              </option>
              {watchlistStocks.map((s: any) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} — {s.company_name}
                </option>
              ))}
            </select>
          </div>

          {/* Manual ticker search */}
          <div className="flex-1 min-w-48">
            <label className="text-white/40 text-xs uppercase tracking-wider mb-1 block">
              Search Any Stock
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tickerInput}
                onChange={e => setTickerInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="e.g. NVDA, AAPL..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl
                px-4 py-2.5 text-white text-sm placeholder-white/30
                focus:outline-none focus:border-cyan-400/50"
              />
              <button
                onClick={handleSubmit}
                className="px-4 py-2.5 bg-cyan-500/20 border border-cyan-500/30
                rounded-xl text-cyan-400 text-sm hover:bg-cyan-500/30 transition-colors"
              >
                →
              </button>
            </div>
          </div>

          {/* Capital */}
          <div className="min-w-40">
            <label className="text-white/40 text-xs uppercase tracking-wider mb-1 block">
              Total Capital
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
              <input
                type="number"
                value={capital}
                onChange={e => setCapital(Number(e.target.value))}
                onBlur={() => result && runAnalysis(ticker, capital)}
                className="w-full bg-white/5 border border-white/10 rounded-xl
                pl-7 pr-4 py-2.5 text-white text-sm
                focus:outline-none focus:border-cyan-400/50"
              />
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent
              rounded-full animate-spin" />
            <p className="text-white/50 text-sm">
              Analysing {ticker} — detecting Aurora peaks...
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-6">

            {/* Analysis summary row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-white/40 text-xs uppercase tracking-wider">
                    Current Price
                  </p>
                  <Tooltip text="Live market price fetched from Yahoo Finance">
                    <span/>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatPrice(result.currentPrice)}
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-white/40 text-xs uppercase tracking-wider">
                    Recent Aurora Peak
                  </p>
                  <Tooltip text="The most recent significant price high from which Aurora calculates entry levels">
                    <span/>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatPrice(result.recentPeakPrice)}
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  {new Date(result.recentPeakDate).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  })}
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-white/40 text-xs uppercase tracking-wider">
                    Largest Pullback
                  </p>
                  <Tooltip text="The biggest historical drop from a peak. Aurora uses this to select the correct ladder spacing.">
                    <span/>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-red-400">
                  -{result.largestPullback.toFixed(1)}%
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-white/40 text-xs uppercase tracking-wider">
                    Auto-Selected Ladder
                  </p>
                  <Tooltip text={`Based on ${result.largestPullback.toFixed(1)}% largest pullback. Aurora rounds up to the next available ladder: 30/40/50/60/70/90.`}>
                    <span/>
                  </Tooltip>
                </div>
                <p className={`text-2xl font-bold ${ladderTypeColor(result.calculatorType)}`}>
                  {result.calculatorType} Ladder
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  Auto-selected ✦
                </p>
              </div>
            </div>

            {/* Combined buy alert */}
            {result.combinedBuyNeeded && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-start gap-3">
                  <span className="text-amber-400 text-xl flex-shrink-0">⚡</span>
                  <div>
                    <p className="text-amber-400 font-bold text-sm mb-1">
                      Combined Buy Opportunity
                    </p>
                    <p className="text-amber-400/70 text-sm">
                      The current price of {formatPrice(result.currentPrice)} has already
                      passed Entry {result.combinedBuyLines.join(', ')}.
                      Aurora combines the allocations for those lines and buys at the live price.
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div className="bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-white/40 text-xs mb-1">Combined Allocation</p>
                        <p className="text-white font-bold">${result.combinedBuyAllocation.toFixed(2)}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-white/40 text-xs mb-1">Live Price</p>
                        <p className="text-amber-400 font-bold">{formatPrice(result.currentPrice)}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-white/40 text-xs mb-1">Shares to Buy</p>
                        <p className="text-white font-bold">{result.combinedBuyShares.toFixed(2)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/stocks/${ticker}`)}
                      className="mt-3 px-4 py-2 rounded-xl text-xs font-bold
                      bg-amber-500/20 border border-amber-500/30 text-amber-400
                      hover:bg-amber-500/30 transition-colors"
                    >
                      Make Investment → Place Combined Buy
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Entry Lines Table */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-white font-bold">Aurora Entry Lines</h2>
                <Tooltip text="Staged buy levels calculated from the Aurora Peak. Blue lines on the chart. Buy in stages as price falls through each level.">
                  <span/>
                </Tooltip>
              </div>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      <th className="text-left px-4 py-3 text-white/40 text-xs uppercase tracking-wider">Step</th>
                      <th className="text-left px-4 py-3 text-white/40 text-xs uppercase tracking-wider">Drop</th>
                      <th className="text-left px-4 py-3 text-white/40 text-xs uppercase tracking-wider">
                        <div className="flex items-center gap-1">
                          Entry Price
                          <Tooltip text="Calculated from the Aurora Peak price. This is where you place your buy order.">
                            <span/>
                          </Tooltip>
                        </div>
                      </th>
                      <th className="text-left px-4 py-3 text-white/40 text-xs uppercase tracking-wider">Allocation</th>
                      <th className="text-left px-4 py-3 text-white/40 text-xs uppercase tracking-wider">Shares</th>
                      <th className="text-left px-4 py-3 text-white/40 text-xs uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {result.entryLines.map(line => {
                      const alreadyPassed = result.currentPrice <= line.entryPrice
                      const isCombined = result.combinedBuyLines.includes(line.step)
                      return (
                        <tr key={line.step}
                          className={`${isCombined ? 'bg-amber-500/5' : alreadyPassed ? 'bg-cyan-500/5' : ''}`}>
                          <td className="px-4 py-3 text-white font-bold">
                            Step {line.step}
                          </td>
                          <td className="px-4 py-3 text-red-400">
                            -{line.dropPercent}%
                          </td>
                          <td className="px-4 py-3 text-cyan-400 font-bold font-mono">
                            {formatPrice(line.entryPrice)}
                          </td>
                          <td className="px-4 py-3 text-white/70">
                            ${line.allocation.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-white/70">
                            {isCombined
                              ? result.combinedBuyShares.toFixed(2)
                              : line.plannedShares.toFixed(2)
                            }
                          </td>
                          <td className="px-4 py-3">
                            {isCombined ? (
                              <span className="px-2 py-1 rounded-full text-xs font-bold
                                bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                COMBINED BUY
                              </span>
                            ) : alreadyPassed ? (
                              <span className="px-2 py-1 rounded-full text-xs font-bold
                                bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                PRICE PASSED
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-bold
                                bg-white/5 text-white/40 border border-white/10">
                                PENDING
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BEP and Profit Levels */}
            {result.bep && result.profitLevels && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* BEP Card */}
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-0.5 bg-green-400" />
                    <p className="text-green-400 font-bold text-sm">Aurora BEP</p>
                    <Tooltip text="Blended Entry Price — your weighted average cost across all filled entries. Shown as the green line on the chart.">
                      <span/>
                    </Tooltip>
                  </div>
                  <p className="text-3xl font-bold text-green-400">
                    {formatPrice(result.bep)}
                  </p>
                  <p className="text-green-400/60 text-xs mt-1">
                    Weighted average of all entry fills
                  </p>
                  {result.stopLoss && (
                    <div className="mt-3 pt-3 border-t border-green-500/20">
                      <p className="text-white/40 text-xs">Current stop-loss</p>
                      <p className="text-white font-bold">{formatPrice(result.stopLoss)}</p>
                    </div>
                  )}
                </div>

                {/* Profit Targets */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-0.5 bg-amber-400 border-t-2 border-dashed border-amber-400" />
                    <p className="text-amber-400 font-bold text-sm">Profit Targets</p>
                    <Tooltip text="Calculated from BEP. Aurora stop rules: move stop to previous level when each target is hit.">
                      <span/>
                    </Tooltip>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: '+10%', value: result.profitLevels.p10, stop: 'Move stop above BEP' },
                      { label: '+15%', value: result.profitLevels.p15, stop: 'Move stop to +10%' },
                      { label: '+20%', value: result.profitLevels.p20, stop: 'Move stop to +15%' },
                      { label: '+25%', value: result.profitLevels.p25, stop: 'Move stop to +20%' },
                    ].map(t => (
                      <div key={t.label} className="flex items-center justify-between">
                        <span className="text-amber-400/70 text-sm">{t.label}</span>
                        <span className="text-white font-mono font-bold text-sm">
                          {formatPrice(t.value)}
                        </span>
                        <span className="text-white/30 text-xs hidden md:block">{t.stop}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Peak/Pullback analysis toggle */}
            <div>
              <button
                onClick={() => setShowPeaks(!showPeaks)}
                className="flex items-center gap-2 text-white/40 text-sm hover:text-white/60 transition-colors"
              >
                <span>{showPeaks ? '▼' : '▶'}</span>
                Aurora Peak & Pullback Analysis
                <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 border border-white/10">
                  {peaks.length} peaks · {pullbacks.length} pullbacks detected
                </span>
              </button>

              {showPeaks && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-2">
                      Aurora Peaks (20%+ rises)
                    </p>
                    <div className="space-y-2">
                      {peaks.slice(-5).map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between
                          bg-white/5 rounded-lg px-3 py-2 text-sm">
                          <span className="text-white/50 text-xs">{p.peakDate}</span>
                          <span className="text-white font-bold">{formatPrice(p.peakPrice)}</span>
                          <span className="text-green-400 text-xs">+{p.risePercent?.toFixed(1)}%</span>
                          {p.isAllTimeHigh && (
                            <span className="text-xs text-amber-400">ATH</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-2">
                      Pullbacks Measured
                    </p>
                    <div className="space-y-2">
                      {pullbacks.map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between
                          bg-white/5 rounded-lg px-3 py-2 text-sm">
                          <span className="text-white/50 text-xs">{p.fromPeakDate}</span>
                          <span className="text-white">{formatPrice(p.fromPeakPrice)}</span>
                          <span className="text-red-400 font-bold">-{p.pullbackPercent?.toFixed(1)}%</span>
                          {p.isCovidPullback && (
                            <span className="text-xs text-purple-400">COVID</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                      <p className="text-white/40 text-xs">Largest pullback</p>
                      <p className="text-red-400 font-bold">
                        -{result.largestPullback.toFixed(1)}% → {result.calculatorType} Ladder
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Open in full calculator */}
            <div className="flex gap-3 pt-2 border-t border-white/10">
              <button
                onClick={() => router.push(`/dashboard/stocks/${ticker}`)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold
                bg-gradient-to-r from-cyan-400 to-blue-500 text-white
                hover:opacity-90 transition-opacity"
              >
                View Chart & Make Investment →
              </button>
              <button
                onClick={() => runAnalysis(ticker, capital)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold
                border border-white/10 text-white/60 hover:bg-white/5 transition-colors"
              >
                Refresh Analysis
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="text-6xl opacity-20">✦</div>
            <p className="text-white/40 text-center">
              Select a stock from your watchlist or enter a ticker to begin Aurora analysis
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CalculatorPage() {
  return (
    <Suspense fallback={
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CalculatorContent />
    </Suspense>
  )
}
