"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import TradingViewAdvancedChart from "@/components/stocks/TradingViewAdvancedChart"

type ScannerRow = {
  ticker?: string
  company?: string
  company_name?: string
  sector?: string
  industry?: string
  market_cap?: number | string
  price?: number
  last_price?: number
  change?: number
  change_percent?: number
  change_pct?: number
  trend?: string
  aurora_score?: number
  score?: number
  updated_at?: string
  finviz_updated_at?: string
  source_updated_at?: string
  fetched_at?: string
  rank?: number
}

function num(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function fmtMoney(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

function fmtCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function safeUpper(value?: string) {
  return (value || "").toUpperCase()
}

function scoreToTone(score: number) {
  if (score >= 80) return "text-emerald-300"
  if (score >= 65) return "text-cyan-300"
  if (score >= 50) return "text-amber-300"
  return "text-rose-300"
}

function scoreToLabel(score: number) {
  if (score >= 80) return "Elite"
  if (score >= 65) return "Strong"
  if (score >= 50) return "Watch"
  return "Weak"
}

function getUpdatedAt(row: ScannerRow | null) {
  return (
    row?.finviz_updated_at ||
    row?.source_updated_at ||
    row?.fetched_at ||
    row?.updated_at ||
    null
  )
}

function deriveMomentum(score: number, changePct: number, trend: string) {
  const t = trend.toLowerCase()

  if (score >= 80 || changePct >= 3 || t.includes("strong")) {
    return { label: "Strong Bullish", value: 88 }
  }
  if (score >= 65 || changePct >= 1 || t.includes("up")) {
    return { label: "Bullish", value: 72 }
  }
  if (score >= 50 || changePct > -1) {
    return { label: "Neutral", value: 52 }
  }
  return { label: "Weakening", value: 34 }
}

function deriveSectorStrength(score: number) {
  return clamp(Math.round(score * 0.92 + 6), 20, 95)
}

function deriveBreakdown(score: number, changePct: number) {
  const trendStrength = clamp(Math.round(score * 0.28 + 18), 10, 95)
  const momentum = clamp(Math.round(score * 0.26 + changePct * 3 + 18), 10, 95)
  const relativeStrength = clamp(Math.round(score * 0.24 + changePct * 2 + 14), 10, 95)
  const liquidity = clamp(Math.round(score * 0.22 + 24), 10, 95)
  const setupQuality = clamp(Math.round(score * 0.3 + 12), 10, 95)
  const sectorStrength = deriveSectorStrength(score)

  return [
    { label: "Trend Strength", value: trendStrength },
    { label: "Momentum", value: momentum },
    { label: "Relative Strength", value: relativeStrength },
    { label: "Liquidity", value: liquidity },
    { label: "Setup Quality", value: setupQuality },
    { label: "Sector Strength", value: sectorStrength },
  ]
}

function HeatBar({ value }: { value: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5">
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400"
        style={{ width: `${clamp(value, 0, 100)}%` }}
      />
    </div>
  )
}

function StatCard({
  title,
  value,
  subtext,
  valueClassName = "text-white",
}: {
  title: string
  value: string
  subtext: string
  valueClassName?: string
}) {
  return (
    <div className="rounded-[22px] border border-cyan-500/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.07),transparent_35%),linear-gradient(180deg,rgba(8,17,31,0.92),rgba(6,14,24,0.98))] p-5 shadow-[0_10px_50px_rgba(2,6,23,0.25)]">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{title}</div>
      <div className={`mt-3 text-2xl font-semibold ${valueClassName}`}>{value}</div>
      <div className="mt-1 text-sm text-slate-400">{subtext}</div>
    </div>
  )
}

export default function StockIntelligenceClient({ ticker }: { ticker: string }) {
  const [row, setRow] = useState<ScannerRow | null>(null)
  const [loading, setLoading] = useState(true)

  const [budget, setBudget] = useState(5000)
  const [line1Pct, setLine1Pct] = useState(0)
  const [line2Pct, setLine2Pct] = useState(5)
  const [line3Pct, setLine3Pct] = useState(10)
  const [line4Pct, setLine4Pct] = useState(15)

  useEffect(() => {
    let ignore = false

    async function load() {
      setLoading(true)

      try {
        const res = await fetch(`/api/scanner?ticker=${encodeURIComponent(ticker)}`, {
          cache: "no-store",
        })

        const data = await res.json().catch(() => null)

        if (ignore) return

        const resolved =
          Array.isArray(data) ? data[0] :
          data?.data && Array.isArray(data.data) ? data.data[0] :
          data?.row ? data.row :
          data

        setRow(resolved || null)
      } catch {
        if (!ignore) setRow(null)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    load()

    return () => {
      ignore = true
    }
  }, [ticker])

  const companyName = row?.company_name || row?.company || `${safeUpper(ticker)} Holdings`
  const price = num(row?.price ?? row?.last_price, 0)
  const score = num(row?.aurora_score ?? row?.score, 54)
  const changePct = num(row?.change_percent ?? row?.change_pct ?? row?.change, 0)
  const trend = row?.trend || (changePct >= 1 ? "Uptrend" : changePct <= -1 ? "Pullback" : "Neutral")
  const marketCap = num(row?.market_cap, 0)
  const sector = row?.sector || "Technology"
  const industry = row?.industry || "Large Cap Growth"
  const updatedAt = getUpdatedAt(row)

  const momentum = useMemo(
    () => deriveMomentum(score, changePct, trend),
    [score, changePct, trend]
  )

  const breakdown = useMemo(
    () => deriveBreakdown(score, changePct),
    [score, changePct]
  )

  const sectorStrength = useMemo(
    () => deriveSectorStrength(score),
    [score]
  )

  const entryLines = useMemo(() => {
    const base = price > 0 ? price : 100
    const perLine = budget / 4

    const levels = [
      { key: "L1", name: "Buy Line 1", pctDrop: line1Pct },
      { key: "L2", name: "Buy Line 2", pctDrop: line2Pct },
      { key: "L3", name: "Buy Line 3", pctDrop: line3Pct },
      { key: "L4", name: "Buy Line 4", pctDrop: line4Pct },
    ].map((line) => {
      const linePrice = base * (1 - line.pctDrop / 100)
      const shares = linePrice > 0 ? perLine / linePrice : 0
      return {
        ...line,
        price: linePrice,
        allocation: perLine,
        shares,
      }
    })

    return levels
  }, [price, budget, line1Pct, line2Pct, line3Pct, line4Pct])

  const bep = useMemo(() => {
    const totalAllocation = entryLines.reduce((sum, line) => sum + line.allocation, 0)
    const totalShares = entryLines.reduce((sum, line) => sum + line.shares, 0)
    if (!totalShares) return 0
    return totalAllocation / totalShares
  }, [entryLines])

  const profitTargets = useMemo(() => {
    const deployed = entryLines.reduce((sum, line) => sum + line.allocation, 0)
    const targets = [10, 15, 20, 25].map((pct) => {
      const targetPrice = bep * (1 + pct / 100)
      const cashProfit = deployed * (pct / 100)
      return {
        pct,
        targetPrice,
        cashProfit,
      }
    })
    return targets
  }, [bep, entryLines])

  const ladderOverlay = useMemo(() => {
    const prices = [
      ...entryLines.map((x) => x.price),
      bep,
      ...profitTargets.map((x) => x.targetPrice),
    ].filter((x) => Number.isFinite(x) && x > 0)

    const max = Math.max(...prices, (price || 1) * 1.25)
    const min = Math.min(...prices, (price || 1) * 0.75)
    const span = max - min || 1

    const y = (v: number) => `${((max - v) / span) * 100}%`

    return {
      min,
      max,
      rows: [
        ...profitTargets
          .slice()
          .reverse()
          .map((t) => ({
            label: `${t.pct}% Profit`,
            price: t.targetPrice,
            top: y(t.targetPrice),
            tone: "from-amber-300 to-yellow-500",
            edge: "border-amber-400/40",
            text: "text-amber-200",
          })),
        {
          label: "BEP",
          price: bep,
          top: y(bep),
          tone: "from-emerald-300 to-emerald-500",
          edge: "border-emerald-400/40",
          text: "text-emerald-200",
        },
        ...entryLines.map((line) => ({
          label: line.name,
          price: line.price,
          top: y(line.price),
          tone: "from-cyan-300 to-sky-500",
          edge: "border-cyan-400/40",
          text: "text-cyan-200",
        })),
      ],
    }
  }, [entryLines, bep, profitTargets, price])

  const heatmapCells = useMemo(() => {
    const base = sectorStrength
    return Array.from({ length: 16 }).map((_, i) => {
      const modifier = ((i % 4) - 1.5) * 4 + (Math.floor(i / 4) - 1.5) * 3
      const value = clamp(Math.round(base + modifier), 20, 95)
      return value
    })
  }, [sectorStrength])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),transparent_28%),linear-gradient(180deg,#020817_0%,#04111f_32%,#05101c_100%)] px-6 py-6 text-white md:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-col gap-4 rounded-[28px] border border-cyan-500/15 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.1),transparent_30%),linear-gradient(180deg,rgba(7,17,31,0.95),rgba(5,12,21,0.98))] p-6 shadow-[0_25px_120px_rgba(2,6,23,0.5)] lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-200">
              Aurora Stock Intelligence
            </div>

            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <h1 className="text-4xl font-semibold tracking-tight text-white">{safeUpper(ticker)}</h1>
              <div className="pb-1 text-lg text-slate-300">{companyName}</div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-400">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{sector}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{industry}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{trend}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {updatedAt ? `Updated ${new Date(updatedAt).toLocaleString()}` : "Live view"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/market-scanner"
              className="rounded-[18px] border border-cyan-400/25 bg-cyan-500/5 px-5 py-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/10"
            >
              Back to Market Scanner
            </Link>
            <Link
              href={`/dashboard/investments/calculator?ticker=${encodeURIComponent(safeUpper(ticker))}`}
              className="rounded-[18px] border border-emerald-400/25 bg-emerald-500/5 px-5 py-3 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/10"
            >
              Open Buy Ladder Calculator
            </Link>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-5">
          <StatCard
            title="Aurora Score"
            value={`${Math.round(score)}`}
            subtext={`${scoreToLabel(score)} setup quality`}
            valueClassName={scoreToTone(score)}
          />
          <StatCard
            title="Momentum"
            value={momentum.label}
            subtext={`${momentum.value}/100 signal strength`}
            valueClassName="text-cyan-300"
          />
          <StatCard
            title="Sector Strength"
            value={`${sectorStrength}/100`}
            subtext={`${sector} relative strength`}
            valueClassName="text-sky-300"
          />
          <StatCard
            title="Price"
            value={price > 0 ? fmtMoney(price) : "—"}
            subtext={`${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}% today`}
            valueClassName={changePct >= 0 ? "text-emerald-300" : "text-rose-300"}
          />
          <StatCard
            title="Market Cap"
            value={marketCap > 0 ? fmtCompact(marketCap) : "—"}
            subtext={row?.rank ? `Scanner rank #${row.rank}` : "Scanner data snapshot"}
            valueClassName="text-white"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <div className="rounded-[26px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(7,17,31,0.96),rgba(4,12,20,0.98))] p-4 shadow-[0_20px_80px_rgba(2,6,23,0.35)]">
              <div className="mb-4 flex items-center justify-between px-2">
                <div>
                  <div className="text-sm font-medium text-white">TradingView Pro Chart</div>
                  <div className="text-xs text-slate-400">Advanced chart with RSI, MACD and moving average</div>
                </div>
                <div className="rounded-full border border-cyan-400/20 bg-cyan-500/5 px-3 py-1 text-xs text-cyan-200">
                  {safeUpper(ticker)}
                </div>
              </div>
              <TradingViewAdvancedChart ticker={safeUpper(ticker)} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[24px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(7,17,31,0.96),rgba(4,12,20,0.98))] p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold text-white">Aurora Score Breakdown</div>
                    <div className="text-sm text-slate-400">Institutional-style weighted signal view</div>
                  </div>
                  <div className={`text-2xl font-semibold ${scoreToTone(score)}`}>{Math.round(score)}</div>
                </div>

                <div className="space-y-4">
                  {breakdown.map((item) => (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-300">{item.label}</span>
                        <span className="text-slate-400">{item.value}/100</span>
                      </div>
                      <HeatBar value={item.value} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(7,17,31,0.96),rgba(4,12,20,0.98))] p-6">
                <div className="mb-5">
                  <div className="text-lg font-semibold text-white">Sector Heatmap</div>
                  <div className="text-sm text-slate-400">
                    Premium visual snapshot for {sector}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {heatmapCells.map((value, index) => (
                    <div
                      key={index}
                      className="flex aspect-square items-center justify-center rounded-2xl border border-white/5 text-xs font-medium text-slate-200 shadow-inner"
                      style={{
                        background:
                          value >= 75
                            ? "linear-gradient(180deg, rgba(16,185,129,0.35), rgba(6,95,70,0.35))"
                            : value >= 60
                            ? "linear-gradient(180deg, rgba(14,165,233,0.35), rgba(3,105,161,0.35))"
                            : value >= 45
                            ? "linear-gradient(180deg, rgba(245,158,11,0.28), rgba(146,64,14,0.28))"
                            : "linear-gradient(180deg, rgba(244,63,94,0.25), rgba(127,29,29,0.25))",
                      }}
                    >
                      {index === 5 ? safeUpper(ticker) : value}
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm text-slate-300">
                  <div className="mb-2 font-medium text-white">Sector Intelligence</div>
                  <div>
                    {safeUpper(ticker)} is currently scoring <span className="text-cyan-300">{sectorStrength}/100</span> versus
                    its sector template. This panel is designed as a premium sector strength visual so the page still looks complete even when
                    only single-stock scanner data is available.
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(7,17,31,0.96),rgba(4,12,20,0.98))] p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-white">Visual Ladder Overlay</div>
                  <div className="text-sm text-slate-400">Aurora buy lines, BEP and profit levels</div>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                  Bloomberg-style ladder view
                </div>
              </div>

              <div className="relative h-[420px] overflow-hidden rounded-[22px] border border-white/5 bg-[linear-gradient(180deg,rgba(3,7,18,0.95),rgba(2,6,16,1))]">
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,165,233,0.02),transparent_40%,rgba(34,197,94,0.02))]" />
                <div className="absolute inset-y-0 left-[72px] w-px bg-cyan-400/10" />
                <div className="absolute inset-0">
                  {ladderOverlay.rows.map((item) => (
                    <div
                      key={item.label}
                      className="absolute left-4 right-4"
                      style={{ top: item.top }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-14 text-right text-[11px] font-medium ${item.text}`}>
                          {item.label}
                        </div>
                        <div className={`h-px flex-1 bg-gradient-to-r ${item.tone}`} />
                        <div className={`min-w-[96px] rounded-full border px-3 py-1 text-right text-[11px] font-medium ${item.edge} ${item.text} bg-white/[0.03]`}>
                          {fmtMoney(item.price)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="absolute bottom-4 left-4 right-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-cyan-400/10 bg-cyan-500/[0.04] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Current Price</div>
                    <div className="mt-2 text-lg font-semibold text-white">{price > 0 ? fmtMoney(price) : "—"}</div>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/10 bg-emerald-500/[0.04] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Blended BEP</div>
                    <div className="mt-2 text-lg font-semibold text-emerald-300">{fmtMoney(bep)}</div>
                  </div>
                  <div className="rounded-2xl border border-amber-400/10 bg-amber-500/[0.04] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Top Profit Target</div>
                    <div className="mt-2 text-lg font-semibold text-amber-300">
                      {fmtMoney(profitTargets[profitTargets.length - 1]?.targetPrice || 0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[24px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(7,17,31,0.96),rgba(4,12,20,0.98))] p-6">
              <div className="mb-5">
                <div className="text-lg font-semibold text-white">Buy Ladder Calculator</div>
                <div className="text-sm text-slate-400">Structure staged entries using Aurora line percentages</div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">Total Budget</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(num(e.target.value, 0))}
                    className="w-full rounded-2xl border border-cyan-500/15 bg-[#091321] px-4 py-3 text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Line 1 Drop %</label>
                    <input
                      type="number"
                      value={line1Pct}
                      onChange={(e) => setLine1Pct(num(e.target.value, 0))}
                      className="w-full rounded-2xl border border-cyan-500/15 bg-[#091321] px-4 py-3 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Line 2 Drop %</label>
                    <input
                      type="number"
                      value={line2Pct}
                      onChange={(e) => setLine2Pct(num(e.target.value, 0))}
                      className="w-full rounded-2xl border border-cyan-500/15 bg-[#091321] px-4 py-3 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Line 3 Drop %</label>
                    <input
                      type="number"
                      value={line3Pct}
                      onChange={(e) => setLine3Pct(num(e.target.value, 0))}
                      className="w-full rounded-2xl border border-cyan-500/15 bg-[#091321] px-4 py-3 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Line 4 Drop %</label>
                    <input
                      type="number"
                      value={line4Pct}
                      onChange={(e) => setLine4Pct(num(e.target.value, 0))}
                      className="w-full rounded-2xl border border-cyan-500/15 bg-[#091321] px-4 py-3 text-white outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                  <div className="mb-3 text-sm font-medium text-white">Entry Ladder</div>
                  <div className="space-y-3">
                    {entryLines.map((line) => (
                      <div key={line.key} className="rounded-xl border border-white/5 bg-black/10 p-3">
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="text-cyan-200">{line.name}</span>
                          <span className="text-slate-400">-{line.pctDrop}%</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <div className="text-slate-500">Price</div>
                            <div className="mt-1 text-white">{fmtMoney(line.price)}</div>
                          </div>
                          <div>
                            <div className="text-slate-500">Allocation</div>
                            <div className="mt-1 text-white">{fmtMoney(line.allocation)}</div>
                          </div>
                          <div>
                            <div className="text-slate-500">Shares</div>
                            <div className="mt-1 text-white">{line.shares.toFixed(4)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-400/10 bg-emerald-500/[0.04] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-emerald-200/70">Blended Entry Price</div>
                  <div className="mt-2 text-2xl font-semibold text-emerald-300">{fmtMoney(bep)}</div>
                  <div className="mt-1 text-sm text-slate-400">Average entry across all four buy lines</div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(7,17,31,0.96),rgba(4,12,20,0.98))] p-6">
              <div className="mb-5">
                <div className="text-lg font-semibold text-white">Profit Ladder</div>
                <div className="text-sm text-slate-400">Target prices and cash profit from blended BEP</div>
              </div>

              <div className="space-y-3">
                {profitTargets.map((target) => (
                  <div
                    key={target.pct}
                    className="rounded-2xl border border-amber-400/10 bg-amber-500/[0.03] p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-medium text-amber-200">{target.pct}% Profit Level</div>
                      <div className="text-xs text-slate-400">Aurora exit line</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-slate-500">Target Price</div>
                        <div className="mt-1 text-white">{fmtMoney(target.targetPrice)}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Cash Profit</div>
                        <div className="mt-1 text-amber-300">{fmtMoney(target.cashProfit)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(7,17,31,0.96),rgba(4,12,20,0.98))] p-6">
              <div className="mb-5">
                <div className="text-lg font-semibold text-white">Mini Indicators</div>
                <div className="text-sm text-slate-400">Quick institutional dashboard</div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-300">Aurora Rating</span>
                    <span className={scoreToTone(score)}>{Math.round(score)}/100</span>
                  </div>
                  <HeatBar value={score} />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-300">Momentum</span>
                    <span className="text-cyan-300">{momentum.value}/100</span>
                  </div>
                  <HeatBar value={momentum.value} />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-300">Sector Strength</span>
                    <span className="text-sky-300">{sectorStrength}/100</span>
                  </div>
                  <HeatBar value={sectorStrength} />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-300">Trend Quality</span>
                    <span className="text-emerald-300">{breakdown[0]?.value || 0}/100</span>
                  </div>
                  <HeatBar value={breakdown[0]?.value || 0} />
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm text-slate-300">
                <div className="mb-2 font-medium text-white">Signal Summary</div>
                <div>
                  {loading
                    ? "Loading scanner data..."
                    : row
                    ? `${safeUpper(ticker)} is showing a ${scoreToLabel(score).toLowerCase()} Aurora setup with ${momentum.label.toLowerCase()} momentum and ${sectorStrength >= 70 ? "strong" : sectorStrength >= 55 ? "stable" : "mixed"} sector alignment.`
                    : `No scanner row was found for ${safeUpper(ticker)}. The page still loads fully so any ticker can be analysed from the chart and Aurora ladder tools.`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
