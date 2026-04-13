'use client'
import { useState, useMemo } from 'react'

interface Props {
  ticker: string
  currentPrice: number
  lastPeak: number | null
  lastPeakDate: string | null
  dropFromPeak: number | null
}

export default function AuroraStockCalculator({
  ticker,
  currentPrice,
  lastPeak,
  lastPeakDate,
  dropFromPeak,
}: Props) {
  const [investment, setInvestment] = useState('1000')
  const [bepMode, setBepMode] = useState<'auto' | 'manual'>('auto')
  const [manualBep, setManualBep] = useState('')

  const peakPrice = lastPeak || currentPrice
  const totalInvested = parseFloat(investment) || 1000

  // Aurora ladder — 1.25x geometric weighting across 4 drop levels from peak.
  // Execution: L1 is never bought alone — L1 + L2 money combine at L2 price.
  const LADDER_WEIGHTS = useMemo(() => [1, 1.25, 1.5625, 1.953125], [])
  const weightSum = 5.765625
  const base = totalInvested / weightSum

  // Per-level display data (raw weighted, shares at own price)
  const dropLevels = useMemo(() =>
    [10, 20, 30, 40].map((pct, i) => {
      const price = peakPrice * (1 - pct / 100)
      const levelInvestment = base * LADDER_WEIGHTS[i]
      const shares = price > 0 ? levelInvestment / price : 0
      return { pct, price, investment: levelInvestment, shares, label: `${pct}% drop` }
    }),
    [peakPrice, base, LADDER_WEIGHTS]
  )

  // Current drop from peak
  const currentDropPct = dropFromPeak ?? (lastPeak
    ? ((lastPeak - currentPrice) / lastPeak) * 100
    : 0)

  // Actual execution: 3 buys (L1+L2 combined @ L2, L3 @ L3, L4 @ L4)
  const execution = useMemo(() => {
    const [l1, l2, l3, l4] = dropLevels
    const firstBuyInvestment = l1.investment + l2.investment
    const firstBuyShares = l2.price > 0 ? firstBuyInvestment / l2.price : 0
    const l3Shares = l3.price > 0 ? l3.investment / l3.price : 0
    const l4Shares = l4.price > 0 ? l4.investment / l4.price : 0
    const totalShares = firstBuyShares + l3Shares + l4Shares
    return { firstBuyInvestment, firstBuyShares, l3Shares, l4Shares, totalShares }
  }, [dropLevels])

  // Auto BEP = totalInvested / total actual shares purchased
  const autoBep = execution.totalShares > 0 ? totalInvested / execution.totalShares : 0

  // Effective BEP
  const bep = bepMode === 'manual' && manualBep
    ? parseFloat(manualBep)
    : autoBep

  // Profit targets from BEP
  const profitTargets = useMemo(() =>
    [10, 15, 20, 25].map(pct => ({
      pct,
      price: bep * (1 + pct / 100),
      profit: totalInvested * (pct / 100),
      value: totalInvested * (1 + pct / 100),
    })),
    [bep, totalInvested]
  )

  const fmt = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="rounded-2xl overflow-hidden bg-[#0a1628] border border-white/[0.08]">

      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">{'\u2726'}</span>
            <h3 className="text-white font-bold text-base">Aurora Calculator</h3>
          </div>
          <p className="text-white/40 text-xs mt-0.5">
            Entry levels & profit targets for {ticker}
          </p>
        </div>
        <div className="text-right">
          <p className="text-white/30 text-[10px] uppercase tracking-wider">Current</p>
          <p className="text-white font-bold text-lg font-mono">{fmt(currentPrice)}</p>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* Reference peak */}
        {lastPeak != null && lastPeak > 0 && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-wider">Last 20% Rise Peak</p>
              <p className="text-white font-bold text-sm font-mono">{fmt(lastPeak)}</p>
              {lastPeakDate && (
                <p className="text-white/20 text-xs mt-0.5">
                  {new Date(lastPeakDate).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  })}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-white/30 text-[10px] uppercase tracking-wider">Drop from peak</p>
              <p className={`font-bold text-lg font-mono ${
                currentDropPct >= 20 ? 'text-green-400'
                : currentDropPct >= 10 ? 'text-amber-400'
                : 'text-white/60'
              }`}>
                {currentDropPct.toFixed(1)}%
              </p>
            </div>
          </div>
        )}

        {/* Investment amount */}
        <div>
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
              pl-7 pr-4 py-2.5 text-white font-mono text-sm
              focus:outline-none focus:border-cyan-400/50"
            />
          </div>
        </div>

        {/* Drop level entry points */}
        <div>
          <p className="text-white/40 text-[10px] uppercase tracking-wider font-bold mb-3">
            Entry levels — drop from peak ({fmt(peakPrice)})
          </p>
          <div className="space-y-2">
            {dropLevels.map(level => {
              const l1Combined = level.pct === 10
              const hit = currentPrice <= level.price
              const isCurrent = Math.abs(currentPrice - level.price) / level.price < 0.02
              const roleLabel =
                level.pct === 10 ? 'Combined with L2 \u2014 bought at L2 price'
                : level.pct === 20 ? 'First buy \u2014 L1 + L2 combined here'
                : `Add-on \u2014 Level ${level.pct === 30 ? 3 : 4}`
              return (
                <div key={level.pct}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    l1Combined ? 'bg-white/[0.02] border-dashed border-white/[0.10]'
                    : isCurrent
                      ? 'bg-cyan-400/10 border-cyan-400/30'
                      : hit
                      ? 'bg-green-500/[0.08] border-green-500/20'
                      : 'bg-white/[0.03] border-white/[0.08]'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center
                      text-xs font-bold flex-shrink-0 ${
                      l1Combined ? 'bg-white/5 text-white/40'
                      : isCurrent ? 'bg-cyan-400/20 text-cyan-400'
                      : hit ? 'bg-green-400/20 text-green-400'
                      : 'bg-white/5 text-white/40'
                    }`}>
                      {level.pct}%
                    </div>
                    <div>
                      <p className={`font-bold text-sm font-mono ${
                        l1Combined ? 'text-white/60'
                        : isCurrent ? 'text-cyan-400'
                        : hit ? 'text-green-400'
                        : 'text-white'
                      }`}>
                        {fmt(level.price)}
                      </p>
                      <p className="text-white/30 text-xs">
                        {roleLabel}
                        {!l1Combined && hit && !isCurrent && ' \u2713 passed'}
                        {!l1Combined && isCurrent && ' \u2190 near current'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-mono ${l1Combined ? 'text-white/50' : 'text-white/70'}`}>
                      {fmt(level.investment)}
                    </p>
                    <p className="text-white/20 text-xs">
                      &asymp; {level.shares.toFixed(4)} shares
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* BEP */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/40 text-[10px] uppercase tracking-wider font-bold">
              Break-even price (BEP)
            </p>
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
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                bepMode === 'manual'
                  ? 'bg-amber-400/15 border-amber-400/30 text-amber-400'
                  : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60'
              }`}>
              {bepMode === 'manual' ? 'Custom BEP' : 'Auto \u2014 click to edit'}
            </button>
          </div>

          {bepMode === 'manual' ? (
            <div>
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
                  pl-7 pr-4 py-2.5 text-amber-400 font-mono text-sm font-bold
                  focus:outline-none focus:border-amber-400/60"
                />
              </div>
              <p className="text-white/30 text-xs mt-1.5">
                Auto BEP was {fmt(autoBep)} &middot; profit targets recalculated from your custom BEP
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-400/[0.08] border border-cyan-400/20">
              <div>
                <p className="text-cyan-400 font-bold text-xl font-mono">{fmt(autoBep)}</p>
                <p className="text-white/30 text-xs mt-0.5">Weighted across L2, L3 &amp; L4 (L1 skipped)</p>
              </div>
              <div className="text-right">
                <p className="text-white/30 text-xs">
                  {currentPrice > autoBep ? 'Above BEP' : 'Below BEP'}
                </p>
                <p className={`font-bold text-sm font-mono ${
                  currentPrice > autoBep ? 'text-green-400' : 'text-red-400'
                }`}>
                  {fmt(Math.abs(currentPrice - autoBep))} {currentPrice > autoBep ? '\u2191' : '\u2193'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Profit targets */}
        <div>
          <p className="text-white/40 text-[10px] uppercase tracking-wider font-bold mb-3">
            Profit targets — from BEP {fmt(bep)}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {profitTargets.map(target => {
              const hit = currentPrice >= target.price
              return (
                <div key={target.pct}
                  className={`rounded-xl p-3 border text-center transition-all ${
                    hit
                      ? 'bg-green-500/[0.12] border-green-500/25'
                      : 'bg-white/[0.03] border-white/[0.08]'
                  }`}>
                  <p className={`text-2xl font-bold ${hit ? 'text-green-400' : 'text-white/70'}`}>
                    {target.pct}%{hit && ' \u2713'}
                  </p>
                  <p className={`font-bold text-sm font-mono mt-1 ${hit ? 'text-green-400' : 'text-white'}`}>
                    {fmt(target.price)}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">+{fmt(target.profit)}</p>
                  <p className="text-white/20 text-xs">= {fmt(target.value)} total</p>
                  {!hit && (
                    <p className="text-white/20 text-xs mt-1">
                      {fmt(target.price - currentPrice)} away
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2">
          <p className="text-white/30 text-[10px] uppercase tracking-wider font-bold">Summary</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {([
              ['Last peak', fmt(peakPrice)],
              ['Current price', fmt(currentPrice)],
              ['Drop from peak', `${currentDropPct.toFixed(1)}%`],
              ['BEP', fmt(bep)],
              ['Investment', fmt(totalInvested)],
              ['First buy (L1+L2)', fmt(execution.firstBuyInvestment)],
              ['Add-on L3', fmt(dropLevels[2].investment)],
              ['Add-on L4', fmt(dropLevels[3].investment)],
            ] as const).map(([label, value]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-white/30">{label}</span>
                <span className="text-white font-mono font-bold">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
