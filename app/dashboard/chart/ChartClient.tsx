"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";

type LadderBand = {
  value: string;
  label: string;
  levels: number[];
};

const LADDER_OPTIONS: LadderBand[] = [
  { value: "20", label: "20% ladder", levels: [0, -5, -10, -20] },
  { value: "30", label: "30% ladder", levels: [0, -7.5, -15, -30] },
  { value: "40", label: "40% ladder", levels: [0, -10, -20, -40] },
  { value: "50", label: "50% ladder", levels: [0, -12.5, -25, -50] },
  { value: "60", label: "60% ladder", levels: [0, -15, -30, -60] },
];

function parseNumber(value: string | null | undefined, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function fmtMoney(value: number, currency = "USD") {
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

function fmtPct(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

function fmtQty(value: number, digits = 4) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function tvSymbolForTicker(ticker: string) {
  const clean = (ticker || "AMD").toUpperCase().trim();
  return `NASDAQ:${clean}`;
}

function TradingViewWidget({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const renderWidget = () => {
      const tv = (window as any).TradingView;
      if (!tv || !container) return;

      container.innerHTML = "";
      const widgetHost = document.createElement("div");
      widgetHost.style.width = "100%";
      widgetHost.style.height = "100%";
      container.appendChild(widgetHost);

      new tv.widget({
        autosize: true,
        symbol,
        interval: "D",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        studies: ["Volume@tv-basicstudies"],
        withdateranges: true,
        allow_symbol_change: true,
        container: widgetHost,
      });
    };

    const existing = document.querySelector(
      'script[src="https://s3.tradingview.com/tv.js"]'
    ) as HTMLScriptElement | null;

    if ((window as any).TradingView) {
      renderWidget();
      return;
    }

    if (existing) {
      existing.addEventListener("load", renderWidget, { once: true });
      return () => existing.removeEventListener("load", renderWidget);
    }

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = renderWidget;
    document.body.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [symbol]);

  return <div ref={containerRef} className="h-full w-full" />;
}

function ChartInner() {
  const searchParams = useSearchParams();

  const ticker = (searchParams.get("symbol") || "AMD").toUpperCase();
  const name = searchParams.get("name") || ticker;
  const referencePrice = parseNumber(searchParams.get("ref"), 0);
  const budget = parseNumber(searchParams.get("budget"), 0);
  const ladderValue = searchParams.get("ladder") || "50";
  const currency = (searchParams.get("currency") || "USD").toUpperCase();

  const ladder = useMemo(
    () => LADDER_OPTIONS.find((item) => item.value === ladderValue) || LADDER_OPTIONS[3],
    [ladderValue]
  );

  const allocations = [25, 25, 25, 25];

  const rows = useMemo(() => {
    if (!referencePrice || !budget) return [];

    let cumulativeShares = 0;
    let cumulativeInvestment = 0;

    return ladder.levels.map((dropPct, index) => {
      const price = referencePrice * (1 + dropPct / 100);
      const allocationPct = allocations[index] || 0;
      const investment = budget * (allocationPct / 100);
      const shares = price > 0 ? investment / price : 0;

      cumulativeShares += shares;
      cumulativeInvestment += investment;

      const averagePrice =
        cumulativeShares > 0 ? cumulativeInvestment / cumulativeShares : 0;

      return {
        index: index + 1,
        dropPct,
        price,
        allocationPct,
        investment,
        shares,
        cumulativeShares,
        averagePrice,
      };
    });
  }, [referencePrice, budget, ladder]);

  const firstTwo =
    rows.length >= 2
      ? {
          totalInvestment: rows[0].investment + rows[1].investment,
          totalShares: rows[1].cumulativeShares,
          averagePrice: rows[1].averagePrice,
        }
      : null;

  const profitTargets = useMemo(() => {
    if (!firstTwo) return [];
    return [10, 15, 20, 25].map((pct) => {
      const targetPrice = firstTwo.averagePrice * (1 + pct / 100);
      const cashProfit = firstTwo.totalShares * (targetPrice - firstTwo.averagePrice);
      return { pct, targetPrice, cashProfit };
    });
  }, [firstTwo]);

  const tvSymbol = tvSymbolForTicker(ticker);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                Aurora Chart View
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {ticker} Chart Analysis
              </h1>
              <p className="mt-2 text-sm text-slate-300 sm:text-base">
                {name} • TradingView chart with Aurora ladder context.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/watchlist"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Back to Watchlist
              </Link>
              <Link
                href={`/dashboard/investments/calculator?symbol=${encodeURIComponent(ticker)}`}
                className="inline-flex items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-500/15 px-5 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/25"
              >
                Open Calculator
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className="h-[620px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
              <TradingViewWidget symbol={tvSymbol} />
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Aurora Buy In Lines</h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Ladder levels calculated from the selected reference price.
                  </p>
                </div>
                <div className="text-sm text-slate-400">
                  Reference: {referencePrice ? fmtMoney(referencePrice, currency) : "—"}
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.15em] text-slate-400">
                      <th className="px-4 py-2">Point</th>
                      <th className="px-4 py-2">Drop</th>
                      <th className="px-4 py-2">Price</th>
                      <th className="px-4 py-2">Budget %</th>
                      <th className="px-4 py-2">Investment</th>
                      <th className="px-4 py-2">Shares</th>
                      <th className="px-4 py-2">Average Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-6 text-center text-sm text-slate-400"
                        >
                          Open this page from the calculator to send in the reference price and ladder.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, idx) => (
                        <tr
                          key={row.index}
                          className={classNames(
                            idx === 0
                              ? "border border-cyan-400/20 bg-cyan-500/10"
                              : idx === 1
                              ? "border border-emerald-400/20 bg-emerald-500/10"
                              : "border border-white/10 bg-slate-900/70"
                          )}
                        >
                          <td className="rounded-l-2xl px-4 py-4 font-semibold text-white">
                            Buy In Point {row.index}
                          </td>
                          <td className="px-4 py-4 text-slate-200">{fmtPct(row.dropPct)}</td>
                          <td className="px-4 py-4 text-slate-100">{fmtMoney(row.price, currency)}</td>
                          <td className="px-4 py-4 text-slate-200">{fmtPct(row.allocationPct)}</td>
                          <td className="px-4 py-4 text-slate-100">
                            {fmtMoney(row.investment, currency)}
                          </td>
                          <td className="px-4 py-4 text-slate-200">{fmtQty(row.shares)}</td>
                          <td className="rounded-r-2xl px-4 py-4 font-semibold text-emerald-200">
                            {fmtMoney(row.averagePrice, currency)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
              <h2 className="text-lg font-semibold">Aurora Summary</h2>

              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Ticker</div>
                  <div className="mt-2 text-3xl font-bold">{ticker}</div>
                  <div className="mt-1 text-sm text-slate-300">{name}</div>
                </div>

                <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-blue-200">Reference Price</div>
                  <div className="mt-2 text-2xl font-bold text-blue-100">
                    {referencePrice ? fmtMoney(referencePrice, currency) : "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                    First 2 Lines Average
                  </div>
                  <div className="mt-2 text-2xl font-bold text-emerald-100">
                    {firstTwo ? fmtMoney(firstTwo.averagePrice, currency) : "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-amber-200">Budget</div>
                  <div className="mt-2 text-2xl font-bold text-amber-100">
                    {budget ? fmtMoney(budget, currency) : "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
              <h2 className="text-lg font-semibold">Profit Lines</h2>
              <p className="mt-2 text-sm text-slate-300">
                Based on the blended average of Buy In Point 1 and Buy In Point 2.
              </p>

              <div className="mt-5 grid gap-4">
                {profitTargets.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-400">
                    Open from the calculator to load BEP and profit targets.
                  </div>
                ) : (
                  profitTargets.map((item) => (
                    <div
                      key={item.pct}
                      className="rounded-2xl border border-amber-400/25 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 p-4"
                    >
                      <div className="text-xs uppercase tracking-[0.2em] text-amber-200">
                        Profit Line {item.pct}%
                      </div>
                      <div className="mt-2 text-2xl font-bold text-amber-100">
                        {fmtMoney(item.targetPrice, currency)}
                      </div>
                      <div className="mt-1 text-sm text-amber-100/80">
                        Move cash profit: {fmtMoney(item.cashProfit, currency)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
              <h2 className="text-lg font-semibold">Next Upgrade Ready</h2>
              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  Aurora score breakdown panel
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  Buy line overlay on custom chart
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  Live auto refresh price pulse
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChartClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white">
          <div className="mx-auto max-w-7xl px-4 py-8">Loading chart...</div>
        </div>
      }
    >
      <ChartInner />
    </Suspense>
  );
}
