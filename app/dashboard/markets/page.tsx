export default function MarketsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-cyan-500/12 bg-[linear-gradient(180deg,rgba(8,20,43,0.98),rgba(3,12,28,0.98))] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.32)]">
        <div className="text-xs uppercase tracking-[0.2em] text-cyan-300/70">
          Markets
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Markets
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-white/65 md:text-base">
          Market overview, price action, sector trends, and broad investment signals
          will appear here.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-[rgba(8,20,43,0.9)] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">
            Overview
          </div>
          <div className="mt-2 text-xl font-semibold text-white">Coming Soon</div>
          <p className="mt-2 text-sm text-white/60">
            Add major indices, movers, heatmaps, and macro trends.
          </p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-[rgba(8,20,43,0.9)] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">
            Watch
          </div>
          <div className="mt-2 text-xl font-semibold text-white">Coming Soon</div>
          <p className="mt-2 text-sm text-white/60">
            Surface your highest-priority markets and setups here.
          </p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-[rgba(8,20,43,0.9)] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">
            Signals
          </div>
          <div className="mt-2 text-xl font-semibold text-white">Coming Soon</div>
          <p className="mt-2 text-sm text-white/60">
            Connect Aurora screeners and investment workflows into this page.
          </p>
        </div>
      </div>
    </div>
  )
}
