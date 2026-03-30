"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import type { FinvizRow } from "@/lib/finviz/types"
import WatchlistStar from "@/components/dashboard/watchlist-star"

type SortKey =
  | "marketCap"
  | "price"
  | "changePct"
  | "volume"
  | "instOwn"
  | "roe"
  | "epsNextY"
  | "salesQoq"

function safeText(value: unknown) {
  return typeof value === "string" ? value : ""
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function fmtNumber(value: unknown, digits = 2) {
  const n = safeNumber(value)
  if (n === null) return "-"
  return n.toFixed(digits)
}

function fmtPercent(value: unknown) {
  const n = safeNumber(value)
  if (n === null) return "-"
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`
}

type ScreenerResponse = {
  ok?: boolean
  source?: string
  count?: number
  rows?: FinvizRow[]
  data?: FinvizRow[]
  error?: string
}

export default function StockTable() {
  const [rows, setRows] = useState<FinvizRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState("unknown")
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<SortKey>("marketCap")
  const [direction, setDirection] = useState<"desc" | "asc">("desc")

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch("/api/finviz/screener", {
          cache: "no-store",
        })

        let json: ScreenerResponse = {}
        try {
          json = await res.json()
        } catch {
          throw new Error("Scanner API did not return valid JSON")
        }

        if (!active) return

        if (!res.ok) {
          throw new Error(json.error || "Failed to load scanner")
        }

        const incoming = Array.isArray(json.rows)
          ? json.rows
          : Array.isArray(json.data)
            ? json.data
            : []

        setRows(incoming)
        setSource(typeof json.source === "string" ? json.source : "unknown")
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : "Failed to load scanner")
        setRows([])
        setSource("unknown")
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    const timer = setInterval(load, 60_000)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()

    let list = rows.filter((row) => {
      const ticker = safeText(row?.ticker).toLowerCase()
      const company = safeText(row?.company).toLowerCase()
      const sector = safeText(row?.sector).toLowerCase()
      const industry = safeText(row?.industry).toLowerCase()
      const country = safeText(row?.country).toLowerCase()

      if (!q) return true

      return (
        ticker.includes(q) ||
        company.includes(q) ||
        sector.includes(q) ||
        industry.includes(q) ||
        country.includes(q)
      )
    })

    list = [...list].sort((a, b) => {
      const aNum = safeNumber(a?.[sortBy]) ?? -Infinity
      const bNum = safeNumber(b?.[sortBy]) ?? -Infinity
      return direction === "desc" ? bNum - aNum : aNum - bNum
    })

    return list
  }, [rows, search, sortBy, direction])

  const gainers = filteredRows.filter((r) => (safeNumber(r?.changePct) ?? 0) > 0).length
  const losers = filteredRows.filter((r) => (safeNumber(r?.changePct) ?? 0) < 0).length

  const avgChange =
    filteredRows.length > 0
      ? filteredRows.reduce((sum, row) => sum + (safeNumber(row?.changePct) ?? 0), 0) /
        filteredRows.length
      : 0

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,20,43,0.96),rgba(8,14,28,0.98))] p-6 backdrop-blur-xl">
          <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-1 text-xs uppercase tracking-[0.28em] text-cyan-300">
            Aurora Scanner
          </div>

          <h2 className="mt-4 text-5xl font-semibold tracking-tight text-white">
            Live quality-growth market scanner.
          </h2>

          <p className="mt-4 max-w-3xl text-2xl leading-relaxed text-white/60">
            Mid-cap and above, strong balance sheets, high returns, strong earnings
            growth and institutional ownership.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="h-14 w-40 rounded-full bg-white/90" />
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-xl text-white/85 transition hover:bg-white/10"
            >
              Refresh Scanner
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          <StatCard label="Rows" value={String(filteredRows.length)} sub="Live matches" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
            <StatCard label="Gainers" value={String(gainers)} sub="Positive" />
            <StatCard label="Losers" value={String(losers)} sub="Negative" />
          </div>
          <StatCard label="Average Change" value={fmtPercent(avgChange)} sub="Visible rows" />
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[rgba(10,15,30,0.84)] p-4 backdrop-blur-xl">
        <div className="grid gap-4 xl:grid-cols-[1.6fr_240px_240px]">
          <div>
            <label className="mb-3 block text-sm text-white/60">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticker, company, sector, industry or country"
              className="w-full rounded-2xl border border-cyan-400/10 bg-[#061123] px-5 py-4 text-xl text-white outline-none placeholder:text-white/30"
            />
          </div>

          <div>
            <label className="mb-3 block text-sm text-white/60">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="w-full rounded-2xl border border-cyan-400/10 bg-[#061123] px-5 py-4 text-xl text-white outline-none"
            >
              <option value="marketCap">Market Cap</option>
              <option value="price">Price</option>
              <option value="changePct">Change</option>
              <option value="volume">Volume</option>
              <option value="instOwn">Inst Own</option>
              <option value="roe">ROE</option>
              <option value="epsNextY">EPS Next Y</option>
              <option value="salesQoq">Sales QoQ</option>
            </select>
          </div>

          <div>
            <label className="mb-3 block text-sm text-white/60">Direction</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as "desc" | "asc")}
              className="w-full rounded-2xl border border-cyan-400/10 bg-[#061123] px-5 py-4 text-xl text-white outline-none"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,22,45,0.96),rgba(7,14,28,0.99))] p-4 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-white/30">
              Live Scanner Output
            </div>
            <h2 className="mt-2 text-4xl font-semibold text-white">Aurora Glass Table</h2>
          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60">
            {filteredRows.length} rows
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-[#04101f] px-6 py-10 text-center text-white/65">
            Loading live scanner...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-400/20 bg-red-400/10 px-6 py-6 text-red-200">
            {error}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#04101f] px-6 py-10 text-center text-white/45">
            No live scanner rows found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-white/10 bg-[#04101f]">
            <table className="min-w-[1800px] w-full">
              <thead className="border-b border-white/10 bg-white/[0.03]">
                <tr className="text-left text-xs uppercase tracking-[0.18em] text-white/40">
                  <th className="px-4 py-4">Watch</th>
                  <th className="px-4 py-4">Ticker</th>
                  <th className="px-4 py-4">Company</th>
                  <th className="px-4 py-4">Sector</th>
                  <th className="px-4 py-4">Industry</th>
                  <th className="px-4 py-4">Country</th>
                  <th className="px-4 py-4">Market Cap</th>
                  <th className="px-4 py-4">P/E</th>
                  <th className="px-4 py-4">Price</th>
                  <th className="px-4 py-4">Change</th>
                  <th className="px-4 py-4">Volume</th>
                  <th className="px-4 py-4">Inst Own</th>
                  <th className="px-4 py-4">ROE</th>
                  <th className="px-4 py-4">ROA</th>
                  <th className="px-4 py-4">ROI</th>
                  <th className="px-4 py-4">EPS This Y</th>
                  <th className="px-4 py-4">EPS Next Y</th>
                  <th className="px-4 py-4">Sales QoQ</th>
                  <th className="px-4 py-4">Perf Year</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row, index) => {
                  const ticker = safeText(row?.ticker)
                  const company = safeText(row?.company)

                  return (
                    <tr
                      key={`${ticker}-${index}`}
                      className="border-b border-white/5 text-sm text-white/80 transition hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-4">
                        <WatchlistStar ticker={ticker} company={company} />
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/dashboard/${ticker}`}
                          className="font-semibold tracking-wide text-cyan-300 hover:text-cyan-200"
                        >
                          {ticker || "-"}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-white">{company || "-"}</td>
                      <td className="px-4 py-4">{safeText(row?.sector) || "-"}</td>
                      <td className="px-4 py-4">{safeText(row?.industry) || "-"}</td>
                      <td className="px-4 py-4">{safeText(row?.country) || "-"}</td>
                      <td className="px-4 py-4">{safeText(row?.marketCapText) || "-"}</td>
                      <td className="px-4 py-4">{fmtNumber(row?.pe)}</td>
                      <td className="px-4 py-4">${fmtNumber(row?.price)}</td>
                      <td
                        className={`px-4 py-4 font-medium ${
                          (safeNumber(row?.changePct) ?? 0) >= 0
                            ? "text-emerald-300"
                            : "text-red-300"
                        }`}
                      >
                        {fmtPercent(row?.changePct)}
                      </td>
                      <td className="px-4 py-4">
                        {safeNumber(row?.volume)?.toLocaleString() ?? "-"}
                      </td>
                      <td className="px-4 py-4">{fmtPercent(row?.instOwn)}</td>
                      <td className="px-4 py-4">{fmtPercent(row?.roe)}</td>
                      <td className="px-4 py-4">{fmtPercent(row?.roa)}</td>
                      <td className="px-4 py-4">{fmtPercent(row?.roi)}</td>
                      <td className="px-4 py-4">{fmtPercent(row?.epsThisY)}</td>
                      <td className="px-4 py-4">{fmtPercent(row?.epsNextY)}</td>
                      <td className="px-4 py-4">{fmtPercent(row?.salesQoq)}</td>
                      <td className="px-4 py-4">{fmtPercent(row?.perf52w)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,18,38,0.95),rgba(5,12,25,0.98))] p-6 backdrop-blur-xl">
      <div className="text-xs uppercase tracking-[0.26em] text-white/35">{label}</div>
      <div className="mt-4 text-5xl font-semibold tracking-tight text-white">{value}</div>
      <div className="mt-2 text-lg text-white/45">{sub}</div>
    </div>
  )
}
