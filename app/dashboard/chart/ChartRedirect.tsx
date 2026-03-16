"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function ChartRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const ticker = (searchParams.get("ticker") || "AAPL").toUpperCase()
    router.replace(`/dashboard/stocks/${encodeURIComponent(ticker)}`)
  }, [router, searchParams])

  return <div className="p-8 text-slate-400">Redirecting to Stock Intelligence...</div>
}
