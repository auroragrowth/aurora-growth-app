"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { useWatchlist } from "@/components/watchlist/WatchlistProvider";

type Universe = "core" | "alternative";

type ScannerRow = {
  id?: string;
  ticker?: string | null;
  symbol?: string | null;
  company_name?: string | null;
  sector?: string | null;
  industry?: string | null;
  market_cap?: string | number | null;
  price?: string | number | null;
  change_percent?: string | number | null;
  change_pct?: string | number | null;
  score?: string | number | null;
  source_list?: string | null;
};

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const cleaned = value.replace(/[%,$\s]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function formatPrice(value: unknown) {
  return `$${toNumber(value, 0).toFixed(2)}`;
}

function formatChange(value: unknown) {
  const num = toNumber(value, 0);
  return `${num > 0 ? "+" : ""}${num.toFixed(2)}%`;
}

function scoreBarWidth(score: unknown) {
  return Math.max(0, Math.min(100, toNumber(score, 0) * 3.33));
}

export default function MarketScannerPage() {
  const router = useRouter();
  const [activeUniverse, setActiveUniverse] = useState<Universe>("core");
  const [rows, setRows] = useState<ScannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { hasTicker, toggleTicker, ready, loading: watchlistLoading } = useWatchlist();

  useEffect(() => {
    let cancelled = false;

    async function loadScanner() {
      try {
        setLoading(true);
        setFetchError(null);

        const res = await fetch(`/api/scanner?universe=${activeUniverse}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load scanner");
        }

        if (!cancelled) {
          setRows(Array.isArray(data?.rows) ? data.rows : []);
        }
      } catch (error) {
        if (!cancelled) {
          setRows([]);
          setFetchError(
            error instanceof Error ? error.message : "Failed to load scanner"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadScanner();

    return () => {
      cancelled = true;
    };
  }, [activeUniverse]);

  const title = useMemo(
    () => (activeUniverse === "core" ? "Aurora Core" : "Aurora Alternative"),
    [activeUniverse]
  );

  async function handleToggleWatch(stock: ScannerRow) {
    const ticker = stock.ticker || stock.symbol || "";
    const companyName = stock.company_name || "";

    if (!ticker) return;

    try {
      const result = await toggleTicker(ticker, companyName);
      if (!result?.ok) {
        throw new Error(result?.error || "Unable to update watchlist");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to update watchlist");
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(24,98,255,0.18),_transparent_30%),linear-gradient(180deg,#020817_0%,#031225_45%,#04162d_100%)] px-6 py-8 text-white">
      <div className="mx-auto max-w-[1400px] space-y-8">
        <section className="space-y-6">
          <div>
            <div className="text-[12px] uppercase tracking-[0.35em] text-cyan-300/80">
              Aurora Market Scanner
            </div>
            <h1 className="mt-2 text-4xl font-semibold text-white md:text-5xl">
              {title}
            </h1>
            <p className="mt-2 text-sm text-white/45">Aurora platform workspace</p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setActiveUniverse("core")}
              className={`rounded-xl border px-5 py-3 text-base transition ${
                activeUniverse === "core"
                  ? "border-cyan-400/70 bg-cyan-400/10 text-cyan-200 shadow-[0_0_25px_rgba(34,211,238,0.12)]"
                  : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              Core
            </button>

            <button
              type="button"
              onClick={() => setActiveUniverse("alternative")}
              className={`rounded-xl border px-5 py-3 text-base transition ${
                activeUniverse === "alternative"
                  ? "border-cyan-400/70 bg-cyan-400/10 text-cyan-200 shadow-[0_0_25px_rgba(34,211,238,0.12)]"
                  : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              Alternative
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-cyan-500/15 bg-[rgba(5,12,30,0.78)] shadow-[0_0_60px_rgba(0,150,255,0.08)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-cyan-500/10 px-6 py-5">
            <div>
              <div className="text-[11px] uppercase tracking-[0.35em] text-cyan-300/80">
                Aurora Market Table
              </div>
              <h2 className="mt-2 text-3xl font-semibold text-white">{title}</h2>
            </div>

            <div className="text-right">
              <div className="text-sm text-white/45">
                {loading ? "Loading..." : `${rows.length} stocks loaded`}
              </div>
              <div className="mt-1 text-xs text-white/30">
                {watchlistLoading || !ready ? "Watchlist syncing..." : "Watchlist ready"}
              </div>
            </div>
          </div>

          {fetchError ? (
            <div className="px-6 py-10">
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-200">
                {fetchError}
              </div>
            </div>
          ) : loading ? (
            <div className="px-6 py-12 text-white/50">Loading scanner...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-white/5">
                  <tr className="text-left text-xs uppercase tracking-[0.25em] text-white/45">
                    <th className="w-[76px] px-4 py-4">Watch</th>
                    <th className="px-4 py-4">Ticker</th>
                    <th className="px-4 py-4">Company</th>
                    <th className="px-4 py-4">Sector</th>
                    <th className="px-4 py-4">Score</th>
                    <th className="px-4 py-4">Price</th>
                    <th className="px-4 py-4">Change</th>
                    <th className="px-4 py-4 text-right">Chart</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((stock, index) => {
                    const ticker = stock.ticker || stock.symbol || "";
                    const inWatchlist = ticker ? hasTicker(ticker) : false;
                    const changeValue = stock.change_percent ?? stock.change_pct ?? 0;
                    const isPositive = toNumber(changeValue, 0) >= 0;

                    return (
                      <tr
                        key={`${ticker}-${index}`}
                        className="group border-t border-cyan-500/10 transition-all duration-200 hover:bg-cyan-500/5 hover:shadow-[inset_0_0_0_1px_rgba(34,211,238,0.14)]"
                      >
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => handleToggleWatch(stock)}
                            className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-200 ${
                              inWatchlist
                                ? "border-amber-300/70 bg-amber-400/20 text-amber-300 shadow-[0_0_22px_rgba(251,191,36,0.28)] hover:bg-amber-400/28"
                                : "border-cyan-400/40 bg-cyan-500/10 text-cyan-300 hover:scale-105 hover:border-cyan-300/70 hover:bg-cyan-400/18 hover:text-cyan-200"
                            }`}
                            title={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                          >
                            <Star className={`h-5 w-5 ${inWatchlist ? "fill-current" : ""}`} />
                          </button>
                        </td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/dashboard/investments/calculator?ticker=${encodeURIComponent(ticker)}`
                              )
                            }
                            className="font-semibold tracking-wide text-cyan-300 transition hover:text-cyan-200"
                          >
                            {ticker}
                          </button>
                        </td>

                        <td className="px-4 py-4 text-white/80">
                          <div className="font-medium">
                            {stock.company_name || "Unknown company"}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-white/55">{stock.sector || "—"}</td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-cyan-400"
                                style={{ width: `${scoreBarWidth(stock.score)}%` }}
                              />
                            </div>
                            <span className="min-w-[24px] text-sm text-white/70">
                              {toNumber(stock.score, 0)}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-white/85">{formatPrice(stock.price)}</td>

                        <td
                          className={`px-4 py-4 font-medium ${
                            isPositive ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {formatChange(changeValue)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/dashboard/investments/calculator?ticker=${encodeURIComponent(ticker)}`
                              )
                            }
                            className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200 transition hover:border-cyan-400/60 hover:bg-cyan-400/15"
                          >
                            View Chart
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
