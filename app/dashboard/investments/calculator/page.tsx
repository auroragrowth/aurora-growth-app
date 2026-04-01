"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ExpiredLock } from "@/components/dashboard/ExpiredOverlay";
import dynamic from "next/dynamic";

const LadderMiniChart = dynamic(
  () => import("@/components/charts/LadderMiniChart"),
  { ssr: false }
);

/* ─── types ─── */

type WatchlistItem = {
  id: string;
  symbol: string;
  company_name?: string | null;
};

type CurrencyCode = "USD" | "GBP" | "EUR";
type LadderType = 30 | 40 | 50 | 60 | 70;
type RefSource = "recent_high" | "covid_high" | "custom";

type LadderRow = {
  step: number;
  entryLevel: string;
  entryPrice: number;
  investmentAmount: number;
  investmentPercent: number;
  shares: number;
  cumulativeShares: number;
  remainingCash: number;
  pctFromHigh: number;
};

type CandleRow = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

type RefData = {
  current_price: number;
  recent_20pct_high: number | null;
  recent_20pct_high_date: string | null;
  days_since_high: number | null;
  high_since_covid: number;
  high_since_covid_date: string | null;
  low_covid_crash: number;
  low_covid_crash_date: string | null;
  high_52w: number;
  high_52w_date: string | null;
  pct_below_recent: number;
  pct_above_covid_low: number;
};

/* ─── helpers ─── */

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
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: digits }).format(value);
}

function getCurrencyPrefix(currency: CurrencyCode): string {
  switch (currency) {
    case "GBP": return "£";
    case "EUR": return "€";
    default: return "$";
  }
}

function getLadderDrops(type: LadderType): number[] {
  switch (type) {
    case 30: return [10, 20, 30];
    case 40: return [10, 20, 30, 40];
    case 50: return [20, 30, 40, 50];
    case 60: return [30, 40, 50, 60];
    case 70: return [20, 30, 40, 50, 60, 70];
    default: return [20, 30, 40, 50];
  }
}

function getBaseAllocation(lineCount: number): number {
  let total = 0;
  for (let i = 0; i < lineCount; i++) total += Math.pow(1.25, i);
  return 1 / total;
}

function getMidpointStep(type: LadderType): number {
  return type === 70 ? 3 : 2;
}

function shortDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

/* ─── component ─── */

export default function InvestmentsCalculatorPage() {
  return <Suspense><InvestmentsCalculatorInner /></Suspense>;
}

function InvestmentsCalculatorInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  // Watchlist
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchlistError, setWatchlistError] = useState("");

  // Inputs
  const [selectedWatchlistId, setSelectedWatchlistId] = useState("");
  const [ticker, setTicker] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [cashAvailable, setCashAvailable] = useState("5000");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [ladderType, setLadderType] = useState<LadderType>(50);
  const [customRefPrice, setCustomRefPrice] = useState("");

  // Reference price state
  const [refSource, setRefSource] = useState<RefSource>("recent_high");
  const [currentPrice, setCurrentPrice] = useState(0);
  const [refData, setRefData] = useState<RefData | null>(null);
  const [loadingRef, setLoadingRef] = useState(false);

  // Profit target — fixed at 20%
  const profitTargetPct = 20;

  // Chart data
  const [candles, setCandles] = useState<CandleRow[]>([]);
  const [loadingCandles, setLoadingCandles] = useState(false);

  // Loading state
  const [loadingTicker, setLoadingTicker] = useState(false);
  const [tickerError, setTickerError] = useState("");

  /* ── Watchlist load ── */
  useEffect(() => {
    let active = true;
    async function load() {
      setLoadingWatchlist(true);
      try {
        const res = await fetch("/api/watchlist", { cache: "no-store" });
        const json = await res.json();
        if (active) setWatchlist((json?.items || []) as WatchlistItem[]);
      } catch (err: any) {
        if (active) setWatchlistError(err?.message || "Failed loading watchlist.");
      } finally {
        if (active) setLoadingWatchlist(false);
      }
    }
    load();
    return () => { active = false; };
  }, [supabase]);

  /* ── Pre-fill from ?ticker= query param ── */
  const [prefilledFromParam, setPrefilledFromParam] = useState(false);
  useEffect(() => {
    const paramTicker = searchParams?.get("ticker");
    if (paramTicker && !prefilledFromParam) {
      setPrefilledFromParam(true);
      setTicker(paramTicker.toUpperCase());
      loadTickerData(paramTicker.toUpperCase());
      return;
    }
  }, [searchParams, prefilledFromParam]);

  /* ── Auto-select first watchlist item ── */
  useEffect(() => {
    if (prefilledFromParam) return;
    if (!watchlist.length || selectedWatchlistId) return;
    const first = watchlist[0];
    setSelectedWatchlistId(first.id);
    setTicker(first.symbol || "");
    setCompanyName(first.company_name || "");
    loadTickerData(first.symbol || "");
  }, [watchlist, selectedWatchlistId, prefilledFromParam]);

  /* ── Load ticker data: price + history + reference ── */
  const loadTickerData = useCallback(async (symbol: string) => {
    const clean = symbol.trim().toUpperCase();
    if (!clean) return;

    setLoadingTicker(true);
    setTickerError("");
    setLoadingCandles(true);
    setLoadingRef(true);

    // 1. Get current price from scanner
    let price = 0;
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(clean)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
      const data = await res.json();
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      const match = rows.find((r: any) => String(r?.symbol || "").toUpperCase() === clean) || rows[0];
      if (!match) throw new Error("No stock data found.");
      const p = parseNumber(match.price) ?? parseNumber(match.current_price) ?? parseNumber(match.close);
      if (p !== null) price = p;
      if (match.company_name || match.company) setCompanyName(match.company_name || match.company);
    } catch (err: any) {
      setTickerError(err?.message || "Could not load ticker.");
    }
    setCurrentPrice(price);
    setLoadingTicker(false);

    // 2. Fetch price history (1y for chart)
    try {
      const res = await fetch(`/api/stock/history?ticker=${encodeURIComponent(clean)}&range=1y`, { cache: "no-store" });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.candles)) {
        setCandles(data.candles);
      }
    } catch {} finally {
      setLoadingCandles(false);
    }

    // 3. Fetch reference price data (needs history to exist first, so slight delay)
    if (price > 0) {
      try {
        // First ensure we have 5y history for reference calculations
        await fetch(`/api/stock/history?ticker=${encodeURIComponent(clean)}&range=5y`, { cache: "no-store" });
        const res = await fetch(
          `/api/stock/reference-price?ticker=${encodeURIComponent(clean)}&current_price=${price}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (data?.ok) setRefData(data as RefData);
      } catch {} finally {
        setLoadingRef(false);
      }
    } else {
      setLoadingRef(false);
    }

    // Log calculator usage for quickstart tracking
    if (price > 0) {
      fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: "calculator_use", event_label: `Calculator used for ${clean}` }),
      }).catch(() => {});
    }
  }, []);

  /* ── Watchlist change ── */
  function handleWatchlistChange(id: string) {
    setSelectedWatchlistId(id);
    const item = watchlist.find((r) => r.id === id);
    if (!item) return;
    setTicker(item.symbol || "");
    setCompanyName(item.company_name || "");
    setRefSource("recent_high");
    setCustomRefPrice("");
    setRefData(null);
    setCandles([]);
    loadTickerData(item.symbol || "");
  }

  function clearTicker() {
    setSelectedWatchlistId("");
    setTicker("");
    setCompanyName("");
    setCurrentPrice(0);
    setRefData(null);
    setCandles([]);
    setRefSource("recent_high");
    setCustomRefPrice("");
    setTickerError("");
  }

  /* ── Derived reference price based on selected source ── */
  const referencePrice = useMemo(() => {
    switch (refSource) {
      case "recent_high": return currentPrice > 0 ? Math.round(currentPrice * 1.20 * 100) / 100 : 0;
      case "covid_high": return refData?.high_since_covid || currentPrice;
      case "custom": return parseNumber(customRefPrice) || 0;
      default: return 0;
    }
  }, [refSource, currentPrice, refData, customRefPrice]);

  const cash = parseNumber(cashAvailable) || 0;
  const ladderDrops = getLadderDrops(ladderType);
  const baseAllocation = getBaseAllocation(ladderDrops.length);
  const midpointStep = getMidpointStep(ladderType);

  /* ── Ladder calculation ── */
  const ladderRows = useMemo<LadderRow[]>(() => {
    if (referencePrice <= 0 || cash <= 0) return [];
    let cumulativeShares = 0;
    let runningAllocated = 0;

    return ladderDrops.map((drop, index) => {
      const investmentPercentDecimal = baseAllocation * Math.pow(1.25, index);
      const investmentAmount = cash * investmentPercentDecimal;
      const entryPrice = referencePrice * (1 - drop / 100);
      const shares = entryPrice > 0 ? investmentAmount / entryPrice : 0;
      cumulativeShares += shares;
      runningAllocated += investmentAmount;
      const pctFromHigh = currentPrice > 0 ? ((currentPrice - entryPrice) / currentPrice) * 100 : 0;

      return {
        step: index + 1,
        entryLevel: `-${drop}%`,
        entryPrice,
        investmentAmount,
        investmentPercent: investmentPercentDecimal * 100,
        shares,
        cumulativeShares,
        remainingCash: Math.max(0, cash - runningAllocated),
        pctFromHigh,
      };
    });
  }, [referencePrice, cash, ladderDrops, baseAllocation, currentPrice]);

  const totalShares = ladderRows.length ? ladderRows[ladderRows.length - 1].cumulativeShares : 0;

  const combinedFirstTwo = useMemo(() => {
    const firstTwo = ladderRows.slice(0, 2);
    const amount = firstTwo.reduce((s, r) => s + r.investmentAmount, 0);
    const shares = firstTwo.reduce((s, r) => s + r.shares, 0);
    return { amount, shares, averagePrice: shares > 0 ? amount / shares : 0 };
  }, [ladderRows]);

  const profitLines = useMemo(() => {
    const bep = combinedFirstTwo.averagePrice;
    const bepShares = combinedFirstTwo.shares;
    if (bep <= 0 || bepShares <= 0) return [];
    return [10, 15, 20, 25].map((pct) => {
      const price = bep * (1 + pct / 100);
      return { percent: pct, price, cashProfit: (price - bep) * bepShares };
    });
  }, [combinedFirstTwo]);

  const cp = getCurrencyPrefix(currency);

  /* ── Chart lines ── */
  const chartLines = useMemo(() => {
    const out: { label: string; price: number; color: string; style: "solid" | "dashed"; lineWidth?: number }[] = [];

    // Reference price line (amber)
    if (referencePrice > 0) {
      out.push({
        label: `Reference · ${cp}${referencePrice.toFixed(2)}`,
        price: referencePrice,
        color: "#D97706",
        style: "solid",
        lineWidth: 2,
      });
    }

    // BEP line (green, solid)
    if (combinedFirstTwo.averagePrice > 0) {
      out.push({
        label: `BEP · ${cp}${combinedFirstTwo.averagePrice.toFixed(2)}`,
        price: combinedFirstTwo.averagePrice,
        color: "#22c55e",
        style: "solid",
        lineWidth: 2,
      });
    }

    // Ladder buy lines (blue, solid)
    ladderRows.forEach((row) => {
      out.push({
        label: `Step ${row.step} · ${cp}${row.entryPrice.toFixed(2)}`,
        price: row.entryPrice,
        color: "#3B82F6",
        style: "solid",
        lineWidth: 2,
      });
    });

    // Profit target lines (gold, dashed) — only when a target % is set
    if (true) {
      ladderRows.forEach((row) => {
        const targetPrice = row.entryPrice * (1 + profitTargetPct / 100);
        out.push({
          label: `Target ${row.step} · ${cp}${targetPrice.toFixed(2)}`,
          price: targetPrice,
          color: "#F59E0B",
          style: "dashed",
          lineWidth: 2,
        });
      });
    }

    return out;
  }, [referencePrice, ladderRows, currency, cp, profitTargetPct, combinedFirstTwo]);

  /* ── Chart link ── */
  const chartHref = useMemo(() => {
    const line1 = ladderRows[0]?.entryPrice || 0;
    const line2 = ladderRows[1]?.entryPrice || 0;
    const bep = combinedFirstTwo.averagePrice || 0;
    const p10 = profitLines.find((l) => l.percent === 10)?.price || 0;
    const p15 = profitLines.find((l) => l.percent === 15)?.price || 0;
    const p20 = profitLines.find((l) => l.percent === 20)?.price || 0;
    const p25 = profitLines.find((l) => l.percent === 25)?.price || 0;
    const params = new URLSearchParams({
      ticker: ticker || "MSFT",
      current: referencePrice > 0 ? String(referencePrice) : "0",
      line1: String(line1), line2: String(line2), bep: String(bep),
      p10: String(p10), p15: String(p15), p20: String(p20), p25: String(p25),
    });
    return `/dashboard/stocks/${ticker || "USLM"}`;
  }, [ticker, referencePrice, ladderRows, combinedFirstTwo, profitLines]);

  /* ── Reference card helper ── */
  const refCards: { key: RefSource; title: string; value: string; sub1: string; sub2: string; borderColor?: string }[] = [
    {
      key: "recent_high",
      title: "RECENT HIGH",
      value: currentPrice > 0
        ? `${cp}${(currentPrice * 1.20).toFixed(2)}`
        : refData?.recent_20pct_high
        ? `${cp}${refData.recent_20pct_high.toFixed(2)}`
        : "—",
      sub1: "20% above current price",
      sub2: currentPrice > 0 ? `Current: ${cp}${currentPrice.toFixed(2)}` : "",
      borderColor: "border-teal-400/40",
    },
  ];

  /* ─── render ─── */
  return (
    <ExpiredLock>
    <div className="space-y-6">

      {/* ═══ TOP: Two-column layout ═══ */}
      <div className="grid gap-6 xl:grid-cols-[2fr_3fr]">

        {/* ─── LEFT COLUMN: Inputs ─── */}
        <section className="rounded-[30px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(4,16,48,0.98),rgba(5,20,56,0.96))] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.3)]">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold text-white">
              Aurora Ladder Calculator
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Select a ticker, choose your reference price source, and build a staged ladder plan.
            </p>
          </div>

          <div className="space-y-4">
            {/* Watchlist */}
            <div>
              <label className="mb-2 block text-sm text-slate-300">Watchlist</label>
              <select
                value={selectedWatchlistId}
                onChange={(e) => handleWatchlistChange(e.target.value)}
                className="w-full rounded-2xl border border-cyan-500/15 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              >
                <option value="">
                  {loadingWatchlist ? "Loading..." : watchlist.length ? "Select from watchlist" : "No items"}
                </option>
                {watchlist.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.symbol}{item.company_name ? ` — ${item.company_name}` : ""}
                  </option>
                ))}
              </select>
              {watchlistError && <p className="mt-2 text-sm text-rose-300">{watchlistError}</p>}
            </div>

            {/* Ticker search */}
            <div>
              <label className="mb-2 block text-sm text-slate-300">Ticker</label>
              <div className="flex gap-2">
                <input
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter") loadTickerData(ticker); }}
                  className="flex-1 rounded-2xl border border-cyan-500/15 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                  placeholder="Search ticker e.g. AAPL"
                />
                <button
                  type="button"
                  onClick={() => loadTickerData(ticker)}
                  disabled={!ticker.trim() || loadingTicker}
                  className="rounded-2xl border border-cyan-500/15 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-40"
                >
                  {loadingTicker ? "..." : "Go"}
                </button>
              </div>
              {currentPrice > 0 && ticker && (
                <p className="mt-2 text-sm text-cyan-300/80">
                  Current: {cp}{currentPrice.toFixed(2)} · Ref: {cp}{referencePrice.toFixed(2)} (+20%)
                </p>
              )}
            </div>

            {/* Cash + Ladder in a row */}
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            {/* Currency */}
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

            {/* Reference price source selector */}
            <div>
              <label className="mb-2 block text-sm text-slate-300">Reference Price</label>
              <div className="grid grid-cols-2 gap-2">
                {(["recent_high", "custom"] as RefSource[]).map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setRefSource(src)}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                      refSource === src
                        ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-200"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/8"
                    }`}
                  >
                    {src === "recent_high" ? "Recent High" : "Custom"}
                  </button>
                ))}
              </div>
              {refSource === "custom" && (
                <input
                  value={customRefPrice}
                  onChange={(e) => setCustomRefPrice(e.target.value)}
                  className="mt-3 w-full rounded-2xl border border-cyan-500/15 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                  placeholder="Enter custom reference price"
                />
              )}
              {referencePrice > 0 && refSource === "recent_high" && currentPrice > 0 && (
                <p className="mt-2 text-sm text-cyan-300/80">
                  {cp}{referencePrice.toFixed(2)} · 20% above current price
                </p>
              )}
              {referencePrice > 0 && refSource === "custom" && (
                <p className="mt-2 text-sm text-cyan-300/80">
                  Reference: {cp}{referencePrice.toFixed(2)}
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => loadTickerData(ticker)}
                disabled={loadingTicker}
                className="flex-1 rounded-[22px] bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-300 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_10px_30px_rgba(34,211,238,0.25)] transition hover:brightness-105 disabled:opacity-60"
              >
                {loadingTicker ? "Loading..." : "Calculate Ladder"}
              </button>
              <button
                type="button"
                onClick={clearTicker}
                className="rounded-[22px] border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Clear
              </button>
            </div>

            {tickerError && <p className="text-sm text-rose-300">{tickerError}</p>}

            {(selectedWatchlistId || companyName) && (
              <div className="flex flex-wrap gap-2">
                {selectedWatchlistId && (
                  <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
                    {ticker}
                  </span>
                )}
                {companyName && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                    {companyName}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ─── RIGHT COLUMN: Chart ─── */}
        <section className="rounded-[30px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(4,16,48,0.98),rgba(5,20,56,0.96))] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.3)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">
                {ticker ? `${ticker} — Price History` : "Price Chart"}
              </h3>
              <p className="mt-1 text-sm text-white/45">
                {candles.length > 0
                  ? `${candles.length} days · Ladder lines overlaid`
                  : "Select a ticker to load chart"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-amber-600/30 bg-amber-600/10 px-2.5 py-1 text-amber-300">Reference</span>
              <span className="rounded-full border border-blue-400/30 bg-blue-400/10 px-2.5 py-1 text-blue-300">Buy Levels</span>
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-amber-200">Profit Targets</span>
            </div>
          </div>

          {loadingCandles ? (
            <div className="flex h-[400px] items-center justify-center rounded-2xl border border-white/10 bg-[#030916] text-sm text-white/40">
              Loading chart data...
            </div>
          ) : (
            <LadderMiniChart
              ticker={ticker}
              candles={candles}
              lines={chartLines}
              height={400}
            />
          )}
        </section>
      </div>

      {/* ═══ REFERENCE PRICE CARDS ═══ */}
      <section className="grid gap-4 sm:grid-cols-2">
        {refCards.map((card) => {
          const isSelected = refSource === card.key;
          return (
            <button
              key={card.key + card.title}
              type="button"
              onClick={() => setRefSource(card.key)}
              className={`rounded-3xl border p-5 text-left transition ${
                isSelected
                  ? `${card.borderColor || "border-cyan-400/40"} bg-cyan-500/10 shadow-[0_0_30px_rgba(34,211,238,0.08)]`
                  : "border-white/10 bg-slate-950/40 hover:border-white/20"
              }`}
            >
              <div className="text-xs uppercase tracking-[0.22em] text-slate-400">{card.title}</div>
              <div className="mt-3 text-3xl font-semibold text-white">{loadingRef ? "..." : card.value}</div>
              <div className="mt-2 text-sm text-slate-300">{card.sub1}</div>
              {card.sub2 && <div className="mt-1 text-sm text-slate-400">{card.sub2}</div>}
            </button>
          );
        })}
      </section>

      {/* ═══ TOP SUMMARY BAR ═══ */}
      {true && ladderRows.length > 0 && (() => {
        const totalInvested = ladderRows.reduce((s, r) => s + r.investmentAmount, 0);
        const totalAtTargets = ladderRows.reduce((s, r) => {
          const targetPrice = r.entryPrice * (1 + profitTargetPct / 100);
          return s + targetPrice * r.shares;
        }, 0);
        const totalGain = totalAtTargets - totalInvested;
        const totalGainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
        return (
          <section className="rounded-2xl border border-white/10 bg-slate-950/80 p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Total Potential Return
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500">Total Invested</div>
                <div className="mt-1 text-xl font-semibold text-white">{formatMoney(totalInvested, currency)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500">Total at Targets</div>
                <div className="mt-1 text-xl font-semibold text-white">{formatMoney(totalAtTargets, currency)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500">Total Gain</div>
                <div className="mt-1 text-xl font-semibold text-emerald-400">
                  +{formatMoney(totalGain, currency)}{" "}
                  <span className="text-sm text-emerald-400/80">(+{totalGainPct.toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ═══ THREE STAT CARDS ═══ */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">First 2 Lines</div>
          <div className="mt-0.5 text-xs uppercase tracking-[0.18em] text-slate-400">Avg Price</div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {combinedFirstTwo.averagePrice > 0 ? `${cp}${combinedFirstTwo.averagePrice.toFixed(2)}` : "—"}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Blended avg entry</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">First 2 Lines</div>
          <div className="mt-0.5 text-xs uppercase tracking-[0.18em] text-slate-400">Shares</div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {combinedFirstTwo.shares > 0 ? formatNumber(combinedFirstTwo.shares, 3) : "—"}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Combined 1 &amp; 2</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">First 2 Lines</div>
          <div className="mt-0.5 text-xs uppercase tracking-[0.18em] text-slate-400">Amount</div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {formatMoney(combinedFirstTwo.amount, currency)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Total invested</div>
        </div>
      </section>

      {/* ═══ ENTRY LINES TABLE ═══ */}
      <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">Entry Lines</h3>
          <p className="mt-1 text-xs text-slate-400">Your staged buy points from the reference price</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                <th className="px-4 py-2.5 text-left font-medium">Line</th>
                <th className="px-4 py-2.5 text-left font-medium">Level</th>
                <th className="px-4 py-2.5 text-left font-medium">Entry Price</th>
                <th className="px-4 py-2.5 text-left font-medium">Investment</th>
                <th className="px-4 py-2.5 text-left font-medium">Shares</th>
              </tr>
            </thead>
            <tbody>
              {ladderRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-slate-500">No entry lines yet.</td>
                </tr>
              ) : (
                ladderRows.map((row) => (
                  <tr
                    key={`entry-${row.step}`}
                    className={`border-t border-white/5 ${
                      row.step === 1
                        ? "bg-blue-500/[0.08]"
                        : row.step === midpointStep
                        ? "bg-teal-500/[0.08]"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-[#3B82F6]" />
                        <span className="font-medium text-white">{row.step}</span>
                        {row.step === midpointStep && (
                          <span className="rounded-full border border-teal-400/20 bg-teal-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-teal-300">
                            BEP
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{row.entryLevel}</td>
                    <td className="px-4 py-3 font-medium text-blue-300">{cp}{row.entryPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-white">{formatMoney(row.investmentAmount, currency)}</td>
                    <td className="px-4 py-3 text-white">{formatNumber(row.shares, 2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ═══ PROFIT TARGETS ═══ */}
      <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">Profit Targets</h3>
          <p className="mt-1 text-xs text-slate-400">
            {true && combinedFirstTwo.averagePrice > 0
              ? <>Calculated from your blended entry price of {cp}{combinedFirstTwo.averagePrice.toFixed(2)}</>
              : "Select a profit target percentage below"}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {profitLines.length === 0 ? (
              <div className="text-sm text-slate-500">No profit targets yet.</div>
            ) : (
              profitLines.map((line) => (
                <div
                  key={`pt-${line.percent}`}
                  className={`rounded-xl border p-4 transition ${
                    profitTargetPct === line.percent
                      ? "border-amber-400/40 bg-amber-500/15"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div className="text-sm font-semibold text-[#F59E0B]">+{line.percent}%</div>
                  <div className="mt-1 text-xl font-semibold text-white">{cp}{line.price.toFixed(2)}</div>
                  <div className="mt-2 text-[11px] text-slate-400">Cash:</div>
                  <div className="text-sm font-medium text-emerald-400">+{formatMoney(line.cashProfit, currency)}</div>
                </div>
              ))
            )}
          </div>

        <div className="mt-4">
          <Link
            href={chartHref}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-300 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-[0_10px_30px_rgba(34,211,238,0.15)] transition hover:brightness-105"
          >
            Analyze on Chart
          </Link>
        </div>
      </section>

    </div>
    </ExpiredLock>
  );
}
