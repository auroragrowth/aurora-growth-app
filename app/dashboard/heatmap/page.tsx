'use client'

import StockHeatmap from '@/components/tradingview/StockHeatmap'

export default function HeatmapPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-1 inline-flex w-fit items-center rounded-full border border-cyan-400/25 bg-cyan-500/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-300">
          Stock Heatmap
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          S&P 500 Market Heatmap
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Visualise market performance by sector and market cap. Spot trends at a glance.
        </p>
      </div>

      <div className="rounded-[32px] border border-cyan-500/12 bg-[linear-gradient(180deg,rgba(8,20,43,0.98),rgba(3,12,28,0.98))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.32)]">
        <StockHeatmap />
      </div>
    </div>
  )
}
