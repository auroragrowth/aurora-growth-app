"use client"

import { useEffect, useRef } from "react"

declare global {
  interface Window {
    TradingView?: any
  }
}

export default function TradingViewAdvancedChart({ ticker }: { ticker: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    containerRef.current.innerHTML = ""

    const wrapper = document.createElement("div")
    wrapper.className = "tradingview-widget-container h-full w-full"

    const chart = document.createElement("div")
    chart.className = "tradingview-widget-container__widget h-full w-full"

    const copyright = document.createElement("div")
    copyright.className = "tradingview-widget-copyright text-[11px] text-slate-500 px-3 pb-2"
    copyright.innerHTML =
      '<span class="text-slate-500">Chart powered by TradingView</span>'

    const script = document.createElement("script")
    script.type = "text/javascript"
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: ticker,
      interval: "D",
      timezone: "Europe/London",
      theme: "dark",
      style: "1",
      locale: "en",
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: true,
      save_image: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      studies: [
        "RSI@tv-basicstudies",
        "MACD@tv-basicstudies",
        "MASimple@tv-basicstudies"
      ],
      backgroundColor: "#06101d",
      gridColor: "rgba(59,130,246,0.08)",
      watchlist: [],
      details: true,
      hotlist: false,
      withdateranges: true
    })

    wrapper.appendChild(chart)
    wrapper.appendChild(copyright)
    wrapper.appendChild(script)
    containerRef.current.appendChild(wrapper)

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ""
      }
    }
  }, [ticker])

  return (
    <div className="h-[680px] w-full overflow-hidden rounded-[24px] border border-cyan-500/20 bg-[#06101d] shadow-[0_0_0_1px_rgba(34,211,238,0.06),0_20px_80px_rgba(2,6,23,0.45)]">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
