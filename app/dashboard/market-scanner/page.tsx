"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import WatchlistStarButton from "@/components/watchlist/WatchlistStarButton";
import { useWatchlist } from "@/components/watchlist/WatchlistProvider";

type ScannerRow = {
  ticker?: string;
  symbol?: string;
  company?: string;
  name?: string;
  market_cap?: number | string;
  marketCap?: number | string;
  score?: number;
  momentum?: string;
  price?: number;
  change_pct?: number;
  change?: number;
};

function fmtPrice(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return `$${value.toFixed(2)}`;
}

function fmtPct(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return `${value.toFixed(2)}%`;
}

function normaliseTicker(input?: string | null) {
  return String(input || "").trim().toUpperCase();
}

export default function MarketScannerPage() {
  const [rows, setRows] = useState<ScannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasTicker } = useWatchlist();

  useEffect(() => {
    let mounted = true;

    async function loadScanner() {
      try {
        const res = await fetch("/api/scanner?universe=core", { cache: "no-store" });
        const json = await res.json();

        if (!mounted) return;

        const nextRows =
          Array.isArray(json)
            ? json
            : Array.isArray(json?.rows)
            ? json.rows
            : Array.isArray(json?.data)
            ? json.data
            : Array.isArray(json?.results)
            ? json.results
            : [];

        console.log("scanner api response", json);
        console.log("scanner parsed rows", nextRows);

        setRows(nextRows);
      } catch (error) {
        console.error("Failed to load market scanner:", error);
        if (mounted) setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadScanner();

    return () => {
      mounted = false;
    };
  }, []);

  const safeRows = useMemo(
    () =>
      rows.map((row) => {
        const ticker = normaliseTicker(row.ticker || row.symbol);
        return {
          ...row,
          ticker,
        };
      }),
    [rows]
  );

  return (
    <div className="px-6 py-6 text-white">
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.35em] text-cyan-300/70">
          Aurora Market Table
        </div>
        <h1 className="mt-2 text-3xl font-semibold">Aurora Core</h1>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-cyan-500/10 bg-[#07122b]/90 shadow-[0_0_60px_rgba(0,80,180,0.12)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-white/5 bg-white/[0.02] text-slate-400">
              <tr>
                <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-[0.3em]">Watch</th>
                <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-[0.3em]">Ticker</th>
                <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-[0.3em]">Company</th>
                <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-[0.3em]">Score</th>
                <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-[0.3em]">Price</th>
                <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-[0.3em]">Change</th>
                <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-[0.3em]">Chart</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    Loading scanner...
                  </td>
                </tr>
              ) : safeRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    No scanner rows found.
                  </td>
                </tr>
              ) : (
                safeRows.map((row, index) => {
                  const ticker = row.ticker || "";
                  const company = row.company || row.name || "-";
                  const change = typeof row.change_pct === "number" ? row.change_pct : row.change;

                  return (
                    <tr
                      key={`${ticker}-${index}`}
                      className="border-b border-white/5 transition hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-4">
                        <WatchlistStarButton
                          ticker={ticker}
                          initialActive={hasTicker(ticker)}
                        />
                      </td>

                      <td className="px-5 py-4 font-semibold text-white">
                        {ticker || "-"}
                      </td>

                      <td className="px-5 py-4 text-slate-200">
                        {company}
                      </td>

                      <td className="px-5 py-4 text-cyan-300">
                        {row.score ?? "-"}
                      </td>

                      <td className="px-5 py-4 text-slate-100">
                        {fmtPrice(row.price)}
                      </td>

                      <td
                        className={`px-5 py-4 ${
                          (change || 0) >= 0 ? "text-emerald-300" : "text-rose-300"
                        }`}
                      >
                        {fmtPct(change)}
                      </td>

                      <td className="px-5 py-4">
                        {ticker ? (
                          <Link
                            href={`/dashboard/chart?ticker=${encodeURIComponent(ticker)}`}
                            className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-400/20"
                          >
                            View Chart
                          </Link>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
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
