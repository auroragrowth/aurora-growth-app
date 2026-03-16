"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

type WatchlistItem = {
  ticker: string
  company?: string
  created_at?: string
}

type EnrichedWatchlistItem = WatchlistItem & {
  marketCap?: string
  sector?: string
}

type SortKey = "ticker" | "company" | "marketCap" | "sector" | "created_at"
type SortDir = "asc" | "desc"

const PAGE_SIZE = 20

function marketCapToNumber(value?: string) {
  if (!value) return 0

  const str = String(value).replace(/,/g, "").trim()
  if (!str) return 0

  if (str.endsWith("T")) return parseFloat(str) * 1_000_000_000_000
  if (str.endsWith("B")) return parseFloat(str) * 1_000_000_000
  if (str.endsWith("M")) return parseFloat(str) * 1_000_000
  if (str.endsWith("K")) return parseFloat(str) * 1_000

  const parsed = parseFloat(str)
  return Number.isNaN(parsed) ? 0 : parsed
}

function sortArrow(active: boolean, dir: SortDir) {
  if (!active) return "↕"
  return dir === "asc" ? "↑" : "↓"
}

export default function WatchlistClient() {
  const [items, setItems] = useState<EnrichedWatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>("created_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const loadWatchlist = useCallback(async () => {
    try {
      setError("")

      const res = await fetch("/api/watchlist", {
        cache: "no-store",
      })

      if (!res.ok) {
        throw new Error("Failed to load watchlist")
      }

      const data = await res.json()
      const rawItems: WatchlistItem[] = Array.isArray(data.items) ? data.items : []

      const enriched = await Promise.all(
        rawItems.map(async (item) => {
          try {
            const tickerRes = await fetch(
              `/api/finviz/ticker?ticker=${encodeURIComponent(item.ticker)}`,
              { cache: "no-store" }
            )

            if (!tickerRes.ok) {
              return {
                ...item,
                marketCap: "-",
                sector: "-",
              }
            }

            const tickerData = await tickerRes.json()

            return {
              ...item,
              company: item.company || tickerData.company || item.ticker,
              marketCap: tickerData.marketCap || "-",
              sector: tickerData.sector || "-",
            }
          } catch {
            return {
              ...item,
              marketCap: "-",
              sector: "-",
            }
          }
        })
      )

      setItems(enriched)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load watchlist")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWatchlist()
  }, [loadWatchlist])

  useEffect(() => {
    function handleRefresh() {
      loadWatchlist()
    }

    window.addEventListener("aurora-watchlist-updated", handleRefresh)
    window.addEventListener("focus", handleRefresh)

    return () => {
      window.removeEventListener("aurora-watchlist-updated", handleRefresh)
      window.removeEventListener("focus", handleRefresh)
    }
  }, [loadWatchlist])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
      return
    }

    setSortKey(key)
    setSortDir(key === "created_at" ? "desc" : "asc")
  }

  const sortedItems = useMemo(() => {
    const list = [...items]

    list.sort((a, b) => {
      let compare = 0

      if (sortKey === "marketCap") {
        compare = marketCapToNumber(a.marketCap) - marketCapToNumber(b.marketCap)
      } else if (sortKey === "created_at") {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
        compare = aTime - bTime
      } else {
        const aValue = String(a[sortKey] ?? "").toLowerCase()
        const bValue = String(b[sortKey] ?? "").toLowerCase()
        compare = aValue.localeCompare(bValue)
      }

      return sortDir === "asc" ? compare : -compare
    })

    return list
  }, [items, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return sortedItems.slice(start, start + PAGE_SIZE)
  }, [sortedItems, page])

  async function removeFromWatchlist(ticker: string, company?: string) {
    try {
      const res = await fetch("/api/watchlist/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticker, company }),
      })

      if (!res.ok) {
        throw new Error("Failed to update watchlist")
      }

      await loadWatchlist()
      window.dispatchEvent(new CustomEvent("aurora-watchlist-updated"))
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update watchlist")
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
          Aurora Growth
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
          Watchlist
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Saved companies from Aurora Market Scanner.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(11,22,52,0.95),rgba(5,15,32,0.95))]">
        {loading ? (
          <div className="p-6 text-white/60">Loading watchlist...</div>
        ) : error ? (
          <div className="p-6 text-red-300">{error}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-white/10 bg-black/10 text-[10px] uppercase tracking-[0.2em] text-white/40">
                  <tr>
                    <th className="px-4 py-3 text-left">Watch</th>

                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort("ticker")}
                        className="inline-flex items-center gap-2 text-left text-white/60 transition hover:text-white"
                      >
                        <span>Ticker</span>
                        <span>{sortArrow(sortKey === "ticker", sortDir)}</span>
                      </button>
                    </th>

                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort("company")}
                        className="inline-flex items-center gap-2 text-left text-white/60 transition hover:text-white"
                      >
                        <span>Company</span>
                        <span>{sortArrow(sortKey === "company", sortDir)}</span>
                      </button>
                    </th>

                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort("marketCap")}
                        className="inline-flex items-center gap-2 text-left text-white/60 transition hover:text-white"
                      >
                        <span>Market Cap</span>
                        <span>{sortArrow(sortKey === "marketCap", sortDir)}</span>
                      </button>
                    </th>

                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort("sector")}
                        className="inline-flex items-center gap-2 text-left text-white/60 transition hover:text-white"
                      >
                        <span>Sector</span>
                        <span>{sortArrow(sortKey === "sector", sortDir)}</span>
                      </button>
                    </th>

                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort("created_at")}
                        className="inline-flex items-center gap-2 text-left text-white/60 transition hover:text-white"
                      >
                        <span>Added</span>
                        <span>{sortArrow(sortKey === "created_at", sortDir)}</span>
                      </button>
                    </th>

                    <th className="px-4 py-3 text-left">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {pagedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-white/50">
                        No watchlist items yet.
                      </td>
                    </tr>
                  ) : (
                    pagedItems.map((item) => (
                      <tr
                        key={`${item.ticker}-${item.created_at ?? ""}`}
                        className="border-t border-white/5 text-white/85"
                      >
                        <td className="px-4 py-3 text-yellow-300">★ Watchlist</td>

                        <td className="px-4 py-3 font-semibold text-cyan-300">
                          <Link href={`/dashboard/${encodeURIComponent(item.ticker)}`}>
                            {item.ticker}
                          </Link>
                        </td>

                        <td className="px-4 py-3">
                          <Link href={`/dashboard/${encodeURIComponent(item.ticker)}`}>
                            {item.company || "-"}
                          </Link>
                        </td>

                        <td className="px-4 py-3">{item.marketCap || "-"}</td>
                        <td className="px-4 py-3">{item.sector || "-"}</td>

                        <td className="px-4 py-3 text-white/60">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString()
                            : "-"}
                        </td>

                        <td className="px-4 py-3">
                          <button
                            onClick={() => removeFromWatchlist(item.ticker, item.company)}
                            className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-200 transition hover:bg-red-500/20"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-white/10 px-4 py-4 text-sm text-white/60">
              <div>
                Showing {pagedItems.length} of {sortedItems.length} saved tickers
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Prev
                </button>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80">
                  Page {page} / {totalPages}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
