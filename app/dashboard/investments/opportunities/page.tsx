export default function InvestmentOpportunitiesPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="text-xs uppercase tracking-[0.2em] text-cyan-300/70">
          Investments
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Opportunities
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-white/65 md:text-base">
          Review investment opportunities surfaced by Aurora filters, watchlists, and
          market workflows.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">
            Pipeline
          </div>
          <div className="mt-2 text-xl font-semibold text-white">Ready For Data</div>
          <p className="mt-2 text-sm text-white/60">
            Connect screener results here and allow one-click opening of company pages.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">
            Workflow
          </div>
          <div className="mt-2 text-xl font-semibold text-white">Ready For Linking</div>
          <p className="mt-2 text-sm text-white/60">
            From here, users can launch the calculator and create investment plans.
          </p>
        </div>
      </div>
    </div>
  )
}
