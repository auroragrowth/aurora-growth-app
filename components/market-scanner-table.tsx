"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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

  return (
    <section className="space-y-4">
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
                          onClick={() => onWatchToggle?.(row.ticker)}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                            isSaved
                              ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                              : "border-cyan-500/20 bg-cyan-500/10 text-cyan-300 hover:border-cyan-400/30 hover:bg-cyan-400/10"
                          }`}
                        >
                          {isSaved ? "★ Watching" : "+ Watch"}
                        </button>
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/${row.ticker}`}
                          className="font-semibold text-cyan-300 hover:text-cyan-200"
                        >
                          {row.ticker}
                        </Link>
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/${row.ticker}`}
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
                        <Link
                          href={`/dashboard/${row.ticker}`}
                          className="inline-flex rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 transition hover:border-rose-400/40 hover:bg-rose-500/15"
                        >
                          View
                        </Link>
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
