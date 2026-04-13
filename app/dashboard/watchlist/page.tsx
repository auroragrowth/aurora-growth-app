"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useWatchlist } from "@/components/watchlist/WatchlistProvider";
import { usePortfolio } from "@/components/providers/PortfolioProvider";
import { ExpiredBlur } from "@/components/dashboard/ExpiredOverlay";
import PriceAlertModal from "@/components/watchlist/PriceAlertModal";
import MiniChart from "@/components/tradingview/MiniChart";
import TechnicalAnalysis from "@/components/tradingview/TechnicalAnalysis";
import FundamentalData from "@/components/tradingview/FundamentalData";
import BrokerModeToggle from "@/components/broker/BrokerModeToggle";

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
  readiness?: string | null;
  rises_count_18m?: number | null;
  most_recent_hat_price?: number | null;
  most_recent_hat_date?: string | null;
  drop_from_hat_pct?: number | null;
  is_invested?: boolean | null;
  in_scanner?: boolean | null;
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

function getReadiness(row: WatchlistRow) {
  const rises = row.rises_count_18m || 0;
  const drop = parseFloat(String(row.drop_from_hat_pct || "0"));
  const r = row.readiness || "grey";

  if (rises < 3 || r === "grey")
    return { bg: "bg-white/5 border-white/10", dot: "bg-white/20", text: "text-white/30", label: rises > 0 ? `${rises} peak${rises === 1 ? "" : "s"}` : "—", tooltip: rises > 0 ? `Only ${rises} qualifying peak${rises === 1 ? "" : "s"} in 12 months — needs 3+` : "No Aurora peak data yet", priority: 4 };
  if (r === "green" || drop >= 20)
    return { bg: "bg-green-500/15 border-green-500/30", dot: "bg-green-400", text: "text-green-400", label: `${drop.toFixed(1)}% ↓`, tooltip: `READY — ${drop.toFixed(1)}% below last peak · ${rises} peaks of 20%+ in 12m`, priority: 1 };
  if (r === "amber" || (drop >= 10 && drop < 20))
    return { bg: "bg-amber-500/15 border-amber-500/30", dot: "bg-amber-400", text: "text-amber-400", label: `${drop.toFixed(1)}% ↓`, tooltip: `APPROACHING — ${drop.toFixed(1)}% below peak · needs 20% · ${rises} peaks in 12m`, priority: 2 };
  return { bg: "bg-red-500/10 border-red-500/20", dot: "bg-red-400", text: "text-red-400", label: drop < 0 ? "Above peak" : `${drop.toFixed(1)}% ↓`, tooltip: `NOT READY — ${drop.toFixed(1)}% from peak · ${rises} peaks in 12m`, priority: 3 };
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
  const [scannerMap, setScannerMap] = useState<Record<string, any>>({});
  const [investedSet, setInvestedSet] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Fetch scanner readiness data
  useEffect(() => {
    fetch("/api/aurora-market-scanner?universe=all", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, any> = {};
        (d?.rows || []).forEach((r: any) => {
          if (r.ticker) map[r.ticker.toUpperCase()] = r;
        });
        setScannerMap(map);
      })
      .catch(() => {});
  }, []);

  // Sync invested set from items
  useEffect(() => {
    setInvestedSet(
      new Set(items.filter((i: any) => i.is_invested).map((i: any) => (i.symbol || "").toUpperCase()))
    );
  }, [items]);

  const toggleInvested = async (symbol: string) => {
    const newVal = !investedSet.has(symbol);
    setInvestedSet((prev) => {
      const next = new Set(prev);
      if (newVal) next.add(symbol);
      else next.delete(symbol);
      return next;
    });
    try {
      await fetch("/api/watchlist/invested", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, is_invested: newVal }),
      });
    } catch {
      setInvestedSet((prev) => {
        const next = new Set(prev);
        if (newVal) next.delete(symbol);
        else next.add(symbol);
        return next;
      });
    }
  };

  const syncFromT212 = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/broker/sync-positions", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSyncResult(`✓ ${data.message}`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setSyncResult(`✗ ${data.error}`);
      }
    } catch (e: any) {
      setSyncResult(`✗ ${e.message}`);
    }
    setSyncing(false);
  };

  // Stock Analysis section
  const [analysisTicker, setAnalysisTicker] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [stockMetrics, setStockMetrics] = useState<{
    ticker: string;
    company: string;
    price: number;
    previousClose: number | null;
    changePct: number | null;
    high52w: number | null;
    high90d: number | null;
    high90dDate: string | null;
    recentHigh: number | null;
    recentHighDate: string | null;
    score: number | null;
    marketCapFormatted: string | null;
    volume: number | null;
    pctBelowHigh52w: number | null;
  } | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-select first watchlist item for analysis
  useEffect(() => {
    if (!analysisTicker && items.length > 0) {
      setAnalysisTicker(items[0].symbol);
    }
  }, [items, analysisTicker]);

  // Fetch stock metrics when analysis ticker changes
  useEffect(() => {
    if (!analysisTicker) { setStockMetrics(null); return; }
    setLoadingMetrics(true);
    fetch(`/api/scanner/stock?ticker=${encodeURIComponent(analysisTicker)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setStockMetrics(d))
      .catch(() => setStockMetrics(null))
      .finally(() => setLoadingMetrics(false));
  }, [analysisTicker]);

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
      above: all.find((a) => a.alert_type === "above") || undefined,
      below: all.find((a) => a.alert_type === "below") || undefined,
      entry: all.find((a) => a.alert_type === "entry_level") || undefined,
    };
  }

  const rows: WatchlistRow[] = useMemo(() => {
    return (items || []).map((item: any) => {
      const sym = (item.symbol || item.ticker || "").toUpperCase();
      const sc = scannerMap[sym];
      return {
      id: item.id,
      symbol: sym,
      company_name: item.company_name ?? item.name ?? null,
      created_at: item.created_at ?? null,
      source: item.source ?? null,
      universe: item.universe ?? item.bucket ?? null,
      scanner_source: item.scanner_source ?? null,
      market_cap: item.market_cap ?? null,
      readiness: sc?.readiness ?? null,
      rises_count_18m: sc?.rises_count_18m ?? null,
      most_recent_hat_price: sc?.most_recent_hat_price ?? null,
      most_recent_hat_date: sc?.most_recent_hat_date ?? null,
      drop_from_hat_pct: sc?.drop_from_hat_pct ?? null,
      is_invested: item.is_invested ?? false,
      in_scanner: item.in_scanner ?? true,
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
    }});
  }, [items, scannerMap]);

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
          <p className="mt-1 text-sm text-white/50">
            {isDemo
              ? "Viewing practice account"
              : "Viewing live account"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={syncFromT212}
            disabled={syncing}
            title="Import your open T212 positions to watchlist"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/50 transition-all hover:bg-white/10 hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {syncing ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border border-white/40 border-t-white" />
                Syncing...
              </>
            ) : (
              <>🔗 Sync T212</>
            )}
          </button>
          <BrokerModeToggle initialMode={portfolio.brokerMode || "live"} onModeChange={() => window.location.reload()} />
        </div>
      </div>

      {syncResult && (
        <div className={`rounded-xl border px-4 py-2.5 text-sm ${
          syncResult.startsWith("✓")
            ? "border-green-500/20 bg-green-500/10 text-green-400"
            : "border-red-500/20 bg-red-500/10 text-red-400"
        }`}>
          {syncResult}
        </div>
      )}

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
        <div className="overflow-visible rounded-3xl border border-cyan-500/10 bg-[#041225]/95">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-white/[0.03]">
                <tr className="border-b border-white/5 text-left text-[11px] uppercase tracking-[0.28em] text-white/45">
                  <th className="px-3 py-2.5">Watch</th>

                  <th className="px-3 py-2.5">
                    <button
                      onClick={() => handleSort("ticker")}
                      className="inline-flex items-center gap-2 text-left transition hover:text-cyan-300"
                    >
                      Ticker
                      <span className="text-white/30">&#8597;</span>
                    </button>
                  </th>

                  <th className="px-3 py-2.5">
                    <button
                      onClick={() => handleSort("company")}
                      className="inline-flex items-center gap-2 text-left transition hover:text-cyan-300"
                    >
                      Company
                      <span className="text-white/30">&#8597;</span>
                    </button>
                  </th>

                  <th className="px-3 py-2.5">Readiness</th>

                  <th className="px-3 py-2.5">
                    <button
                      onClick={() => handleSort("source")}
                      className="inline-flex items-center gap-2 text-left transition hover:text-cyan-300"
                    >
                      Source
                      <span className="text-white/30">&#8597;</span>
                    </button>
                  </th>

                  <th className="px-3 py-2.5">
                    <button
                      onClick={() => handleSort("added")}
                      className="inline-flex items-center gap-2 text-left transition hover:text-cyan-300"
                    >
                      Added
                      <span className="text-white/30">&#8597;</span>
                    </button>
                  </th>

                  <th className="px-3 py-2.5">Chart</th>
                  <th className="px-3 py-2.5">Action</th>
                </tr>
              </thead>

              <caption className="caption-bottom p-0">
                <div className="flex items-center gap-4 px-3 py-2.5 flex-wrap">
                  <p className="text-white/20 text-xs">Row colour:</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-green-500/30 border border-green-500/30" />
                    <span className="text-green-400 text-xs">Invested</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/20" />
                    <span className="text-red-400 text-xs">Dropped off Aurora list</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-white/5 border border-white/10" />
                    <span className="text-white/30 text-xs">On list — not invested</span>
                  </div>
                </div>
              </caption>

              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
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
                        className={`border-b text-white/88 transition-all duration-300 ${
                          investedSet.has(row.symbol)
                            ? "border-green-500/20 bg-green-500/10 hover:bg-green-500/15"
                            : row.in_scanner === false && !investedSet.has(row.symbol)
                            ? "border-red-500/15 bg-red-500/[0.08] hover:bg-red-500/[0.12]"
                            : "border-white/5 hover:bg-white/[0.025]"
                        }`}
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRemove(row.symbol)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/35 bg-cyan-500/10 text-sm text-cyan-300 transition hover:scale-105 hover:bg-cyan-500/20"
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
                                  className={`relative inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs transition hover:scale-105 ${
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

                        <td className="px-3 py-2.5">
                          <Link
                            href={`/dashboard/stocks/${encodeURIComponent(row.symbol)}`}
                            className="text-sm font-semibold text-white transition hover:text-cyan-300"
                          >
                            {row.symbol}
                          </Link>
                        </td>

                        <td className="px-3 py-2.5 text-xs text-white/75">
                          <span className="inline-flex items-center gap-1">
                            {row.company_name || "—"}
                            {row.in_scanner === false && !investedSet.has(row.symbol) && (
                              <span className="ml-1 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 border border-red-500/20 font-bold whitespace-nowrap">
                                ⚠ Off list
                              </span>
                            )}
                          </span>
                        </td>

                        <td className="px-3 py-2.5">
                          {(() => {
                            const rd = getReadiness(row);
                            return (
                              <div className="relative inline-block group">
                                <div className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-xs font-bold cursor-help ${rd.bg}`}>
                                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${rd.dot}`} />
                                  <span className={rd.text}>{rd.label}</span>
                                </div>
                                <div className="absolute z-50 left-0 top-full mt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none group-hover:pointer-events-auto w-72 bg-[#080f1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                                  <div className={`px-4 py-2.5 border-b border-white/10 flex items-center gap-2.5 ${rd.bg}`}>
                                    <span className={`w-2.5 h-2.5 rounded-full ${rd.dot}`} />
                                    <div>
                                      <p className={`text-xs font-bold ${rd.text}`}>
                                        {row.readiness === "green" ? "READY TO WATCH" : row.readiness === "amber" ? "APPROACHING" : row.readiness === "red" ? "NOT YET READY" : "INSUFFICIENT DATA"}
                                      </p>
                                      <p className="text-white/40 text-[10px]">Aurora Readiness — {row.symbol}</p>
                                    </div>
                                  </div>
                                  <div className="p-3 space-y-2.5">
                                    <p className="text-white/60 text-xs leading-relaxed">{rd.tooltip}</p>
                                    {row.most_recent_hat_price && (
                                      <div className="grid grid-cols-3 gap-1.5">
                                        <div className="bg-white/5 rounded-lg p-2 text-center">
                                          <p className="text-white/30 text-[10px] mb-0.5">Last peak</p>
                                          <p className="text-xs font-bold text-white">${Number(row.most_recent_hat_price).toFixed(2)}</p>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-2 text-center">
                                          <p className="text-white/30 text-[10px] mb-0.5">Peak date</p>
                                          <p className="text-xs font-bold text-white">{row.most_recent_hat_date ? new Date(row.most_recent_hat_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}</p>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-2 text-center">
                                          <p className="text-white/30 text-[10px] mb-0.5">Drop</p>
                                          <p className={`text-xs font-bold ${parseFloat(String(row.drop_from_hat_pct || "0")) >= 20 ? "text-green-400" : parseFloat(String(row.drop_from_hat_pct || "0")) >= 10 ? "text-amber-400" : "text-red-400"}`}>{parseFloat(String(row.drop_from_hat_pct || "0")).toFixed(1)}%</p>
                                        </div>
                                      </div>
                                    )}
                                    <div>
                                      <div className="flex justify-between mb-1">
                                        <p className="text-white/30 text-[10px] uppercase tracking-wider font-bold">Peaks (12m)</p>
                                        <span className={`text-[10px] font-bold ${(row.rises_count_18m || 0) >= 3 ? "text-green-400" : "text-red-400"}`}>{row.rises_count_18m || 0}/3</span>
                                      </div>
                                      <div className="flex gap-1.5">
                                        {[1, 2, 3].map((n) => (
                                          <div key={n} className={`flex-1 h-1.5 rounded-full ${n <= (row.rises_count_18m || 0) ? "bg-gradient-to-r from-cyan-400 to-purple-400" : "bg-white/10"}`} />
                                        ))}
                                      </div>
                                    </div>
                                    <p className="text-white/20 text-[10px] pt-1 border-t border-white/5">Based on Aurora peak detection — not a buy signal.</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${sourceBadgeClass(source)}`}
                          >
                            {sourceLabel(row)}
                          </span>
                        </td>

                        <td className="px-3 py-2.5 text-xs text-white/55">
                          {formatDate(row.created_at)}
                        </td>

                        <td className="px-3 py-2">
                          <div className="w-[160px] h-[80px] overflow-hidden rounded-lg">
                            <MiniChart ticker={row.symbol} />
                          </div>
                        </td>

                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboard/stocks/${encodeURIComponent(row.symbol)}`}
                              className="inline-flex items-center rounded-full border border-cyan-400/35 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 transition hover:bg-cyan-500/20"
                            >
                              View
                            </Link>

                            <button
                              onClick={() => handleRemove(row.symbol)}
                              className="inline-flex items-center rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-medium text-fuchsia-200 transition hover:bg-fuchsia-500/20"
                            >
                              Remove
                            </button>

                            <button
                              onClick={() => toggleInvested(row.symbol)}
                              title={investedSet.has(row.symbol) ? "Mark as not invested" : "Invested in this stock"}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                investedSet.has(row.symbol)
                                  ? "bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-cyan-400/30 text-cyan-400"
                                  : "bg-white/5 border border-white/10 text-white/30 hover:text-white/60 hover:bg-white/10"
                              }`}
                            >
                              {investedSet.has(row.symbol) ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                                  Invested
                                </>
                              ) : (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-white/20 flex-shrink-0" />
                                  Invest
                                </>
                              )}
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
