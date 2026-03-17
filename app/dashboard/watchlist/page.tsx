"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import WatchlistStar from "@/components/dashboard/watchlist-star";

type WatchlistItem = {
  id: string;
  user_id: string;
  symbol: string;
  company_name: string | null;
  market: string | null;
  created_at: string;
  updated_at: string;
};

type ScannerRow = {
  ticker?: string;
  company?: string | null;
  company_name?: string | null;
  market_cap?: string | null;
  score?: number | null;
  change_percent?: string | number | null;
  scanner_type?: string | null;
  updated_at?: string | null;
};

type DisplayRow = {
  id: string;
  symbol: string;
  company: string;
  marketCap: string;
  score: number | null;
  changeText: string;
  changeValue: number | null;
  addedText: string;
  addedRaw: string;
  scannerType: string;
};

type SortKey =
  | "watch"
  | "ticker"
  | "company"
  | "marketCap"
  | "score"
  | "change"
  | "added"
  | "action";

function normaliseTicker(input?: string | null) {
  return String(input || "").trim().toUpperCase();
}

function fmtAdded(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function fmtChange(value: unknown) {
  const n = toNumber(value);
  if (n === null) return { text: "-", value: null };
  return { text: `${n.toFixed(2)}%`, value: n };
}

function parseMarketCap(value?: string | null) {
  if (!value) return null;
  const clean = String(value).trim().toUpperCase();
  const match = clean.match(/^([0-9.]+)\s*([KMBT])?$/);
  if (!match) return null;

  const num = Number(match[1]);
  if (!Number.isFinite(num)) return null;

  const suffix = match[2] || "";
  const mult =
    suffix === "K" ? 1_000 :
    suffix === "M" ? 1_000_000 :
    suffix === "B" ? 1_000_000_000 :
    suffix === "T" ? 1_000_000_000_000 :
    1;

  return num * mult;
}

function SortHeader({
  label,
  column,
  sortKey,
  sortDir,
  onClick,
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onClick: (key: SortKey) => void;
}) {
  const active = sortKey === column;
  return (
    <button
      type="button"
      onClick={() => onClick(column)}
      className={[
        "inline-flex items-center gap-2 rounded px-1 py-1 transition",
        active ? "text-cyan-300" : "text-white/40 hover:text-white/75",
      ].join(" ")}
    >
      <span>{label}</span>
      <span className="text-[10px]">{active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}</span>
    </button>
  );
}

export default function WatchlistPage() {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [scannerMap, setScannerMap] = useState<Record<string, ScannerRow>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [listFilter, setListFilter] = useState("all");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("added");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  async function loadAll(showRefreshState = false) {
    try {
      if (showRefreshState) setRefreshing(true);
      else setLoading(true);

      setErrorText(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setItems([]);
        setScannerMap({});
        return;
      }

      const { data: watchlistData, error: watchlistError } = await supabase
        .from("watchlist_items")
        .select("id, user_id, symbol, company_name, market, created_at, updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (watchlistError) throw watchlistError;

      const watchItems = (watchlistData || []) as WatchlistItem[];
      setItems(watchItems);

      const symbols = watchItems.map((x) => normaliseTicker(x.symbol)).filter(Boolean);

      if (!symbols.length) {
        setScannerMap({});
        return;
      }

      const { data: scannerData, error: scannerError } = await supabase
        .from("scanner_results")
        .select("ticker, company, company_name, market_cap, score, change_percent, scanner_type, updated_at")
        .in("ticker", symbols);

      if (scannerError) {
        console.error("Scanner enrichment failed:", scannerError);
        setScannerMap({});
        return;
      }

      const bestByTicker: Record<string, ScannerRow> = {};

      for (const raw of (scannerData || []) as ScannerRow[]) {
        const t = normaliseTicker(raw.ticker);
        if (!t) continue;

        const existing = bestByTicker[t];
        const rawScore = toNumber(raw.score) ?? -1;
        const existingScore = toNumber(existing?.score) ?? -1;

        if (!existing || rawScore >= existingScore) {
          bestByTicker[t] = raw;
        }
      }

      setScannerMap(bestByTicker);
    } catch (error) {
      console.error("Watchlist page load error:", error);
      setErrorText(error instanceof Error ? error.message : "Failed to load watchlist");
      setItems([]);
      setScannerMap({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll(false);
  }, []);

  async function handleRemove(symbol: string) {
    try {
      setRemoving(symbol);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("You must be signed in.");

      const { error } = await supabase
        .from("watchlist_items")
        .delete()
        .eq("user_id", user.id)
        .eq("symbol", normaliseTicker(symbol));

      if (error) throw error;

      setItems((prev) =>
        prev.filter((item) => normaliseTicker(item.symbol) !== normaliseTicker(symbol))
      );

      setScannerMap((prev) => {
        const next = { ...prev };
        delete next[normaliseTicker(symbol)];
        return next;
      });
    } catch (error) {
      console.error("Remove watchlist item error:", error);
      window.alert(error instanceof Error ? error.message : "Failed to remove from watchlist");
    } finally {
      setRemoving(null);
    }
  }

  function handleSort(column: SortKey) {
    if (sortKey === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(column);
      setSortDir(column === "added" ? "desc" : "asc");
    }
  }

  const baseRows = useMemo<DisplayRow[]>(() => {
    let result = items.map((item) => {
      const symbol = normaliseTicker(item.symbol);
      const scan = scannerMap[symbol];
      const company = scan?.company || scan?.company_name || item.company_name || symbol;
      const change = fmtChange(scan?.change_percent);

      return {
        id: item.id,
        symbol,
        company,
        marketCap: scan?.market_cap || "-",
        score: toNumber(scan?.score),
        changeText: change.text,
        changeValue: change.value,
        addedText: fmtAdded(item.created_at),
        addedRaw: item.created_at,
        scannerType:
          scan?.scanner_type === "alternative"
            ? "Aurora Alternative"
            : scan?.scanner_type === "core"
            ? "Aurora Core"
            : "Manual Watchlist",
      };
    });

    if (listFilter !== "all") {
      result = result.filter((row) => {
        if (listFilter === "core") return row.scannerType === "Aurora Core";
        if (listFilter === "alternative") return row.scannerType === "Aurora Alternative";
        if (listFilter === "manual") return row.scannerType === "Manual Watchlist";
        return true;
      });
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((row) =>
        [row.symbol, row.company, row.scannerType].join(" ").toLowerCase().includes(q)
      );
    }

    return result;
  }, [items, scannerMap, search, listFilter]);

  const rows = useMemo(() => {
    const sorted = [...baseRows].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";

      switch (sortKey) {
        case "watch":
        case "ticker":
        case "action":
          av = a.symbol;
          bv = b.symbol;
          break;
        case "company":
          av = a.company;
          bv = b.company;
          break;
        case "marketCap":
          av = parseMarketCap(a.marketCap) ?? -1;
          bv = parseMarketCap(b.marketCap) ?? -1;
          break;
        case "score":
          av = a.score ?? -1;
          bv = b.score ?? -1;
          break;
        case "change":
          av = a.changeValue ?? -9999;
          bv = b.changeValue ?? -9999;
          break;
        case "added":
          av = new Date(a.addedRaw || 0).getTime();
          bv = new Date(b.addedRaw || 0).getTime();
          break;
      }

      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }

      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

    return sorted;
  }, [baseRows, sortKey, sortDir]);

  const totalSaved = items.length;
  const coreCount = baseRows.filter((r) => r.scannerType === "Aurora Core").length;
  const altCount = baseRows.filter((r) => r.scannerType === "Aurora Alternative").length;
  const manualCount = baseRows.filter((r) => r.scannerType === "Manual Watchlist").length;

  return (
    <div className="px-6 py-6 text-white">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Watchlist</h1>
        <div className="mt-1 text-sm text-white/45">Aurora platform workspace</div>
      </div>

      <div className="mb-6 rounded-[28px] border border-cyan-500/10 bg-[#06152d]/80 p-6 shadow-[0_0_60px_rgba(0,80,180,0.12)]">
        <div className="mb-3 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
          Aurora Growth
        </div>
        <h2 className="max-w-4xl text-4xl font-semibold tracking-tight">
          Your saved companies, in one cleaner premium view.
        </h2>
        <p className="mt-4 max-w-4xl text-xl leading-relaxed text-white/60">
          Review companies saved from Aurora Core and Aurora Alternative, search quickly, and jump straight into each stock page.
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs uppercase tracking-[0.35em] text-white/35">Total Saved</div>
          <div className="mt-3 text-5xl font-semibold">{totalSaved}</div>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs uppercase tracking-[0.35em] text-white/35">Aurora Core</div>
          <div className="mt-3 text-5xl font-semibold">{coreCount}</div>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs uppercase tracking-[0.35em] text-white/35">Aurora Alternative</div>
          <div className="mt-3 text-5xl font-semibold">{altCount}</div>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs uppercase tracking-[0.35em] text-white/35">Manual Watchlist</div>
          <div className="mt-3 text-5xl font-semibold">{manualCount}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-cyan-500/10 bg-[#07122b]/90 shadow-[0_0_60px_rgba(0,80,180,0.12)]">
        <div className="flex flex-col gap-4 border-b border-white/5 p-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-white/35">Aurora Watchlist</div>
            <h3 className="mt-2 text-2xl font-semibold">Watchlist</h3>
            <p className="mt-2 text-white/50">
              Saved companies from Aurora Market Scanner and your platform watchlist.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticker, company"
              className="h-12 rounded-full border border-white/10 bg-white/[0.05] px-5 text-white outline-none placeholder:text-white/35"
            />
            <select
              value={listFilter}
              onChange={(e) => setListFilter(e.target.value)}
              className="h-12 rounded-full border border-white/10 bg-[#13284e] px-5 text-white outline-none"
            >
              <option value="all">All lists</option>
              <option value="core">Aurora Core</option>
              <option value="alternative">Aurora Alternative</option>
              <option value="manual">Manual Watchlist</option>
            </select>
            <button
              type="button"
              onClick={() => loadAll(true)}
              className="h-12 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-6 text-cyan-200 transition hover:bg-cyan-400/20"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {errorText ? (
          <div className="p-6 text-rose-300">{errorText}</div>
        ) : loading ? (
          <div className="p-10 text-center text-white/45">Loading watchlist...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-white/45">No saved companies found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-white/5 text-white/40">
                <tr className="text-left text-xs uppercase tracking-[0.25em]">
                  <th className="px-5 py-4"><SortHeader label="Watch" column="watch" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} /></th>
                  <th className="px-5 py-4"><SortHeader label="Ticker" column="ticker" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} /></th>
                  <th className="px-5 py-4"><SortHeader label="Company" column="company" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} /></th>
                  <th className="px-5 py-4"><SortHeader label="Market Cap" column="marketCap" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} /></th>
                  <th className="px-5 py-4"><SortHeader label="Score" column="score" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} /></th>
                  <th className="px-5 py-4"><SortHeader label="Change" column="change" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} /></th>
                  <th className="px-5 py-4"><SortHeader label="Added" column="added" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} /></th>
                  <th className="px-5 py-4"><SortHeader label="Action" column="action" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} /></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 text-white/80 transition hover:bg-white/[0.03]">
                    <td className="px-5 py-4">
                      <WatchlistStar ticker={row.symbol} company={row.company} />
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/chart?ticker=${encodeURIComponent(row.symbol)}`} className="font-semibold tracking-wide text-cyan-300 hover:text-cyan-200">
                        {row.symbol}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-white">
                      <Link href={`/dashboard/chart?ticker=${encodeURIComponent(row.symbol)}`} className="hover:text-cyan-200">
                        {row.company}
                      </Link>
                    </td>
                    <td className="px-5 py-4">{row.marketCap}</td>
                    <td className="px-5 py-4 text-cyan-300">{row.score === null ? "-" : row.score}</td>
                    <td className={`px-5 py-4 font-medium ${row.changeValue === null ? "text-white/50" : row.changeValue >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {row.changeText}
                    </td>
                    <td className="px-5 py-4 text-white/55">{row.addedText}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/dashboard/chart?ticker=${encodeURIComponent(row.symbol)}`}
                          className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-400/20"
                        >
                          View Chart
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleRemove(row.symbol)}
                          disabled={removing === row.symbol}
                          className="inline-flex items-center rounded-full border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50"
                        >
                          {removing === row.symbol ? "Removing..." : "Remove"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
