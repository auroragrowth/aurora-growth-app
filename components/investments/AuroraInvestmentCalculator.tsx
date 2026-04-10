'use client'
import { useState, useEffect } from 'react'

interface WatchlistStock {
  symbol: string
  company_name: string
}

interface ScannerData {
  price: number
  mostRecentHatPrice: number | null
  mostRecentHatDate: string | null
  dropFromHatPct: number | null
  readiness: string
  risesCount18m: number
}

interface DropLevel {
  pct: number
  price: number
}

interface LadderRow {
  step: number
  dropPct: number
  entryPrice: number
  investment: number
  shares: number
  cumShares: number
  cumInvested: number
  bep: number
}

export default function AuroraInvestmentCalculator() {
  // Stock selection
  const [watchlist, setWatchlist] = useState<WatchlistStock[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [manualTicker, setManualTicker] = useState('')
  const [scannerData, setScannerData] = useState<ScannerData | null>(null)
  const [loadingPrice, setLoadingPrice] = useState(false)

  // Calculator inputs
  const [investment, setInvestment] = useState('1000')
  const [bepMode, setBepMode] = useState<'auto' | 'manual'>('auto')
  const [manualBep, setManualBep] = useState('')

  // Active tab
  const [tab, setTab] = useState<'simple' | 'ladder'>('simple')

  const ticker = selectedSymbol || manualTicker.toUpperCase()

  // Load watchlist
  useEffect(() => {
    fetch('/api/watchlist')
      .then(r => r.json())
      .then(data => {
        const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
        setWatchlist(items)
      })
      .catch(() => {})
  }, [])

  // Load scanner data when ticker changes
  useEffect(() => {
    if (!ticker) { setScannerData(null); return }
    setLoadingPrice(true)
    fetch(`/api/scanner/stock?ticker=${ticker}`)
      .then(r => r.json())
      .then(data => {
        if (data.price) {
          setScannerData({
            price: data.price,
            mostRecentHatPrice: data.mostRecentHatPrice || null,
            mostRecentHatDate: data.mostRecentHatDate || null,
            dropFromHatPct: data.dropFromHatPct || null,
            readiness: data.readiness || 'grey',
            risesCount18m: data.risesCount18m || 0,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPrice(false))
  }, [ticker])

  const currentPrice = scannerData?.price || 0
  const lastPeak = scannerData?.mostRecentHatPrice || currentPrice
  const lastPeakDate = scannerData?.mostRecentHatDate || null
  const totalInvested = parseFloat(investment) || 1000

  // Drop levels 10/20/30/40% from peak
  const dropLevels: DropLevel[] = [10, 20, 30, 40].map(pct => ({
    pct,
    price: lastPeak * (1 - pct / 100)
  }))

  const currentDropPct = lastPeak > 0
    ? ((lastPeak - currentPrice) / lastPeak * 100)
    : 0

  // Auto BEP = average of all 4 entry levels
  const autoBep = dropLevels.reduce((s, l) => s + l.price, 0) / dropLevels.length

  const bep = bepMode === 'manual' && manualBep
    ? parseFloat(manualBep) || autoBep
    : autoBep

  // Profit targets from BEP
  const profitTargets = [10, 15, 20, 25].map(pct => ({
    pct,
    price: bep * (1 + pct / 100),
    profit: totalInvested * (pct / 100),
    value: totalInvested * (1 + pct / 100),
  }))

  // Full ladder table
  const perLevel = totalInvested / dropLevels.length
  const ladderRows: LadderRow[] = dropLevels.map((level, i) => {
    const shares = perLevel / level.price
    const cumInvested = perLevel * (i + 1)
    const cumShares = dropLevels.slice(0, i + 1).reduce((s, l) => s + (perLevel / l.price), 0)
    const bepCalc = cumInvested / cumShares
    return {
      step: i + 1,
      dropPct: level.pct,
      entryPrice: level.price,
      investment: perLevel,
      shares,
      cumShares,
      cumInvested,
      bep: bepCalc,
    }
  })

  const fmt = (n: number) =>
    `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const fmtShares = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const readinessColour = {
    green: 'text-green-400', amber: 'text-amber-400',
    red: 'text-red-400', grey: 'text-white/30'
  }[scannerData?.readiness || 'grey'] || 'text-white/30'

  // CSV export
  const exportCSV = () => {
    const rows = [
      ['Step', 'Drop %', 'Entry Price', 'Investment', 'Shares', 'Cum Shares', 'Cum Invested', 'BEP'],
      ...ladderRows.map(r => [
        r.step, `${r.dropPct}%`,
        r.entryPrice.toFixed(2), r.investment.toFixed(2),
        r.shares.toFixed(4), r.cumShares.toFixed(4),
        r.cumInvested.toFixed(2), r.bep.toFixed(2)
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `aurora-ladder-${ticker}-${Date.now()}.csv`
    a.click()
  }

  return (
    <div className="mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Investment Calculator</h1>
        <p className="text-white/40 text-sm mt-1">
          Aurora Ladder &mdash; plan your entry levels and profit targets
        </p>
      </div>

      {/* Stock selector */}
      <div className="rounded-2xl overflow-hidden bg-[#0a1628] border border-white/[0.08]">
        <div className="px-5 py-4 border-b border-white/[0.08]">
          <h3 className="text-white font-bold text-base">Select Stock</h3>
        </div>
        <div className="p-5 space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Watchlist dropdown */}
            <div>
              <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2 font-bold">
                From watchlist
              </label>
              <select
                value={selectedSymbol}
                onChange={e => { setSelectedSymbol(e.target.value); setManualTicker('') }}
                className="w-full bg-white/5 border border-white/10 rounded-xl
                px-4 py-2.5 text-white text-sm
                focus:outline-none focus:border-cyan-400/50"
              >
                <option value="">&mdash; Select from watchlist &mdash;</option>
                {watchlist.map(s => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.symbol} &mdash; {s.company_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Manual ticker */}
            <div>
              <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2 font-bold">
                Or enter ticker manually
              </label>
              <input
                type="text"
                value={manualTicker}
                onChange={e => { setManualTicker(e.target.value.toUpperCase()); setSelectedSymbol('') }}
                placeholder="e.g. NVDA"
                className="w-full bg-white/5 border border-white/10 rounded-xl
                px-4 py-2.5 text-white font-mono text-sm uppercase
                focus:outline-none focus:border-cyan-400/50
                placeholder:text-white/20 placeholder:normal-case"
              />
            </div>
          </div>

          {/* Stock info */}
          {ticker && (
            <div className="flex items-center justify-between p-4 rounded-xl
              bg-white/[0.03] border border-white/[0.08]">
              {loadingPrice ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                  <p className="text-white/40 text-sm">Loading {ticker}...</p>
                </div>
              ) : scannerData ? (
                <>
                  <div>
                    <p className="text-white font-bold text-lg">{ticker}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className={`text-xs font-bold capitalize ${readinessColour}`}>
                        &#x25CF; {scannerData.readiness}
                      </span>
                      <span className="text-white/30 text-xs">
                        {scannerData.risesCount18m} rises in 18m
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white/30 text-[10px] uppercase tracking-wider">Current price</p>
                    <p className="text-white font-bold text-xl font-mono">{fmt(currentPrice)}</p>
                  </div>
                </>
              ) : (
                <p className="text-red-400 text-sm">Stock not found in Aurora scanner</p>
              )}
            </div>
          )}

        </div>
      </div>

      {scannerData && ticker && (
        <>
          {/* Investment amount */}
          <div className="rounded-2xl overflow-hidden bg-[#0a1628] border border-white/[0.08]">
            <div className="p-5">
              <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2 font-bold">
                Total investment amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-mono">$</span>
                <input
                  type="number"
                  value={investment}
                  onChange={e => setInvestment(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl
                  pl-7 pr-4 py-3 text-white font-mono text-lg
                  focus:outline-none focus:border-cyan-400/50"
                />
              </div>
              <p className="text-white/30 text-xs mt-1.5">
                Split equally across 4 levels &mdash; {fmt(totalInvested / 4)} per level
              </p>
            </div>
          </div>

          {/* Tab toggle */}
          <div className="flex gap-2">
            {([['simple', 'Simple View'], ['ladder', 'Full Ladder']] as const).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                  tab === t
                    ? 'bg-cyan-400/15 border-cyan-400/30 text-cyan-400'
                    : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'simple' && (
            <div className="space-y-6">

              {/* Peak reference */}
              {lastPeak > 0 && (
                <div className="rounded-2xl overflow-hidden bg-[#0a1628] border border-white/[0.08]">
                  <div className="p-5">
                    <div className="flex items-center justify-between p-3 rounded-xl
                      bg-white/[0.03] border border-white/[0.08]">
                      <div>
                        <p className="text-white/30 text-[10px] uppercase tracking-wider">Last 20% rise peak</p>
                        <p className="text-white font-bold text-sm font-mono">{fmt(lastPeak)}</p>
                        {lastPeakDate && (
                          <p className="text-white/20 text-xs mt-0.5">{fmtDate(lastPeakDate)}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-white/30 text-[10px] uppercase tracking-wider">Current drop</p>
                        <p className={`font-bold text-2xl font-mono ${
                          currentDropPct >= 20 ? 'text-green-400'
                          : currentDropPct >= 10 ? 'text-amber-400'
                          : 'text-white/60'
                        }`}>
                          {currentDropPct.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Entry levels */}
              <div className="rounded-2xl overflow-hidden bg-[#0a1628] border border-white/[0.08]">
                <div className="px-5 py-4 border-b border-white/[0.08]">
                  <h3 className="text-white font-bold text-base">Entry Levels</h3>
                  <p className="text-white/40 text-xs mt-0.5">
                    Drop from last peak of {fmt(lastPeak)}
                  </p>
                </div>
                <div className="p-5 space-y-2">
                  {dropLevels.map(level => {
                    const hit = currentPrice > 0 && currentPrice <= level.price
                    const isCurrent = currentPrice > 0 &&
                      Math.abs(currentPrice - level.price) / level.price < 0.025
                    return (
                      <div key={level.pct}
                        className={`flex items-center justify-between p-3 rounded-xl border
                        transition-all ${
                          isCurrent ? 'bg-cyan-400/10 border-cyan-400/30'
                          : hit ? 'bg-green-500/[0.08] border-green-500/20'
                          : 'bg-white/[0.03] border-white/[0.08]'
                        }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center
                            text-sm font-bold flex-shrink-0 ${
                            isCurrent ? 'bg-cyan-400/20 text-cyan-400'
                            : hit ? 'bg-green-400/20 text-green-400'
                            : 'bg-white/5 text-white/40'
                          }`}>
                            {level.pct}%
                          </div>
                          <div>
                            <p className={`font-bold text-base font-mono ${
                              isCurrent ? 'text-cyan-400'
                              : hit ? 'text-green-400'
                              : 'text-white'
                            }`}>
                              {fmt(level.price)}
                            </p>
                            <p className="text-white/30 text-xs">
                              {level.pct}% below peak
                              {hit && !isCurrent && ' \u2713 reached'}
                              {isCurrent && ' \u2190 near here now'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold text-sm font-mono">
                            {fmt(totalInvested / 4)}
                          </p>
                          <p className="text-white/20 text-xs">
                            &asymp; {(totalInvested / 4 / level.price).toFixed(4)} shares
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* BEP */}
              <div className="rounded-2xl overflow-hidden bg-[#0a1628] border border-white/[0.08]">
                <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
                  <h3 className="text-white font-bold text-base">Break-even Price</h3>
                  <button
                    onClick={() => {
                      if (bepMode === 'auto') {
                        setBepMode('manual')
                        setManualBep(autoBep.toFixed(2))
                      } else {
                        setBepMode('auto')
                        setManualBep('')
                      }
                    }}
                    className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                      bepMode === 'manual'
                        ? 'bg-amber-400/15 border-amber-400/30 text-amber-400'
                        : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60'
                    }`}>
                    {bepMode === 'manual' ? 'Custom BEP' : 'Auto \u2014 click to edit'}
                  </button>
                </div>
                <div className="p-5 space-y-3">
                  {bepMode === 'manual' ? (
                    <div>
                      <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2 font-bold">
                        Enter your break-even price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400/60 font-mono">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={manualBep}
                          onChange={e => setManualBep(e.target.value)}
                          autoFocus
                          placeholder={autoBep.toFixed(2)}
                          className="w-full bg-amber-400/[0.08] border border-amber-400/30 rounded-xl
                          pl-7 pr-4 py-3 text-amber-400 font-mono text-lg font-bold
                          focus:outline-none focus:border-amber-400/60"
                        />
                      </div>
                      <p className="text-white/30 text-xs mt-1.5">
                        Auto BEP = {fmt(autoBep)} (average of all 4 entry levels)
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 rounded-xl
                      bg-cyan-400/[0.08] border border-cyan-400/20">
                      <div>
                        <p className="text-cyan-400 font-bold text-3xl font-mono">
                          {fmt(autoBep)}
                        </p>
                        <p className="text-white/30 text-xs mt-1">
                          Average of all 4 entry levels
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/30 text-xs">
                          {currentPrice > autoBep ? 'Currently above BEP' : 'Currently below BEP'}
                        </p>
                        <p className={`font-bold text-sm font-mono mt-1 ${
                          currentPrice > autoBep ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {fmt(Math.abs(currentPrice - autoBep))}
                          {' '}{currentPrice > autoBep ? '\u2191' : '\u2193'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Profit targets */}
              <div className="rounded-2xl overflow-hidden bg-[#0a1628] border border-white/[0.08]">
                <div className="px-5 py-4 border-b border-white/[0.08]">
                  <h3 className="text-white font-bold text-base">Profit Targets</h3>
                  <p className="text-white/40 text-xs mt-0.5">
                    From BEP of {fmt(bep)}
                    {bepMode === 'manual' && manualBep && ' (custom)'}
                  </p>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-3">
                    {profitTargets.map(target => {
                      const hit = currentPrice >= target.price
                      return (
                        <div key={target.pct}
                          className={`rounded-xl p-4 border text-center transition-all ${
                            hit
                              ? 'bg-green-500/[0.12] border-green-500/25'
                              : 'bg-white/[0.03] border-white/[0.08]'
                          }`}>
                          <p className={`text-3xl font-bold ${
                            hit ? 'text-green-400' : 'text-white/60'
                          }`}>
                            {target.pct}%
                            {hit && ' \u2713'}
                          </p>
                          <p className={`font-bold text-base font-mono mt-1.5 ${
                            hit ? 'text-green-400' : 'text-white'
                          }`}>
                            {fmt(target.price)}
                          </p>
                          <p className="text-white/50 text-sm mt-1">
                            +{fmt(target.profit)}
                          </p>
                          <p className="text-white/20 text-xs mt-0.5">
                            = {fmt(target.value)} total
                          </p>
                          {!hit && currentPrice > 0 && (
                            <p className="text-white/20 text-xs mt-1.5">
                              {fmt(target.price - currentPrice)} away
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-2xl p-5 bg-[#0a1628] border border-white/[0.08]">
                <p className="text-white/30 text-[10px] uppercase tracking-wider font-bold mb-3">
                  Summary &mdash; {ticker}
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {([
                    ['Last peak', fmt(lastPeak)],
                    ['Current price', fmt(currentPrice)],
                    ['Drop from peak', `${currentDropPct.toFixed(1)}%`],
                    ['Break-even', fmt(bep)],
                    ['Total investment', fmt(totalInvested)],
                    ['Per level', fmt(totalInvested / 4)],
                    ['10% target', fmt(profitTargets[0].price)],
                    ['25% target', fmt(profitTargets[3].price)],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between text-sm py-1
                      border-b border-white/5">
                      <span className="text-white/30">{label}</span>
                      <span className="text-white font-mono font-bold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {tab === 'ladder' && (
            <div className="rounded-2xl overflow-hidden bg-[#0a1628] border border-white/[0.08]">
              <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-base">Full Ladder &mdash; {ticker}</h3>
                  <p className="text-white/40 text-xs mt-0.5">
                    {fmt(totalInvested)} total across 4 levels
                  </p>
                </div>
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                  border border-white/10 bg-white/5 text-white/50 text-xs
                  font-bold hover:bg-white/10 transition-all">
                  &darr; Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08]">
                      {['Step', 'Drop', 'Entry Price', 'Investment', 'Shares', 'Cum Shares', 'Cum Invested', 'Running BEP'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-white/30 font-bold uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ladderRows.map((row, i) => {
                      const hit = currentPrice > 0 && currentPrice <= row.entryPrice
                      return (
                        <tr key={row.step}
                          className={`border-b border-white/5 transition-all ${
                            hit ? 'bg-green-500/5' : i % 2 === 0 ? 'bg-white/[0.02]' : ''
                          }`}>
                          <td className="px-4 py-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center
                              text-xs font-bold inline-flex ${
                              hit ? 'bg-green-400/20 text-green-400' : 'bg-white/5 text-white/40'
                            }`}>
                              {row.step}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-white/70">{row.dropPct}%</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-bold font-mono ${hit ? 'text-green-400' : 'text-white'}`}>
                              {fmt(row.entryPrice)}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-white/70">
                            {fmt(row.investment)}
                          </td>
                          <td className="px-4 py-3 font-mono text-white/50">
                            {fmtShares(row.shares)}
                          </td>
                          <td className="px-4 py-3 font-mono text-white/50">
                            {fmtShares(row.cumShares)}
                          </td>
                          <td className="px-4 py-3 font-mono text-white/70">
                            {fmt(row.cumInvested)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold font-mono text-cyan-400">
                              {fmt(row.bep)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/10 bg-white/[0.03]">
                      <td colSpan={3} className="px-4 py-3 text-white/50 text-xs font-bold uppercase">
                        Totals
                      </td>
                      <td className="px-4 py-3 font-bold font-mono text-white">
                        {fmt(totalInvested)}
                      </td>
                      <td className="px-4 py-3 font-bold font-mono text-white/70">
                        {fmtShares(ladderRows[ladderRows.length - 1]?.cumShares || 0)}
                      </td>
                      <td colSpan={2} />
                      <td className="px-4 py-3 font-bold font-mono text-cyan-400">
                        BEP: {fmt(bep)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Profit targets below ladder */}
              <div className="p-5 border-t border-white/[0.08]">
                <p className="text-white/30 text-[10px] uppercase tracking-wider font-bold mb-3">
                  Profit targets from final BEP {fmt(bep)}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {profitTargets.map(t => {
                    const hit = currentPrice >= t.price
                    return (
                      <div key={t.pct}
                        className={`rounded-xl p-3 border text-center ${
                          hit ? 'bg-green-500/[0.12] border-green-500/25'
                          : 'bg-white/[0.03] border-white/[0.08]'
                        }`}>
                        <p className={`text-xl font-bold ${hit ? 'text-green-400' : 'text-white/60'}`}>
                          {t.pct}%{hit && ' \u2713'}
                        </p>
                        <p className={`font-bold text-sm font-mono mt-1 ${hit ? 'text-green-400' : 'text-white'}`}>
                          {fmt(t.price)}
                        </p>
                        <p className="text-white/30 text-xs mt-0.5">+{fmt(t.profit)}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
