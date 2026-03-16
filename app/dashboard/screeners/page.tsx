export default function ScreenersPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="text-xs uppercase tracking-[0.2em] text-cyan-300/70">
          Screeners
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Screeners
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-white/65 md:text-base">
          Run Aurora stock screens, review filtered ideas, and open opportunities
          directly from here.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">Screener Status</h2>
        <p className="mt-3 text-sm text-white/60">
          This page is ready for your Finviz and Aurora filtering engine. Next step is
          wiring in live data and results tables.
        </p>
      </div>
    </div>
  )
}
