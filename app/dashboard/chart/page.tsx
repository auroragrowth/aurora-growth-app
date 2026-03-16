import { Suspense } from "react"
import ChartRedirect from "./ChartRedirect"

export default function LegacyChartPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading chart...</div>}>
      <ChartRedirect />
    </Suspense>
  )
}
