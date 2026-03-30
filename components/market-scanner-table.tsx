"use client";

import Link from "next/link";
import { useMemo, useState, useRef, useEffect } from "react";

type ScannerRow = {
  ticker: string;
  company: string;
  marketCap?: string;
  sector?: string;
  industry?: string;
  price?: string | number;
  change?: string | number;
};

type SortKey =
  | "ticker"
  | "company"
  | "marketCap"
  | "sector"
  | "industry"
  | "price"
  | "change";

type Props = {
  title?: string;
  description?: string;
  rows: ScannerRow[];
  pageSize?: number;
  onWatchToggle?: (ticker: string) => void;
  watchlist?: string[];
};

function parseSortableValue(value: unknown) {
  if (value === null || value === undefined || value === "-") return "";

  if (typeof value === "number") return value;

  const str = String(value).trim();

  const numeric = Number(str.replace(/[$,%BMK,]/g, ""));
  if (!Number.isNaN(numeric) && str.match(/[\d.]/)) return numeric;

  return str.toLowerCase();
}

function ActionDropdown({
  ticker,
  isSaved,
  onWatchToggle,
}: {
  ticker: string;
  isSaved: boolean;
  onWatchToggle?: (ticker: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 transition hover:border-rose-400/40 hover:bg-rose-500/15"
      >
        View Chart
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1628] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <Link
            href={`/dashboard/stocks/${encodeURIComponent(ticker)}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/[0.05]"
          >
            <span>📈</span>
            Open full chart
          </Link>
          <button
            onClick={() => {
              onWatchToggle?.(ticker);
              setOpen(false);
            }}
            disabled={isSaved}
            className={`flex w-full items-center gap-2 px-4 py-3 text-sm transition ${
              isSaved
                ? "cursor-default text-slate-500"
                : "text-slate-200 hover:bg-white/[0.05]"
            }`}
          >
            {isSaved ? (
              <>
                <span>✓</span>
                In watchlist
              </>
            ) : (
              <>
                <span>⭐</span>
                Add to watchlist
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default function MarketScannerTable({
  title = "Aurora Market Scanner",
  description = "Discover companies from Aurora scanner rules.",
  rows,
  pageSize = 20,
  onWatchToggle,
  watchlist = [],
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("ticker");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [confirmTicker, setConfirmTicker] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  const sortedRows = useMemo(() => {
    const cloned = [...rows];

    cloned.sort((a, b) => {
      const aVal = parseSortableValue(a[sortKey]);
      const bVal = parseSortableValue(b[sortKey]);

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return cloned;
  }, [rows, sortKey, sortDir]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  }

  function handleStarClick(ticker: string, isSaved: boolean) {
    if (isSaved) {
      setConfirmTicker(ticker);
    } else {
      onWatchToggle?.(ticker);
    }
  }

  return (
    <section className="space-y-4">
      {/* Confirm remove dialog */}
      {confirmTicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0b1628] p-6 shadow-2xl">
            <p className="text-sm text-slate-200">
              Remove <span className="font-semibold text-white">{confirmTicker}</span> from your watchlist?
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  onWatchToggle?.(confirmTicker);
                  setConfirmTicker(null);
                }}
                className="flex-1 rounded-full bg-red-500/20 px-4 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/30"
              >
                Remove
              </button>
              <button
                onClick={() => setConfirmTicker(null)}
                className="flex-1 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.06]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="text-[11px] uppercase tracking-[0.35em] text-cyan-400/80">
          Aurora Growth
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-white">{title}</h1>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-cyan-500/15 bg-[radial-gradient(circle_at_top,rgba(24,55,120,0.28),rgba(2,8,23,0.96)_58%)] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_20px_80px_rgba(0,0,0,0.45)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-white/8">
              <tr className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
                <th className="px-5 py-4">Watch</th>

                <th className="px-5 py-4">
                  <button
                    onClick={() => handleSort("ticker")}
                    className="inline-flex items-center gap-2 hover:text-white"
                  >
                    Ticker <span className="text-xs">{sortIndicator("ticker")}</span>
                  </button>
                </th>

                <th className="px-5 py-4">
                  <button
                    onClick={() => handleSort("company")}
                    className="inline-flex items-center gap-2 hover:text-white"
                  >
                    Company <span className="text-xs">{sortIndicator("company")}</span>
                  </button>
                </th>

                <th className="px-5 py-4">
                  <button
                    onClick={() => handleSort("marketCap")}
                    className="inline-flex items-center gap-2 hover:text-white"
                  >
                    Market Cap <span className="text-xs">{sortIndicator("marketCap")}</span>
                  </button>
                </th>

                <th className="px-5 py-4">
                  <button
                    onClick={() => handleSort("sector")}
                    className="inline-flex items-center gap-2 hover:text-white"
                  >
                    Sector <span className="text-xs">{sortIndicator("sector")}</span>
                  </button>
                </th>

                <th className="px-5 py-4">
                  <button
                    onClick={() => handleSort("industry")}
                    className="inline-flex items-center gap-2 hover:text-white"
                  >
                    Industry <span className="text-xs">{sortIndicator("industry")}</span>
                  </button>
                </th>

                <th className="px-5 py-4">
                  <button
                    onClick={() => handleSort("price")}
                    className="inline-flex items-center gap-2 hover:text-white"
                  >
                    Price <span className="text-xs">{sortIndicator("price")}</span>
                  </button>
                </th>

                <th className="px-5 py-4">
                  <button
                    onClick={() => handleSort("change")}
                    className="inline-flex items-center gap-2 hover:text-white"
                  >
                    Change <span className="text-xs">{sortIndicator("change")}</span>
                  </button>
                </th>

                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-400">
                    No scanner results found.
                  </td>
                </tr>
              ) : (
                pagedRows.map((row) => {
                  const isSaved = watchlist.includes(row.ticker);

                  return (
                    <tr
                      key={row.ticker}
                      className="border-b border-white/6 text-sm text-slate-200 transition hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleStarClick(row.ticker, isSaved)}
                          className="text-xl transition hover:scale-110"
                          title={isSaved ? "Remove from watchlist" : "Add to watchlist"}
                        >
                          {isSaved ? (
                            <span className="text-yellow-400">★</span>
                          ) : (
                            <span className="text-slate-500 hover:text-yellow-400">☆</span>
                          )}
                        </button>
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/stocks/${encodeURIComponent(row.ticker)}`}
                          className="font-semibold text-cyan-300 hover:text-cyan-200"
                        >
                          {row.ticker}
                        </Link>
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/stocks/${encodeURIComponent(row.ticker)}`}
                          className="hover:text-white"
                        >
                          {row.company}
                        </Link>
                      </td>

                      <td className="px-5 py-4 text-slate-300">{row.marketCap || "-"}</td>
                      <td className="px-5 py-4 text-slate-300">{row.sector || "-"}</td>
                      <td className="px-5 py-4 text-slate-300">{row.industry || "-"}</td>
                      <td className="px-5 py-4 text-slate-300">{row.price || "-"}</td>
                      <td className="px-5 py-4 text-slate-300">{row.change || "-"}</td>

                      <td className="px-5 py-4 text-right">
                        <ActionDropdown
                          ticker={row.ticker}
                          isSaved={isSaved}
                          onWatchToggle={onWatchToggle}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-white/8 px-5 py-5">
          <div className="text-sm text-slate-400">
            Showing {pagedRows.length} of {rows.length} results
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>

            <div className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm text-white">
              Page {page} / {totalPages}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
