"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import TradingViewAuroraPanel from "@/components/charts/TradingViewAuroraPanel";

type Analysis = {
  ok: boolean;
  ticker: string;
  currentPrice: number;
  majorRisePeak: number;
  currentDropPct: number;
  worstDropPct: number;
  riskBand: number;
  zone: string;
  source: string;
};

type EntryRow = {
  label: string;
  level: number;
  allocationPct: number;
  allocationAmount: number;
  price: number;
  shares: number;
};

type ProfitRow = {
  label: string;
  percent: number;
  price: number;
  profit: number;
};

export default function Page() {
  const params = useParams();
  const ticker = (params?.ticker as string)?.toUpperCase();

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState(2000);

  useEffect(() => {
    if (!ticker) return;

    let ignore = false;

    async function load() {
      try {
        const res = await fetch(`/api/aurora/analysis?ticker=${ticker}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "Analysis request failed");
        }

        if (!ignore) {
          setAnalysis(data);
          setError("");
        }
      } catch (err: any) {
        if (!ignore) {
          setError(err?.message || "Failed to load Aurora analysis");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [ticker]);

  const entries = useMemo<EntryRow[]>(() => {
    if (!analysis) return [];

    const peak = analysis.majorRisePeak;
    const band = analysis.riskBand;

    let levels: number[] = [];
    let allocations: number[] = [];

    if (band <= 30) {
      levels = [10, 20, 30];
      allocations = [0.34, 0.33, 0.33];
    } else if (band <= 40) {
      levels = [20, 30, 40];
      allocations = [0.34, 0.33, 0.33];
    } else if (band <= 50) {
      levels = [20, 30, 40, 50];
      allocations = [0.2, 0.25, 0.25, 0.3];
    } else if (band <= 60) {
      levels = [20, 30, 40, 50, 60];
      allocations = [0.15, 0.18, 0.2, 0.22, 0.25];
    } else {
      levels = [20, 30, 40, 50, 60, 70];
      allocations = [0.1, 0.12, 0.15, 0.18, 0.2, 0.25];
    }

    const labels = [
      "Starter",
      "Add",
      "Value",
      "Deep Value",
      "Extreme Value",
      "Max Value",
    ];

    return levels.map((level, i) => {
      const price = Number((peak * (1 - level / 100)).toFixed(2));
      const allocationPct = allocations[i] ?? 0;
      const allocationAmount = Number((budget * allocationPct).toFixed(2));
      const shares = price > 0 ? Number((allocationAmount / price).toFixed(4)) : 0;

      return {
        label: labels[i] || `Entry ${i + 1}`,
        level,
        allocationPct,
        allocationAmount,
        price,
        shares,
      };
    });
  }, [analysis, budget]);

  const avgPrice = useMemo(() => {
    if (!entries.length) return 0;

    const totalCost = entries.reduce((sum, row) => sum + row.allocationAmount, 0);
    const totalShares = entries.reduce((sum, row) => sum + row.shares, 0);

    if (!totalShares) return 0;

    return Number((totalCost / totalShares).toFixed(2));
  }, [entries]);

  const totalShares = useMemo(() => {
    return Number(entries.reduce((sum, row) => sum + row.shares, 0).toFixed(4));
  }, [entries]);

  const profits = useMemo<ProfitRow[]>(() => {
    return [10, 15, 20, 25].map((percent) => {
      const price = Number((avgPrice * (1 + percent / 100)).toFixed(2));
      const profit = Number(((price - avgPrice) * totalShares).toFixed(2));

      return {
        label: `+${percent}%`,
        percent,
        price,
        profit,
      };
    });
  }, [avgPrice, totalShares]);

  if (loading) {
    return <div className="p-10 text-white/60">Loading Aurora…</div>;
  }

  if (error) {
    return <div className="p-10 text-red-400">ERROR: {error}</div>;
  }

  if (!analysis) {
    return <div className="p-10 text-white/60">No Aurora analysis found.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-white">
        <div className="mb-3 text-sm text-white/50">{analysis.ticker}</div>

        <>
          <div className="grid gap-4 md:grid-cols-6">
            <div>
              <div className="text-xs text-white/40">Current Price</div>
              <div className="text-2xl font-semibold">${analysis.currentPrice.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-white/40">Major Rise Peak</div>
              <div className="text-2xl font-semibold text-cyan-300">
                ${analysis.majorRisePeak.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-white/40">Current Drop</div>
              <div className="text-2xl font-semibold text-amber-300">
                {analysis.currentDropPct.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-white/40">Risk Band</div>
              <div className="text-2xl font-semibold">{analysis.riskBand}</div>
            </div>
            <div>
              <div className="text-xs text-white/40">Zone</div>
              <div className="text-2xl font-semibold">{analysis.zone}</div>
            </div>
            <div>
              <div className="text-xs text-white/40">Budget</div>
              <input
                type="number"
                min={100}
                step={100}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value || 0))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
              />
            </div>
          </div>

          <TradingViewAuroraPanel
            ticker={analysis.ticker}
            height={620}
            avgPrice={avgPrice}
            profits={profits}
          />
        </>
      </div>
    </div>
  );
}
