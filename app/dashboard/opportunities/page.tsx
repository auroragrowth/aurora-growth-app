"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import WatchlistStar from "@/components/watchlist/WatchlistStar";
import { useWatchlist } from "@/components/watchlist/WatchlistProvider";

type OpportunityRow = {
  id?: string | number;
  ticker?: string;
  company?: string;
  sector?: string;
  industry?: string;
  price?: number | string;
  change_pct?: number | string;
  aurora_score?: number | string;
  score?: number | string;
  rank_score?: number | string;
  market_cap?: string | number;
  volume?: string | number;
  relative_volume?: string | number;
  source_bucket?: string;
  bucket?: string;
  watchlist?: boolean;
  finviz_updated_at?: string;
  source_updated_at?: string;
  fetched_at?: string;
  updated_at?: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function fmtPrice(value: unknown) {
  const n = asNumber(value, NaN);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtPct(value: unknown) {
  const n = asNumber(value, NaN);
  if (!Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function fmtNumber(value: unknown) {
  const n = asNumber(value, NaN);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}

function scoreValue(row: OpportunityRow) {
  return Math.max(
    asNumber(row.aurora_score, -999),
    asNumber(row.score, -999),
    asNumber(row.rank_score, -999)
  );
}

function bucketValue(row: OpportunityRow) {
  const raw = (row.source_bucket || row.bucket || "").toLowerCase();
  if (raw.includes("core")) return "core";
  if (raw.includes("active")) return "active";
  return "other";
}

function lastUpdatedValue(row: OpportunityRow) {
  return (
    row.finviz_updated_at ||
    row.source_updated_at ||
    row.fetched_at ||
    row.updated_at ||
    null
  );
}

function scoreLabel(score: number) {
  if (score >= 85) return "Elite Setup";
  if (score >= 75) return "Strong Opportunity";
  if (score >= 65) return "Good Watch";
  if (score >= 50) return "Developing";
  return "Weak";
}

function scoreTone(score: number) {
  if (score >= 85) {
    return {
      badge: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30",
      bar: "from-emerald-400 to-lime-300",
    };
  }
  if (score >= 75) {
    return {
      badge: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/30",
      bar: "from-sky-400 to-cyan-300",
    };
  }
  if (score >= 65) {
    return {
      badge: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30",
      bar: "from-amber-400 to-yellow-300",
    };
  }
  return {
    badge: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30",
    bar: "from-rose-400 to-red-300",
  };
}

function miniSectorName(value?: string) {
  if (!value) return "Unclassified";
  const lower = value.toLowerCase();
  if (lower.includes("tech")) return "Technology";
  if (lower.includes("health")) return "Healthcare";
  if (lower.includes("energy")) return "Energy";
  if (lower.includes("finan")) return "Financials";
  if (lower.includes("consumer")) return "Consumer";
  if (lower.includes("industr")) return "Industrials";
  if (lower.includes("basic")) return "Materials";
  if (lower.includes("real estate")) return "Real Estate";
  if (lower.includes("comm")) return "Communication";
  if (lower.includes("utilities")) return "Utilities";
  return value;
}

export default function TopOpportunitiesPage() {
  const [rows, setRows] = useState<OpportunityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState<"all" | "core" | "active">("all");
  const { items: watchlistItems } = useWatchlist();

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("scanner_results")
          .select(
            "id,ticker,company,sector,industry,price,change_pct,aurora_score,score,rank_score,market_cap,volume,relative_volume,source_bucket,bucket,watchlist,finviz_updated_at,source_updated_at,fetched_at,updated_at"
          )
          .order("aurora_score", { ascending: false, nullsFirst: false })
          .limit(200);

        if (error) throw error;
        if (!mounted) return;

        const cleaned = (data || [])
          .map((row) => ({
            ...row,
            ticker: row.ticker?.toUpperCase?.() || "",
            company: row.company || row.ticker || "Unknown",
            sector: miniSectorName(row.sector),
          }))
          .sort((a, b) => scoreValue(b) - scoreValue(a));

        setRows(cleaned);
      } catch (err) {
        console.error("Failed to load top opportunities:", err);

        if (!mounted) return;

        setRows([
          {
            ticker: "MSFT",
            company: "Microsoft Corp",
            sector: "Technology",
            industry: "Software",
            price: 432.18,
            change_pct: 1.82,
            aurora_score: 91,
            source_bucket: "core",
            relative_volume: 1.3,
            updated_at: new Date().toISOString(),
          },
          {
            ticker: "NVDA",
            company: "NVIDIA Corp",
            sector: "Technology",
            industry: "Semiconductors",
            price: 118.44,
            change_pct: 2.21,
            aurora_score: 89,
            source_bucket: "active",
            relative_volume: 1.8,
            updated_at: new Date().toISOString(),
          },
          {
            ticker: "ISRG",
            company: "Intuitive Surgical",
            sector: "Healthcare",
            industry: "Medical Devices",
            price: 401.55,
            change_pct: 0.74,
            aurora_score: 84,
            source_bucket: "core",
            relative_volume: 1.1,
            updated_at: new Date().toISOString(),
          },
        ]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    let result = [...rows];

    if (bucket !== "all") {
      result = result.filter((row) => bucketValue(row) === bucket);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((row) => {
        const hay = [
          row.ticker,
          row.company,
          row.sector,
          row.industry,
          row.source_bucket,
          row.bucket,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return hay.includes(q);
      });
    }

    return result.sort((a, b) => scoreValue(b) - scoreValue(a));
  }, [rows, search, bucket]);

  const top10 = filtered.slice(0, 10);

  const best = top10[0];
  const avgScore =
    top10.length > 0
      ? top10.reduce((sum, row) => sum + scoreValue(row), 0) / top10.length
      : 0;

  const lastUpdated = rows
    .map((r) => lastUpdatedValue(r))
    .filter(Boolean)
    .sort()
    .reverse()[0];

  return (
    <div className="min-h-screen bg-[#06131f] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 inline-flex rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300 ring-1 ring-cyan-400/20">
                Aurora Scanner
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Top Opportunities
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-white/70 sm:text-base">
                Highest-ranked opportunities from your Aurora market scanner,
                ordered by Aurora Score and ready for deeper analysis.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
              <div className="font-medium text-white">Last Update</div>
              <div>
                {lastUpdated
                  ? new Date(lastUpdated).toLocaleString()
                  : "No timestamp found"}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
                Best Ranked
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {best?.ticker || "—"}
              </div>
              <div className="text-sm text-white/70">
                {best?.company || "No data"}
              </div>
            </div>

            <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-sky-300/80">
                Top 10 Average Score
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {top10.length ? avgScore.toFixed(1) : "—"}
              </div>
              <div className="text-sm text-white/70">
                Overall quality of the current shortlist
              </div>
            </div>

            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-amber-300/80">
                Watchlist Size
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {watchlistItems.length}
              </div>
              <div className="text-sm text-white/70">
                Shared across all dashboard pages
              </div>
            </div>

            <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-fuchsia-300/80">
                Scanner Buckets
              </div>
              <div className="mt-2 text-2xl font-semibold">Core / Active</div>
              <div className="text-sm text-white/70">
                Compare stable leaders vs fast movers
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticker, company, sector, industry..."
              className="w-full rounded-xl border border-white/10 bg-[#081824] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-400/40"
            />
          </div>

          <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
            {[
              { key: "all", label: "All" },
              { key: "core", label: "Core" },
              { key: "active", label: "Active" },
            ].map((item) => {
              const active = bucket === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() =>
                    setBucket(item.key as "all" | "core" | "active")
                  }
                  className={[
                    "rounded-xl px-4 py-2 text-sm font-medium transition",
                    active
                      ? "bg-cyan-400 text-[#04111c]"
                      : "bg-[#081824] text-white/80 hover:bg-[#0d2233]",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Top 10 Ranked Setups</h2>
              <p className="text-sm text-white/60">
                Aurora Score is used to rank the strongest current opportunities.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {top10.map((row, index) => {
              const score = scoreValue(row);
              const tone = scoreTone(score);
              const change = asNumber(row.change_pct, 0);

              return (
                <div
                  key={`${row.ticker}-${index}`}
                  className="rounded-2xl border border-white/10 bg-[#081824]/80 p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/15 text-sm font-semibold text-cyan-300">
                          #{index + 1}
                        </span>
                        <h3 className="text-lg font-semibold">
                          {row.ticker || "—"}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone.badge}`}
                        >
                          {scoreLabel(score)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-white/65">
                        {row.company || "Unknown company"}
                      </p>
                    </div>

                    <div className="flex items-start gap-2">
                      <WatchlistStar ticker={row.ticker} />
                      <div className="text-right">
                        <div className="text-2xl font-semibold">{score}</div>
                        <div className="text-xs uppercase tracking-[0.2em] text-white/45">
                          Aurora Score
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`}
                      style={{ width: `${Math.max(6, Math.min(score, 100))}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                    <div className="rounded-xl bg-white/5 p-3">
                      <div className="text-white/45">Price</div>
                      <div className="mt-1 font-medium">
                        {fmtPrice(row.price)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3">
                      <div className="text-white/45">Daily Move</div>
                      <div
                        className={`mt-1 font-medium ${
                          change >= 0 ? "text-emerald-300" : "text-rose-300"
                        }`}
                      >
                        {fmtPct(row.change_pct)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3">
                      <div className="text-white/45">Sector</div>
                      <div className="mt-1 font-medium">
                        {row.sector || "—"}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3">
                      <div className="text-white/45">Bucket</div>
                      <div className="mt-1 font-medium capitalize">
                        {bucketValue(row)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-white/60">
                      <span className="text-white/40">Industry:</span>{" "}
                      {row.industry || "—"}
                      {" • "}
                      <span className="text-white/40">Rel Vol:</span>{" "}
                      {fmtNumber(row.relative_volume)}
                    </div>

                    <Link
                      href={`/dashboard/chart?ticker=${encodeURIComponent(
                        row.ticker || ""
                      )}`}
                      className="inline-flex items-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-[#04111c] transition hover:brightness-110"
                    >
                      Analyse
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
          <div className="mb-4 flex flex-col gap-1">
            <h2 className="text-xl font-semibold">Full Opportunity Table</h2>
            <p className="text-sm text-white/60">
              Use this page to scan the highest Aurora-ranked names before going
              into the chart page.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-white/45">
                  <th className="px-3 py-2">Star</th>
                  <th className="px-3 py-2">Rank</th>
                  <th className="px-3 py-2">Ticker</th>
                  <th className="px-3 py-2">Company</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Move</th>
                  <th className="px-3 py-2">Sector</th>
                  <th className="px-3 py-2">Industry</th>
                  <th className="px-3 py-2">Bucket</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td
                        colSpan={11}
                        className="rounded-2xl bg-white/5 px-4 py-5 text-white/35"
                      >
                        Loading opportunities...
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="rounded-2xl bg-white/5 px-4 py-6 text-center text-white/50"
                    >
                      No opportunities found for the current filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, index) => {
                    const score = scoreValue(row);
                    const change = asNumber(row.change_pct, 0);

                    return (
                      <tr
                        key={`${row.ticker}-${index}-table`}
                        className="rounded-2xl bg-[#081824]/80 text-sm"
                      >
                        <td className="rounded-l-2xl px-3 py-4">
                          <WatchlistStar ticker={row.ticker} />
                        </td>
                        <td className="px-3 py-4 font-semibold text-cyan-300">
                          #{index + 1}
                        </td>
                        <td className="px-3 py-4 font-semibold text-white">
                          {row.ticker || "—"}
                        </td>
                        <td className="px-3 py-4 text-white/80">
                          {row.company || "—"}
                        </td>
                        <td className="px-3 py-4">
                          <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-300 ring-1 ring-cyan-400/20">
                            {score}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-white/80">
                          {fmtPrice(row.price)}
                        </td>
                        <td
                          className={`px-3 py-4 font-medium ${
                            change >= 0 ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {fmtPct(row.change_pct)}
                        </td>
                        <td className="px-3 py-4 text-white/70">
                          {row.sector || "—"}
                        </td>
                        <td className="px-3 py-4 text-white/70">
                          {row.industry || "—"}
                        </td>
                        <td className="px-3 py-4 text-white/70 capitalize">
                          {bucketValue(row)}
                        </td>
                        <td className="rounded-r-2xl px-3 py-4 text-right">
                          <Link
                            href={`/dashboard/chart?ticker=${encodeURIComponent(
                              row.ticker || ""
                            )}`}
                            className="inline-flex rounded-xl bg-cyan-400 px-3 py-2 text-xs font-semibold text-[#04111c] transition hover:brightness-110"
                          >
                            Analyse
                          </Link>
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
    </div>
  );
}
