"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import WatchlistStar from "@/components/watchlist/WatchlistStar";
import { useWatchlist } from "@/components/watchlist/WatchlistProvider";

type RawRow = Record<string, any>;

type ScannerRow = {
  ticker?: string;
  company?: string;
  company_name?: string;
  sector?: string;
  industry?: string;
  market_cap?: string | number;
  price?: string | number;
  change_percent?: string | number;
  aurora_score?: string | number;
  score?: string | number;
  scanner_type?: string;
  bucket?: string;
  updated_at?: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/[%,$\s]/g, "");
      const n = Number(cleaned);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function normaliseRow(row: RawRow): ScannerRow {
  return {
    ticker: firstString(row.ticker).toUpperCase(),
    company: firstString(row.company, row.company_name, row.name),
    company_name: firstString(row.company_name, row.company, row.name),
    sector: firstString(row.sector),
    industry: firstString(row.industry),
    market_cap: firstString(row.market_cap) || row.market_cap || "—",
    price: firstNumber(row.price, row.last_price, row.close, row.current_price),
    change_percent: firstNumber(row.change_percent, row.change_pct, row.change),
    aurora_score: firstNumber(row.aurora_score),
    score: firstNumber(row.score, row.rank_score),
    scanner_type: firstString(row.scanner_type, row.source_bucket, row.bucket),
    bucket: firstString(row.bucket, row.source_bucket, row.scanner_type),
    updated_at: firstString(row.updated_at, row.source_updated_at, row.fetched_at),
  };
}

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function fmtPrice(value: unknown) {
  const n = asNumber(value, NaN);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toFixed(2)}`;
}

function fmtPct(value: unknown) {
  const n = asNumber(value, NaN);
  if (!Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function scoreValue(row: ScannerRow) {
  return Math.max(
    asNumber(row.aurora_score, -999),
    asNumber(row.score, -999)
  );
}

function scoreBarWidth(score: unknown) {
  const safe = Math.max(0, Math.min(100, asNumber(score, 0)));
  return `${safe}%`;
}

function scoreTone(score: unknown) {
  const safe = asNumber(score, 0);
  if (safe >= 30) return "bg-emerald-400";
  if (safe >= 20) return "bg-cyan-400";
  if (safe >= 10) return "bg-amber-400";
  return "bg-slate-500";
}

function bucketValue(row: ScannerRow) {
  const raw = (row.scanner_type || row.bucket || "").toLowerCase();
  if (raw.includes("core")) return "Core";
  if (raw.includes("alt")) return "Alternative";
  if (raw.includes("active")) return "Alternative";
  return "Manual";
}

export default function WatchlistPage() {
  const { items, ready, loading, refresh } = useWatchlist();
  const [rows, setRows] = useState<ScannerRow[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [listFilter, setListFilter] = useState("all");
  const [pageLoading, setPageLoading] = useState(false);

  const tickers = useMemo(() => items.map((x) => x.toUpperCase()), [items]);

  useEffect(() => {
    let mounted = true;

    async function loadRows() {
      if (!ready) return;

      try {
        setPageLoading(true);
        setErrorText(null);

        if (!tickers.length) {
          setRows([]);
          return;
        }

        const { data, error } = await supabase
          .from("scanner_results")
          .select("*")
          .in("ticker", tickers);

        if (error) throw error;

        const bestByTicker = new Map<string, ScannerRow>();

        for (const raw of data || []) {
          const row = normaliseRow(raw);
          const t = (row.ticker || "").toUpperCase();
          if (!t) continue;

          const existing = bestByTicker.get(t);
          if (!existing || scoreValue(row) > scoreValue(existing)) {
            bestByTicker.set(t, row);
          }
        }

        const ordered = tickers.map((ticker) => {
          return (
            bestByTicker.get(ticker) || {
              ticker,
              company: ticker,
              company_name: ticker,
              sector: "—",
              industry: "—",
              market_cap: "—",
            }
          );
        });

        if (mounted) setRows(ordered);
      } catch (err: any) {
        console.error("Watchlist page load failed:", err);
        if (mounted) {
          setErrorText(err?.message || "Unable to load watchlist right now.");
          setRows([]);
        }
      } finally {
        if (mounted) setPageLoading(false);
      }
    }

    loadRows();

    return () => {
      mounted = false;
    };
  }, [tickers, ready]);

  const filtered = useMemo(() => {
    let result = [...rows];

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((row) => {
        const hay = [
          row.ticker,
          row.company,
          row.company_name,
          row.sector,
          row.industry,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return hay.includes(q);
      });
    }

    if (listFilter !== "all") {
      result = result.filter(
        (row) => bucketValue(row).toLowerCase() === listFilter
      );
    }

    return result;
  }, [rows, search, listFilter]);

  const coreCount = rows.filter((row) => bucketValue(row) === "Core").length;
  const altCount = rows.filter((row) => bucketValue(row) === "Alternative").length;
  const manualCount = rows.filter((row) => bucketValue(row) === "Manual").length;

  return (
    <div className="min-h-screen bg-[#06131f] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-[28px] border border-cyan-500/10 bg-[linear-gradient(180deg,rgba(6,18,45,0.96),rgba(3,11,30,0.98))] p-6 shadow-[0_0_40px_rgba(0,140,255,0.08)]">
          <div className="mb-3 inline-flex rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300 ring-1 ring-cyan-400/20">
            Aurora Growth
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Your saved companies, in one cleaner premium view.
          </h1>
          <p className="mt-3 max-w-3xl text-base text-slate-400">
            Review companies saved from Aurora Core and Aurora Alternative, search quickly, and jump straight into each stock page.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Total Saved
            </div>
            <div className="mt-3 text-4xl font-semibold text-white">{rows.length}</div>
          </div>

          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Aurora Core
            </div>
            <div className="mt-3 text-4xl font-semibold text-white">{coreCount}</div>
          </div>

          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Aurora Alternative
            </div>
            <div className="mt-3 text-4xl font-semibold text-white">{altCount}</div>
          </div>

          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Manual Watchlist
            </div>
            <div className="mt-3 text-4xl font-semibold text-white">{manualCount}</div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-cyan-500/10 bg-[linear-gradient(180deg,rgba(7,18,45,0.96),rgba(3,10,28,0.98))] shadow-[0_0_30px_rgba(0,140,255,0.08)]">
          <div className="flex flex-col gap-4 border-b border-white/8 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Aurora watchlist
              </div>
              <div className="mt-1 text-2xl font-semibold text-white">
                Watchlist
              </div>
              <p className="mt-2 text-sm text-slate-400">
                Saved companies from Aurora Market Scanner and your platform watchlist.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ticker, company"
                className="rounded-2xl border border-white/10 bg-[#112443] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
              />
              <select
                value={listFilter}
                onChange={(e) => setListFilter(e.target.value)}
                className="rounded-2xl border border-white/10 bg-[#112443] px-4 py-3 text-sm text-white outline-none"
              >
                <option value="all">All lists</option>
                <option value="core">Aurora Core</option>
                <option value="alternative">Aurora Alternative</option>
                <option value="manual">Manual</option>
              </select>
              <button
                onClick={async () => {
                  await refresh();
                }}
                className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm font-medium text-cyan-300 transition hover:bg-cyan-400/15"
              >
                Refresh
              </button>
            </div>
          </div>

          {errorText && (
            <div className="mx-6 mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {errorText}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-white/8 bg-white/[0.02]">
                <tr className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  <th className="px-5 py-4">Watch</th>
                  <th className="px-5 py-4">Ticker</th>
                  <th className="px-5 py-4">Company</th>
                  <th className="px-5 py-4">Market Cap</th>
                  <th className="px-5 py-4">Score</th>
                  <th className="px-5 py-4">Change</th>
                  <th className="px-5 py-4">Added</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading || pageLoading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                      Loading watchlist...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                      No saved companies found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, index) => (
                    <tr
                      key={`${row.ticker}-${index}`}
                      className="border-t border-white/6 text-sm text-slate-200 transition hover:bg-cyan-500/[0.03]"
                    >
                      <td className="px-5 py-4">
                        <WatchlistStar ticker={row.ticker} />
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/chart?ticker=${encodeURIComponent(row.ticker || "")}`}
                          className="font-semibold text-white transition hover:text-cyan-300"
                        >
                          {row.ticker || "—"}
                        </Link>
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/chart?ticker=${encodeURIComponent(row.ticker || "")}`}
                          className="block transition hover:opacity-90"
                        >
                          <div className="font-medium text-white hover:text-cyan-300 transition">
                            {row.company || row.company_name || "—"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {row.industry || row.sector || "Aurora Watchlist"}
                          </div>
                        </Link>
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {row.market_cap || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex min-w-[150px] items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                            <div
                              className={`h-full rounded-full ${scoreTone(row.aurora_score ?? row.score)}`}
                              style={{ width: scoreBarWidth(row.aurora_score ?? row.score) }}
                            />
                          </div>
                          <span className="min-w-[26px] text-sm font-semibold text-white">
                            {Math.max(0, asNumber(row.aurora_score ?? row.score, 0))}
                          </span>
                        </div>
                      </td>

                      <td
                        className={`px-5 py-4 font-medium ${
                          asNumber(row.change_percent, 0) > 0
                            ? "text-emerald-300"
                            : asNumber(row.change_percent, 0) < 0
                            ? "text-rose-300"
                            : "text-slate-300"
                        }`}
                      >
                        {fmtPct(row.change_percent)}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {bucketValue(row)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/dashboard/chart?ticker=${encodeURIComponent(
                            row.ticker || ""
                          )}`}
                          className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-200 transition hover:bg-cyan-500/20"
                        >
                          Analyse
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
