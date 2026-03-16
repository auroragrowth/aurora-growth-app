"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type WatchlistItem = {
  id: string;
  ticker: string;
  company_name?: string | null;
  sector?: string | null;
  industry?: string | null;
  market_cap?: string | number | null;
  price?: string | number | null;
  change_percent?: string | number | null;
  source_list?: string | null;
  created_at?: string | null;
};

type CurrencyCode = "USD" | "GBP" | "EUR";
type LadderType = 30 | 40 | 50 | 60 | 70;

type LadderRow = {
  step: number;
  entryLevel: string;
  entryPrice: number;
  investmentAmount: number;
  investmentPercent: number;
  shares: number;
  cumulativeShares: number;
  remainingCash: number;
};

function parseNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(value: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatNumber(value: number, digits = 4): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: digits,
  }).format(value);
}

function getCurrencyPrefix(currency: CurrencyCode): string {
  switch (currency) {
    case "GBP":
      return "£";
    case "EUR":
      return "€";
    default:
      return "US$";
  }
}

function getLadderDrops(type: LadderType): number[] {
  switch (type) {
    case 30:
      return [10, 20, 30];
    case 40:
      return [10, 20, 30, 40];
    case 50:
      return [20, 30, 40, 50];
    case 60:
      return [30, 40, 50, 60];
    case 70:
      return [20, 30, 40, 50, 60, 70];
    default:
      return [20, 30, 40, 50];
  }
}

function getBaseAllocation(lineCount: number): number {
  let total = 0;
  for (let i = 0; i < lineCount; i += 1) {
    total += Math.pow(1.25, i);
  }
  return 1 / total;
}

function getMidpointStep(type: LadderType): number {
  if (type === 70) return 3;
  return 2;
}

export default function InvestmentsCalculatorPage() {
  const supabase = createClient();

  const [loadingWatchlist, setLoadingWatchlist] = useState(true);
  const [watchlistError, setWatchlistError] = useState("");
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  const [selectedWatchlistId, setSelectedWatchlistId] = useState("");
  const [ticker, setTicker] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [referencePrice, setReferencePrice] = useState("");
  const [cashAvailable, setCashAvailable] = useState("5000");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [ladderType, setLadderType] = useState<LadderType>(50);

  const [loadingLivePrice, setLoadingLivePrice] = useState(false);
  const [livePriceError, setLivePriceError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadWatchlist() {
      setLoadingWatchlist(true);
      setWatchlistError("");

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (active) {
            setWatchlist([]);
            setLoadingWatchlist(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from("watchlist")
          .select("id,ticker,company_name,sector,industry,market_cap,price,change_percent,source_list,created_at")
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (active) {
          setWatchlist((data || []) as WatchlistItem[]);
        }
      } catch (err: any) {
        console.error("Failed loading watchlist:", err);
        if (active) {
          setWatchlist([]);
          setWatchlistError(err?.message || "Failed loading watchlist.");
        }
      } finally {
        if (active) {
          setLoadingWatchlist(false);
        }
      }
    }

    loadWatchlist();

    return () => {
      active = false;
    };
  }, [supabase]);

  async function loadLiveTicker(symbol: string) {
    const clean = symbol.trim().toUpperCase();
    if (!clean) return;

    setLoadingLivePrice(true);
    setLivePriceError("");

    try {
      const res = await fetch(`/api/finviz/ticker?ticker=${encodeURIComponent(clean)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load ticker");
      }

      const livePrice = parseNumber(data?.price);
      const liveCompany = data?.company || data?.company_name || "";

      if (liveCompany) {
        setCompanyName(liveCompany);
      }

      if (livePrice !== null) {
        setReferencePrice(String(livePrice));
      } else {
        setLivePriceError("Ticker loaded but no live price was returned.");
      }
    } catch (err: any) {
      console.error("Failed loading live ticker:", err);
      setLivePriceError(err?.message || "Could not load live ticker price.");
    } finally {
      setLoadingLivePrice(false);
    }
  }

  function handleWatchlistChange(id: string) {
    setSelectedWatchlistId(id);

    const item = watchlist.find((row) => row.id === id);
    if (!item) return;

    setTicker(item.ticker || "");
    setCompanyName(item.company_name || "");

    const storedPrice = parseNumber(item.price);
    if (storedPrice !== null) {
      setReferencePrice(String(storedPrice));
    }

    void loadLiveTicker(item.ticker || "");
  }

  function clearTicker() {
    setSelectedWatchlistId("");
    setTicker("");
    setCompanyName("");
    setReferencePrice("");
    setLivePriceError("");
  }

  const reference = parseNumber(referencePrice) || 0;
  const cash = parseNumber(cashAvailable) || 0;
  const ladderDrops = getLadderDrops(ladderType);
  const baseAllocation = getBaseAllocation(ladderDrops.length);
  const midpointStep = getMidpointStep(ladderType);

  const ladderRows = useMemo<LadderRow[]>(() => {
    if (reference <= 0 || cash <= 0) return [];

    let cumulativeShares = 0;
    let runningAllocated = 0;

    return ladderDrops.map((drop, index) => {
      const investmentPercentDecimal = baseAllocation * Math.pow(1.25, index);
      const investmentAmount = cash * investmentPercentDecimal;
      const entryPrice = reference * (1 - drop / 100);
      const shares = entryPrice > 0 ? investmentAmount / entryPrice : 0;

      cumulativeShares += shares;
      runningAllocated += investmentAmount;

      return {
        step: index + 1,
        entryLevel: `-${drop}%`,
        entryPrice,
        investmentAmount,
        investmentPercent: investmentPercentDecimal * 100,
        shares,
        cumulativeShares,
        remainingCash: Math.max(0, cash - runningAllocated),
      };
    });
  }, [reference, cash, ladderDrops, baseAllocation]);

  const totalShares = ladderRows.length
    ? ladderRows[ladderRows.length - 1].cumulativeShares
    : 0;

  const combinedFirstTwo = useMemo(() => {
    const firstTwo = ladderRows.slice(0, 2);
    const amount = firstTwo.reduce((sum, row) => sum + row.investmentAmount, 0);
    const shares = firstTwo.reduce((sum, row) => sum + row.shares, 0);
    const averagePrice = shares > 0 ? amount / shares : 0;

    return {
      amount,
      shares,
      averagePrice,
    };
  }, [ladderRows]);

  const profitLines = useMemo(() => {
    const bepPrice = combinedFirstTwo.averagePrice;
    const bepShares = combinedFirstTwo.shares;

    if (bepPrice <= 0 || bepShares <= 0) return [];

    return [10, 15, 20, 25].map((pct) => {
      const price = bepPrice * (1 + pct / 100);
      const cashProfit = (price - bepPrice) * bepShares;

      return {
        percent: pct,
        price,
        cashProfit,
      };
    });
  }, [combinedFirstTwo]);

  const chartHref = useMemo(() => {
    const line1 = ladderRows[0]?.entryPrice || 0;
    const line2 = ladderRows[1]?.entryPrice || 0;
    const bep = combinedFirstTwo.averagePrice || 0;
    const p10 = profitLines.find((line) => line.percent === 10)?.price || 0;
    const p15 = profitLines.find((line) => line.percent === 15)?.price || 0;
    const p20 = profitLines.find((line) => line.percent === 20)?.price || 0;
    const p25 = profitLines.find((line) => line.percent === 25)?.price || 0;

    const params = new URLSearchParams({
      ticker: ticker || "MSFT",
      current: reference > 0 ? String(reference) : "0",
      line1: line1 > 0 ? String(line1) : "0",
      line2: line2 > 0 ? String(line2) : "0",
      bep: bep > 0 ? String(bep) : "0",
      p10: p10 > 0 ? String(p10) : "0",
      p15: p15 > 0 ? String(p15) : "0",
      p20: p20 > 0 ? String(p20) : "0",
      p25: p25 > 0 ? String(p25) : "0",
    });

    return `/dashboard/chart?${params.toString()}`;
  }, [ticker, reference, ladderRows, combinedFirstTwo, profitLines]);

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(4,16,48,0.98),rgba(5,20,56,0.96))] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.3)]">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-white">
            Aurora Investment Ladder Calculator
          </h2>
          <p className="mt-2 max-w-4xl text-slate-300">
            Select a watchlist ticker or enter one manually, then build a staged Aurora ladder plan.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1fr_auto_auto]">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Watchlist</label>
            <select
              value={selectedWatchlistId}
              onChange={(e) => handleWatchlistChange(e.target.value)}
              className="w-full rounded-2xl border border-cyan-500/15 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
            >
              <option value="">
                {loadingWatchlist
                  ? "Loading watchlist..."
                  : watchlist.length
                    ? "Select from watchlist"
                    : "No watchlist items found"}
              </option>
              {watchlist.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.ticker}
                  {item.company_name ? ` - ${item.company_name}` : ""}
                </option>
              ))}
            </select>
            {watchlistError ? (
              <p className="mt-2 text-sm text-rose-300">{watchlistError}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Ticker</label>
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="w-full rounded-2xl border border-cyan-500/15 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              placeholder="ANET"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Reference Price</label>
            <input
              value={referencePrice}
              onChange={(e) => setReferencePrice(e.target.value)}
              className="w-full rounded-2xl border border-cyan-500/15 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              placeholder="399.82"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Cash Available</label>
            <input
              value={cashAvailable}
              onChange={(e) => setCashAvailable(e.target.value)}
              className="w-full rounded-2xl border border-cyan-500/15 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              placeholder="5000"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Ladder Type</label>
            <select
              value={ladderType}
              onChange={(e) => setLadderType(Number(e.target.value) as LadderType)}
              className="w-full rounded-2xl border border-cyan-500/15 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
            >
              <option value={30}>30%</option>
              <option value={40}>40%</option>
              <option value={50}>50%</option>
              <option value={60}>60%</option>
              <option value={70}>70%</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="w-full rounded-2xl border border-cyan-500/15 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
            >
              <option value="USD">$ USD</option>
              <option value="GBP">£ GBP</option>
              <option value="EUR">€ EUR</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void loadLiveTicker(ticker)}
              className="min-w-[160px] rounded-[22px] bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-300 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_10px_30px_rgba(34,211,238,0.25)] transition hover:brightness-105"
            >
              {loadingLivePrice ? "Loading..." : "Calculate Ladder"}
            </button>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={clearTicker}
              className="min-w-[120px] rounded-[22px] border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Clear Ticker
            </button>
          </div>
        </div>

        {(selectedWatchlistId || companyName) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedWatchlistId ? (
              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
                Selected: {ticker || "Ticker"}
              </span>
            ) : null}
            {selectedWatchlistId ? (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                In Watchlist
              </span>
            ) : null}
            {companyName ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                {companyName}
              </span>
            ) : null}
          </div>
        )}

        {livePriceError ? (
          <p className="mt-4 text-sm text-rose-300">{livePriceError}</p>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
            Ticker
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {ticker || "-"}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
            Reference Price
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {reference > 0 ? `${getCurrencyPrefix(currency)}${reference.toFixed(2)}` : "-"}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
            Cash Available
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {cash > 0 ? formatMoney(cash, currency) : "-"}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
            Total Shares
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {totalShares > 0 ? formatNumber(totalShares, 4) : "-"}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
            Ladder
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {ladderType}%
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(4,16,48,0.98),rgba(5,20,56,0.96))] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.3)]">
        <div className="mb-5">
          <h3 className="text-2xl font-semibold text-white">
            Investment Ladder
          </h3>
          <p className="mt-2 text-slate-300">
            Highlighted entry step is the midpoint of the selected ladder.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-8 bg-white/5 text-xs uppercase tracking-[0.2em] text-slate-400">
            <div className="px-4 py-3">Step</div>
            <div className="px-4 py-3">Entry Level</div>
            <div className="px-4 py-3">Entry Price</div>
            <div className="px-4 py-3">Investment</div>
            <div className="px-4 py-3">% of Total</div>
            <div className="px-4 py-3">Shares</div>
            <div className="px-4 py-3">Cumulative Shares</div>
            <div className="px-4 py-3">Remaining Cash</div>
          </div>

          {ladderRows.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-300">
              Enter a valid ticker, reference price and cash amount to build the ladder.
            </div>
          ) : (
            ladderRows.map((row) => (
              <div
                key={row.step}
                className={`grid grid-cols-8 border-t border-white/10 text-sm ${
                  row.step === midpointStep
                    ? "bg-cyan-500/10 text-white"
                    : "text-white"
                }`}
              >
                <div className="flex items-center gap-2 px-4 py-4">
                  <span className="font-medium">{row.step}</span>
                  {row.step === midpointStep ? (
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                      Entry Step
                    </span>
                  ) : null}
                </div>
                <div className="px-4 py-4">{row.entryLevel}</div>
                <div className="px-4 py-4">
                  {getCurrencyPrefix(currency)}{row.entryPrice.toFixed(2)}
                </div>
                <div className="px-4 py-4">{formatMoney(row.investmentAmount, currency)}</div>
                <div className="px-4 py-4">{formatPercent(row.investmentPercent)}</div>
                <div className="px-4 py-4">{formatNumber(row.shares, 4)}</div>
                <div className="px-4 py-4">{formatNumber(row.cumulativeShares, 4)}</div>
                <div className="px-4 py-4">{formatMoney(row.remainingCash, currency)}</div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-emerald-200/80">
            First 2 Lines Average Price
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {combinedFirstTwo.averagePrice > 0
              ? `${getCurrencyPrefix(currency)}${combinedFirstTwo.averagePrice.toFixed(2)}`
              : "-"}
          </div>
          <div className="mt-2 text-sm text-slate-200">
            Combine line 1 and line 2 to get the blended average entry price.
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-emerald-200/80">
            First 2 Lines Shares
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {combinedFirstTwo.shares > 0 ? formatNumber(combinedFirstTwo.shares, 4) : "-"}
          </div>
          <div className="mt-2 text-sm text-slate-200">
            Add the shares from line 1 and line 2 together.
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-emerald-200/80">
            First 2 Lines Amount
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {formatMoney(combinedFirstTwo.amount, currency)}
          </div>
          <div className="mt-2 text-sm text-slate-200">
            Total amount invested across the first 2 ladder lines.
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-sky-400/20 bg-sky-500/10 p-6">
        <h3 className="text-xl font-semibold text-white">
          Buying In Lines
        </h3>
        <p className="mt-2 text-sm text-slate-200">
          Use these levels for your buying lines on the chart.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {ladderRows.length === 0 ? (
            <div className="text-sm text-slate-200">
              No buying lines yet.
            </div>
          ) : (
            ladderRows.map((row) => (
              <div
                key={`buy-${row.step}`}
                className="rounded-2xl border border-sky-300/20 bg-sky-400/10 p-4"
              >
                <div className="text-xs uppercase tracking-[0.22em] text-sky-100/80">
                  Buy In Point {row.step}
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {getCurrencyPrefix(currency)}{row.entryPrice.toFixed(2)}
                </div>
                <div className="mt-1 text-sm text-slate-200">
                  {row.entryLevel}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-[30px] border border-amber-400/20 bg-amber-500/10 p-6">
        <h3 className="text-xl font-semibold text-white">
          Profit Lines
        </h3>
        <p className="mt-2 text-sm text-slate-200">
          Calculated from the BEP using the first 2 ladder lines.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {profitLines.length === 0 ? (
            <div className="text-sm text-slate-200">
              No profit lines yet.
            </div>
          ) : (
            profitLines.map((line) => (
              <div
                key={`profit-${line.percent}`}
                className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4"
              >
                <div className="text-xs uppercase tracking-[0.22em] text-amber-100/80">
                  +{line.percent}% Profit
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {getCurrencyPrefix(currency)}{line.price.toFixed(2)}
                </div>
                <div className="mt-1 text-sm text-slate-200">
                  Price target from BEP
                </div>
                <div className="mt-3 text-xs uppercase tracking-[0.18em] text-amber-100/70">
                  Cash Profit
                </div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {formatMoney(line.cashProfit, currency)}
                </div>
                <div className="mt-1 text-xs text-slate-200">
                  From BEP {combinedFirstTwo.averagePrice > 0 ? `${getCurrencyPrefix(currency)}${combinedFirstTwo.averagePrice.toFixed(2)}` : "-"}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6">
          <Link
            href={chartHref}
            className="inline-flex items-center justify-center rounded-[22px] bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-300 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_10px_30px_rgba(34,211,238,0.25)] transition hover:brightness-105"
          >
            Analyze on Chart
          </Link>
        </div>
      </section>
    </div>
  );
}
