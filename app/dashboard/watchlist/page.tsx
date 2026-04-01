"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useWatchlist } from "@/components/watchlist/WatchlistProvider";
import { usePortfolio } from "@/components/providers/PortfolioProvider";
import { ExpiredBlur } from "@/components/dashboard/ExpiredOverlay";
import PriceAlertModal from "@/components/watchlist/PriceAlertModal";

type PriceAlertRow = {
  id: string;
  symbol: string;
  alert_type: string;
  target_price: number;
  triggered: boolean;
  is_active?: boolean;
};

type SourceFilter = "all" | "core" | "alternative" | "mylist";

type WatchlistRow = {
  id?: string;
  symbol: string;
  company_name?: string | null;
  created_at?: string | null;
  source?: string | null;
  universe?: string | null;
  scanner_source?: string | null;
  market_cap?: number | string | null;
  score?: number | null;
  change_pct?: number | null;
  change?: number | null;
};

type SourceType = "core" | "alternative" | "mylist";

function normaliseSource(row: WatchlistRow): SourceType {
  const raw = String(row.source ?? row.universe ?? row.scanner_source ?? "")
    .trim()
    .toLowerCase();

  if (
    raw === "core" ||
    raw === "aurora core" ||
    raw === "aurora_core" ||
    raw === "aurora-core"
  ) {
    return "core";
  }

  if (
    raw === "alternative" ||
    raw === "aurora alternative" ||
    raw === "aurora_alternative" ||
    raw === "aurora-alternative"
  ) {
    return "alternative";
  }

  if (
    raw === "my list" ||
    raw === "mylist" ||
    raw === "my_list" ||
    raw === "search"
  ) {
    return "mylist";
  }

  if (!raw) return "mylist";

  return "mylist";
}

function sourceLabel(row: WatchlistRow) {
  const s = normaliseSource(row);
  if (s === "core") return "Aurora Core";
  if (s === "alternative") return "Aurora Alternative";
  return "My List";
}

function sourceBadgeClass(source: SourceType) {
  if (source === "core")
    return "border-teal-400/35 bg-teal-500/10 text-teal-300";
  if (source === "alternative")
    return "border-purple-400/35 bg-purple-500/10 text-purple-300";
  return "border-white/20 bg-white/5 text-white/55";
}

function formatPercent(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "0.00%";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMarketCap(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "—";

  const n =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^0-9.-]/g, ""));

  if (!Number.isFinite(n)) return String(value);

  if (n >= 1_000_000_000_000)
    return `${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;

  return n.toLocaleString("en-GB");
}

export default function WatchlistPage() {
  const { items, loading, ready, toggleTicker } = useWatchlist();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [sortKey, setSortKey] = useState<
    "added" | "ticker" | "company" | "source" | "score"
  >("added");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [mounted, setMounted] = useState(false);
  const [alerts, setAlerts] = useState<PriceAlertRow[]>([]);
  const [alertModalSymbol, setAlertModalSymbol] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data?.alerts)) setAlerts(data.alerts);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    const id = setInterval(() => {
      fetch("/api/alerts/check", { cache: "no-store" }).catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  function activeAlertsForSymbol(symbol: string) {
    return alerts.filter(
      (a) => a.symbol === symbol && !a.triggered && a.is_active !== false
    );
  }

  function triggeredAlertsForSymbol(symbol: string) {
    return alerts.filter(
      (a) => a.symbol === symbol && a.triggered
    );
  }

  function existingAlertsForModal(symbol: string) {
    const all = alerts.filter((a) => a.symbol === symbol && !a.triggered);
    return {
      above: all.find((a) => a.alert_type === "price_above") || undefined,
      below: all.find((a) => a.alert_type === "price_below") || undefined,
      entry: all.find((a) => a.alert_type === "entry_level") || undefined,
    };
  }

  const rows: WatchlistRow[] = useMemo(() => {
    return (items || []).map((item: any) => ({
      id: item.id,
      symbol: item.symbol || item.ticker || "",
      company_name: item.company_name ?? item.name ?? null,
      created_at: item.created_at ?? null,
      source: item.source ?? null,
      universe: item.universe ?? item.bucket ?? null,
      scanner_source: item.scanner_source ?? null,
      market_cap: item.market_cap ?? null,
      score:
        typeof item.score === "number"
          ? item.score
          : item.score !== undefined && item.score !== null
            ? Number(item.score)
            : null,
      change_pct:
        typeof item.change_pct === "number"
          ? item.change_pct
          : item.change_pct !== undefined && item.change_pct !== null
            ? Number(item.change_pct)
            : typeof item.change === "number"
              ? item.change
              : item.change !== undefined && item.change !== null
                ? Number(item.change)
                : null,
      change:
        typeof item.change === "number"
          ? item.change
          : item.change !== undefined && item.change !== null
            ? Number(item.change)
            : null,
    }));
  }, [items]);

  const coreCount = useMemo(
    () => rows.filter((row) => normaliseSource(row) === "core").length,
    [rows]
  );

  const alternativeCount = useMemo(
    () => rows.filter((row) => normaliseSource(row) === "alternative").length,
    [rows]
  );

  const myListCount = useMemo(
    () => rows.filter((row) => normaliseSource(row) === "mylist").length,
    [rows]
  );

  const filteredRows = useMemo(() => {
    let next = [...rows];

    if (sourceFilter === "core") {
      next = next.filter((row) => normaliseSource(row) === "core");
    } else if (sourceFilter === "alternative") {
      next = next.filter((row) => normaliseSource(row) === "alternative");
    } else if (sourceFilter === "mylist") {
      next = next.filter((row) => normaliseSource(row) === "mylist");
    }

    next.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (sortKey === "ticker") {
        aVal = a.symbol || "";
        bVal = b.symbol || "";
      } else if (sortKey === "company") {
        aVal = a.company_name || "";
        bVal = b.company_name || "";
      } else if (sortKey === "source") {
        aVal = normaliseSource(a);
        bVal = normaliseSource(b);
      } else if (sortKey === "score") {
        aVal = a.score ?? -9999;
        bVal = b.score ?? -9999;
      } else {
        aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
        bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }

      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return next;
  }, [rows, sourceFilter, sortKey, sortDir]);

  function handleSort(
    key: "added" | "ticker" | "company" | "source" | "score"
  ) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "added" ? "desc" : "asc");
  }

  async function handleRemove(symbol?: string | null) {
    if (!symbol) return;
    try {
      await toggleTicker(symbol, null);
    } catch (error) {
      console.error("Failed to remove from watchlist:", error);
    }
  }

  const { data: portfolio } = usePortfolio();
  const isDemo = portfolio.brokerMode === "demo";
  const [switching, setSwitching] = useState(false);

  const switchMode = useCallback(async (next: "live" | "demo") => {
    if (switching) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/broker/set-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: next }),
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("aurora:broker-mode-changed", { detail: next }));
        window.dispatchEvent(new CustomEvent("aurora:broker-connected"));
        window.dispatchEvent(new CustomEvent("aurora:toast", {
          detail: {
            id: `mode-${next}`,
            title: `Switched to ${next === "demo" ? "Demo" : "Live"} Account`,
            tone: "info",
          },
        }));
      }
    } catch { /* ignore */ } finally {
      setSwitching(false);
    }
  }, [switching]);

  return (
    <div className="space-y-6 p-6">
      {/* Mode switcher + title row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {isDemo ? "Demo Watchlist" : "My Watchlist"}
            {isDemo && (
              <span className="ml-3 inline-flex items-center rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-sm font-semibold text-amber-300">
                DEMO MODE
              </span>
            )}
          </h1>
          <p className="mt-2 text-sm text-white/60">
            {isDemo
              ? "Practice watchlist for your demo account."
              : "Saved companies from Aurora Market Scanner and your personal picks."}
          </p>
        </div>

        {/* Live / Demo switcher */}
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => switchMode("live")}
            disabled={switching || !isDemo}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              !isDemo
                ? "bg-emerald-400/15 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.15)]"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${!isDemo ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" : "bg-slate-600"}`} />
            Live Watchlist
          </button>
          <button
            type="button"
            onClick={() => switchMode("demo")}
            disabled={switching || isDemo}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              isDemo
                ? "bg-amber-400/15 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isDemo ? "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.7)]" : "bg-slate-600"}`} />
            Demo Watchlist
          </button>
        </div>
      </div>

      {/* Demo banner */}
      {isDemo && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 px-5 py-4">
          <div className="flex items-start gap-3 text-sm text-amber-300">
            <span className="mt-0.5 text-lg">🟡</span>
            <div>
              <div className="font-semibold">You are viewing your Demo Watchlist</div>
              <div className="mt-1 text-amber-300/70">
                Stocks added here are for practice trading only and separate from your live watchlist.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <div className={`rounded-3xl border p-5 shadow-[0_0_30px_rgba(0,180,255,0.08)] ${
          isDemo
            ? "border-amber-500/20 bg-[#07152f]/90"
            : "border-cyan-500/20 bg-[#07152f]/90"
        }`}>
          <div className="text-xs uppercase tracking-[0.28em] text-white/45">
            Total Saved
          </div>
          <div className={`mt-3 text-3xl font-semibold ${isDemo ? "text-amber-300" : "text-cyan-300"}`}>
            {rows.length}
          </div>
          <div className="mt-2 text-sm text-white/55">
            All saved watchlist stocks
          </div>
        </div>

        <div className="rounded-3xl border border-teal-400/20 bg-[#07152f]/90 p-5 shadow-[0_0_30px_rgba(20,184,166,0.08)]">
          <div className="text-xs uppercase tracking-[0.28em] text-white/45">
            Aurora Core
          </div>
          <div className="mt-3 text-3xl font-semibold text-teal-300">
            {coreCount}
          </div>
          <div className="mt-2 text-sm text-white/55">
            Core watchlist names
          </div>
        </div>

        <div className="rounded-3xl border border-purple-400/20 bg-[#07152f]/90 p-5 shadow-[0_0_30px_rgba(168,85,247,0.08)]">
          <div className="text-xs uppercase tracking-[0.28em] text-white/45">
            Aurora Alternative
          </div>
          <div className="mt-3 text-3xl font-semibold text-purple-300">
            {alternativeCount}
          </div>
          <div className="mt-2 text-sm text-white/55">
            Alternative watchlist names
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#07152f]/90 p-5">
          <div className="text-xs uppercase tracking-[0.28em] text-white/45">
            Status
          </div>
          <div className="mt-3 text-lg font-semibold text-white">
            {!mounted
              ? "Loading..."
              : loading
                ? "Syncing..."
                : ready
                  ? "Ready"
                  : "Starting"}
          </div>
          <div className="mt-2 text-sm text-white/55">
            Watchlist connected
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setSourceFilter("all")}
          className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
            sourceFilter === "all"
              ? "border border-cyan-400/40 bg-cyan-500/15 text-cyan-300 shadow-[0_0_20px_rgba(0,200,255,0.15)]"
              : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
          }`}
        >
          All ({rows.length})
        </button>

        <button
          onClick={() => setSourceFilter("core")}
          className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
            sourceFilter === "core"
              ? "border border-teal-400/40 bg-teal-500/15 text-teal-300 shadow-[0_0_20px_rgba(20,184,166,0.15)]"
              : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
          }`}
        >
          Core ({coreCount})
        </button>

        <button
          onClick={() => setSourceFilter("alternative")}
          className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
            sourceFilter === "alternative"
              ? "border border-purple-400/40 bg-purple-500/15 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
              : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
          }`}
        >
          Alternative ({alternativeCount})
        </button>

        <button
          onClick={() => setSourceFilter("mylist")}
          className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
            sourceFilter === "mylist"
              ? "border border-white/30 bg-white/10 text-white/80"
              : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
          }`}
        >
          My List ({myListCount})
        </button>
      </div>

      <ExpiredBlur>
        <div className="overflow-hidden rounded-3xl border border-cyan-500/10 bg-[#041225]/95">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-white/[0.03]">
                <tr className="border-b border-white/5 text-left text-[11px] uppercase tracking-[0.28em] text-white/45">
                  <th className="px-6 py-4">Watch</th>

                  <th className="px-6 py-4">
                    <button
                      onClick={() => handleSort("ticker")}
                      className="inline-flex items-center gap-2 text-left transition hover:text-cyan-300"
                    >
                      Ticker
                      <span className="text-white/30">&#8597;</span>
                    </button>
                  </th>

                  <th className="px-6 py-4">
                    <button
                      onClick={() => handleSort("company")}
                      className="inline-flex items-center gap-2 text-left transition hover:text-cyan-300"
                    >
                      Company
                      <span className="text-white/30">&#8597;</span>
                    </button>
                  </th>

                  <th className="px-6 py-4">
                    <button
                      onClick={() => handleSort("source")}
                      className="inline-flex items-center gap-2 text-left transition hover:text-cyan-300"
                    >
                      Source
                      <span className="text-white/30">&#8597;</span>
                    </button>
                  </th>

                  <th className="px-6 py-4">Market Cap</th>

                  <th className="px-6 py-4">
                    <button
                      onClick={() => handleSort("score")}
                      className="inline-flex items-center gap-2 text-left transition hover:text-cyan-300"
                    >
                      Score
                      <span className="text-white/30">&#8597;</span>
                    </button>
                  </th>

                  <th className="px-6 py-4">Change</th>

                  <th className="px-6 py-4">
                    <button
                      onClick={() => handleSort("added")}
                      className="inline-flex items-center gap-2 text-left transition hover:text-cyan-300"
                    >
                      Added
                      <span className="text-white/30">&#8597;</span>
                    </button>
                  </th>

                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-16 text-center text-white/55"
                    >
                      No watchlist stocks found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => {
                    const source = normaliseSource(row);

                    return (
                      <tr
                        key={`${row.id ?? row.symbol}-${idx}`}
                        className="border-b border-white/5 text-white/88 transition hover:bg-white/[0.025]"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRemove(row.symbol)}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-400/35 bg-cyan-500/10 text-cyan-300 shadow-[0_0_18px_rgba(0,200,255,0.10)] transition hover:scale-105 hover:bg-cyan-500/20"
                              title="Remove from watchlist"
                            >
                              &#9733;
                            </button>
                            {(() => {
                              const active = activeAlertsForSymbol(row.symbol);
                              const triggered = triggeredAlertsForSymbol(row.symbol);
                              const hasTriggered = triggered.length > 0;
                              const hasActive = active.length > 0;

                              return (
                                <button
                                  onClick={() => setAlertModalSymbol(row.symbol)}
                                  className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm transition hover:scale-105 ${
                                    hasTriggered
                                      ? "animate-pulse border-red-400/40 bg-red-500/15 text-red-300"
                                      : hasActive
                                        ? "border-amber-400/40 bg-amber-400/15 text-amber-300"
                                        : "border-white/15 bg-white/5 text-white/30 hover:text-white/50"
                                  }`}
                                  title={
                                    hasTriggered
                                      ? "Alert triggered!"
                                      : hasActive
                                        ? `${active.length} alert${active.length > 1 ? "s" : ""} active`
                                        : "Set price alert"
                                  }
                                >
                                  {hasTriggered || hasActive ? "🔔" : "🔕"}
                                  {hasActive && !hasTriggered && active.length > 0 && (
                                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black">
                                      {active.length}
                                    </span>
                                  )}
                                </button>
                              );
                            })()}
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <Link
                            href={`/dashboard/stocks/${encodeURIComponent(row.symbol)}`}
                            className="font-semibold tracking-wide text-white transition hover:text-cyan-300"
                          >
                            {row.symbol}
                          </Link>
                        </td>

                        <td className="px-6 py-5 text-white/85">
                          {row.company_name || "—"}
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.24em] ${sourceBadgeClass(source)}`}
                          >
                            {sourceLabel(row)}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-white/80">
                          {formatMarketCap(row.market_cap)}
                        </td>

                        <td className="px-6 py-5 font-medium text-cyan-300">
                          {row.score ?? "—"}
                        </td>

                        <td
                          className={`px-6 py-5 ${
                            (row.change_pct ?? 0) >= 0
                              ? "text-emerald-300"
                              : "text-red-300"
                          }`}
                        >
                          {formatPercent(row.change_pct)}
                        </td>

                        <td className="px-6 py-5 text-white/65">
                          {formatDate(row.created_at)}
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/dashboard/stocks/${encodeURIComponent(row.symbol)}`}
                              className="inline-flex items-center rounded-full border border-cyan-400/35 bg-cyan-500/10 px-5 py-3 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20"
                            >
                              View Chart
                            </Link>

                            <button
                              onClick={() => handleRemove(row.symbol)}
                              className="inline-flex items-center rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-5 py-3 text-sm font-medium text-fuchsia-200 transition hover:bg-fuchsia-500/20"
                            >
                              Remove
                            </button>
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
      </ExpiredBlur>

      {alertModalSymbol && (
        <PriceAlertModal
          symbol={alertModalSymbol}
          companyName={
            rows.find((r) => r.symbol === alertModalSymbol)?.company_name
          }
          currentPrice={0}
          existingAlerts={existingAlertsForModal(alertModalSymbol)}
          onClose={() => setAlertModalSymbol(null)}
          onSaved={loadAlerts}
        />
      )}
    </div>
  );
}
