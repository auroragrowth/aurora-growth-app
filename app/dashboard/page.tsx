import Link from "next/link";

const strategySteps = [
  {
    step: "01",
    title: "Find quality first",
    text: "Aurora scans for stronger businesses with better fundamentals, profitability, returns and institutional quality so weaker names are filtered out early.",
  },
  {
    step: "02",
    title: "Enter in stages",
    text: "Rather than buying all at once, Aurora is built around staged entries so you can plan buy-in points and improve your blended average price with structure.",
  },
  {
    step: "03",
    title: "Plan profit before emotion",
    text: "Aurora helps you map profit levels in advance so you can see target prices and potential cash returns before making a decision.",
  },
];

const dashboardFeatures = [
  {
    title: "Live market scanner",
    text: "See quality-growth stocks that match the Aurora filtering model.",
    href: "/dashboard/market-scanner",
    cta: "Open scanner",
  },
  {
    title: "Watchlist",
    text: "Save and track the stocks you want to monitor more closely.",
    href: "/dashboard/watchlist",
    cta: "View watchlist",
  },
  {
    title: "Investment calculator",
    text: "Plan staged entries, blended averages and structured profit levels.",
    href: "/dashboard/investments/calculator",
    cta: "Open calculator",
  },
  {
    title: "Chart analysis",
    text: "Review price structure and line up buying zones with more confidence.",
    href: "/dashboard/chart",
    cta: "Open charts",
  },
];

const gettingStarted = [
  "Review the live scanner to spot quality-growth opportunities.",
  "Save the strongest ideas to your watchlist.",
  "Open a stock in the calculator and plan your staged entry points.",
  "Use the chart page to review structure and levels visually.",
  "Map profit targets before entering so your plan is already clear.",
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 md:px-8 lg:px-10">
        <section className="overflow-hidden rounded-[28px] border border-cyan-500/15 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_34%),linear-gradient(135deg,rgba(3,7,18,0.96),rgba(2,6,23,0.92))] shadow-[0_0_0_1px_rgba(14,165,233,0.04),0_20px_80px_rgba(2,6,23,0.65)]">
          <div className="grid gap-8 px-6 py-8 md:px-8 md:py-10 lg:grid-cols-[1.35fr_0.85fr] lg:px-10">
            <div className="flex flex-col justify-center">
              <div className="mb-4 inline-flex w-fit items-center rounded-full border border-cyan-400/25 bg-cyan-500/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-300">
                Welcome to Aurora
              </div>

              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
                Invest with more clarity, more structure, and less emotion.
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
                Aurora Growth is built to help you discover stronger quality-growth
                opportunities, plan staged entries, calculate blended average prices,
                and map profit targets before you commit capital.
              </p>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400 md:text-base">
                The aim is simple: reduce guesswork, improve discipline, and give
                you a repeatable framework for how to review opportunities across
                the market.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/dashboard/market-scanner"
                  className="inline-flex items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/15 px-5 py-3 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300/50 hover:bg-cyan-500/20"
                >
                  Open Market Scanner
                </Link>

                <Link
                  href="/dashboard/investments/calculator"
                  className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/80"
                >
                  Open Calculator
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[24px] border border-cyan-500/15 bg-slate-950/50 p-5 backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.35em] text-slate-500">
                  Aurora framework
                </div>
                <div className="mt-3 text-2xl font-semibold text-white">
                  Quality → Structure → Discipline
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  Aurora helps you move from spotting stronger stocks to building a
                  proper staged entry and profit plan with a clearer process.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="rounded-[22px] border border-slate-800 bg-slate-950/50 p-5">
                  <div className="text-[11px] uppercase tracking-[0.35em] text-slate-500">
                    Focus
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-white">
                    Quality
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    Filter for stronger companies.
                  </p>
                </div>

                <div className="rounded-[22px] border border-slate-800 bg-slate-950/50 p-5">
                  <div className="text-[11px] uppercase tracking-[0.35em] text-slate-500">
                    Method
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-white">
                    Staged
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    Build entries with structure.
                  </p>
                </div>

                <div className="rounded-[22px] border border-slate-800 bg-slate-950/50 p-5">
                  <div className="text-[11px] uppercase tracking-[0.35em] text-slate-500">
                    Outcome
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-white">
                    Clarity
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    Plan profit before emotion.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-cyan-500/10 bg-[linear-gradient(180deg,rgba(8,15,35,0.95),rgba(2,6,23,0.98))] p-6 shadow-[0_10px_40px_rgba(2,6,23,0.45)] md:p-8">
            <div className="text-[11px] uppercase tracking-[0.35em] text-cyan-300/80">
              How the strategy works
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              The Aurora investment process
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
              Aurora is designed to help you focus on better opportunities, build
              positions more carefully, and define your next steps before emotion
              gets involved.
            </p>

            <div className="mt-8 space-y-4">
              {strategySteps.map((item) => (
                <div
                  key={item.step}
                  className="rounded-[22px] border border-slate-800 bg-slate-950/50 p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-500/10 text-sm font-semibold text-cyan-300">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-slate-400 md:text-base">
                        {item.text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-cyan-500/10 bg-[linear-gradient(180deg,rgba(8,15,35,0.95),rgba(2,6,23,0.98))] p-6 shadow-[0_10px_40px_rgba(2,6,23,0.45)] md:p-8">
            <div className="text-[11px] uppercase tracking-[0.35em] text-cyan-300/80">
              What the dashboard gives you
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Your Aurora tools
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-400 md:text-base">
              Every area of the dashboard is designed to help you move from idea
              to plan with more control.
            </p>

            <div className="mt-8 grid gap-4">
              {dashboardFeatures.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-[22px] border border-slate-800 bg-slate-950/50 p-5"
                >
                  <h3 className="text-lg font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-400 md:text-base">
                    {feature.text}
                  </p>
                  <Link
                    href={feature.href}
                    className="mt-4 inline-flex items-center text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
                  >
                    {feature.cta} →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-cyan-500/10 bg-[linear-gradient(180deg,rgba(8,15,35,0.95),rgba(2,6,23,0.98))] p-6 shadow-[0_10px_40px_rgba(2,6,23,0.45)] md:p-8">
            <div className="text-[11px] uppercase tracking-[0.35em] text-cyan-300/80">
              Why it matters
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Turn guesswork into a process
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-400 md:text-base">
              Many investors struggle because they buy too early, buy too much at
              once, or take decisions without a proper plan. Aurora is built to
              reduce that.
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-400 md:text-base">
              By combining a filtered scanner, watchlist tools, staged entry
              planning and profit mapping, the dashboard helps you build a more
              repeatable investment framework.
            </p>

            <div className="mt-6 rounded-[22px] border border-cyan-500/15 bg-cyan-500/10 p-5">
              <div className="text-sm font-semibold text-cyan-200">
                Aurora process
              </div>
              <p className="mt-2 text-sm leading-7 text-cyan-50/90">
                Identify quality → review structure → plan entries → calculate
                average price → set targets → act with discipline.
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-cyan-500/10 bg-[linear-gradient(180deg,rgba(8,15,35,0.95),rgba(2,6,23,0.98))] p-6 shadow-[0_10px_40px_rgba(2,6,23,0.45)] md:p-8">
            <div className="text-[11px] uppercase tracking-[0.35em] text-cyan-300/80">
              Getting started
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Start here
            </h2>

            <div className="mt-8 space-y-4">
              {gettingStarted.map((item, index) => (
                <div
                  key={item}
                  className="flex gap-4 rounded-[20px] border border-slate-800 bg-slate-950/50 p-4"
                >
                  <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-500/10 text-sm font-semibold text-cyan-300">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-7 text-slate-300 md:text-base">
                    {item}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard/market-scanner"
                className="inline-flex items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/15 px-5 py-3 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300/50 hover:bg-cyan-500/20"
              >
                Go to Scanner
              </Link>

              <Link
                href="/dashboard/watchlist"
                className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/80"
              >
                Go to Watchlist
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
