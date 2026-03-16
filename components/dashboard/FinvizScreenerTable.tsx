"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

type FinvizRow = {
  ticker: string
  company: string
  sector?: string
  marketCap?: string
}

type ScreenerResponse = {
  rows: FinvizRow[]
  page: number
  totalPages: number
}

const PAGE_SIZE = 20
const AUTO_REFRESH_MS = 3 * 60 * 1000

function value(v?: string | number) {
  if (v === undefined || v === null || v === "") return "-"
  return v
}

function numberValue(v: unknown) {
  if (!v) return 0
  const str = String(v).replace(/,/g, "").trim()
  if (!str) return 0
  if (str.endsWith("T")) return parseFloat(str) * 1_000_000_000_000
  if (str.endsWith("B")) return parseFloat(str) * 1_000_000_000
  if (str.endsWith("M")) return parseFloat(str) * 1_000_000
  if (str.endsWith("K")) return parseFloat(str) * 1_000
  const parsed = parseFloat(str)
  return Number.isNaN(parsed) ? 0 : parsed
}

export default function FinvizScreenerTable() {
  const [rows, setRows] = useState<FinvizRow[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("marketCap")
  const [dir, setDir] = useState("desc")
  const [watchlist, setWatchlist] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [refreshTick, setRefreshTick] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<string>("")
  const [busyTicker, setBusyTicker] = useState<string | null>(null)

  useEffect(() => {
    async function loadWatchlist() {
      try {
        const res = await fetch("/api/watchlist", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()

        const map: Record<string, boolean> = {}
        for (const item of data.items ?? []) {
          map[String(item.ticker).toUpperCase()] = true
        }
        setWatchlist(map)
      } catch {}
    }

    loadWatchlist()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshTick((v) => v + 1)
    }, AUTO_REFRESH_MS)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)

        const res = await fetch(
          `/api/finviz/screener?page=${page}&limit=${PAGE_SIZE}`,
          { cache: "no-store" }
        )

        if (!res.ok) {
          throw new Error("Failed to load scanner")
        }

        const data: ScreenerResponse = await res.json()

        setRows(data.rows || [])
        setTotalPages(data.totalPages || 1)
        setLastUpdated(new Date().toLocaleTimeString())
      } catch (error) {
        console.error(error)
        setRows([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [page, refreshTick])

  async function toggle(ticker: string, company: string) {
    try {
      setBusyTicker(ticker)

      const res = await fetch("/api/watchlist/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, company }),
      })

      if (!res.ok) {
        throw new Error("Failed to update watchlist")
      }

      const data = await res.json()

      setWatchlist((prev) => ({
        ...prev,
        [ticker]: !!data.watched,
      }))

      window.dispatchEvent(new CustomEvent("aurora-watchlist-updated"))
    } catch (error) {
      console.error(error)
      alert("Failed to update watchlist")
    } finally {
      setBusyTicker(null)
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()

    let list = [...rows]

    if (q) {
      list = list.filter(
        (r) =>
          r.ticker?.toLowerCase().includes(q) ||
          r.company?.toLowerCase().includes(q) ||
          r.sector?.toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => {
      if (sort === "marketCap") {
        const av = numberValue(a.marketCap)
        const bv = numberValue(b.marketCap)
        return dir === "asc" ? av - bv : bv - av
      }

      const as = String((a as Record<string, unknown>)[sort] ?? "")
      const bs = String((b as Record<string, unknown>)[sort] ?? "")

      return dir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as)
    })

    return list
  }, [rows, search, sort, dir])

  if (loading) {
    return <div className="p-6 text-white/60">Loading scanner...</div>
  }

  return (
    <div className="flex h-full flex-col space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="grid flex-1 gap-3 xl:grid-cols-[1.6fr_200px_160px]">
          <input
            type="text"
            placeholder="Search ticker, company or sector"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-full border border-white/10 bg-[#07162d] px-4 py-2 text-sm text-white outline-none placeholder:text-white/35"
          />

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-full border border-white/10 bg-[#07162d] px-4 py-2 text-sm text-white outline-none"
          >
            <option value="marketCap">Market Cap</option>
            <option value="ticker">Ticker</option>
            <option value="company">Company</option>
            <option value="sector">Sector</option>
          </select>

          <select
            value={dir}
            onChange={(e) => setDir(e.target.value)}
            className="rounded-full border border-white/10 bg-[#07162d] px-4 py-2 text-sm text-white outline-none"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>

        <button
          onClick={() => setRefreshTick((v) => v + 1)}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
        >
          Refresh
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-white/45">
        <div>Auto refresh every 3 minutes</div>
        <div>{lastUpdated ? `Last updated ${lastUpdated}` : ""}</div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[#091326] text-[10px] uppercase tracking-[0.2em] text-white/40">
              <tr>
                <th className="px-3 py-2 text-left">Watch</th>
                <th className="px-3 py-2 text-left">Ticker</th>
                <th className="px-3 py-2 text-left">Company</th>
                <th className="px-3 py-2 text-left">Market Cap</th>
                <th className="px-3 py-2 text-left">Sector</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((row) => {
                const ticker = String(row.ticker || "").toUpperCase()
                const watched = watchlist[ticker]
                const isBusy = busyTicker === ticker

                return (
                  <tr key={ticker} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-3 py-2">
                      <button
                        onClick={() => toggle(ticker, row.company || ticker)}
                        disabled={isBusy}
                        className={`rounded-full border px-2 py-1 text-xs ${
                          watched
                            ? "border-yellow-400 bg-yellow-400/20 text-yellow-300"
                            : "border-white/10 text-white/60"
                        } ${isBusy ? "opacity-50" : ""}`}
                      >
                        {watched ? "★" : "☆"} Watch
                      </button>
                    </td>

                    <td className="px-3 py-2 font-semibold text-cyan-300">
                      <Link href={`/dashboard/${encodeURIComponent(ticker)}`}>
                        {ticker}
                      </Link>
                    </td>

                    <td className="px-3 py-2">
                      <Link href={`/dashboard/${encodeURIComponent(ticker)}`}>
                        {row.company}
                      </Link>
                    </td>

                    <td className="px-3 py-2">{value(row.marketCap)}</td>
                    <td className="px-3 py-2">{value(row.sector)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-white/50">
        <div>Showing {PAGE_SIZE} rows</div>

        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border border-white/10 px-3 py-1"
          >
            Prev
          </button>

          <div>
            Page {page} / {totalPages}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded border border-white/10 px-3 py-1"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
