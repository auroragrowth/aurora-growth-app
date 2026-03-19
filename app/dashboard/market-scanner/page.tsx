"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useWatchlist } from "@/components/watchlist/WatchlistProvider";

type ScannerRow = {
  id?: string;
  ticker?: string | null;
  symbol?: string | null;
  company_name?: string | null;
  sector?: string | null;
  market_cap?: string | number | null;
  price?: string | number | null;
  change_percent?: string | number | null;
  aurora_score?: string | number | null;
  score?: string | number | null;
  trend?: string | null;
  source_list?: string | null;
  updated_at?: string | null;
};

type UniverseFilter = "all" | "core" | "alternative";
type SortKey =
  | "ticker"
  | "company_name"
  | "sector"
  | "market_cap"
  | "price"
  | "change_percent"
  | "score"
  | "trend";

type SortDirection = "asc" | "desc";

function toTicker(row: ScannerRow) {
  return String(row.ticker || row.symbol || "").toUpperCase();
}

function toCompany(row: ScannerRow) {
  return String(row.company_name || toTicker(row) || "Unknown Company");
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[%,$£,\s,]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatMoney(value: unknown) {
  const n = toNumber(value);
  if (!n) return "—";

  if (Math.abs(n) >= 1_000_000_000_000) {
    return `$${(n / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (Math.abs(n) >= 1_000_000_000) {
    return `$${(n / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(n) >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(2)}M`;
  }
  return `$${n.toFixed(2)}`;
}

function formatPrice(value: unknown) {
  const n = toNumber(value);
  if (!n) return "—";
  return `$${n.toFixed(2)}`;
}

function formatPercent(value: unknown) {
  const n = toNumber(value);
  if (!n) return "0.00%";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function formatUpdatedAt(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export default function MarketScannerPage() {
  const { hasTicker, toggleTicker, ready } = useWatchlist();

  const [rows, setRows] = useState<ScannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [universe, setUniverse] = useState<UniverseFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  async function loadScanner(showRefreshState = false) {
    try {
      if (showRefreshState) setRefreshing(true);
      else setLoading(true);

      const qs =
        universe === "all" ? "" : `?universe=${encodeURIComponent(universe)}`;

      const res = await fetch(`/api/scanner${qs}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      const nextRows = Array.isArray(data?.rows) ? data.rows : [];
      setRows(nextRows);

      const newest = nextRows
        .map((row: ScannerRow) => row.updated_at)
        .filter(Boolean)
        .sort()
        .reverse()[0];

      setLastUpdated(newest || null);
    } catch (error) {
      console.error("Failed to load scanner:", error);
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadScanner();
  }, [universe]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();

    let result = rows.filter((row) => {
      if (!q) return true;

      return (
        toTicker(row).toLowerCase().includes(q) ||
        toCompany(row).toLowerCase().includes(q) ||
        String(row.sector || "")
          .toLowerCase()
          .includes(q)
      );
    });

    result = [...result].sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      switch (sortKey) {
        case "ticker":
          aValue = toTicker(a);
          bValue = toTicker(b);
          break;
        case "company_name":
          aValue = toCompany(a);
          bValue = toCompany(b);
          break;
        case "sector":
          aValue = String(a.sector || "");
          bValue = String(b.sector || "");
          break;
        case "market_cap":
          aValue = toNumber(a.market_cap);
          bValue = toNumber(b.market_cap);
          break;
        case "price":
          aValue = toNumber(a.price);
          bValue = toNumber(b.price);
          break;
        case "change_percent":
          aValue = toNumber(a.change_percent);
          bValue = toNumber(b.change_percent);
          break;
        case "score":
          aValue = toNumber(a.aurora_score ?? a.score);
          bValue = toNumber(b.aurora_score ?? b.score);
          break;
        case "trend":
          aValue = String(a.trend || "");
          bValue = String(b.trend || "");
          break;
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return sortDirection === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });

    return result;
  }, [rows, query, sortKey, sortDirection]);

  async function handleToggleWatchlist(ticker?: string | null, companyName?: string | null) {
    if (!ticker) return;

    try {
      const result = await toggleTicker(ticker, companyName);
      if (!result?.ok) {
        throw new Error("Unable to update watchlist");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to update watchlist");
    }
  }

  function handleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "ticker" || nextKey === "company_name" ? "asc" : "desc");
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="rounded-3xl border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(6,12,24,.96),rgba(8,16,32,.92))] p-5 shadow-[0_0_45px_rgba(0,180,255,.08)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
              Aurora Scanner
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Market Scanner
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
              Scan Aurora core and alternative ideas, sort by score, and add names
              straight into your watchlist.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                Universe
              </div>
              <div className="mt-2 text-sm font-medium text-white">
                {universe === "all" ? "All" : universe === "core" ? "Core" : "Alternative"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                Loaded
              </div>
              <div className="mt-2 text-sm font-medium text-white">
                {filteredRows.length} stocks
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                Watchlist
              </div>
              <div className="mt-2 text-sm font-medium text-white">
                {ready ? "Connected" : "Loading"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                Updated
              </div>
              <div className="mt-2 text-sm font-medium text-white">
                {formatUpdatedAt(lastUpdated)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 xl:flex-row">
          <input
            type="text"
            placeholder="Search ticker, company, sector..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400/40 xl:max-w-md"
          />

          <div className="flex flex-wrap gap-2">
            {(["all", "core", "alternative"] as UniverseFilter[]).map((value) => {
              const active = universe === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setUniverse(value)}
                  className={[
                    "rounded-2xl border px-4 py-2 text-sm font-semibold transition",
                    active
                      ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-200"
                      : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]",
                  ].join(" ")}
                >
                  {value === "all" ? "All" : value === "core" ? "Core" : "Alternative"}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => loadScanner(true)}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06]"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(8,12,20,.98),rgba(8,14,26,.95))]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-white/10 bg-white/[0.03]">
              <tr className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                <th className="px-4 py-4">Watch</th>
                <th className="px-4 py-4">
                  <button type="button" onClick={() => handleSort("ticker")} className="hover:text-white">
                    Ticker
                  </button>
                </th>
                <th className="px-4 py-4">
                  <button type="button" onClick={() => handleSort("company_name")} className="hover:text-white">
                    Company
                  </button>
                </th>
                <th className="px-4 py-4">
                  <button type="button" onClick={() => handleSort("sector")} className="hover:text-white">
                    Sector
                  </button>
                </th>
                <th className="px-4 py-4">
                  <button type="button" onClick={() => handleSort("market_cap")} className="hover:text-white">
                    Market Cap
                  </button>
                </th>
                <th className="px-4 py-4">
                  <button type="button" onClick={() => handleSort("score")} className="hover:text-white">
                    Score
                  </button>
                </th>
                <th className="px-4 py-4">
                  <button type="button" onClick={() => handleSort("trend")} className="hover:text-white">
                    Trend
                  </button>
                </th>
                <th className="px-4 py-4">
                  <button type="button" onClick={() => handleSort("price")} className="hover:text-white">
                    Price
                  </button>
                </th>
                <th className="px-4 py-4">
                  <button type="button" onClick={() => handleSort("change_percent")} className="hover:text-white">
                    Change
                  </button>
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-white/50">
                    Loading market scanner...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-white/50">
                    No scanner results found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const ticker = toTicker(row);
                  const company = toCompany(row);
                  const onWatchlist = hasTicker(ticker);
                  const score = toNumber(row.aurora_score ?? row.score);
                  const change = toNumber(row.change_percent);

                  return (
                    <tr
                      key={row.id || ticker}
                      className="border-b border-white/6 text-sm text-white/80 transition hover:bg-cyan-400/[0.06] hover:shadow-[inset_0_0_0_1px_rgba(34,211,238,0.14)]"
                    >
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleWatchlist(ticker, company)}
                          className={[
                            "rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
                            onWatchlist
                              ? "border-amber-400/40 bg-amber-400/15 text-amber-200"
                              : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]",
                          ].join(" ")}
                        >
                          {onWatchlist ? "Saved" : "Add"}
                        </button>
                      </td>

                      <td className="px-4 py-4 font-semibold text-cyan-200">
                        <Link href={`/dashboard/investments/calculator?ticker=${ticker}`} className="hover:text-cyan-100">
                          {ticker}
                        </Link>
                      </td>

                      <td className="px-4 py-4">
                        <div className="min-w-[220px]">
                          <div className="font-medium text-white">{company}</div>
                          <div className="mt-1 text-xs text-white/40">
                            {row.source_list || "scanner"}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-white/65">
                        {row.sector || "—"}
                      </td>

                      <td className="px-4 py-4 text-white/80">
                        {formatMoney(row.market_cap)}
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-200">
                          {score ? score.toFixed(1) : "—"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-white/75">
                        {row.trend || "—"}
                      </td>

                      <td className="px-4 py-4 text-white/90">
                        {formatPrice(row.price)}
                      </td>

                      <td
                        className={[
                          "px-4 py-4 font-medium",
                          change >= 0 ? "text-emerald-300" : "text-red-300",
                        ].join(" ")}
                      >
                        {formatPercent(row.change_percent)}
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
  );
}
