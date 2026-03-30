import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MarketCountdown from "@/components/dashboard/MarketCountdown";

type ScannerRow = {
  ticker?: string;
  company_name?: string;
  score?: number;
  price?: number;
  change_percent?: number;
};

function formatPrice(v?: number | null) {
  if (typeof v !== "number") return "—";
  return `$${v.toFixed(2)}`;
}

function formatPct(v?: number | null) {
  if (typeof v !== "number") return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch profile (including full_name for greeting)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, plan, plan_key, subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  const profileName = profile?.full_name;
  const firstName = profileName
    ? profileName.split(" ")[0]
    : (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
      (user.user_metadata?.name as string | undefined)?.split(" ")[0] ||
      user.email?.split("@")[0] ||
      "there";

  const plan = profile?.plan_key ?? profile?.plan ?? "free";
  const planLabel =
    plan === "elite" ? "Aurora Elite" :
    plan === "pro" ? "Aurora Pro" :
    plan === "core" ? "Aurora Core" : "Free";

  // Watchlist count
  const { count: watchlistCount } = await supabase
    .from("watchlist_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Top 3 scanner stocks
  let topStocks: ScannerRow[] = [];
  try {
    const { data: scannerData } = await supabase
      .from("scanner_results")
      .select("ticker, company_name, score, price, change_percent")
      .order("score", { ascending: false, nullsFirst: false })
      .limit(3);
    topStocks = (scannerData || []) as ScannerRow[];
  } catch { /* ignore */ }

  return (
    <main className="text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 md:px-8 lg:px-10">
        <MarketCountdown />

        {/* Welcome hero */}
        <section className="overflow-hidden rounded-[28px] border border-cyan-500/15 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_34%),linear-gradient(135deg,rgba(3,7,18,0.96),rgba(2,6,23,0.92))] shadow-[0_0_0_1px_rgba(14,165,233,0.04),0_20px_80px_rgba(2,6,23,0.65)] p-6 md:p-8">
          <div className="mb-4 inline-flex w-fit items-center rounded-full border border-cyan-400/25 bg-cyan-500/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-300">
            Dashboard
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Welcome back, {firstName}
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
            Invest with more clarity, more structure, and less emotion. Here is your Aurora overview.
          </p>
        </section>

        {/* Quick stats */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-cyan-500/20 bg-[#07152f]/90 p-5 shadow-[0_0_30px_rgba(0,180,255,0.08)]">
            <div className="text-xs uppercase tracking-[0.28em] text-white/45">Active Plan</div>
            <div className="mt-3 text-2xl font-semibold text-cyan-300">{planLabel}</div>
            <div className="mt-2 text-sm text-white/55">
              {profile?.subscription_status === "active" ? "Active" : profile?.subscription_status === "trialing" ? "Trial" : "Inactive"}
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-400/20 bg-[#07152f]/90 p-5 shadow-[0_0_30px_rgba(16,185,129,0.08)]">
            <div className="text-xs uppercase tracking-[0.28em] text-white/45">Watchlist</div>
            <div className="mt-3 text-2xl font-semibold text-emerald-300">{watchlistCount ?? 0}</div>
            <div className="mt-2 text-sm text-white/55">Stocks tracked</div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#07152f]/90 p-5">
            <div className="text-xs uppercase tracking-[0.28em] text-white/45">Market</div>
            <div className="mt-3 text-2xl font-semibold text-white">Open</div>
            <div className="mt-2 text-sm text-white/55">US equities</div>
          </div>
        </section>

        {/* Top scanner stocks + quick links */}
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          {/* Top 3 scanner stocks */}
          <section className="rounded-[28px] border border-cyan-500/10 bg-[linear-gradient(180deg,rgba(8,15,35,0.95),rgba(2,6,23,0.98))] p-6 shadow-[0_10px_40px_rgba(2,6,23,0.45)]">
            <div className="text-[11px] uppercase tracking-[0.35em] text-cyan-300/80">Top Scanner Picks</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Highest Scored Stocks</h2>

            <div className="mt-5 space-y-3">
              {topStocks.length === 0 ? (
                <div className="text-sm text-slate-400">No scanner data available yet.</div>
              ) : (
                topStocks.map((stock, i) => (
                  <Link
                    key={stock.ticker || i}
                    href={`/dashboard/stocks/${encodeURIComponent(stock.ticker || "")}`}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 p-4 transition hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-500/10 text-sm font-semibold text-cyan-300">
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{stock.ticker}</div>
                        <div className="text-sm text-slate-400">{stock.company_name || "—"}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-white/70">Score: <span className="font-semibold text-cyan-300">{stock.score ?? "—"}</span></div>
                      <div className="text-sm text-white/50">{formatPrice(stock.price)} <span className={`${(stock.change_percent ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{formatPct(stock.change_percent)}</span></div>
                    </div>
                  </Link>
                ))
              )}
            </div>

            <div className="mt-5">
              <Link href="/dashboard/market-scanner" className="text-sm font-semibold text-cyan-300 transition hover:text-cyan-200">
                View full scanner →
              </Link>
            </div>
          </section>

          {/* Quick links */}
          <section className="rounded-[28px] border border-cyan-500/10 bg-[linear-gradient(180deg,rgba(8,15,35,0.95),rgba(2,6,23,0.98))] p-6">
            <div className="text-[11px] uppercase tracking-[0.35em] text-cyan-300/80">Quick Links</div>
            <div className="mt-4 space-y-2">
              {[
                { label: "Market Scanner", href: "/dashboard/market-scanner" },
                { label: "Investment Calculator", href: "/dashboard/investments/calculator" },
                { label: "Watchlist", href: "/dashboard/watchlist" },
                { label: "Chart Analysis", href: "/dashboard/stocks/USLM" },
                { label: "Volatility Compass", href: "/dashboard/volatility-compass" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/[0.04] hover:text-white"
                >
                  {link.label}
                  <span className="text-white/30">→</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
