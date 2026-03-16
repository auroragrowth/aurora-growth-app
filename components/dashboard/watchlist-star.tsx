"use client"

import { useEffect, useState } from "react"

export default function WatchlistStar({
  ticker,
  company,
}: {
  ticker: string
  company: string
}) {
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    async function load() {
      const res = await fetch("/api/watchlist", { cache: "no-store" })
      const json = await res.json()
      if (!mounted || !json.ok) return

      const found = (json.rows || []).some((r: { ticker: string }) => r.ticker === ticker)
      setActive(found)
    }

    load()
    return () => {
      mounted = false
    }
  }, [ticker])

  async function toggle() {
    setLoading(true)

    try {
      if (active) {
        await fetch(`/api/watchlist?ticker=${encodeURIComponent(ticker)}`, {
          method: "DELETE",
        })
        setActive(false)
      } else {
        await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker, company }),
        })
        setActive(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`rounded-full border px-3 py-1 text-xs transition ${
        active
          ? "border-amber-300/40 bg-amber-300/10 text-amber-200"
          : "border-white/10 bg-white/5 text-white/60 hover:text-white"
      }`}
      title={active ? "Remove from watchlist" : "Add to watchlist"}
    >
      {active ? "★ Watchlist" : "☆ Watchlist"}
    </button>
  )
}
