"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import TradingViewAdvancedChart from "@/components/stocks/TradingViewAdvancedChart";
import { useWatchlist } from "@/components/watchlist/WatchlistProvider";

type ScannerRow = {
  ticker?: string;
  company?: string;
  company_name?: string;
  sector?: string;
  industry?: string;
  score?: number;
  trend?: string;
  price?: number;
  change_percent?: number;
  change_pct?: number;
  market_cap?: number | string;
  roe?: number;
  roa?: number;
  roi?: number;
  eps_this_y?: number;
  eps_next_y?: number;
  eps_next_5y?: number;
  peg?: number;
  current_ratio?: number;
  debt_eq?: number;
  inst_own?: number;
  scanner_type?: string;
};

type Props = {
  ticker: string;
};

function safeUpper(value: string | undefined | null) {
  return String(value || "").toUpperCase().trim();
}

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function fmtPrice(value: unknown) {
  const n = asNumber(value, NaN);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtPct(value: unknown) {
  const n = asNumber(value, NaN);
  if (!Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function fmtMktCap(value: unknown) {
  const n = asNumber(value, 0);
  if (!n) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtNum(value: unknown, suffix = "") {
  const n = asNumber(value, NaN);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)}${suffix}`;
}

function getMomentum(score: number) {
  if (score >= 30)
    return {
      label: "STRONG",
      cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    };
  if (score >= 22)
    return {
      label: "BUILDING",
      cls: "text-teal-400 bg-teal-500/10 border-teal-500/30",
    };
  if (score >= 15)
    return {
      label: "WATCH",
      cls: "text-amber-300 bg-amber-500/10 border-amber-500/30",
    };
  return {
    label: "WEAK",
    cls: "text-zinc-400 bg-white/5 border-white/10",
  };
}

function makeBuyLadder(price: number) {
  if (!Number.isFinite(price) || price <= 0) return [];
  return [
    { label: "Buy In Point 1", pct: 0, price },
    { label: "Buy In Point 2", pct: -3, price: price * 0.97 },
    { label: "Buy In Point 3", pct: -6, price: price * 0.94 },
    { label: "Buy In Point 4", pct: -9, price: price * 0.91 },
  ];
}

function makeProfitLadder(basePrice: number) {
  if (!Number.isFinite(basePrice) || basePrice <= 0) return [];
  return [
    { label: "Profit 10%", pct: 10, price: basePrice * 1.1 },
    { label: "Profit 15%", pct: 15, price: basePrice * 1.15 },
    { label: "Profit 20%", pct: 20, price: basePrice * 1.2 },
    { label: "Profit 25%", pct: 25, price: basePrice * 1.25 },
  ];
}

function MetricCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        {title}
      </div>
      <div className="mt-1.5 text-lg font-semibold text-white">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

export default function StockIntelligenceClient({ ticker }: Props) {
  const { hasTicker, toggleTicker } = useWatchlist();
  const symbol = safeUpper(ticker);

  const [row, setRow] = useState<ScannerRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTimestamp, setAiTimestamp] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/aurora-market-scanner?universe=all`,
          { cache: "no-store" }
        );
        const data = await res.json();
        const rows: ScannerRow[] = Array.isArray(data?.rows) ? data.rows : [];
        const match = rows.find(
          (r) => safeUpper(r.ticker) === symbol
        );
        if (mounted) setRow(match || null);
      } catch {
        if (mounted) setRow(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [symbol]);

  const loadAiAnalysis = useCallback(async () => {
    setAiLoading(true);
    try {
      const res = await fetch(
        `/api/aurora/intelligence?ticker=${encodeURIComponent(symbol)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data?.analysis) {
        setAiText(data.analysis);
        setAiTimestamp(new Date().toISOString());
      }
    } catch {
      setAiText("Unable to load analysis at this time.");
    } finally {
      setAiLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    loadAiAnalysis();
  }, [loadAiAnalysis]);

  function handleListen() {
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    if (!aiText) return;
    const utterance = new SpeechSynthesisUtterance(aiText);
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    setSpeaking(true);
    speechSynthesis.speak(utterance);
  }

  const company =
    row?.company_name || row?.company || symbol;
  const score = asNumber(row?.score, 0);
  const price = asNumber(row?.price, 0);
  const changePct = asNumber(row?.change_percent ?? row?.change_pct, 0);
  const trend = row?.trend || "flat";
  const sector = row?.sector || "—";
  const industry = row?.industry || "—";
  const momentum = getMomentum(score);

  const buyLadder = makeBuyLadder(price);
  const blendedEntry =
    buyLadder.length >= 2
      ? (buyLadder[0].price + buyLadder[1].price) / 2
      : price;
  const profitLadder = makeProfitLadder(blendedEntry);

  const onWatchlist = hasTicker(symbol);

  function agoText() {
    if (!aiTimestamp) return "";
    const mins = Math.round(
      (Date.now() - new Date(aiTimestamp).getTime()) / 60000
    );
    if (mins < 1) return "Updated just now";
    if (mins < 60) return `Updated ${mins}m ago`;
    return `Updated ${Math.round(mins / 60)}h ago`;
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/dashboard/market-scanner"
              className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 transition hover:bg-white/10"
            >
              ← Back to Market Scanner
            </Link>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-white">
                {symbol}
              </h1>
              <span className="text-lg text-white/50">{company}</span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${momentum.cls}`}
              >
                {momentum.label}
              </span>

              <button
                type="button"
                onClick={() => toggleTicker(symbol, company)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  onWatchlist
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                    : "border-white/15 bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {onWatchlist ? "★ On Watchlist" : "☆ Add to Watchlist"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 lg:w-[420px]">
            <MetricCard title="Price" value={fmtPrice(price)} />
            <MetricCard
              title="Change"
              value={fmtPct(changePct)}
            />
            <MetricCard
              title="Aurora Score"
              value={score ? `${score}` : "—"}
              sub="out of 30"
            />
          </div>
        </div>

        {/* Key metrics strip */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          <MetricCard title="Market Cap" value={fmtMktCap(row?.market_cap)} />
          <MetricCard title="Sector" value={sector} />
          <MetricCard title="Industry" value={industry} />
          <MetricCard title="PEG" value={fmtNum(row?.peg)} />
          <MetricCard title="Trend" value={trend} sub={momentum.label} />
          <MetricCard
            title="Scanner"
            value={
              row?.scanner_type === "core"
                ? "Aurora Core"
                : row?.scanner_type === "alternative"
                  ? "Aurora Alt"
                  : "—"
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_0.9fr]">
          {/* Left column */}
          <div className="space-y-6">
            {/* Chart */}
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] p-3 shadow-2xl">
              <TradingViewAdvancedChart symbol={symbol} />
            </div>

            {/* AI Analysis */}
            <div className="rounded-3xl border border-cyan-500/20 bg-[#08111f] p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400">✦</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                    Aurora Intelligence
                  </span>
                </div>
                <span className="text-xs text-zinc-500">{agoText()}</span>
              </div>

              {aiLoading ? (
                <div className="mt-4 text-sm text-zinc-400">
                  Generating analysis...
                </div>
              ) : showAi && aiText ? (
                <p className="mt-4 text-sm leading-7 text-zinc-300">
                  {aiText}
                </p>
              ) : null}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleListen}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10"
                >
                  {speaking ? "⏹ Stop" : "🎧 Listen"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAi((v) => !v)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10"
                >
                  {showAi ? "Hide" : "Read"}
                </button>
              </div>
            </div>

            {/* Fundamentals */}
            <div className="rounded-3xl border border-white/10 bg-[#08111f] p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Fundamentals
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <MetricCard
                  title="EPS This Year"
                  value={fmtNum(row?.eps_this_y, "%")}
                />
                <MetricCard
                  title="EPS Next Year"
                  value={fmtNum(row?.eps_next_y, "%")}
                />
                <MetricCard
                  title="EPS 5Y"
                  value={fmtNum(row?.eps_next_5y, "%")}
                />
                <MetricCard title="ROE" value={fmtNum(row?.roe, "%")} />
                <MetricCard title="ROA" value={fmtNum(row?.roa, "%")} />
                <MetricCard title="ROI" value={fmtNum(row?.roi, "%")} />
                <MetricCard
                  title="Current Ratio"
                  value={fmtNum(row?.current_ratio)}
                />
                <MetricCard
                  title="Debt/Equity"
                  value={fmtNum(row?.debt_eq)}
                />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-cyan-500/20 bg-[#08111f] p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                Aurora Intelligence
              </div>
              <div className="mt-4 space-y-3 text-sm text-zinc-300">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span>Setup Quality</span>
                  <span className="font-semibold text-white">
                    {score >= 30
                      ? "Elite"
                      : score >= 22
                        ? "Strong"
                        : score >= 15
                          ? "Developing"
                          : "Watch"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span>Momentum</span>
                  <span className="font-semibold text-white">
                    {momentum.label}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span>Current Price</span>
                  <span className="font-semibold text-white">
                    {fmtPrice(price)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span>2-Point Average Entry</span>
                  <span className="font-semibold text-emerald-400">
                    {fmtPrice(blendedEntry)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-sky-500/20 bg-[#08111f] p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-sky-300">
                Buying In Points
              </div>
              <div className="mt-4 space-y-3">
                {buyLadder.map((line) => (
                  <div
                    key={line.label}
                    className="flex items-center justify-between rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-white">
                        {line.label}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {line.pct === 0
                          ? "Current level"
                          : `${line.pct}% from price`}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-sky-300">
                      {fmtPrice(line.price)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-amber-500/20 bg-[#08111f] p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-amber-300">
                Profit Levels
              </div>
              <div className="mt-4 space-y-3">
                {profitLadder.map((line) => (
                  <div
                    key={line.label}
                    className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-white">
                        {line.label}
                      </div>
                      <div className="text-xs text-zinc-400">
                        Target from 2-point average entry
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-amber-300">
                      {fmtPrice(line.price)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
