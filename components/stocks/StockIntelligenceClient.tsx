"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdvancedChart from "@/components/tradingview/AdvancedChart";
import TechnicalAnalysis from "@/components/tradingview/TechnicalAnalysis";
import FundamentalData from "@/components/tradingview/FundamentalData";
import CompanyProfile from "@/components/tradingview/CompanyProfile";
import TopStories from "@/components/tradingview/TopStories";
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
  const str = String(value || "").trim();
  const m = str.match(/^([\d,.]+)\s*([BMT])$/i);
  if (m) return `$${m[1]}${m[2].toUpperCase()}`;
  if (str.includes("%")) return "—";
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

/* ─── Investment Modal ─── */
function InvestmentModal({ ticker, currentPrice, onClose }: { ticker: string; currentPrice: number; onClose: () => void }) {
  const [cash, setCash] = useState("5000");
  const [step, setStep] = useState<"plan" | "review" | "result">("plan");
  const [placing, setPlacing] = useState(false);
  const [placingStep, setPlacingStep] = useState(0);
  const [results, setResults] = useState<{ step: number; success: boolean; orderId?: string; error?: string }[]>([]);

  const refPrice = currentPrice * 1.20;
  const drops = [10, 20, 30, 40];
  const cashNum = parseFloat(cash) || 0;

  const ladder = useMemo(() => {
    if (refPrice <= 0 || cashNum <= 0) return [];
    let totalWeight = 0;
    for (let i = 0; i < drops.length; i++) totalWeight += Math.pow(1.25, i);

    let cumShares = 0;
    return drops.map((drop, i) => {
      const pct = Math.pow(1.25, i) / totalWeight;
      const amount = cashNum * pct;
      const price = refPrice * (1 - drop / 100);
      const shares = price > 0 ? Math.floor(amount / price) : 0;
      cumShares += shares;
      return { step: i + 1, drop, price, amount, shares, cumShares };
    });
  }, [refPrice, cashNum]);

  const bep = useMemo(() => {
    const first2 = ladder.slice(0, 2);
    const totalAmt = first2.reduce((s, r) => s + r.amount, 0);
    const totalShares = first2.reduce((s, r) => s + r.shares, 0);
    return totalShares > 0 ? totalAmt / totalShares : 0;
  }, [ladder]);

  const totalShares = ladder.reduce((s, r) => s + r.shares, 0);
  const totalCost = ladder.reduce((s, r) => s + r.shares * r.price, 0);

  async function placeOrders() {
    setPlacing(true);
    setPlacingStep(0);
    const res: typeof results = [];
    for (let i = 0; i < ladder.length; i++) {
      const row = ladder[i];
      setPlacingStep(i + 1);
      if (row.shares <= 0) { res.push({ step: row.step, success: false, error: "0 shares" }); continue; }
      try {
        const r = await fetch("/api/broker/place-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker, quantity: row.shares, limitPrice: parseFloat(row.price.toFixed(2)), ladderStep: row.step }),
        });
        const data = await r.json();
        const errMsg = !r.ok
          ? r.status === 429 ? "Rate limit — please wait and retry"
            : r.status === 403 ? "Insufficient permissions"
            : data.error || `Failed (${r.status})`
          : undefined;
        res.push({ step: row.step, success: r.ok, orderId: data.orderId?.toString(), error: errMsg });
      } catch (e) {
        res.push({ step: row.step, success: false, error: "Network error" });
      }
      // Wait 2s between orders to avoid broker rate limits
      if (i < ladder.length - 1) await new Promise((r) => setTimeout(r, 2000));
    }
    setResults(res);
    setStep("result");
    setPlacing(false);
  }

  const successCount = results.filter((r) => r.success).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[32px] border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(6,18,42,0.98),rgba(4,12,28,0.98))] p-8 shadow-2xl">
        <button onClick={onClose} className="absolute right-5 top-5 text-slate-400 hover:text-white" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        {step === "plan" && (
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Investment Plan</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">{ticker}</h2>
            <div className="mt-1 text-sm text-slate-400">Current: ${currentPrice.toFixed(2)} · Ref: ${refPrice.toFixed(2)} (+20%)</div>

            <div className="mt-5">
              <label className="mb-2 block text-sm text-slate-300">Cash to invest</label>
              <input value={cash} onChange={(e) => setCash(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-cyan-400/40" placeholder="5000" />
            </div>

            <div className="mt-5 space-y-2">
              {ladder.map((r) => (
                <div key={r.step} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm">
                  <div><span className="font-semibold text-blue-300">Step {r.step}</span> <span className="text-slate-400">-{r.drop}%</span></div>
                  <div className="text-right"><span className="text-white">${r.price.toFixed(2)}</span> <span className="text-slate-500">× {r.shares} shares</span></div>
                </div>
              ))}
            </div>

            {bep > 0 && <div className="mt-3 text-sm text-emerald-300">BEP: ${bep.toFixed(2)} · Total: {totalShares} shares · ${totalCost.toFixed(2)}</div>}

            <button onClick={() => setStep("review")} disabled={!ladder.length || totalShares === 0} className="mt-5 w-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#60a5fa,#a855f7)] px-6 py-3.5 text-base font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-50">
              Review Orders
            </button>
          </div>
        )}

        {step === "review" && (
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Review Orders</div>
            <h2 className="mt-2 text-xl font-semibold text-white">{ticker} — {ladder.length} limit orders</h2>

            <div className="mt-5 space-y-2">
              {ladder.map((r) => (
                <div key={r.step} className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold text-white">Step {r.step}: LIMIT BUY</span>
                    <span className="text-cyan-300">${(r.shares * r.price).toFixed(2)}</span>
                  </div>
                  <div className="mt-1 text-slate-400">${r.price.toFixed(2)} × {r.shares} shares</div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs text-amber-300">
              These orders will be placed on your broker account. Please review carefully.
            </div>

            <div className="mt-5 flex gap-3">
              <button onClick={() => setStep("plan")} className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10">Back</button>
              <button onClick={placeOrders} disabled={placing} className="flex-1 rounded-full bg-[linear-gradient(90deg,#22d3ee,#60a5fa,#a855f7)] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-50">
                {placing ? `Placing order ${placingStep} of ${ladder.length}...` : `Place ${ladder.length} orders`}
              </button>
            </div>
          </div>
        )}

        {step === "result" && (
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Order Results</div>
            <h2 className="mt-2 text-xl font-semibold text-white">
              {successCount === ladder.length ? `${successCount} orders placed` : `${successCount} of ${ladder.length} orders placed`}
            </h2>

            <div className="mt-5 space-y-2">
              {results.map((r) => (
                <div key={r.step} className={`rounded-xl border px-4 py-3 text-sm ${r.success ? "border-emerald-400/20 bg-emerald-400/5" : "border-rose-400/20 bg-rose-400/5"}`}>
                  <div className="flex justify-between">
                    <span className="font-semibold text-white">Step {r.step}</span>
                    <span className={r.success ? "text-emerald-300" : "text-rose-300"}>{r.success ? "Placed" : "Failed"}</span>
                  </div>
                  {r.orderId && <div className="mt-1 text-xs text-slate-400">Order ID: {r.orderId}</div>}
                  {r.error && <div className="mt-1 text-xs text-rose-300">{r.error}</div>}
                </div>
              ))}
            </div>

            <button onClick={onClose} className="mt-5 w-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#60a5fa,#a855f7)] px-6 py-3.5 text-base font-semibold text-slate-950 transition hover:brightness-110">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StockIntelligenceClient({ ticker }: Props) {
  const router = useRouter();
  const { hasTicker, toggleTicker, items: watchlistItems } = useWatchlist();
  const symbol = safeUpper(ticker);

  const [row, setRow] = useState<ScannerRow | null>(null);
  const [allRows, setAllRows] = useState<ScannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [aiTimestamp, setAiTimestamp] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  // Ticker search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchResults = useMemo(() => {
    const q = searchQuery.toUpperCase().trim();
    const wlTickers = (watchlistItems || []).map((i: any) => safeUpper(i.symbol || i.ticker));

    // Build deduplicated list: watchlist first, then scanner
    const seen = new Set<string>();
    const results: { ticker: string; company: string; isWatchlist: boolean }[] = [];

    for (const item of watchlistItems || []) {
      const t = safeUpper(item.symbol || (item as any).ticker);
      if (!t || seen.has(t)) continue;
      if (q && !t.includes(q) && !(item.company_name || "").toUpperCase().includes(q)) continue;
      seen.add(t);
      results.push({ ticker: t, company: item.company_name || "", isWatchlist: true });
    }

    for (const r of allRows) {
      const t = safeUpper(r.ticker);
      if (!t || seen.has(t)) continue;
      if (q && !t.includes(q) && !(r.company_name || r.company || "").toUpperCase().includes(q)) continue;
      seen.add(t);
      results.push({ ticker: t, company: r.company_name || r.company || "", isWatchlist: false });
    }

    return results.slice(0, 20);
  }, [searchQuery, watchlistItems, allRows]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
        if (mounted) {
          setRow(match || null);
          setAllRows(rows);
        }
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
      // Try Anthropic-powered route first
      const res = await fetch(
        `/api/aurora/intelligence?ticker=${encodeURIComponent(symbol)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data?.analysis) {
        setAiText(data.analysis);
        setAiTimestamp(data.updated_at || new Date().toISOString());
        return;
      }
    } catch {
      // Anthropic route failed — try Gemini fallback
    }

    try {
      const res2 = await fetch(
        `/api/intelligence?ticker=${encodeURIComponent(symbol)}`,
        { cache: "no-store" }
      );
      const data2 = await res2.json();
      if (data2?.analysis) {
        setAiText(data2.analysis);
        setAiTimestamp(data2.updated_at || new Date().toISOString());
        return;
      }
    } catch {
      // both failed
    }

    setAiText("Unable to load analysis at this time. Please try again.");
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
      {/* ── Hero Chart — full width, edge-to-edge, no card wrapper ── */}
      <div className="w-full bg-[#07101d]">
        <AdvancedChart ticker={symbol} height={545} />
      </div>

      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/market-scanner"
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 transition hover:bg-white/10"
              >
                ← Back
              </Link>

              {/* Ticker search */}
              <div ref={searchRef} className="relative">
                <input
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                  placeholder={`${symbol} — Search or select ticker...`}
                  className="w-64 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-400/30"
                />
                {searchOpen && searchResults.length > 0 && (
                  <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-80 overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1220] shadow-2xl">
                    {searchResults.map((r) => (
                      <button
                        key={r.ticker}
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery("");
                          router.push(`/dashboard/stocks/${r.ticker}`);
                        }}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-white/5 ${
                          r.ticker === symbol ? "bg-cyan-400/5" : ""
                        }`}
                      >
                        <span className="font-semibold text-cyan-300">{r.ticker}</span>
                        <span className="truncate text-zinc-400">{r.company}</span>
                        {r.isWatchlist && (
                          <span className="ml-auto shrink-0 text-[10px] text-amber-400">★</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

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
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  onWatchlist
                    ? "border-teal-400/30 bg-teal-400/15 text-teal-300"
                    : "border-white/15 bg-white/5 text-white/60 hover:border-yellow-400/30 hover:bg-yellow-400/10 hover:text-yellow-300"
                }`}
              >
                {onWatchlist ? (
                  <>
                    <span>✓</span> In watchlist
                  </>
                ) : (
                  <>
                    <span>⭐</span> Add to watchlist
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowInvestModal(true)}
                className="aurora-btn aurora-btn-primary"
              >
                📊 Make Investment
              </button>

              <Link
                href={`/dashboard/investments/calculator?ticker=${symbol}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-medium text-white/70 transition hover:border-cyan-400/30 hover:bg-white/10 hover:text-white"
              >
                🧮 Calculator
              </Link>
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

        {/* TradingView widgets: 2-column layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left column */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-[#08111f] p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Technical Analysis</div>
              <TechnicalAnalysis ticker={symbol} />
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#08111f] p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Fundamental Data</div>
              <FundamentalData ticker={symbol} />
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-[#08111f] p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Company Profile</div>
              <CompanyProfile ticker={symbol} />
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#08111f] p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Top Stories</div>
              <TopStories ticker={symbol} />
            </div>
          </div>
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
            <div className="mt-4">
              {aiText.includes("##") ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {aiText
                    .split("##")
                    .filter(Boolean)
                    .map((section, i) => {
                      const lines = section.split("\n").filter(Boolean);
                      const title = lines[0]?.trim() || "";
                      const body = lines.slice(1).join(" ").trim();
                      return (
                        <div
                          key={i}
                          className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3"
                        >
                          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-300/80">
                            {title}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-zinc-300">
                            {body}
                          </p>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-sm leading-7 text-zinc-300">{aiText}</p>
              )}
            </div>
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

        {/* Aurora Intelligence + Ladders + Fundamentals */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_0.9fr]">
          {/* Left column */}
          <div className="space-y-6">
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

        {/* Make Investment button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowInvestModal(true)}
            className="aurora-btn aurora-btn-primary aurora-btn-lg"
          >
            📊 Make Investment
          </button>
        </div>
      </div>

      {showInvestModal && (
        <InvestmentModal
          ticker={symbol}
          currentPrice={asNumber(row?.price, 0)}
          onClose={() => setShowInvestModal(false)}
        />
      )}
    </div>
  );
}
