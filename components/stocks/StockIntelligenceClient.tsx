"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TradingViewAdvancedChart from "@/components/stocks/TradingViewAdvancedChart";

type ScannerRow = {
  ticker?: string;
  company?: string;
  sector?: string;
  industry?: string;
  score?: number;
  trend?: string;
  price?: number;
  change_pct?: number;
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

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
  if (score >= 60) return "text-cyan-400 border-cyan-500/30 bg-cyan-500/10";
  if (score >= 40) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
  return "text-rose-400 border-rose-500/30 bg-rose-500/10";
}

function trendTone(trend: string) {
  const t = trend.toLowerCase();
  if (t.includes("up") || t.includes("bull") || t.includes("strong")) {
    return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  }
  if (t.includes("down") || t.includes("bear") || t.includes("weak")) {
    return "text-rose-400 bg-rose-500/10 border-rose-500/30";
  }
  return "text-amber-300 bg-amber-500/10 border-amber-500/30";
}

function getMomentum(score: number, changePct: number, trend: string) {
  const t = trend.toLowerCase();

  if (score >= 75 && changePct > 0 && (t.includes("up") || t.includes("bull"))) {
    return { label: "Strong Momentum", tone: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
  }
  if (score >= 55) {
    return { label: "Building Momentum", tone: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" };
  }
  if (changePct < 0) {
    return { label: "Pullback Phase", tone: "text-amber-300 bg-amber-500/10 border-amber-500/30" };
  }
  return { label: "Watch Setup", tone: "text-zinc-300 bg-white/5 border-white/10" };
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

function InfoCard({
  title,
  value,
  subtext,
}: {
  title: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="text-xs uppercase tracking-[0.18em] text-zinc-400">{title}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
      {subtext ? <div className="mt-1 text-xs text-zinc-400">{subtext}</div> : null}
    </div>
  );
}

export default function StockIntelligenceClient({ ticker }: Props) {
  const [scannerRows, setScannerRows] = useState<ScannerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadScanner() {
      try {
        setLoading(true);

        const res = await fetch("/data/scanner-cache.json", {
          cache: "no-store",
        });

        if (!res.ok) {
          if (mounted) setScannerRows([]);
          return;
        }

        const data = await res.json();

        if (mounted) {
          setScannerRows(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to load scanner cache", error);
        if (mounted) setScannerRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadScanner();

    return () => {
      mounted = false;
    };
  }, []);

  const row = useMemo(() => {
    const symbol = safeUpper(ticker);
    return scannerRows.find((item) => safeUpper(item.ticker) === symbol) || null;
  }, [scannerRows, ticker]);

  const company = row?.company || safeUpper(ticker);
  const score = asNumber(row?.score, 0);
  const price = asNumber(row?.price, 0);
  const changePct = asNumber(row?.change_pct, 0);
  const trend = row?.trend || "Watch";
  const sector = row?.sector || "—";
  const industry = row?.industry || "—";

  const momentum = getMomentum(score, changePct, trend);
  const buyLadder = makeBuyLadder(price);
  const blendedEntry =
    buyLadder.length >= 2 ? (buyLadder[0].price + buyLadder[1].price) / 2 : price;
  const profitLadder = makeProfitLadder(blendedEntry);

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
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
                {safeUpper(ticker)}
              </h1>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${scoreTone(score)}`}
              >
                Aurora Score {score || "—"}
              </span>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${trendTone(trend)}`}
              >
                {trend}
              </span>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${momentum.tone}`}
              >
                {momentum.label}
              </span>
            </div>

            <p className="mt-3 text-sm text-zinc-400">
              {loading ? "Loading stock intelligence..." : company}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:w-[360px]">
            <InfoCard title="Price" value={fmtPrice(price)} />
            <InfoCard title="Change" value={fmtPct(changePct)} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_0.9fr]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] p-3 shadow-2xl">
              <TradingViewAdvancedChart symbol={safeUpper(ticker)} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <InfoCard title="Aurora Score" value={String(score || "—")} subtext="Composite setup strength" />
              <InfoCard title="Sector" value={sector} subtext="Market classification" />
              <InfoCard title="Industry" value={industry} subtext="Business group" />
              <InfoCard title="Trend" value={trend} subtext={momentum.label} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-cyan-500/20 bg-[#08111f] p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                Aurora Intelligence
              </div>

              <div className="mt-4 space-y-3 text-sm text-zinc-300">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span>Setup Quality</span>
                  <span className="font-semibold text-white">
                    {score >= 80 ? "Elite" : score >= 60 ? "Strong" : score >= 40 ? "Developing" : "Watch"}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span>Momentum</span>
                  <span className="font-semibold text-white">{momentum.label}</span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span>Current Price</span>
                  <span className="font-semibold text-white">{fmtPrice(price)}</span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span>2-Point Average Entry</span>
                  <span className="font-semibold text-emerald-400">{fmtPrice(blendedEntry)}</span>
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
                      <div className="text-sm font-medium text-white">{line.label}</div>
                      <div className="text-xs text-zinc-400">
                        {line.pct === 0 ? "Current level" : `${line.pct}% from price`}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-semibold text-sky-300">
                        {fmtPrice(line.price)}
                      </div>
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
                      <div className="text-sm font-medium text-white">{line.label}</div>
                      <div className="text-xs text-zinc-400">
                        Target from 2-point average entry
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-semibold text-amber-300">
                        {fmtPrice(line.price)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#08111f] p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                Aurora Note
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-300">
                This page blends scanner strength, trend direction, staged entries,
                and projected profit targets into one professional stock intelligence
                screen. It is designed to feel more like a terminal page than a basic
                quote page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
