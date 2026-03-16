import StockTable from "@/components/dashboard/stock-table"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">
          Aurora Growth
        </div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
          Market Dashboard
        </h1>
        <p className="mt-3 max-w-3xl text-white/55">
          Institutional-style market intelligence, ranked opportunity flow, and
          live scanner output for Aurora members.
        </p>
      </div>

      <StockTable />
    </div>
  )
}
