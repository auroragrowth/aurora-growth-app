export default function InvestmentPortfolioPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-cyan-500/12 bg-[linear-gradient(180deg,rgba(8,20,43,0.98),rgba(3,12,28,0.98))] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.32)]">
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
        <div className="rounded-2xl border border-white/8 bg-[rgba(8,20,43,0.9)] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">
            Holdings
          </div>
          <div className="mt-2 text-xl font-semibold text-white">0</div>
          <p className="mt-2 text-sm text-white/60">
            Ready to connect to saved positions and broker sync later.
          </p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-[rgba(8,20,43,0.9)] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">
            Value
          </div>
          <div className="mt-2 text-xl font-semibold text-white">$0.00</div>
          <p className="mt-2 text-sm text-white/60">
            Portfolio value and allocation summaries can be added next.
          </p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-[rgba(8,20,43,0.9)] p-5">
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
