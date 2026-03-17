"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type WatchlistItem = {
  symbol?: string;
  ticker?: string;
  code?: string;
  name?: string;
  company?: string;
};

type QuoteResponse = {
  ok: boolean;
  symbol: string;
  name?: string;
  price: number;
  previousClose?: number | null;
  change?: number | null;
  changePercent?: number | null;
  currency?: string | null;
  marketState?: string | null;
  source?: string;
  fetchedAt?: string;
  error?: string;
};

type LadderOption = {
  value: string;
  label: string;
  levels: number[];
};

type LadderRow = {
  step: number;
  levelPct: number;
  entryPrice: number;
  investment: number;
  percentOfTotal: number;
  shares: number;
  cumulativeShares: number;
  remainingCash: number;
  isEntryStep: boolean;
};

const LADDER_OPTIONS: LadderOption[] = [
  { value: "20", label: "20%", levels: [-8, -12, -16, -20] },
  { value: "30", label: "30%", levels: [-12, -18, -24, -30] },
  { value: "40", label: "40%", levels: [-16, -24, -32, -40] },
  { value: "50", label: "50%", levels: [-20, -30, -40, -50] },
  { value: "60", label: "60%", levels: [-24, -36, -48, -60] },
];

const DEFAULT_CURRENCY = "USD";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function parseNumber(value: unknown, fallback = 0): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value.replace(/,/g, "").trim())
      : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function fmtMoney(value: number, currency = DEFAULT_CURRENCY) {
  if (!Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function fmtPrice(value: number, currency = DEFAULT_CURRENCY) {
  if (!Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: value < 1 ? 4 : 2,
      maximumFractionDigits: value < 1 ? 4 : 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(value < 1 ? 4 : 2)}`;
  }
}

function fmtQty(value: number, digits = 4) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

function fmtPct(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

async function safeJsonFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init?.headers || {}),
    },
  });

  const raw = await response.text();

  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(
      raw?.startsWith("<!DOCTYPE") || raw?.startsWith("<html")
        ? "API returned HTML instead of JSON"
        : "API returned invalid JSON"
    );
  }

  const obj = data as Record<string, unknown> | null;

  if (!response.ok || obj?.ok === false) {
    throw new Error(
      typeof obj?.error === "string"
        ? obj.error
        : `Request failed (${response.status})`
    );
  }

  return data as T;
}

function getStoredWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  const keys = ["aurora_watchlist", "watchlist", "guest_watchlist"];

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.items)) return parsed.items;
    } catch {}
  }

  return [];
}

function getTicker(item: WatchlistItem): string {
  return String(item.symbol || item.ticker || item.code || "")
    .trim()
    .toUpperCase();
}

function getCompany(item: WatchlistItem): string {
  return String(item.company || item.name || getTicker(item)).trim();
}

function uniqueWatchlist(items: WatchlistItem[]) {
  const seen = new Set<string>();
  const out: WatchlistItem[] = [];

  for (const item of items) {
    const ticker = getTicker(item);
    if (!ticker || seen.has(ticker)) continue;
    seen.add(ticker);
    out.push(item);
  }

  return out.sort((a, b) => getTicker(a).localeCompare(getTicker(b)));
}

export default function InvestmentCalculatorPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [selectedWatchTicker, setSelectedWatchTicker] = useState("");
  const [ticker, setTicker] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [referencePrice, setReferencePrice] = useState("100");
  const [cashAvailable, setCashAvailable] = useState("5000");
  const [ladderType, setLadderType] = useState("50");
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [quoteMeta, setQuoteMeta] = useState<QuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [calculated, setCalculated] = useState(false);

  useEffect(() => {
    const items = uniqueWatchlist(getStoredWatchlist());
    setWatchlist(items);

    if (items.length > 0 && !selectedWatchTicker) {
      const firstTicker = getTicker(items[0]);
      setSelectedWatchTicker(firstTicker);
      setTicker(firstTicker);
      setCompanyName(getCompany(items[0]));
    }
  }, [selectedWatchTicker]);

  const selectedWatchItem = useMemo(
    () => watchlist.find((item) => getTicker(item) === selectedWatchTicker),
    [watchlist, selectedWatchTicker]
  );

  const currentLadder = useMemo(
    () => LADDER_OPTIONS.find((item) => item.value === ladderType) || LADDER_OPTIONS[3],
    [ladderType]
  );

  async function fetchQuote(symbol: string) {
    const cleaned = symbol.trim().toUpperCase();
    if (!cleaned) return;

    setLoadingQuote(true);
    setQuoteError("");

    try {
      const data = await safeJsonFetch<QuoteResponse>(
        `/api/market/quote?symbol=${encodeURIComponent(cleaned)}`
      );

      setQuoteMeta(data);
      setTicker(data.symbol || cleaned);
      setReferencePrice(String(parseNumber(data.price, 0)));
      setCurrency((data.currency || DEFAULT_CURRENCY).toUpperCase());

      if (data.name) {
        setCompanyName(data.name);
      } else if (selectedWatchItem) {
        setCompanyName(getCompany(selectedWatchItem));
      }
    } catch (error) {
      setQuoteError(error instanceof Error ? error.message : "Failed to load ticker");
    } finally {
      setLoadingQuote(false);
    }
  }

  function handleLoadFromWatchlist() {
    if (!selectedWatchTicker) return;
    setTicker(selectedWatchTicker);
    if (selectedWatchItem) {
      setCompanyName(getCompany(selectedWatchItem));
    }
    fetchQuote(selectedWatchTicker);
  }

  function handleCalculate() {
    setCalculated(true);
  }

  function handleClear() {
    setTicker("");
    setCompanyName("");
    setReferencePrice("100");
    setCashAvailable("5000");
    setLadderType("50");
    setCurrency(DEFAULT_CURRENCY);
    setQuoteMeta(null);
    setQuoteError("");
    setCalculated(false);
  }

  const referenceValue = parseNumber(referencePrice, 0);
  const cashValue = parseNumber(cashAvailable, 0);

  const rows = useMemo<LadderRow[]>(() => {
    if (!referenceValue || !cashValue) return [];

    const weights = [17.3442, 21.6803, 27.1004, 33.8751];
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    let cumulativeShares = 0;
    let remainingCash = cashValue;

    return currentLadder.levels.map((levelPct, index) => {
      const entryPrice = referenceValue * (1 + levelPct / 100);
      const percentOfTotal = (weights[index] / totalWeight) * 100;
      const investment = (cashValue * percentOfTotal) / 100;
      const shares = entryPrice > 0 ? investment / entryPrice : 0;

      cumulativeShares += shares;
      remainingCash -= investment;

      return {
        step: index + 1,
        levelPct,
        entryPrice,
        investment,
        percentOfTotal,
        shares,
        cumulativeShares,
        remainingCash: Math.max(0, remainingCash),
        isEntryStep: index === 1,
      };
    });
  }, [referenceValue, cashValue, currentLadder]);

  const totalShares = rows.length ? rows[rows.length - 1].cumulativeShares : 0;

  const firstTwo = rows.length >= 2
    ? {
        averagePrice:
            (rows[0].investment + rows[1].investment) /
            (rows[0].shares + rows[1].shares),
        shares: rows[1].cumulativeShares,
        amount: rows[0].investment + rows[1].investment,
      }
    : null;

  const profitLines = useMemo(() => {
    if (!firstTwo) return [];
    return [10, 15, 20, 25].map((pct) => {
      const targetPrice = firstTwo.averagePrice * (1 + pct / 100);
      const cashProfit = (targetPrice - firstTwo.averagePrice) * firstTwo.shares;
      return { pct, targetPrice, cashProfit };
    });
  }, [firstTwo]);

  const chartHref = useMemo(() => {
    const params = new URLSearchParams();
    if (ticker) params.set("symbol", ticker);
    if (companyName) params.set("name", companyName);
    if (referencePrice) params.set("ref", referencePrice);
    if (cashAvailable) params.set("budget", cashAvailable);
    if (ladderType) params.set("ladder", ladderType);
    if (currency) params.set("currency", currency);
    return `/dashboard/chart?${params.toString()}`;
  }, [ticker, companyName, referencePrice, cashAvailable, ladderType, currency]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="rounded-[32px] border border-cyan-500/15 bg-[radial-gradient(circle_at_top_left,rgba(10,98,255,0.18),transparent_35%),linear-gradient(180deg,rgba(2,6,23,0.92),rgba(2,6,23,0.98))] p-8 shadow-[0_0_60px_rgba(0,120,255,0.08)]">
          <div className="mb-8 flex items-start justify-between gap-6">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
                Aurora Growth
              </div>
              <h1 className="text-5xl font-semibold tracking-tight">Investment Calculator</h1>
              <p className="mt-4 text-xl text-white/65">
                Build structured staged entries using the Aurora investment ladder model.
              </p>
            </div>

            <Link
              href={chartHref}
              className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-7 py-4 text-lg font-semibold text-cyan-200 transition hover:bg-cyan-500/25"
            >
              Analyse on Chart
            </Link>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr_1fr_1fr_auto_auto]">
            <div>
              <label className="mb-3 block text-sm font-medium text-white/70">Watchlist</label>
              <select
                value={selectedWatchTicker}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedWatchTicker(value);
                  setTicker(value);
                  const found = watchlist.find((item) => getTicker(item) === value);
                  if (found) setCompanyName(getCompany(found));
                }}
                className="w-full rounded-2xl border border-cyan-400/20 bg-slate-950/70 px-5 py-4 text-xl text-white outline-none"
              >
                {watchlist.length === 0 && <option value="">No watchlist stocks found</option>}
                {watchlist.map((item) => {
                  const itemTicker = getTicker(item);
                  return (
                    <option key={itemTicker} value={itemTicker}>
                      {itemTicker} - {getCompany(item)}
                    </option>
                  );
                })}
              </select>

              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {ticker && (
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-cyan-300">
                    Selected: {ticker}
                  </span>
                )}
                <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-amber-300">
                  In Watchlist
                </span>
                {companyName && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/70">
                    {companyName}
                  </span>
                )}
              </div>

              {quoteError && (
                <div className="mt-4 text-base text-rose-300">{quoteError}</div>
              )}
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-white/70">Ticker</label>
              <input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="w-full rounded-2xl border border-cyan-400/20 bg-slate-950/70 px-5 py-4 text-xl text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-white/70">Reference Price</label>
              <input
                value={referencePrice}
                onChange={(e) => setReferencePrice(e.target.value)}
                className="w-full rounded-2xl border border-cyan-400/20 bg-slate-950/70 px-5 py-4 text-xl text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-white/70">Cash Available</label>
              <input
                value={cashAvailable}
                onChange={(e) => setCashAvailable(e.target.value)}
                className="w-full rounded-2xl border border-cyan-400/20 bg-slate-950/70 px-5 py-4 text-xl text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-white/70">Ladder Type</label>
              <select
                value={ladderType}
                onChange={(e) => setLadderType(e.target.value)}
                className="w-full rounded-2xl border border-cyan-400/20 bg-slate-950/70 px-5 py-4 text-xl text-white outline-none"
              >
                {LADDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-white/70">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-2xl border border-cyan-400/20 bg-slate-950/70 px-5 py-4 text-xl text-white outline-none"
              >
                <option value="USD">$ USD</option>
                <option value="GBP">£ GBP</option>
                <option value="EUR">€ EUR</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <button
              onClick={handleLoadFromWatchlist}
              disabled={!ticker || loadingQuote}
              className="rounded-full bg-cyan-400 px-8 py-4 text-xl font-semibold text-slate-950 shadow-[0_0_30px_rgba(56,189,248,0.35)] transition hover:brightness-105 disabled:opacity-60"
            >
              {loadingQuote ? "Loading..." : "Calculate Ladder"}
            </button>

            <button
              onClick={handleClear}
              className="rounded-full border border-white/10 bg-white/5 px-8 py-4 text-xl font-medium text-white/85 transition hover:bg-white/10"
            >
              Clear Ticker
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-5">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <div className="text-xs uppercase tracking-[0.3em] text-white/40">Ticker</div>
            <div className="mt-4 text-5xl font-semibold">{ticker || "—"}</div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <div className="text-xs uppercase tracking-[0.3em] text-white/40">Reference Price</div>
            <div className="mt-4 text-5xl font-semibold">{fmtPrice(referenceValue, currency)}</div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <div className="text-xs uppercase tracking-[0.3em] text-white/40">Cash Available</div>
            <div className="mt-4 text-5xl font-semibold">{fmtMoney(cashValue, currency)}</div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <div className="text-xs uppercase tracking-[0.3em] text-white/40">Total Shares</div>
            <div className="mt-4 text-5xl font-semibold">{fmtQty(totalShares)}</div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <div className="text-xs uppercase tracking-[0.3em] text-white/40">Ladder</div>
            <div className="mt-4 text-5xl font-semibold">{ladderType}%</div>
          </div>
        </div>

        <div className="mt-6 rounded-[32px] border border-cyan-500/10 bg-[linear-gradient(180deg,rgba(5,10,30,0.96),rgba(3,7,20,0.98))] p-6">
          <h2 className="text-4xl font-semibold">Investment Ladder</h2>
          <p className="mt-3 text-xl text-white/65">
            Highlighted entry step is the midpoint of the selected ladder.
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full overflow-hidden rounded-3xl">
              <thead>
                <tr className="border-b border-white/10 text-left text-sm uppercase tracking-[0.25em] text-white/40">
                  <th className="px-5 py-4">Step</th>
                  <th className="px-5 py-4">Entry Level</th>
                  <th className="px-5 py-4">Entry Price</th>
                  <th className="px-5 py-4">Investment</th>
                  <th className="px-5 py-4">% of Total</th>
                  <th className="px-5 py-4">Shares</th>
                  <th className="px-5 py-4">Cumulative Shares</th>
                  <th className="px-5 py-4">Remaining Cash</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.step}
                    className={cn(
                      "border-b border-white/8",
                      row.isEntryStep ? "bg-cyan-500/10" : "bg-transparent"
                    )}
                  >
                    <td className="px-5 py-5 text-xl">{row.step}</td>
                    <td className="px-5 py-5 text-xl">{fmtPct(row.levelPct)}</td>
                    <td className="px-5 py-5 text-xl">{fmtPrice(row.entryPrice, currency)}</td>
                    <td className="px-5 py-5 text-xl">{fmtMoney(row.investment, currency)}</td>
                    <td className="px-5 py-5 text-xl">{fmtPct(row.percentOfTotal)}</td>
                    <td className="px-5 py-5 text-xl">{fmtQty(row.shares)}</td>
                    <td className="px-5 py-5 text-xl">{fmtQty(row.cumulativeShares)}</td>
                    <td className="px-5 py-5 text-xl">{fmtMoney(row.remainingCash, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-4">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-300">First 2 Lines Average Price</div>
            <div className="mt-4 text-5xl font-semibold">
              {firstTwo ? fmtPrice(firstTwo.averagePrice, currency) : "—"}
            </div>
            <p className="mt-3 text-lg text-white/70">
              Combine line 1 and line 2 to get the blended average entry price.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-300">First 2 Lines Shares</div>
            <div className="mt-4 text-5xl font-semibold">
              {firstTwo ? fmtQty(firstTwo.shares) : "—"}
            </div>
            <p className="mt-3 text-lg text-white/70">
              Add the shares from line 1 and line 2 together.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-300">First 2 Lines Amount</div>
            <div className="mt-4 text-5xl font-semibold">
              {firstTwo ? fmtMoney(firstTwo.amount, currency) : "—"}
            </div>
            <p className="mt-3 text-lg text-white/70">
              Total amount invested across the first 2 ladder lines.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-300">Profit Levels Ready</div>
            <div className="mt-4 text-5xl font-semibold">{profitLines.length}</div>
            <p className="mt-3 text-lg text-white/70">
              10%, 15%, 20%, 25% target prices and move cash profit.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-[28px] border border-amber-400/20 bg-[linear-gradient(180deg,rgba(245,158,11,0.08),rgba(255,255,255,0.02))] p-6">
            <h3 className="text-3xl font-semibold">Profit Lines</h3>
            <p className="mt-3 text-lg text-white/65">
              Profit levels are calculated from the blended average of Buy In Point 1 and Buy In Point 2.
            </p>

            <div className="mt-5 grid gap-4">
              {profitLines.map((item) => (
                <div
                  key={item.pct}
                  className="rounded-[24px] border border-amber-400/25 bg-[linear-gradient(90deg,rgba(245,158,11,0.08),rgba(255,255,255,0.02))] p-5"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <div className="text-sm uppercase tracking-[0.3em] text-amber-200">
                        Profit Line {item.pct}%
                      </div>
                      <div className="mt-3 text-4xl font-semibold text-amber-100">
                        {fmtPrice(item.targetPrice, currency)}
                      </div>
                      <div className="mt-2 text-lg text-white/70">
                        Target price from blended entry
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm uppercase tracking-[0.3em] text-amber-200">
                        Move Cash Profit
                      </div>
                      <div className="mt-3 text-4xl font-semibold text-amber-100">
                        {fmtMoney(item.cashProfit, currency)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[28px] border border-cyan-400/20 bg-cyan-500/10 p-6">
              <div className="text-xs uppercase tracking-[0.3em] text-cyan-300">Buy In Point 1</div>
              <div className="mt-4 text-5xl font-semibold text-cyan-100">
                {rows[0] ? fmtPrice(rows[0].entryPrice, currency) : "—"}
              </div>
              <p className="mt-3 text-lg text-white/70">
                Initial entry at the reference price level.
              </p>
            </div>

            <div className="rounded-[28px] border border-emerald-400/20 bg-emerald-500/10 p-6">
              <div className="text-xs uppercase tracking-[0.3em] text-emerald-300">First 2 Lines Average Price</div>
              <div className="mt-4 text-5xl font-semibold text-emerald-100">
                {firstTwo ? fmtPrice(firstTwo.averagePrice, currency) : "—"}
              </div>
              <p className="mt-3 text-lg text-white/70">
                Combine Buy In Point 1 and Buy In Point 2 to get the blended average entry price.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
