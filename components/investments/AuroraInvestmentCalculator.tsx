"use client"

import { useEffect, useMemo, useState } from "react"
import { calculateAuroraInvestmentLadder } from "@/lib/aurora-ladder"
import type { LadderCalculationResult, LadderProfile } from "@/types/investments"

type WatchlistItem = {
  ticker: string
  company?: string
  created_at?: string
}

const profileOptions: LadderProfile[] = [30, 40, 50, 60, 70]

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`
}

function formatLevel(value: number) {
  return `${(value * 100).toFixed(0)}%`
}

function formatShares(value: number) {
  return value.toFixed(4).replace(/\.?0+$/, "")
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function AuroraInvestmentCalculator() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [watchlistLoading, setWatchlistLoading] = useState(true)
  const [selectedWatchlistTicker, setSelectedWatchlistTicker] = useState("")

  const [ticker, setTicker] = useState("MSFT")
  const [referencePrice, setReferencePrice] = useState("399.82")
  const [totalCash, setTotalCash] = useState("5000")
  const [profile, setProfile] = useState<LadderProfile>(50)
  const [result, setResult] = useState<LadderCalculationResult | null>(null)
  const [error, setError] = useState("")
  const [exportMessage, setExportMessage] = useState("")

  useEffect(() => {
    async function loadWatchlist() {
      try {
        setWatchlistLoading(true)

        const res = await fetch("/api/watchlist", {
          cache: "no-store",
        })

        if (!res.ok) {
          setWatchlist([])
          return
        }

        const data = await res.json()
        setWatchlist(Array.isArray(data.items) ? data.items : [])
      } catch (err) {
        console.error("Failed to load watchlist", err)
        setWatchlist([])
      } finally {
        setWatchlistLoading(false)
      }
    }

    loadWatchlist()
  }, [])

  function handleWatchlistChange(value: string) {
    setSelectedWatchlistTicker(value)

    if (value) {
      setTicker(value.toUpperCase())
    }
  }

  function handleTickerChange(value: string) {
    setTicker(value.toUpperCase())
  }

  function handleClearSelection() {
    setSelectedWatchlistTicker("")
    setTicker("")
    setResult(null)
    setExportMessage("")
  }

  function handleCalculate() {
    try {
      setError("")
      setExportMessage("")

      const output = calculateAuroraInvestmentLadder({
        ticker,
        referencePrice: Number(referencePrice),
        totalCash: Number(totalCash),
        profile,
      })

      setResult(output)
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : "Calculation failed.")
    }
  }

  const selectedWatchlistItem = useMemo(() => {
    return watchlist.find((item) => item.ticker === selectedWatchlistTicker)
  }, [watchlist, selectedWatchlistTicker])

  const isTickerInWatchlist = useMemo(() => {
    const cleaned = ticker.trim().toUpperCase()
    if (!cleaned) return false
    return watchlist.some((item) => item.ticker.toUpperCase() === cleaned)
  }, [ticker, watchlist])

  const highlightedStepNumber = useMemo(() => {
    if (!result) return null
    return Math.floor(result.steps.length / 2)
  }, [result])

  const orderPayload = useMemo(() => {
    if (!result) return null

    return {
      broker: "Trading212",
      exportType: "order-plan",
      ticker: result.ticker,
      profile: result.profile,
      referencePrice: result.referencePrice,
      totalCash: result.totalCash,
      totalAllocated: result.totalAllocated,
      totalShares: result.totalShares,
      orders: result.steps.map((step) => ({
        stepNumber: step.stepNumber,
        side: "BUY",
        ticker: result.ticker,
        triggerPrice: step.entryPrice,
        investmentAmount: step.investmentAmount,
        quantity: step.sharesToBuy,
        orderType: "LIMIT_BUY_DRAFT",
      })),
      createdAt: result.createdAt,
      source: "aurora-investment-ladder-calculator",
    }
  }, [result])

  function exportCsv() {
    if (!result || !orderPayload) return

    const rows = [
      [
        "ticker",
        "stepNumber",
        "triggerPrice",
        "investmentAmount",
        "quantity",
        "orderType",
      ],
      ...orderPayload.orders.map((order) => [
        order.ticker,
        String(order.stepNumber),
        String(order.triggerPrice),
        String(order.investmentAmount),
        String(order.quantity),
        order.orderType,
      ]),
    ]

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n")

    downloadTextFile(
      `${result.ticker}-trading212-orders.csv`,
      csv,
      "text/csv;charset=utf-8"
    )

    setExportMessage("CSV exported.")
  }

  async function copyOrderJson() {
    if (!orderPayload) return

    await navigator.clipboard.writeText(JSON.stringify(orderPayload, null, 2))
    setExportMessage("Order JSON copied.")
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-cyan-400/10 bg-[linear-gradient(135deg,rgba(11,22,52,0.96),rgba(5,15,32,0.94))] p-6 shadow-[0_0_40px_rgba(0,0,0,0.25)] backdrop-blur-xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Aurora Investment Ladder Calculator
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-white/65 md:text-base">
            Build disciplined staged entries using a structured Aurora ladder model.
            Select a saved watchlist ticker or enter one manually.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">
              Watchlist
            </label>
            <select
              value={selectedWatchlistTicker}
              onChange={(e) => handleWatchlistChange(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#07162d] px-4 py-3 text-white outline-none focus:border-cyan-400/40"
            >
              <option value="" className="bg-slate-950">
                {watchlistLoading ? "Loading watchlist..." : "Select from watchlist"}
              </option>
              {watchlist.map((item) => (
                <option
                  key={`${item.ticker}-${item.created_at ?? ""}`}
                  value={item.ticker}
                  className="bg-slate-950"
                >
                  {item.ticker}
                  {item.company ? ` — ${item.company}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">
              Ticker
            </label>
            <input
              value={ticker}
              onChange={(e) => handleTickerChange(e.target.value)}
              placeholder="Enter ticker manually"
              className="w-full rounded-2xl border border-white/10 bg-[#07162d] px-4 py-3 text-white outline-none ring-0 placeholder:text-white/30 focus:border-cyan-400/40"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">
              Reference Price
            </label>
            <input
              type="number"
              step="0.01"
              value={referencePrice}
              onChange={(e) => setReferencePrice(e.target.value)}
              placeholder="399.82"
              className="w-full rounded-2xl border border-white/10 bg-[#07162d] px-4 py-3 text-white outline-none ring-0 placeholder:text-white/30 focus:border-cyan-400/40"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">
              Cash Available
            </label>
            <input
              type="number"
              step="0.01"
              value={totalCash}
              onChange={(e) => setTotalCash(e.target.value)}
              placeholder="5000"
              className="w-full rounded-2xl border border-white/10 bg-[#07162d] px-4 py-3 text-white outline-none ring-0 placeholder:text-white/30 focus:border-cyan-400/40"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">
              Profile
            </label>
            <select
              value={profile}
              onChange={(e) => setProfile(Number(e.target.value) as LadderProfile)}
              className="w-full rounded-2xl border border-white/10 bg-[#07162d] px-4 py-3 text-white outline-none focus:border-cyan-400/40"
            >
              {profileOptions.map((option) => (
                <option key={option} value={option} className="bg-slate-950">
                  {option}%
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {selectedWatchlistItem ? (
            <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-300">
              Selected: {selectedWatchlistItem.ticker}
              {selectedWatchlistItem.company ? ` — ${selectedWatchlistItem.company}` : ""}
            </div>
          ) : null}

          {isTickerInWatchlist ? (
            <div className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1.5 text-xs text-yellow-300">
              In Watchlist
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={handleCalculate}
            className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90"
          >
            Calculate Investment Ladder
          </button>

          <button
            onClick={handleClearSelection}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Clear Ticker
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}
      </div>

      {result ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-3xl border border-cyan-400/10 bg-[linear-gradient(135deg,rgba(11,22,52,0.96),rgba(5,15,32,0.94))] p-5 backdrop-blur-xl">
              <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                Ticker
              </div>
              <div className="mt-2 text-xl font-semibold text-white">
                {result.ticker}
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-400/10 bg-[linear-gradient(135deg,rgba(11,22,52,0.96),rgba(5,15,32,0.94))] p-5 backdrop-blur-xl">
              <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                Reference Price
              </div>
              <div className="mt-2 text-xl font-semibold text-white">
                {formatCurrency(result.referencePrice)}
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-400/10 bg-[linear-gradient(135deg,rgba(11,22,52,0.96),rgba(5,15,32,0.94))] p-5 backdrop-blur-xl">
              <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                Cash Available
              </div>
              <div className="mt-2 text-xl font-semibold text-white">
                {formatCurrency(result.totalCash)}
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-400/10 bg-[linear-gradient(135deg,rgba(11,22,52,0.96),rgba(5,15,32,0.94))] p-5 backdrop-blur-xl">
              <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                Total Shares
              </div>
              <div className="mt-2 text-xl font-semibold text-white">
                {formatShares(result.totalShares)}
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-400/10 bg-[linear-gradient(135deg,rgba(11,22,52,0.96),rgba(5,15,32,0.94))] p-5 backdrop-blur-xl">
              <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                Profile
              </div>
              <div className="mt-2 text-xl font-semibold text-white">
                {result.profile}%
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-cyan-400/10 bg-[linear-gradient(135deg,rgba(11,22,52,0.96),rgba(5,15,32,0.94))] backdrop-blur-xl">
            <div className="border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Investment Ladder</h2>
              <p className="mt-1 text-sm text-white/50">
                Highlighted entry step is the midpoint of the selected ladder.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white/5 text-white/65">
                  <tr>
                    <th className="px-4 py-3 text-left">Step</th>
                    <th className="px-4 py-3 text-left">Entry Level</th>
                    <th className="px-4 py-3 text-left">Entry Price</th>
                    <th className="px-4 py-3 text-left">Investment</th>
                    <th className="px-4 py-3 text-left">% of Total</th>
                    <th className="px-4 py-3 text-left">Shares</th>
                    <th className="px-4 py-3 text-left">Cumulative Shares</th>
                    <th className="px-4 py-3 text-left">Remaining Cash</th>
                  </tr>
                </thead>
                <tbody>
                  {result.steps.map((step) => {
                    const isHighlighted = step.stepNumber === highlightedStepNumber

                    return (
                      <tr
                        key={step.stepNumber}
                        className={`border-t text-white ${
                          isHighlighted
                            ? "border-cyan-400/30 bg-cyan-400/10"
                            : "border-white/10"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span>{step.stepNumber}</span>
                            {isHighlighted ? (
                              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                                Entry Step
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">{formatLevel(step.entryLevel)}</td>
                        <td className="px-4 py-3">{formatCurrency(step.entryPrice)}</td>
                        <td className="px-4 py-3">{formatCurrency(step.investmentAmount)}</td>
                        <td className="px-4 py-3">
                          {formatPercent(step.percentOfTotalInvestment)}
                        </td>
                        <td className="px-4 py-3">{formatShares(step.sharesToBuy)}</td>
                        <td className="px-4 py-3">{formatShares(step.cumulativeShares)}</td>
                        <td className="px-4 py-3">{formatCurrency(step.remainingCash)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-cyan-400/10 bg-[linear-gradient(135deg,rgba(11,22,52,0.96),rgba(5,15,32,0.94))] p-5 backdrop-blur-xl">
              <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                Total Allocated
              </div>
              <div className="mt-2 text-xl font-semibold text-white">
                {formatCurrency(result.totalAllocated)}
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-400/10 bg-[linear-gradient(135deg,rgba(11,22,52,0.96),rgba(5,15,32,0.94))] p-5 backdrop-blur-xl">
              <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                Percent Allocated
              </div>
              <div className="mt-2 text-xl font-semibold text-white">
                {formatPercent(result.totalPercentAllocated)}
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-400/10 bg-[linear-gradient(135deg,rgba(11,22,52,0.96),rgba(5,15,32,0.94))] p-5 backdrop-blur-xl">
              <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                Unallocated Cash
              </div>
              <div className="mt-2 text-xl font-semibold text-white">
                {formatCurrency(result.unallocatedCash)}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-cyan-400/10 bg-[linear-gradient(135deg,rgba(11,22,52,0.96),rgba(5,15,32,0.94))] p-6 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Trading 212 Export
                </h3>
                <p className="mt-2 text-sm text-white/60">
                  Export the calculated ladder as JSON or CSV.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={copyOrderJson}
                  className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90"
                >
                  Copy Order JSON
                </button>

                <button
                  onClick={exportCsv}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  Download Orders CSV
                </button>
              </div>
            </div>

            {exportMessage ? (
              <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-300">
                {exportMessage}
              </div>
            ) : null}

            <pre className="mt-4 overflow-x-auto rounded-2xl bg-black/30 p-4 text-xs text-cyan-200">
              {JSON.stringify(orderPayload, null, 2)}
            </pre>
          </div>
        </>
      ) : null}
    </div>
  )
}
