"use client";

import { useEffect, useState } from "react";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";

export default function VolatilityCompassPage() {
  const [vix, setVix] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadVix() {
    try {
      const res = await fetch("/api/market/vix");
      const data = await res.json();
      setVix(data.vix);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVix();
  }, []);

  function sentiment() {
    if (!vix) return { label: "Loading", color: "text-blue-300" };

    if (vix < 15)
      return { label: "Low Volatility • Bullish", color: "text-emerald-300" };

    if (vix < 25)
      return { label: "Normal Market", color: "text-yellow-300" };

    if (vix < 35)
      return { label: "High Volatility", color: "text-orange-300" };

    return { label: "Extreme Fear", color: "text-red-400" };
  }

  const market = sentiment();

  return (
    <div className="space-y-6">
      {/* Header */}

      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.22),transparent_22%),linear-gradient(180deg,rgba(7,23,54,0.92)_0%,rgba(3,14,36,0.96)_100%)] shadow-[0_20px_80px_rgba(0,0,0,0.22)]">
        <div className="px-6 py-7 sm:px-8 lg:px-10">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-200">
              Elite tool
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Aurora Volatility Compass
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100/72 sm:text-base">
              The Aurora Volatility Compass monitors market volatility using the
              VIX index to help traders understand when the market is calm,
              trending, or experiencing fear. High volatility often signals
              uncertainty and opportunity.
            </p>
          </div>
        </div>
      </section>

      {/* VIX Display */}

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(4,18,45,0.82)_0%,rgba(3,14,36,0.9)_100%)] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.18)]">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="h-6 w-6 text-cyan-300" />
            <h3 className="text-lg font-semibold text-white">
              Current VIX Level
            </h3>
          </div>

          {loading ? (
            <div className="text-blue-200/70">Loading volatility data...</div>
          ) : (
            <div className="text-4xl font-bold text-white">{vix}</div>
          )}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(4,18,45,0.82)_0%,rgba(3,14,36,0.9)_100%)] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.18)]">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-6 w-6 text-emerald-300" />
            <h3 className="text-lg font-semibold text-white">
              Market Sentiment
            </h3>
          </div>

          <div className={`text-xl font-semibold ${market.color}`}>
            {market.label}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(4,18,45,0.82)_0%,rgba(3,14,36,0.9)_100%)] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.18)]">
          <div className="flex items-center gap-3 mb-4">
            <TrendingDown className="h-6 w-6 text-yellow-300" />
            <h3 className="text-lg font-semibold text-white">
              Interpretation
            </h3>
          </div>

          <p className="text-sm text-blue-100/70 leading-relaxed">
            When the VIX rises above 30 the market is experiencing significant
            fear. Historically this often occurs near major market bottoms.
            Lower volatility suggests stable bullish conditions.
          </p>
        </div>
      </section>

      {/* Chart */}

      <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(4,18,45,0.82)_0%,rgba(3,14,36,0.9)_100%)] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.18)]">
        <h3 className="text-lg font-semibold text-white mb-4">
          VIX Chart
        </h3>

        <iframe
          src="https://s.tradingview.com/widgetembed/?symbol=CBOE:VIX&interval=D&theme=dark"
          className="w-full h-[500px] rounded-xl border border-white/10"
        />
      </section>
    </div>
  );
}
