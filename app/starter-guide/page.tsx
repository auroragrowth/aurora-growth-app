import Link from "next/link";
import Image from "next/image";
import {
  ScanSearch,
  Star,
  Calculator,
  Bell,
  Layers,
  TrendingUp,
  ShieldCheck,
  MessageCircle,
  ArrowRight,
} from "lucide-react";

export default function StarterGuidePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020817] text-white">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_right,rgba(139,92,246,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.10),transparent_35%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-12 sm:py-16">
        {/* Header with logo */}
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 h-28 w-28 translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-violet-500/20 blur-2xl" />
            <Image
              src="/aurora-logo.png"
              alt="Aurora Growth"
              width={190}
              height={48}
              priority
              className="relative h-auto w-auto"
            />
          </div>

          <h1 className="bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400 bg-clip-text text-4xl font-extrabold text-transparent sm:text-5xl">
            Aurora Growth Starter Guide
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/60">
            Everything you need to know to get started with Aurora — from scanning stocks to building your first investment ladder.
          </p>
        </div>

        {/* Section 1: How Aurora Works */}
        <section className="mb-10 rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          <h2 className="mb-8 text-center text-2xl font-bold text-white sm:text-3xl">
            How Aurora Works
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">
            {[
              {
                icon: ScanSearch,
                step: "1",
                title: "Scanner",
                description:
                  "Aurora scans the market daily and scores stocks based on momentum, fundamentals, and technical signals — so you don't have to.",
                color: "from-cyan-400 to-cyan-600",
              },
              {
                icon: Star,
                step: "2",
                title: "Watchlist",
                description:
                  "Add the stocks that interest you to your personal watchlist to track them over time and monitor key changes.",
                color: "from-blue-400 to-blue-600",
              },
              {
                icon: Calculator,
                step: "3",
                title: "Calculator",
                description:
                  "Use the investment ladder calculator to plan your entry points and position sizes before committing any capital.",
                color: "from-violet-400 to-violet-600",
              },
              {
                icon: Bell,
                step: "4",
                title: "Alerts",
                description:
                  "Set price and entry-level alerts so you never miss a buying opportunity — delivered straight to Telegram.",
                color: "from-fuchsia-400 to-fuchsia-600",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                <div className="mb-4 flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} shadow-lg`}
                  >
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-white/40">
                      Step {item.step}
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      {item.title}
                    </h3>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-white/60">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Understanding the Aurora Scanner */}
        <section className="mb-10 rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          <h2 className="mb-8 text-center text-2xl font-bold text-white sm:text-3xl">
            Understanding the Aurora Scanner
          </h2>

          <div className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="mb-3 flex items-center gap-3 text-lg font-bold text-white">
                <Layers className="h-5 w-5 text-cyan-400" />
                Core &amp; Alternative Lists
              </h3>
              <p className="text-sm leading-relaxed text-white/60">
                The Aurora scanner produces two lists each day. The{" "}
                <span className="font-semibold text-cyan-400">Core list</span>{" "}
                contains stocks that meet Aurora&apos;s strictest criteria — strong
                momentum, solid fundamentals, and clear technical setups. The{" "}
                <span className="font-semibold text-violet-400">
                  Alternative list
                </span>{" "}
                includes stocks that show potential but may carry higher
                volatility or less confirmed signals. Both lists are refreshed
                regularly to keep your universe current.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="mb-3 flex items-center gap-3 text-lg font-bold text-white">
                <TrendingUp className="h-5 w-5 text-cyan-400" />
                The Aurora Score
              </h3>
              <p className="text-sm leading-relaxed text-white/60">
                Every stock on the scanner is given an{" "}
                <span className="font-semibold text-cyan-400">
                  Aurora score out of 30
                </span>
                . This score combines momentum strength, fundamental quality, and
                technical positioning into a single number. Higher scores
                indicate stocks that align most closely with Aurora&apos;s criteria.
                Use the score as a starting point for your own research — not as a
                buy signal on its own.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="mb-3 flex items-center gap-3 text-lg font-bold text-white">
                <Star className="h-5 w-5 text-cyan-400" />
                Momentum Badges
              </h3>
              <p className="text-sm leading-relaxed text-white/60">
                Stocks on the scanner may display momentum badges that give you a
                quick visual read on their trend. These badges highlight whether a
                stock is showing{" "}
                <span className="font-semibold text-emerald-400">
                  strong upward momentum
                </span>
                ,{" "}
                <span className="font-semibold text-amber-400">
                  neutral consolidation
                </span>
                , or{" "}
                <span className="font-semibold text-red-400">
                  weakening signals
                </span>
                . They&apos;re designed to help you triage the list quickly so you can
                focus your time on the most promising setups.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Building Your First Investment Ladder */}
        <section className="mb-10 rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          <h2 className="mb-8 text-center text-2xl font-bold text-white sm:text-3xl">
            Building Your First Investment Ladder
          </h2>

          <div className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="mb-3 text-lg font-bold text-white">
                What is a Reference Price?
              </h3>
              <p className="text-sm leading-relaxed text-white/60">
                The reference price is the starting point for your investment
                ladder. It&apos;s typically set at or near the stock&apos;s current price
                when you begin planning your position. Aurora uses this price as
                the anchor from which your ladder steps are calculated — each
                step below represents a progressively better entry point.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="mb-3 text-lg font-bold text-white">
                How Ladder Steps Work
              </h3>
              <p className="text-sm leading-relaxed text-white/60">
                An investment ladder breaks your total intended position into
                multiple buy levels spaced below the reference price. Instead of
                going all-in at one price, you set a series of steps — for
                example, at 5%, 10%, and 15% below your reference price. If the
                stock drops to each level, you buy a pre-planned amount at that
                step. If it doesn&apos;t drop, you haven&apos;t overcommitted.
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] p-6">
              <h3 className="mb-3 flex items-center gap-3 text-lg font-bold text-white">
                <ShieldCheck className="h-5 w-5 text-cyan-400" />
                Why Staged Buying Reduces Risk
              </h3>
              <p className="text-sm leading-relaxed text-white/60">
                Staged buying means you&apos;re never fully exposed at the worst
                possible price. If the stock falls further, your later steps
                bring your average cost down. If it reverses early, you&apos;ve still
                entered at a reasonable level. This approach helps manage
                volatility, reduces emotional decision-making, and ensures you
                always have capital in reserve.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Setting Up Alerts */}
        <section className="mb-10 rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          <h2 className="mb-8 text-center text-2xl font-bold text-white sm:text-3xl">
            Setting Up Alerts
          </h2>

          <div className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="mb-3 flex items-center gap-3 text-lg font-bold text-white">
                <Bell className="h-5 w-5 text-cyan-400" />
                Price Alerts
              </h3>
              <p className="text-sm leading-relaxed text-white/60">
                Price alerts let you set a target price for any stock on your
                watchlist. When the stock reaches your target, Aurora notifies
                you instantly — so you can act on your plan without constantly
                watching the market. Set alerts at each of your ladder steps to
                stay informed as opportunities appear.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="mb-3 flex items-center gap-3 text-lg font-bold text-white">
                <MessageCircle className="h-5 w-5 text-cyan-400" />
                Telegram Alerts
              </h3>
              <p className="text-sm leading-relaxed text-white/60">
                Aurora can send alerts directly to your Telegram account for
                real-time notifications on your phone or desktop. Once connected,
                you&apos;ll receive price alerts, entry-level triggers, and watchlist
                updates wherever you are — no need to keep the Aurora dashboard
                open.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="mb-3 text-lg font-bold text-white">
                Entry Level Alerts
              </h3>
              <p className="text-sm leading-relaxed text-white/60">
                Entry level alerts are tied to the specific ladder steps you&apos;ve
                configured in the calculator. When a stock&apos;s price reaches one
                of your planned entry levels, you&apos;ll be alerted automatically.
                This keeps your buying plan on track and removes the guesswork
                from timing your entries.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Getting Started */}
        <section className="mb-10 rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="text-center">
            <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl">
              Getting Started
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-white/60">
              Ready to take control of your investment research? Create your free
              Aurora account and start exploring the scanner, watchlists, and
              calculator today.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#3b82f6_50%,#d946ef_100%)] px-8 py-4 text-lg font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.25)] transition hover:shadow-[0_0_40px_rgba(34,211,238,0.4)]"
              >
                Create Account
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-4 text-lg font-semibold text-white transition hover:bg-white/10"
              >
                Log In
              </Link>
            </div>
          </div>
        </section>

        {/* Footer note */}
        <p className="text-center text-xs text-white/30">
          Aurora Growth is an educational tool and does not provide financial
          advice. Always do your own research before making investment decisions.
        </p>
      </div>
    </main>
  );
}
