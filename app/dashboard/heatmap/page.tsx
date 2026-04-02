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

      <div className="rounded-3xl border border-white/10 bg-[#08111f] p-4">
        <StockHeatmap />
      </div>
    </div>
  )
}
