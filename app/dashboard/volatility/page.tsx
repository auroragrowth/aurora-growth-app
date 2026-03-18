"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type VolatilityRow = {
  symbol: string;
  company_name?: string;
  sector?: string;
  price: number;
  change_pct: number;
  volatility: number;
  atr?: number;
  score?: number;
  trend?: "Bullish" | "Bearish" | "Neutral";
};

type ApiResponse = {
  ok: boolean;
  rows: VolatilityRow[];
  updatedAt?: string;
  source?: string;
};

function formatPct(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 2 : 2,
  }).format(value);
}

function getVolBand(vol: number) {
  if (vol >= 6) return "Extreme";
  if (vol >= 4) return "High";
  if (vol >= 2.5) return "Elevated";
  return "Normal";
}

function getVolBandClass(vol: number) {
  if (vol >= 6) {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }
  if (vol >= 4) {
    return "border-orange-400/40 bg-orange-400/10 text-orange-300";
  }
  if (vol >= 2.5) {
    return "border-yellow-400/40 bg-yellow-400/10 text-yellow-300";
  }
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
}

function getTrendClass(trend?: string) {
  if (trend === "Bullish") return "text-emerald-300";
  if (trend === "Bearish") return "text-red-300";
  return "text-slate-300";
}

function getRiskRegime(avgVol: number) {
  if (avgVol >= 5) {
    return {
      label: "High Risk Regime",
      tone: "text-red-300",
      box: "border-red-500/30 bg-red-500/10",
      sub: "Fast markets. Wider ranges. Higher opportunity and higher risk.",
    };
  }
  if (avgVol >= 3) {
    return {
      label: "Active Opportunity Regime",
      tone: "text-orange-300",
      box: "border-orange-500/30 bg-orange-500/10",
      sub: "Healthy movement for ladder entries and momentum setups.",
    };
  }
  return {
    label: "Stable Regime",
    tone: "text-emerald-300",
    box: "border-emerald-500/30 bg-emerald-500/10",
    sub: "Lower movement. Fewer explosive setups. Focus on quality.",
  };
}

export default function VolatilityPage() {
  const [rows, setRows] = useState<VolatilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [source, setSource] = useState<string>("Aurora Volatility Engine");
  const [lastRefreshLabel, setLastRefreshLabel] = useState<string>("");

  async function loadData(silent = false) {
    try {
      if (!silent) setLoading(true);
      const res = await fetch("/api/volatility", { cache: "no-store" });
      const data: ApiResponse = await res.json();

      if (data?.ok) {
        setRows(Array.isArray(data.rows) ? data.rows : []);
        setUpdatedAt(data.updatedAt || new Date().toISOString());
        setSource(data.source || "Aurora Volatility Engine");
        setLastRefreshLabel(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error("Failed to load volatility data", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const avgVol =
      total > 0
        ? rows.reduce((sum, row) => sum + Number(row.volatility || 0), 0) / total
        : 0;

    const avgMove =
      total > 0
        ? rows.reduce((sum, row) => sum + Math.abs(Number(row.change_pct || 0)), 0) / total
        : 0;

    const highOpportunity = rows.filter((r) => Number(r.volatility) >= 4).length;
    const bullish = rows.filter((r) => r.trend === "Bullish").length;
    const bearish = rows.filter((r) => r.trend === "Bearish").length;

    const sortedByMove = [...rows].sort(
      (a, b) => Math.abs(Number(b.change_pct || 0)) - Math.abs(Number(a.change_pct || 0))
    );

    const sortedByVol = [...rows].sort(
      (a, b) => Number(b.volatility || 0) - Number(a.volatility || 0)
    );

    const best = [...rows].sort((a, b) => Number(b.change_pct || 0) - Number(a.change_pct || 0))[0];
    const worst = [...rows].sort((a, b) => Number(a.change_pct || 0) - Number(b.change_pct || 0))[0];

    return {
      total,
      avgVol,
      avgMove,
      highOpportunity,
      bullish,
      bearish,
      mostActive: sortedByMove.slice(0, 6),
      hottest: sortedByVol.slice(0, 6),
      best,
      worst,
    };
  }, [rows]);

  const regime = getRiskRegime(stats.avgVol);

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto w-full max-w-[1700px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.20),transparent_28%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
                Aurora Terminal
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Volatility Intelligence
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300 sm:text-base">
                Institutional-style market volatility board for scanning movement, risk regime,
                opportunity clusters, and ladder-ready setups.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  Source: {source}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  Updated: {updatedAt ? new Date(updatedAt).toLocaleString() : "—"}
                </span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-300">
                  Live refresh: 30s
                </span>
              </div>
            </div>

            <div className={`min-w-[320px] rounded-2xl border p-4 ${regime.box}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                    Market Regime
                  </p>
                  <p className={`mt-1 text-xl font-semibold ${regime.tone}`}>
                    {regime.label}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {regime.sub}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                    Avg Vol
                  </p>
                  <p className="text-2xl font-semibold text-white">
                    {stats.avgVol.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard
            title="Tracked"
            value={String(stats.total)}
            sub="Symbols in board"
            glow="cyan"
          />
          <MetricCard
            title="Avg Move"
            value={`${stats.avgMove.toFixed(2)}%`}
            sub="Abs daily move"
            glow="blue"
          />
          <MetricCard
            title="High Opportunity"
            value={String(stats.highOpportunity)}
            sub="Volatility > 4%"
            glow="violet"
          />
          <MetricCard
            title="Bullish"
            value={String(stats.bullish)}
            sub="Trend bias"
            glow="emerald"
          />
          <MetricCard
            title="Bearish"
            value={String(stats.bearish)}
            sub="Trend bias"
            glow="red"
          />
          <MetricCard
            title="Last Refresh"
            value={lastRefreshLabel || "—"}
            sub="Auto-updating"
            glow="amber"
          />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.9fr_0.9fr]">
          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.38)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Volatility Board</h2>
                <p className="text-sm text-slate-400">
                  Ranked scan of symbols with movement, trend, and volatility state.
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
                Bloomberg-style board
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/[0.04] text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Ticker</th>
                      <th className="px-4 py-3 text-left font-medium">Company</th>
                      <th className="px-4 py-3 text-left font-medium">Sector</th>
                      <th className="px-4 py-3 text-left font-medium">Price</th>
                      <th className="px-4 py-3 text-left font-medium">Change</th>
                      <th className="px-4 py-3 text-left font-medium">Volatility</th>
                      <th className="px-4 py-3 text-left font-medium">Band</th>
                      <th className="px-4 py-3 text-left font-medium">Trend</th>
                      <th className="px-4 py-3 text-left font-medium">Score</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                          Loading volatility board...
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                          No volatility data available.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => {
                        const positive = Number(row.change_pct || 0) >= 0;
                        const score = Number(row.score || 0);
                        return (
                          <tr
                            key={row.symbol}
                            className="group border-t border-white/5 transition duration-200 hover:bg-cyan-400/[0.05] hover:shadow-[inset_0_0_0_1px_rgba(34,211,238,0.12)]"
                          >
                            <td className="px-4 py-3">
                              <Link
                                href={`/dashboard/investments/calculator?ticker=${encodeURIComponent(row.symbol)}`}
                                className="font-semibold tracking-wide text-white transition group-hover:text-cyan-300"
                              >
                                {row.symbol}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                              {row.company_name || "—"}
                            </td>
                            <td className="px-4 py-3 text-slate-400">
                              {row.sector || "—"}
                            </td>
                            <td className="px-4 py-3 text-white">
                              {formatMoney(Number(row.price || 0))}
                            </td>
                            <td
                              className={`px-4 py-3 font-medium ${
                                positive ? "text-emerald-300" : "text-red-300"
                              }`}
                            >
                              {formatPct(Number(row.change_pct || 0))}
                            </td>
                            <td className="px-4 py-3 text-cyan-300">
                              {Number(row.volatility || 0).toFixed(2)}%
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getVolBandClass(
                                  Number(row.volatility || 0)
                                )}`}
                              >
                                {getVolBand(Number(row.volatility || 0))}
                              </span>
                            </td>
                            <td className={`px-4 py-3 ${getTrendClass(row.trend)}`}>
                              {row.trend || "Neutral"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500"
                                    style={{ width: `${Math.max(4, Math.min(score, 100))}%` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-300">{score}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <PanelCard
              title="Best Performer"
              subtitle="Top gainer in current board"
            >
              {stats.best ? (
                <FeaturedMover row={stats.best} positive />
              ) : (
                <EmptyState />
              )}
            </PanelCard>

            <PanelCard
              title="Worst Performer"
              subtitle="Biggest drawdown in current board"
            >
              {stats.worst ? (
                <FeaturedMover row={stats.worst} positive={false} />
              ) : (
                <EmptyState />
              )}
            </PanelCard>

            <PanelCard
              title="Most Active Movers"
              subtitle="Largest percentage moves"
            >
              <CompactList rows={stats.mostActive} />
            </PanelCard>
          </div>

          <div className="space-y-6">
            <PanelCard
              title="Hottest Volatility"
              subtitle="Most explosive opportunity set"
            >
              <CompactVolList rows={stats.hottest} />
            </PanelCard>

            <PanelCard
              title="Aurora Notes"
              subtitle="How to use this board"
            >
              <div className="space-y-3 text-sm text-slate-300">
                <p>
                  Focus first on <span className="text-cyan-300">High</span> and{" "}
                  <span className="text-red-300">Extreme</span> volatility names for
                  fast-moving ladder opportunities.
                </p>
                <p>
                  Use the trend column to separate momentum continuation from noisy
                  mean-reversion conditions.
                </p>
                <p>
                  Click any ticker to move into the investment calculator and turn the
                  setup into an Aurora ladder plan.
                </p>
              </div>
            </PanelCard>

            <PanelCard
              title="Terminal Status"
              subtitle="System snapshot"
            >
              <div className="grid grid-cols-2 gap-3 text-sm">
                <StatusPill label="Feed" value="Live" tone="emerald" />
                <StatusPill label="Engine" value="Online" tone="cyan" />
                <StatusPill label="Refresh" value="30 sec" tone="violet" />
                <StatusPill label="Mode" value="Scanner" tone="amber" />
              </div>
            </PanelCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  sub,
  glow,
}: {
  title: string;
  value: string;
  sub: string;
  glow: "cyan" | "blue" | "violet" | "emerald" | "red" | "amber";
}) {
  const glowMap: Record<string, string> = {
    cyan: "from-cyan-500/20 to-cyan-400/5",
    blue: "from-blue-500/20 to-blue-400/5",
    violet: "from-violet-500/20 to-violet-400/5",
    emerald: "from-emerald-500/20 to-emerald-400/5",
    red: "from-red-500/20 to-red-400/5",
    amber: "from-amber-500/20 to-amber-400/5",
  };

  return (
    <div className={`rounded-[22px] border border-white/10 bg-gradient-to-br ${glowMap[glow]} p-4 shadow-[0_14px_40px_rgba(0,0,0,0.30)]`}>
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{sub}</p>
    </div>
  );
}

function PanelCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.38)]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function FeaturedMover({
  row,
  positive,
}: {
  row: VolatilityRow;
  positive: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xl font-semibold text-white">{row.symbol}</p>
          <p className="mt-1 text-sm text-slate-400">{row.company_name || "—"}</p>
          <p className="mt-3 text-sm text-slate-400">{row.sector || "—"}</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-semibold ${positive ? "text-emerald-300" : "text-red-300"}`}>
            {formatPct(Number(row.change_pct || 0))}
          </p>
          <p className="mt-1 text-sm text-cyan-300">
            Vol {Number(row.volatility || 0).toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
}

function CompactList({ rows }: { rows: VolatilityRow[] }) {
  if (!rows.length) return <EmptyState />;

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const positive = Number(row.change_pct || 0) >= 0;
        return (
          <div
            key={row.symbol}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <div>
              <p className="font-semibold text-white">{row.symbol}</p>
              <p className="text-xs text-slate-400">{row.company_name || "—"}</p>
            </div>
            <div className="text-right">
              <p className={positive ? "font-medium text-emerald-300" : "font-medium text-red-300"}>
                {formatPct(Number(row.change_pct || 0))}
              </p>
              <p className="text-xs text-slate-400">
                {formatMoney(Number(row.price || 0))}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CompactVolList({ rows }: { rows: VolatilityRow[] }) {
  if (!rows.length) return <EmptyState />;

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.symbol}
          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-white">{row.symbol}</p>
              <p className="text-xs text-slate-400">{row.company_name || "—"}</p>
            </div>
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getVolBandClass(
                Number(row.volatility || 0)
              )}`}
            >
              {getVolBand(Number(row.volatility || 0))}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500"
                style={{ width: `${Math.max(6, Math.min(Number(row.volatility || 0) * 12, 100))}%` }}
              />
            </div>
            <div className="min-w-[58px] text-right text-sm font-medium text-cyan-300">
              {Number(row.volatility || 0).toFixed(2)}%
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "cyan" | "violet" | "amber";
}) {
  const map: Record<string, string> = {
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
    violet: "border-violet-500/30 bg-violet-500/10 text-violet-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  };

  return (
    <div className={`rounded-2xl border px-3 py-3 ${map[tone]}`}>
      <p className="text-[11px] uppercase tracking-[0.2em] opacity-80">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-500">
      No data available.
    </div>
  );
}
