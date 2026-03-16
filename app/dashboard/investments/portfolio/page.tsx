export default function InvestmentPortfolioPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="text-xs uppercase tracking-[0.2em] text-cyan-300/70">
          Investments
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Portfolio
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-white/65 md:text-base">
          Portfolio holdings, allocations, and performance tracking will live here.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">
            Holdings
          </div>
          <div className="mt-2 text-xl font-semibold text-white">0</div>
          <p className="mt-2 text-sm text-white/60">
            Ready to connect to saved positions and broker sync later.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">
            Value
          </div>
          <div className="mt-2 text-xl font-semibold text-white">$0.00</div>
          <p className="mt-2 text-sm text-white/60">
            Portfolio value and allocation summaries can be added next.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">
            Performance
          </div>
          <div className="mt-2 text-xl font-semibold text-white">Coming Soon</div>
          <p className="mt-2 text-sm text-white/60">
            Add profit, drawdown, and holdings analysis here.
          </p>
        </div>
      </div>
    </div>
  )
}
