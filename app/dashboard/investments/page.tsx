"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Trading212Position = {
  instrument?: {
    ticker?: string;
    name?: string;
    currency?: string;
    isin?: string;
  };
  quantity?: number;
  currentPrice?: number;
  averagePricePaid?: number;
  walletImpact?: {
    currency?: string;
    totalCost?: number;
    currentValue?: number;
    unrealizedProfitLoss?: number;
    fxImpact?: number | null;
  };
};

function gbp(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function num(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function pct(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function cleanTicker(ticker?: string) {
  return ticker?.replace("_US_EQ", "").replace("_EQ", "") || "—";
}

function auroraScore(p: Trading212Position) {
  const pnl = num(p.walletImpact?.unrealizedProfitLoss);
  const cost = num(p.walletImpact?.totalCost);
  const current = num(p.walletImpact?.currentValue);
  const ret = cost > 0 ? (pnl / cost) * 100 : 0;
  const sizeScore = Math.min(current / 8, 40);
  const returnScore = Math.max(0, Math.min((ret + 10) * 3, 40));
  const positiveBias = pnl > 0 ? 20 : pnl < 0 ? 8 : 12;
  return Math.round(Math.max(1, Math.min(99, sizeScore + returnScore + positiveBias)));
}

function sparkBars(seed: string, positive = true) {
  const values = seed.split("").map((c, i) => {
    const code = c.charCodeAt(0);
    const v = ((code * (i + 3)) % 70) + 20;
    return v;
  });

  return values.slice(0, 12).map((v, i) => {
    const adjusted = positive
      ? Math.min(100, v + (i % 3) * 6)
      : Math.max(18, v - (i % 4) * 5);
    return adjusted;
  });
}

export default function InvestmentsPage() {
  const [positions, setPositions] = useState<Trading212Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function load(showLoader = false) {
      try {
        if (showLoader) setLoading(true);
        setError("");

        const res = await fetch("/api/trading212/positions", {
          cache: "no-store",
        });

        const json = await res.json();

        if (!mounted) return;

        if (!res.ok || !json?.ok) {
          setPositions([]);
          setError(json?.error || "Failed to load Trading 212 positions");
          return;
        }

        setPositions(Array.isArray(json.positions) ? json.positions : []);
        setLastUpdated(new Date().toLocaleTimeString("en-GB"));
      } catch (err) {
        if (!mounted) return;
        setPositions([]);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (mounted && showLoader) setLoading(false);
      }
    }

    load(true);

    const interval = setInterval(() => {
      load(false);
    }, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const enriched = useMemo(() => {
    return positions.map((p) => {
      const cost = num(p.walletImpact?.totalCost);
      const value = num(p.walletImpact?.currentValue);
      const pnl = num(p.walletImpact?.unrealizedProfitLoss);
      const ret = cost > 0 ? (pnl / cost) * 100 : 0;
      const score = auroraScore(p);

      return {
        ...p,
        cost,
        value,
        pnl,
        ret,
        score,
        ticker: cleanTicker(p.instrument?.ticker),
        name: p.instrument?.name || "—",
      };
    });
  }, [positions]);

  const summary = useMemo(() => {
    const invested = enriched.reduce((sum, p) => sum + p.cost, 0);
    const value = enriched.reduce((sum, p) => sum + p.value, 0);
    const pnl = enriched.reduce((sum, p) => sum + p.pnl, 0);
    const ret = invested > 0 ? (pnl / invested) * 100 : 0;

    return { invested, value, pnl, ret };
  }, [enriched]);

  const best = useMemo(() => {
    if (!enriched.length) return null;
    return [...enriched].sort((a, b) => b.pnl - a.pnl)[0];
  }, [enriched]);

  const worst = useMemo(() => {
    if (!enriched.length) return null;
    return [...enriched].sort((a, b) => a.pnl - b.pnl)[0];
  }, [enriched]);

  const topAllocation = useMemo(() => {
    return [...enriched]
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((p) => ({
        ...p,
        weight: summary.value > 0 ? (p.value / summary.value) * 100 : 0,
      }));
  }, [enriched, summary.value]);

  const portfolioScore = useMemo(() => {
    if (!enriched.length) return 0;
    const avg = enriched.reduce((sum, p) => sum + p.score, 0) / enriched.length;
    return Math.round(avg);
  }, [enriched]);

  const winners = enriched.filter((p) => p.pnl >= 0).length;
  const losers = enriched.filter((p) => p.pnl < 0).length;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_28%),radial-gradient(circle_at_70%_20%,_rgba(99,102,241,0.14),_transparent_30%),linear-gradient(180deg,#020617_0%,#071226_42%,#020617_100%)] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-5xl font-semibold tracking-tight">Investments</h1>
            <p className="mt-3 text-sm text-slate-300">
              Live Trading 212 portfolio intelligence with Aurora overlays.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
              Live refresh every 30s
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              Last updated: {lastUpdated || "Loading..."}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_0_60px_rgba(59,130,246,0.08)] backdrop-blur-xl">
            <div className="animate-pulse space-y-4">
              <div className="h-10 w-56 rounded bg-white/10" />
              <div className="grid gap-4 md:grid-cols-4">
                <div className="h-28 rounded-3xl bg-white/5" />
                <div className="h-28 rounded-3xl bg-white/5" />
                <div className="h-28 rounded-3xl bg-white/5" />
                <div className="h-28 rounded-3xl bg-white/5" />
              </div>
              <div className="h-96 rounded-3xl bg-white/5" />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-8 shadow-[0_0_50px_rgba(244,63,94,0.08)]">
            <h2 className="text-2xl font-semibold">Trading 212 not loading</h2>
            <p className="mt-3 text-slate-200">{error}</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_0_40px_rgba(59,130,246,0.08)] backdrop-blur-xl">
                <div className="text-sm text-slate-400">Portfolio value</div>
                <div className="mt-3 text-4xl font-semibold">{gbp(summary.value)}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                  Live valuation
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_0_40px_rgba(59,130,246,0.08)] backdrop-blur-xl">
                <div className="text-sm text-slate-400">Invested</div>
                <div className="mt-3 text-4xl font-semibold">{gbp(summary.invested)}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                  Cost basis
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(16,185,129,0.14),rgba(255,255,255,0.03))] p-6 shadow-[0_0_40px_rgba(16,185,129,0.1)] backdrop-blur-xl">
                <div className="text-sm text-slate-400">Profit / loss</div>
                <div
                  className={`mt-3 text-4xl font-semibold ${
                    summary.pnl >= 0 ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {summary.pnl >= 0 ? "+" : ""}
                  {gbp(summary.pnl)}
                </div>
                <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                  Real-time P/L
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(34,211,238,0.14),rgba(255,255,255,0.03))] p-6 shadow-[0_0_40px_rgba(34,211,238,0.08)] backdrop-blur-xl">
                <div className="text-sm text-slate-400">Return</div>
                <div
                  className={`mt-3 text-4xl font-semibold ${
                    summary.ret >= 0 ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {summary.ret >= 0 ? "+" : ""}
                  {summary.ret.toFixed(2)}%
                </div>
                <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                  Portfolio efficiency
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
              <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 shadow-[0_0_60px_rgba(59,130,246,0.08)] backdrop-blur-xl">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">Portfolio allocation</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Top weighted holdings in your live account.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                    {enriched.length} holdings
                  </div>
                </div>

                <div className="space-y-4">
                  {topAllocation.map((holding) => (
                    <div key={holding.ticker}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/dashboard/investments/${encodeURIComponent(holding.ticker)}`}
                            className="min-w-[72px] font-semibold text-cyan-300 transition hover:text-cyan-200 hover:underline"
                          >
                            {holding.ticker}
                          </Link>
                          <div className="truncate text-slate-300">{holding.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-white">{gbp(holding.value)}</div>
                          <div className="text-xs text-slate-400">
                            {holding.weight.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#3b82f6_45%,#8b5cf6_100%)] shadow-[0_0_20px_rgba(59,130,246,0.35)]"
                          style={{ width: `${Math.max(6, holding.weight)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-6">
                <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(34,211,238,0.08),rgba(255,255,255,0.02))] p-6 shadow-[0_0_60px_rgba(34,211,238,0.08)] backdrop-blur-xl">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-semibold">Aurora score</h2>
                    <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-200">
                      {portfolioScore}/99
                    </div>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#06b6d4_0%,#3b82f6_50%,#8b5cf6_100%)]"
                      style={{ width: `${portfolioScore}%` }}
                    />
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Winners
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-emerald-300">
                        {winners}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Losers
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-rose-300">
                        {losers}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Conviction
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-cyan-300">
                        {enriched.length ? "High" : "—"}
                      </div>
                    </div>
                  </div>

                  <p className="mt-5 text-sm leading-6 text-slate-400">
                    Aurora Score blends position size, return strength and portfolio quality
                    into a quick institutional-style confidence view.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <div className="rounded-3xl border border-emerald-400/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(255,255,255,0.03))] p-6 shadow-[0_0_40px_rgba(16,185,129,0.08)]">
                    <div className="text-sm text-slate-400">Best performer</div>
                    <div className="mt-3 text-2xl font-semibold text-white">
                      {best?.ticker || "—"}
                    </div>
                    <div className="mt-1 text-sm text-slate-300">{best?.name || "—"}</div>
                    <div className="mt-4 text-3xl font-semibold text-emerald-300">
                      {best ? `${best.pnl >= 0 ? "+" : ""}${gbp(best.pnl)}` : "—"}
                    </div>
                    <div className="mt-2 text-sm text-emerald-200">
                      {best ? pct(best.ret) : "—"}
                    </div>

                    <div className="mt-5 flex h-12 items-end gap-1">
                      {sparkBars(best?.ticker || "BEST", true).map((bar, i) => (
                        <div
                          key={i}
                          className="w-full rounded-t bg-emerald-300/70"
                          style={{ height: `${bar}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-rose-400/20 bg-[linear-gradient(180deg,rgba(244,63,94,0.12),rgba(255,255,255,0.03))] p-6 shadow-[0_0_40px_rgba(244,63,94,0.08)]">
                    <div className="text-sm text-slate-400">Weakest performer</div>
                    <div className="mt-3 text-2xl font-semibold text-white">
                      {worst?.ticker || "—"}
                    </div>
                    <div className="mt-1 text-sm text-slate-300">{worst?.name || "—"}</div>
                    <div className="mt-4 text-3xl font-semibold text-rose-300">
                      {worst ? `${worst.pnl >= 0 ? "+" : ""}${gbp(worst.pnl)}` : "—"}
                    </div>
                    <div className="mt-2 text-sm text-rose-200">
                      {worst ? pct(worst.ret) : "—"}
                    </div>

                    <div className="mt-5 flex h-12 items-end gap-1">
                      {sparkBars(worst?.ticker || "WORST", false).map((bar, i) => (
                        <div
                          key={i}
                          className="w-full rounded-t bg-rose-300/70"
                          style={{ height: `${bar}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-[0_0_60px_rgba(59,130,246,0.06)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                <div>
                  <h2 className="text-2xl font-semibold">Holdings terminal</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Live portfolio positions with Aurora ranking overlay.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                  Bloomberg style
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.18em] text-slate-400">
                    <tr>
                      <th className="px-6 py-4">Ticker</th>
                      <th className="px-6 py-4">Company</th>
                      <th className="px-6 py-4">Qty</th>
                      <th className="px-6 py-4">Avg Price</th>
                      <th className="px-6 py-4">Current</th>
                      <th className="px-6 py-4">Cost</th>
                      <th className="px-6 py-4">Value</th>
                      <th className="px-6 py-4">P/L</th>
                      <th className="px-6 py-4">Return</th>
                      <th className="px-6 py-4">Aurora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enriched.map((p, i) => (
                      <tr
                        key={`${p.instrument?.ticker || "holding"}-${i}`}
                        className="border-t border-white/5 transition hover:bg-cyan-400/[0.05] hover:shadow-[inset_0_0_0_1px_rgba(34,211,238,0.08)]"
                      >
                        <td className="px-6 py-4 font-semibold text-cyan-300">
                          <Link
                            href={`/dashboard/investments/${encodeURIComponent(p.ticker)}`}
                            className="transition hover:text-cyan-200 hover:underline"
                          >
                            {p.ticker}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-slate-200">{p.name}</td>
                        <td className="px-6 py-4 text-slate-300">
                          {num(p.quantity).toFixed(3)}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {num(p.averagePricePaid).toFixed(2)} {p.instrument?.currency || ""}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {num(p.currentPrice).toFixed(2)} {p.instrument?.currency || ""}
                        </td>
                        <td className="px-6 py-4 text-slate-100">{gbp(p.cost)}</td>
                        <td className="px-6 py-4 text-slate-100">{gbp(p.value)}</td>
                        <td
                          className={`px-6 py-4 font-medium ${
                            p.pnl >= 0 ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {p.pnl >= 0 ? "+" : ""}
                          {gbp(p.pnl)}
                        </td>
                        <td
                          className={`px-6 py-4 font-medium ${
                            p.ret >= 0 ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {pct(p.ret)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-white/5">
                              <div
                                className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#3b82f6_45%,#8b5cf6_100%)]"
                                style={{ width: `${p.score}%` }}
                              />
                            </div>
                            <span className="min-w-[40px] text-sm font-medium text-cyan-300">
                              {p.score}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
