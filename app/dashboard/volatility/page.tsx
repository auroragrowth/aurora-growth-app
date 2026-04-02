"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import EconomicCalendar from "@/components/tradingview/EconomicCalendar";

/* ─── Types ─── */

type VixData = {
  current: number;
  change: number;
  changePct: number;
  weekAgo: number | null;
  monthAgo: number | null;
  yearHigh: number | null;
  yearHighDate: string | null;
};

type WatchlistAlert = {
  symbol: string;
  company_name: string;
  currentPrice: number;
  step1Price: number;
  pctAway: number;
};

/* ─── VIX Zone helpers ─── */

function getVixZone(vix: number) {
  if (vix >= 30)
    return {
      label: "EXTREME",
      emoji: "\ud83d\udea8",
      color: "text-red-400",
      bg: "bg-red-500/15 border-red-500/30",
      barColor: "from-red-500 to-red-600",
      desc: "Extreme market fear. Maximum opportunity for staged ladder buying.",
    };
  if (vix >= 25)
    return {
      label: "FEAR",
      emoji: "\ud83d\udd34",
      color: "text-red-300",
      bg: "bg-red-500/10 border-red-400/25",
      barColor: "from-red-400 to-red-500",
      desc: "High fear in markets. Aurora ladder steps becoming active.",
    };
  if (vix >= 20)
    return {
      label: "ELEVATED",
      emoji: "\ud83d\udfe0",
      color: "text-orange-300",
      bg: "bg-orange-500/10 border-orange-400/25",
      barColor: "from-orange-400 to-orange-500",
      desc: "Volatility elevated. Markets becoming uncertain.",
    };
  if (vix >= 15)
    return {
      label: "CAUTION",
      emoji: "\ud83d\udfe1",
      color: "text-amber-300",
      bg: "bg-amber-500/10 border-amber-400/25",
      barColor: "from-amber-400 to-amber-500",
      desc: "Moderate volatility rising. Consider tighter position sizing.",
    };
  return {
    label: "CALM",
    emoji: "\ud83d\udfe2",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10 border-emerald-400/25",
    barColor: "from-emerald-400 to-emerald-500",
    desc: "Low volatility. Markets stable. Good conditions for ladder entries.",
  };
}

function getIntelligence(vix: number) {
  if (vix >= 30)
    return {
      title: "EXTREME market fear detected.",
      body: "Historically, VIX above 30 has preceded some of the best buying opportunities. Your Aurora ladder steps may be activating across multiple watchlist stocks. This is the environment Aurora's staged buying was designed for.",
      action: "Review active price alerts. Check entry levels on your watchlist stocks.",
      icon: "\ud83d\udea8",
    };
  if (vix >= 20)
    return {
      title: "Fear is elevated in markets.",
      body: "This is when Aurora ladder strategies become most powerful. Staged buying at current levels captures discounts that calm markets rarely offer. Market pullbacks create the entry points your ladder is waiting for.",
      action: "Review your ladder plans. Check which Step 1 levels are being approached.",
      icon: "\u26a0\ufe0f",
    };
  if (vix >= 15)
    return {
      title: "Volatility is rising above baseline.",
      body: "Markets are showing increased movement. This is a transitional zone where conditions can shift quickly. Your Aurora ladder entry levels may start coming into play if volatility continues to climb.",
      action: "Monitor your watchlist. Ensure your price alerts are active.",
      icon: "\ud83d\udfe1",
    };
  return {
    title: "Market conditions are calm.",
    body: "Volatility is low which typically means stable price action. Your Aurora ladder entries may take longer to activate. Consider wider ladder spacing in this environment. Patience is key when markets are quiet.",
    action: "Monitor your watchlist. Patience is key in low volatility environments.",
    icon: "\u2728",
  };
}

/* ─── VIX History (static data) ─── */

const VIX_HISTORY = [
  { date: "Mar 2020", vixHigh: 82.69, event: "COVID-19 crash", recovery: "+100% in 1yr" },
  { date: "Feb 2018", vixHigh: 50.3, event: "Volatility spike (XIV)", recovery: "+30% in 1yr" },
  { date: "Aug 2015", vixHigh: 40.74, event: "China market crash", recovery: "+20% in 1yr" },
  { date: "Aug 2024", vixHigh: 38.57, event: "Yen carry trade unwind", recovery: "+25% in 6mo" },
  { date: "Oct 2022", vixHigh: 34.53, event: "Rate hike fears", recovery: "+40% in 1yr" },
];

/* ─── TradingView Chart (unique ID per instance to prevent conflicts) ─── */

function TVChart({
  symbol,
  height,
  id,
  interval = "D",
  studies,
  compareSymbols,
}: {
  symbol: string;
  height: number;
  id: string;
  interval?: string;
  studies?: string[];
  compareSymbols?: { symbol: string; position: string }[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.id = `tv-${id}`;
    wrapper.className = "tradingview-widget-container";
    wrapper.style.height = `${height}px`;
    wrapper.style.width = "100%";

    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.height = `${height}px`;
    inner.style.width = "100%";
    wrapper.appendChild(inner);

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: "100%",
      height,
      symbol,
      interval,
      timezone: "America/New_York",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(2, 11, 34, 0)",
      gridColor: "rgba(255, 255, 255, 0.05)",
      isTransparent: true,
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      hide_volume: true,
      ...(studies ? { studies } : {}),
      ...(compareSymbols ? { compareSymbols } : {}),
      support_host: "https://www.tradingview.com",
    });
    wrapper.appendChild(script);
    ref.current.appendChild(wrapper);

    return () => {
      if (ref.current) ref.current.innerHTML = "";
    };
  }, [symbol, height, id, interval]);

  return (
    <div
      ref={ref}
      className="w-full overflow-hidden"
      style={{ height: `${height}px`, width: "100%" }}
    />
  );
}

/* ─── Main Page ─── */

export default function VolatilityCompassPage() {
  const [vix, setVix] = useState<VixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<WatchlistAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  /* Fetch VIX data from server-side API proxy */
  useEffect(() => {
    async function fetchVix() {
      try {
        const res = await fetch("/api/vix", { cache: "no-store" });
        const data = await res.json();

        if (!data?.ok) {
          console.error("VIX API error:", data?.error);
          return;
        }

        setVix({
          current: data.current,
          change: data.change,
          changePct: data.changePct,
          weekAgo: data.weekAgo,
          monthAgo: data.monthAgo,
          yearHigh: data.yearHigh,
          yearHighDate: data.yearHighDate,
        });
      } catch (e) {
        console.error("VIX fetch error:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchVix();
    const id = setInterval(fetchVix, 60000);
    return () => clearInterval(id);
  }, []);

  /* Fetch watchlist stocks near ladder entry */
  useEffect(() => {
    async function fetchAlerts() {
      try {
        const [wlRes, scanRes] = await Promise.all([
          fetch("/api/watchlist", { cache: "no-store" }),
          fetch("/api/aurora-market-scanner?universe=all", { cache: "no-store" }),
        ]);
        const wlData = await wlRes.json();
        const scanData = await scanRes.json();

        const items = wlData?.items || [];
        const rows = scanData?.rows || [];

        const priceMap = new Map<string, { price: number; company: string }>();
        for (const r of rows) {
          const t = String(r.ticker || "").toUpperCase();
          if (t && r.price) priceMap.set(t, { price: Number(r.price), company: r.company_name || "" });
        }

        const result: WatchlistAlert[] = [];
        for (const item of items) {
          const sym = String(item.symbol || "").toUpperCase();
          const info = priceMap.get(sym);
          if (!info || info.price <= 0) continue;

          const refPrice = info.price * 1.2;
          const step1 = refPrice * 0.9;
          const pctAway = ((info.price - step1) / step1) * 100;

          if (pctAway <= 15 && pctAway >= -5) {
            result.push({
              symbol: sym,
              company_name: item.company_name || info.company,
              currentPrice: info.price,
              step1Price: step1,
              pctAway,
            });
          }
        }

        result.sort((a, b) => a.pctAway - b.pctAway);
        setAlerts(result);
      } catch (e) {
        console.error("Alerts fetch error:", e);
      } finally {
        setAlertsLoading(false);
      }
    }

    fetchAlerts();
  }, []);

  const zone = useMemo(() => (vix ? getVixZone(vix.current) : null), [vix]);
  const intel = useMemo(
    () => (vix ? getIntelligence(vix.current) : null),
    [vix]
  );

  const gaugeWidth = useMemo(() => {
    if (!vix) return 0;
    return Math.min((vix.current / 50) * 100, 100);
  }, [vix]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="text-sm text-slate-400">Loading Volatility Compass...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ══════ SECTION 1: VIX HEADER CARD ══════ */}
      <section className="relative overflow-hidden rounded-[28px] border border-cyan-500/15 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_34%),linear-gradient(135deg,rgba(3,7,18,0.96),rgba(2,6,23,0.92))] p-6 shadow-[0_0_0_1px_rgba(14,165,233,0.04),0_20px_80px_rgba(2,6,23,0.65)] md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-3">
              <span className="text-cyan-400">{"\u2726"}</span>
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
                Volatility Compass
              </span>
              <span className="rounded-full border border-violet-400/30 bg-violet-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-300">
                Elite
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  VIX Index
                </div>
                <div className="mt-1 text-5xl font-bold tracking-tight text-white">
                  {vix?.current.toFixed(2) ?? "—"}
                </div>
              </div>

              {vix && zone && (
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${zone.bg} ${zone.color}`}
                  >
                    {zone.emoji} {zone.label}
                  </span>
                  <span
                    className={`text-sm font-medium ${vix.change >= 0 ? "text-red-300" : "text-emerald-300"}`}
                  >
                    {vix.change >= 0 ? "+" : ""}
                    {vix.change.toFixed(2)} ({vix.changePct >= 0 ? "+" : ""}
                    {vix.changePct.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>

            {zone && (
              <p className="mt-3 max-w-2xl text-sm text-slate-300">
                {zone.desc}
              </p>
            )}

            {/* Gauge bar */}
            <div className="mt-5 max-w-xl">
              <div className="relative h-4 overflow-hidden rounded-full bg-white/5">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 via-orange-500 to-red-600 transition-all duration-1000"
                  style={{ width: `${gaugeWidth}%` }}
                />
                {/* Level markers */}
                <div className="absolute inset-y-0 left-[30%] w-px bg-white/20" title="15" />
                <div className="absolute inset-y-0 left-[40%] w-px bg-white/20" title="20" />
                <div className="absolute inset-y-0 left-[50%] w-px bg-white/20" title="25" />
                <div className="absolute inset-y-0 left-[60%] w-px bg-white/30" title="30" />
                <div className="absolute inset-y-0 left-[80%] w-px bg-white/20" title="40" />
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
                <span>0</span>
                <span>15</span>
                <span>20</span>
                <span>25</span>
                <span>30</span>
                <span>40+</span>
              </div>
              <div className="mt-0.5 flex justify-between text-[10px] font-medium">
                <span className="text-emerald-400">CALM</span>
                <span className="text-amber-300">CAUTION</span>
                <span className="text-orange-300">ELEVATED</span>
                <span className="text-red-300">FEAR</span>
                <span className="text-red-400">EXTREME</span>
                <span />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ SECTION 2: VIX CHART ══════ */}
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] p-3 shadow-2xl">
        <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          VIX Index — Daily Chart
        </div>
        <TVChart symbol="CBOE:VIX" height={650} id="vix-main" interval="D" studies={["RSI@tv-basicstudies"]} />
      </section>

      {/* ══════ SECTION 3: AURORA INTELLIGENCE ══════ */}
      {intel && (
        <section className="rounded-3xl border border-cyan-500/20 bg-[#08111f] p-6">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">{"\u2726"}</span>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Aurora Intelligence
            </span>
            {vix && vix.current >= 30 && (
              <span className="ml-2 animate-pulse text-red-400">{"\ud83d\udea8"}</span>
            )}
          </div>

          <h3 className="mt-4 text-lg font-semibold text-white">
            {intel.icon} {intel.title}
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            {intel.body}
          </p>

          <div className="mt-5 rounded-2xl border border-cyan-500/15 bg-cyan-500/5 px-5 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-300/80">
              Suggested Action
            </div>
            <p className="mt-1 text-sm font-medium text-white">
              {intel.action}
            </p>
          </div>
        </section>
      )}

      {/* ══════ SECTION 4: STAT CARDS ══════ */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="VIX Today"
          value={vix?.current.toFixed(2) ?? "—"}
          sub={zone?.label ?? "—"}
          subColor={zone?.color ?? "text-slate-400"}
        />
        <StatCard
          title="VIX 1 Week Ago"
          value={vix?.weekAgo?.toFixed(2) ?? "—"}
          sub={
            vix?.weekAgo
              ? `${vix.current > vix.weekAgo ? "+" : ""}${(vix.current - vix.weekAgo).toFixed(2)} change`
              : "—"
          }
          subColor={
            vix?.weekAgo
              ? vix.current > vix.weekAgo
                ? "text-red-300"
                : "text-emerald-300"
              : "text-slate-400"
          }
        />
        <StatCard
          title="VIX 1 Month Ago"
          value={vix?.monthAgo?.toFixed(2) ?? "—"}
          sub={
            vix?.monthAgo
              ? `${vix.current > vix.monthAgo ? "+" : ""}${(vix.current - vix.monthAgo).toFixed(2)} change`
              : "—"
          }
          subColor={
            vix?.monthAgo
              ? vix.current > vix.monthAgo
                ? "text-red-300"
                : "text-emerald-300"
              : "text-slate-400"
          }
        />
        <StatCard
          title="VIX 1Y High"
          value={vix?.yearHigh?.toFixed(2) ?? "—"}
          sub={vix?.yearHighDate ?? "—"}
          subColor="text-slate-400"
        />
      </section>

      {/* ══════ SECTION 5: VIX vs S&P 500 ══════ */}
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] p-3 shadow-2xl">
        <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          VIX vs S&P 500 — Weekly Comparison
        </div>
        <TVChart symbol="CBOE:VIX" height={450} id="spx-compare" interval="W" compareSymbols={[{ symbol: "CAPITALCOM:US500", position: "SameScale" }]} />
        <p className="mt-3 px-2 text-xs text-slate-500">
          VIX (blue) typically moves opposite to S&P 500 (orange). When VIX
          spikes, markets are falling — creating Aurora ladder entry
          opportunities.
        </p>
      </section>

      {/* ══════ SECTION 6: WATCHLIST ALERTS ══════ */}
      <section className="rounded-3xl border border-cyan-500/20 bg-[#08111f] p-6">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">{"\u2726"}</span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Watchlist Ladder Alerts
          </span>
        </div>

        {alertsLoading ? (
          <p className="mt-4 text-sm text-slate-400">
            Scanning watchlist stocks...
          </p>
        ) : alerts.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            No watchlist stocks are currently near their Step 1 entry level.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm text-slate-300">
              Based on current volatility,{" "}
              <span className="font-semibold text-cyan-300">
                {alerts.length} stock{alerts.length !== 1 ? "s" : ""}
              </span>{" "}
              in your watchlist {alerts.length === 1 ? "is" : "are"} within
              range of their Step 1 entry level.
            </p>
            <div className="mt-4 space-y-2">
              {alerts.map((a) => (
                <Link
                  key={a.symbol}
                  href={`/dashboard/stocks/${a.symbol}`}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 transition hover:border-cyan-400/20 hover:bg-white/[0.05]"
                >
                  <div>
                    <span className="font-semibold text-white">
                      {a.symbol}
                    </span>
                    <span className="ml-2 text-sm text-slate-400">
                      {a.company_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-400">
                      Step 1 at ${a.step1Price.toFixed(2)}
                    </span>
                    <span className="text-slate-400">
                      Current ${a.currentPrice.toFixed(2)}
                    </span>
                    <span
                      className={`font-semibold ${a.pctAway <= 5 ? "text-amber-300" : "text-slate-300"}`}
                    >
                      {a.pctAway.toFixed(1)}% away
                      {a.pctAway <= 5 && " \u26a1"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ══════ SECTION 7: ECONOMIC CALENDAR ══════ */}
      <section className="rounded-3xl border border-white/10 bg-[#08111f] p-4">
        <div className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Upcoming Events That May Move VIX
        </div>
        <EconomicCalendar />
      </section>

      {/* ══════ SECTION 8: VIX HISTORY TABLE ══════ */}
      <section className="rounded-3xl border border-white/10 bg-[#08111f] p-6">
        <div className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Historical VIX Spikes
        </div>
        <h3 className="text-lg font-semibold text-white">
          Every Major Spike Has Led to Recovery
        </h3>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Date</th>
                <th className="px-5 py-3 text-left font-medium">VIX High</th>
                <th className="px-5 py-3 text-left font-medium">Event</th>
                <th className="px-5 py-3 text-left font-medium">
                  S&P Recovery
                </th>
              </tr>
            </thead>
            <tbody>
              {VIX_HISTORY.map((row) => (
                <tr
                  key={row.date}
                  className="border-t border-white/5 hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-3 font-medium text-white">
                    {row.date}
                  </td>
                  <td className="px-5 py-3 font-semibold text-red-300">
                    {row.vixHigh.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-slate-300">{row.event}</td>
                  <td className="px-5 py-3 font-semibold text-emerald-300">
                    {row.recovery}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Every major VIX spike has historically been followed by significant
          market recovery. Aurora's ladder system is designed to capture these
          opportunities systematically.
        </p>
      </section>
    </div>
  );
}

/* ─── Stat Card ─── */

function StatCard({
  title,
  value,
  sub,
  subColor,
}: {
  title: string;
  value: string;
  sub: string;
  subColor: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#07152f]/90 p-5 shadow-[0_0_30px_rgba(0,180,255,0.05)]">
      <div className="text-xs uppercase tracking-[0.28em] text-white/45">
        {title}
      </div>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
      <div className={`mt-2 text-sm ${subColor}`}>{sub}</div>
    </div>
  );
}
