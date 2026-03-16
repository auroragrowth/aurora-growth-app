"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import WatchlistStar from "@/components/watchlist/WatchlistStar";
import { useWatchlist } from "@/components/watchlist/WatchlistProvider";

type Row = {
  ticker: string;
  company_name: string | null;
  market_cap?: string | null;
  sector?: string | null;
  industry?: string | null;
  price: number | null;
  change_percent: number | null;
  score: number | null;
  trend: string | null;
  scanner_type: string;
  updated_at: string | null;
};

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `$${Number(value).toFixed(2)}`;
}

function formatChange(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value > 0 ? "+" : ""}${Number(value).toFixed(2)}%`;
}

function scoreBarWidth(score: number | null | undefined) {
  if (score === null || score === undefined || Number.isNaN(score)) return "0%";
  const safe = Math.max(0, Math.min(100, Number(score)));
  return `${safe}%`;
}

function scoreTone(score: number | null | undefined) {
  const safe = Number(score || 0);
  if (safe >= 30) return "bg-emerald-400";
  if (safe >= 20) return "bg-cyan-400";
  if (safe >= 10) return "bg-amber-400";
  return "bg-slate-500";
}

function trendTone(trend: string | null | undefined) {
  if (trend === "up") return "text-emerald-300";
  if (trend === "down") return "text-rose-300";
  return "text-slate-300";
}

function trendLabel(trend: string | null | undefined) {
  if (trend === "up") return "↑";
  if (trend === "down") return "↓";
  return "→";
}

function momentumBadge(score: number | null | undefined, change: number | null | undefined) {
  const s = Number(score || 0);
  const c = Number(change || 0);

  if (s >= 30 && c > 0) {
    return {
      label: "Hot",
      className: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    };
  }

  if (s >= 20) {
    return {
      label: "Strong",
      className: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
    };
  }

  if (c > 0) {
    return {
      label: "Rising",
      className: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    };
  }

  return {
    label: "Watch",
    className: "border-white/10 bg-white/[0.04] text-slate-200",
  };
}

function buildSparklinePoints(price: number | null | undefined, change: number | null | undefined, ticker: string) {
  const base = Number(price || 100);
  const move = Number(change || 0);
  const seed = ticker
    .split("")
    .reduce((acc, ch, idx) => acc + ch.charCodeAt(0) * (idx + 1), 0);

  const values = Array.from({ length: 16 }).map((_, i) => {
    const wave = Math.sin((seed + i * 11) / 9) * 0.018;
    const drift = (move / 100) * ((i - 8) / 10);
    const micro = Math.cos((seed + i * 7) / 13) * 0.009;
    const val = base * (1 + wave + drift + micro);
    return Math.max(0.01, val);
  });

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 100 - ((v - min) / span) * 100;
    return `${x},${y}`;
  }).join(" ");
}

function sparklineColor(change: number | null | undefined) {
  return Number(change || 0) >= 0 ? "#34d399" : "#fb7185";
}

function sectorHeatTone(avgScore: number) {
  if (avgScore >= 30) return "from-emerald-500/20 to-emerald-400/5 border-emerald-400/20";
  if (avgScore >= 20) return "from-cyan-500/20 to-cyan-400/5 border-cyan-400/20";
  if (avgScore >= 10) return "from-amber-500/20 to-amber-400/5 border-amber-400/20";
  return "from-slate-500/20 to-slate-400/5 border-white/10";
}

export default function MarketScannerPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanner, setScanner] = useState("core");
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<string>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const { items: watchlistItems } = useWatchlist();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/aurora-market-scanner?scanner=${scanner}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load scanner");
        }

        setRows(Array.isArray(data?.rows) ? data.rows : []);
      } catch (err: any) {
        setRows([]);
        setError(err?.message || "Failed to load scanner");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [scanner]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/aurora-market-scanner?scanner=${scanner}`, {
          cache: "no-store",
        });

        const data = await res.json();
        if (!data?.rows || !Array.isArray(data.rows)) return;

        setRows((prev) => {
          const prevMap = new Map(prev.map((r) => [r.ticker, r]));
          for (const fresh of data.rows as Row[]) {
            const existing = prevMap.get(fresh.ticker);
            if (existing) {
              existing.price = fresh.price;
              existing.change_percent = fresh.change_percent;
              existing.trend = fresh.trend;
              existing.updated_at = fresh.updated_at;
              existing.score = fresh.score;
            } else {
              prevMap.set(fresh.ticker, fresh);
            }
          }
          return Array.from(prevMap.values());
        });
      } catch {
        // ignore background refresh failure
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [scanner]);

  function sortedRows(data: Row[]) {
    return [...data].sort((a: any, b: any) => {
      const av = a[sortKey];
      const bv = b[sortKey];

      if (av == null) return 1;
      if (bv == null) return -1;

      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }

      if (!Number.isNaN(Number(av)) && !Number.isNaN(Number(bv))) {
        return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
      }

      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }

  const displayedRows = useMemo(() => sortedRows(rows), [rows, sortKey, sortDir]);

  const topRow = displayedRows[0];
  const strongSignals = rows.filter((r) => Number(r.score || 0) >= 25).length;
  const positiveMomentum = rows.filter((r) => Number(r.change_percent || 0) > 0).length;
  const lastUpdated = rows[0]?.updated_at
    ? new Date(rows[0].updated_at).toLocaleString()
    : null;

  const bucketParam = useMemo(() => {
    if (scanner === "core") return "core";
    if (scanner === "alternative") return "active";
    return "all";
  }, [scanner]);

  const scannerLabel =
    scanner === "core"
      ? "Aurora Core"
      : scanner === "alternative"
      ? "Aurora Alternative"
      : "Custom Market View";

  const sectorHeatmap = useMemo(() => {
    const sectorMap = new Map<
      string,
      { sector: string; count: number; avgScore: number; positive: number }
    >();

    rows.forEach((row) => {
      const sector = row.sector || "Unclassified";
      const current = sectorMap.get(sector) || {
        sector,
        count: 0,
        avgScore: 0,
        positive: 0,
      };

      current.count += 1;
      current.avgScore += Number(row.score || 0);
      if (Number(row.change_percent || 0) > 0) current.positive += 1;

      sectorMap.set(sector, current);
    });

    return [...sectorMap.values()]
      .map((item) => ({
        ...item,
        avgScore: item.count ? item.avgScore / item.count : 0,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 8);
  }, [rows]);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-cyan-500/10 bg-[linear-gradient(180deg,rgba(6,18,45,0.96),rgba(3,11,30,0.98))] shadow-[0_0_40px_rgba(0,140,255,0.08)]">
        <div className="flex flex-col gap-6 border-b border-white/8 px-8 py-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 text-[12px] uppercase tracking-[0.28em] text-cyan-300/90">
              Aurora platform workspace
            </div>

            <h1 className="text-5xl font-semibold tracking-tight text-white">
              Market Scanner
            </h1>

            <p className="mt-3 max-w-3xl text-[15px] text-slate-400">
              Discover Aurora Core and Alternative opportunities ranked by score, momentum and live market structure.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setScanner("core")}
              className={`rounded-xl border px-5 py-3 text-sm font-medium transition ${
                scanner === "core"
                  ? "border-cyan-300/40 bg-cyan-500/15 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.12)]"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/20 hover:text-white"
              }`}
            >
              Aurora Core
            </button>

            <button
              onClick={() => setScanner("alternative")}
              className={`rounded-xl border px-5 py-3 text-sm font-medium transition ${
                scanner === "alternative"
                  ? "border-violet-300/40 bg-violet-500/15 text-violet-200 shadow-[0_0_20px_rgba(139,92,246,0.16)]"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-violet-400/20 hover:text-white"
              }`}
            >
              Aurora Alternative
            </button>

            <button
              onClick={() => setScanner("custom")}
              className={`rounded-xl border px-5 py-3 text-sm font-medium transition ${
                scanner === "custom"
                  ? "border-slate-300/30 bg-slate-500/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:text-white"
              }`}
            >
              Custom
            </button>

            <Link
              href={`/dashboard/opportunities?bucket=${bucketParam}`}
              className="rounded-xl border border-cyan-300/30 bg-cyan-500/15 px-5 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/25"
            >
              Top 10
            </Link>

            <Link
              href="/dashboard/watchlist"
              className="rounded-xl border border-amber-300/25 bg-amber-500/10 px-5 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
            >
              Watchlist ({watchlistItems.length})
            </Link>
          </div>
        </div>

        <div className="grid gap-4 px-8 py-6 md:grid-cols-4">
          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Loaded Rows
            </div>
            <div className="mt-3 text-3xl font-semibold text-white">{rows.length}</div>
            <div className="mt-2 text-sm text-slate-400">
              {scannerLabel}
            </div>
          </div>

          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Strong Signals
            </div>
            <div className="mt-3 text-3xl font-semibold text-emerald-300">
              {strongSignals}
            </div>
            <div className="mt-2 text-sm text-slate-400">Aurora score 25+</div>
          </div>

          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Positive Momentum
            </div>
            <div className="mt-3 text-3xl font-semibold text-cyan-300">
              {positiveMomentum}
            </div>
            <div className="mt-2 text-sm text-slate-400">Stocks closing green</div>
          </div>

          <div className="relative overflow-hidden rounded-[20px] border border-emerald-400/20 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5 shadow-[0_0_30px_rgba(16,185,129,0.08)]">
            <div className="absolute right-3 top-3 h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
            <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-300/80">
              Top Opportunity
            </div>
            <div className="mt-3 text-3xl font-semibold text-white">
              {topRow?.ticker || "—"}
            </div>
            <div className="mt-2 text-sm text-slate-300">
              {topRow?.company_name || "No data loaded"}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/8 px-8 py-4 text-sm text-slate-400">
          <div>
            {loading ? "Loading scanner..." : `${rows.length} stocks loaded`}
          </div>

          {lastUpdated ? (
            <div className="text-right">
              <div className="text-slate-400">Updated</div>
              <div className="text-xs text-slate-500">{lastUpdated}</div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-cyan-500/10 bg-[linear-gradient(180deg,rgba(7,18,45,0.96),rgba(3,10,28,0.98))] p-6 shadow-[0_0_30px_rgba(0,140,255,0.08)]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Aurora sector heatmap
              </div>
              <div className="mt-1 text-xl font-semibold text-white">
                Sector Strength
              </div>
            </div>
            <div className="text-xs text-slate-500">Top sectors by average score</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {sectorHeatmap.map((sector) => (
              <div
                key={sector.sector}
                className={`rounded-[20px] border bg-gradient-to-br p-4 ${sectorHeatTone(sector.avgScore)}`}
              >
                <div className="text-sm font-semibold text-white">{sector.sector}</div>
                <div className="mt-3 text-2xl font-semibold text-white">
                  {sector.avgScore.toFixed(1)}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Avg score
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-300">
                  <span>{sector.count} stocks</span>
                  <span>{sector.positive} green</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-cyan-500/10 bg-[linear-gradient(180deg,rgba(7,18,45,0.96),rgba(3,10,28,0.98))] p-6 shadow-[0_0_30px_rgba(0,140,255,0.08)]">
          <div className="mb-5">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Aurora spotlight
            </div>
            <div className="mt-1 text-xl font-semibold text-white">
              Momentum Leader
            </div>
          </div>

          {topRow ? (
            <div className="rounded-[22px] border border-emerald-400/20 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_40%),rgba(255,255,255,0.03)] p-5">
              <div className="flex items-center justify-between">
                <Link
                  href={`/dashboard/chart?ticker=${encodeURIComponent(topRow.ticker)}`}
                  className="text-3xl font-semibold text-white hover:text-cyan-300"
                >
                  {topRow.ticker}
                </Link>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  {momentumBadge(topRow.score, topRow.change_percent).label}
                </span>
              </div>

              <div className="mt-2 text-slate-300">{topRow.company_name || "—"}</div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[16px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Price</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatPrice(topRow.price)}
                  </div>
                </div>
                <div className="rounded-[16px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Change</div>
                  <div className={`mt-2 text-2xl font-semibold ${Number(topRow.change_percent || 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {formatChange(topRow.change_percent)}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Live pulse</div>
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${Number(topRow.change_percent || 0) >= 0 ? "bg-emerald-400" : "bg-rose-400"} animate-pulse`} />
                  <span className="text-sm text-slate-300">
                    {Number(topRow.change_percent || 0) >= 0 ? "Positive momentum" : "Pressure building"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-400">No leader available.</div>
          )}
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[28px] border border-cyan-500/10 bg-[linear-gradient(180deg,rgba(7,18,45,0.96),rgba(3,10,28,0.98))] shadow-[0_0_30px_rgba(0,140,255,0.08)]">
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Aurora market table
            </div>
            <div className="mt-1 text-lg font-medium text-white">
              {scannerLabel}
            </div>
          </div>

          <div className="text-sm text-slate-400">
            {loading ? "Loading..." : `${rows.length} stocks loaded`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-white/8 bg-white/[0.02]">
              <tr className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                <th className="px-6 py-4">Watch</th>

                <th
                  className="cursor-pointer px-6 py-4 hover:text-white"
                  onClick={() => {
                    setSortKey("ticker");
                    setSortDir(sortDir === "asc" ? "desc" : "asc");
                  }}
                >
                  Ticker
                </th>

                <th
                  className="cursor-pointer px-6 py-4 hover:text-white"
                  onClick={() => {
                    setSortKey("company_name");
                    setSortDir(sortDir === "asc" ? "desc" : "asc");
                  }}
                >
                  Company
                </th>

                <th
                  className="cursor-pointer px-6 py-4 hover:text-white"
                  onClick={() => {
                    setSortKey("market_cap");
                    setSortDir(sortDir === "asc" ? "desc" : "asc");
                  }}
                >
                  Market Cap
                </th>

                <th
                  className="cursor-pointer px-6 py-4 hover:text-white"
                  onClick={() => {
                    setSortKey("score");
                    setSortDir(sortDir === "asc" ? "desc" : "asc");
                  }}
                >
                  Score
                </th>

                <th className="px-6 py-4">Momentum</th>
                <th className="px-6 py-4">Sparkline</th>

                <th
                  className="cursor-pointer px-6 py-4 hover:text-white"
                  onClick={() => {
                    setSortKey("price");
                    setSortDir(sortDir === "asc" ? "desc" : "asc");
                  }}
                >
                  Price
                </th>

                <th
                  className="cursor-pointer px-6 py-4 hover:text-white"
                  onClick={() => {
                    setSortKey("change_percent");
                    setSortDir(sortDir === "asc" ? "desc" : "asc");
                  }}
                >
                  Change
                </th>

                <th className="px-6 py-4">Chart</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                    Loading scanner...
                  </td>
                </tr>
              ) : displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                    No scanner rows found.
                  </td>
                </tr>
              ) : (
                displayedRows.map((row) => {
                  const momentum = momentumBadge(row.score, row.change_percent);

                  return (
                    <tr
                      key={`${row.ticker}-${row.updated_at}-${row.scanner_type}`}
                      className="border-t border-white/6 text-sm text-slate-200 transition hover:bg-cyan-500/[0.03]"
                    >
                      <td className="px-6 py-4">
                        <WatchlistStar ticker={row.ticker} />
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/chart?ticker=${encodeURIComponent(row.ticker)}`}
                          className="font-semibold text-cyan-300 transition hover:text-cyan-200"
                        >
                          {row.ticker}
                        </Link>
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/chart?ticker=${encodeURIComponent(row.ticker)}`}
                          className="block transition hover:opacity-90"
                        >
                          <div className="font-medium text-white hover:text-cyan-300 transition">
                            {row.company_name || "—"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {row.industry || row.sector || "Aurora Scanner"}
                          </div>
                        </Link>
                      </td>

                      <td className="px-6 py-4 text-slate-300">
                        {row.market_cap || "—"}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex min-w-[150px] items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                            <div
                              className={`h-full rounded-full ${scoreTone(row.score)}`}
                              style={{ width: scoreBarWidth(row.score) }}
                            />
                          </div>
                          <span className="min-w-[26px] text-sm font-semibold text-white">
                            {row.score ?? "—"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${momentum.className}`}>
                          {momentum.label}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="w-[110px]">
                          <svg viewBox="0 0 100 100" className="h-10 w-full overflow-visible">
                            <polyline
                              fill="none"
                              stroke={sparklineColor(row.change_percent)}
                              strokeWidth="4"
                              points={buildSparklinePoints(row.price, row.change_percent, row.ticker)}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-white">
                        <span className="relative inline-flex items-center gap-2">
                          <span className={`inline-block h-2 w-2 rounded-full ${Number(row.change_percent || 0) >= 0 ? "bg-emerald-400" : "bg-rose-400"} animate-pulse`} />
                          {formatPrice(row.price)}
                        </span>
                      </td>

                      <td
                        className={`px-6 py-4 font-medium ${
                          Number(row.change_percent || 0) > 0
                            ? "text-emerald-300"
                            : Number(row.change_percent || 0) < 0
                            ? "text-rose-300"
                            : "text-slate-300"
                        }`}
                      >
                        {formatChange(row.change_percent)}
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/chart?ticker=${encodeURIComponent(row.ticker)}`}
                          className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-200 transition hover:bg-cyan-500/20"
                        >
                          View Chart
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
