export default function InvestmentOrdersPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="text-xs uppercase tracking-[0.2em] text-cyan-300/70">
          Investments
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Orders
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-white/65 md:text-base">
          Draft orders, staged plans, and future broker execution will be managed from
          this page.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">Order Queue</h2>
        <p className="mt-3 text-sm text-white/60">
          This page is ready for saved calculator plans, draft order payloads, and
          later broker execution.
        </p>
      </div>
    </div>
  )
}
