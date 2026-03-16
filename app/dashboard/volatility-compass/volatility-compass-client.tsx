"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type VixApiResponse = {
  symbol: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  updatedAt: string | null;
  spy: number | null;
  spyChange: number | null;
  spyChangePercent: number | null;
  spySma50: number | null;
  regime: string;
  regimeDescription: string;
  regimeStatus: "bull" | "volatile" | "crisis" | "neutral";
};

function getStatusFromVix(vix: number | null) {
  if (vix === null || Number.isNaN(vix)) {
    return {
      label: "Unavailable",
      description: "Live market volatility data is not currently available.",
      badgeClass: "border-white/15 bg-white/10 text-white/70",
      barClass: "from-white/30 to-white/10",
      progress: 0,
    };
  }

  if (vix < 20) {
    return {
      label: "Stable Market",
      description:
        "Volatility is relatively low. Market conditions are calmer and typically more stable.",
      badgeClass: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
      barClass: "from-emerald-400/80 to-emerald-300/40",
      progress: Math.max(12, Math.min((vix / 20) * 33, 33)),
    };
  }

  if (vix < 30) {
    return {
      label: "Elevated Risk",
      description:
        "Volatility is rising. Conditions may be becoming more uncertain and selective entries matter more.",
      badgeClass: "border-amber-400/25 bg-amber-400/10 text-amber-300",
      barClass: "from-amber-400/80 to-amber-300/40",
      progress: 33 + Math.min(((vix - 20) / 10) * 33, 33),
    };
  }

  return {
    label: "High Fear",
    description:
      "Volatility is high. This can signal broad market stress, sharp swings, and potential opportunity for patient investors.",
    badgeClass: "border-rose-400/25 bg-rose-400/10 text-rose-300",
    barClass: "from-rose-400/80 to-rose-300/40",
    progress: Math.min(66 + ((vix - 30) / 20) * 34, 100),
  };
}

function getRegimeClasses(status: string) {
  if (status === "bull") {
    return {
      badge: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
      panel: "border-emerald-400/20 bg-emerald-400/8",
    };
  }

  if (status === "volatile") {
    return {
      badge: "border-amber-400/25 bg-amber-400/10 text-amber-300",
      panel: "border-amber-400/20 bg-amber-400/8",
    };
  }

  if (status === "crisis") {
    return {
      badge: "border-rose-400/25 bg-rose-400/10 text-rose-300",
      panel: "border-rose-400/20 bg-rose-400/8",
    };
  }

  return {
    badge: "border-white/15 bg-white/10 text-white/70",
    panel: "border-white/10 bg-white/5",
  };
}

function formatChange(value: number | null, suffix = "") {
  if (value === null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}${suffix}`;
}

function formatNumber(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  return value.toFixed(2);
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function TradingViewWidget() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container h-full w-full";

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget h-full w-full";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "CBOE:VIX",
      interval: "D",
      timezone: "Europe/London",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      studies: ["RSI@tv-basicstudies"],
      withdateranges: true,
      range: "12M",
    });

    wrapper.appendChild(widget);
    wrapper.appendChild(script);
    containerRef.current.appendChild(wrapper);
  }, []);

  return (
    <div className="h-[520px] w-full overflow-hidden rounded-3xl border border-white/10 bg-[#071126]">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

export default function VolatilityCompassClient({
  userName,
}: {
  userName: string;
}) {
  const [data, setData] = useState<VixApiResponse>({
    symbol: "^VIX",
    price: null,
    change: null,
    changePercent: null,
    updatedAt: null,
    spy: null,
    spyChange: null,
    spyChangePercent: null,
    spySma50: null,
    regime: "Unavailable",
    regimeDescription: "Loading...",
    regimeStatus: "neutral",
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/market/vix", { cache: "no-store" });
        const json: VixApiResponse = await res.json();

        if (!active) return;
        setData(json);
      } catch {
        if (!active) return;
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 60000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const status = useMemo(() => getStatusFromVix(data.price), [data.price]);
  const regimeClasses = useMemo(
    () => getRegimeClasses(data.regimeStatus),
    [data.regimeStatus]
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(91,140,255,0.22),_transparent_35%),linear-gradient(180deg,#020b22_0%,#081734_45%,#12357e_100%)] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">
              Aurora Growth Elite
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Aurora Volatility Compass
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-white/72">
              Track market fear, volatility, and sentiment before making your next move.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Back to dashboard
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/6 backdrop-blur-xl">
              <div className="border-b border-white/10 px-6 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm uppercase tracking-[0.22em] text-white/45">
                      Live Volatility Reading
                    </div>
                    <div className="mt-1 text-sm text-white/55">
                      Welcome back, {userName}
                    </div>
                  </div>

                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${status.badgeClass}`}
                  >
                    {status.label}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 px-6 py-6 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="text-sm text-white/50">Current VIX</div>
                  <div className="mt-3 text-4xl font-semibold tracking-tight">
                    {loading && data.price === null ? "..." : formatNumber(data.price)}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="text-sm text-white/50">Daily Change</div>
                  <div className="mt-3 text-2xl font-semibold tracking-tight">
                    {formatChange(data.change)}
                  </div>
                  <div className="mt-2 text-sm text-white/45">
                    {formatChange(data.changePercent, "%")}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="text-sm text-white/50">Last Updated</div>
                  <div className="mt-3 text-lg font-medium leading-7 text-white/85">
                    {formatDate(data.updatedAt)}
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-white/55">Aurora sentiment scale</span>
                    <span className="text-white/75">{status.label}</span>
                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${status.barClass}`}
                      style={{ width: `${status.progress}%` }}
                    />
                  </div>

                  <p className="mt-4 text-sm leading-7 text-white/72">
                    {status.description}
                  </p>
                </div>
              </div>
            </div>

            <div className={`rounded-3xl border p-6 backdrop-blur-xl ${regimeClasses.panel}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm uppercase tracking-[0.22em] text-white/45">
                    Aurora Market Regime AI
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold">{data.regime}</h2>
                </div>

                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${regimeClasses.badge}`}
                >
                  {data.regime}
                </span>
              </div>

              <p className="mt-4 leading-7 text-white/72">
                {data.regimeDescription}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="text-sm text-white/50">SPY</div>
                  <div className="mt-2 text-2xl font-semibold">
                    {formatNumber(data.spy)}
                  </div>
                  <div className="mt-2 text-sm text-white/45">
                    {formatChange(data.spyChange)} / {formatChange(data.spyChangePercent, "%")}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="text-sm text-white/50">SPY 50 Day Average</div>
                  <div className="mt-2 text-2xl font-semibold">
                    {formatNumber(data.spySma50)}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="text-sm text-white/50">Regime Logic</div>
                  <div className="mt-2 text-sm leading-6 text-white/72">
                    Uses VIX plus SPY trend position vs 50 day average to classify the broader market environment.
                  </div>
                </div>
              </div>
            </div>

            <TradingViewWidget />
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/6 p-6 backdrop-blur-xl">
              <div className="text-sm uppercase tracking-[0.22em] text-white/45">
                What this tool is doing
              </div>

              <h2 className="mt-3 text-2xl font-semibold">
                Reading market fear through the VIX
              </h2>

              <p className="mt-4 leading-7 text-white/72">
                Aurora Volatility Compass monitors the VIX, which reflects expected market volatility. It helps you quickly judge whether current conditions are calm, becoming uncertain, or moving into fear-driven behaviour.
              </p>

              <p className="mt-4 leading-7 text-white/72">
                This is a context tool, not a signal tool. It is best used alongside price structure, support and resistance, and momentum indicators such as RSI.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/6 p-6 backdrop-blur-xl">
              <div className="text-sm uppercase tracking-[0.22em] text-white/45">
                Aurora interpretation
              </div>

              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/8 p-4">
                  <div className="font-semibold text-emerald-300">Below 20 — Stable Market</div>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    Conditions are calmer and broad market stress is lower.
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/8 p-4">
                  <div className="font-semibold text-amber-300">20 to 30 — Elevated Risk</div>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    Volatility is rising, so caution and selectivity matter more.
                  </p>
                </div>

                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/8 p-4">
                  <div className="font-semibold text-rose-300">Above 30 — High Fear</div>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    Market stress is high. Sharp moves and emotional pricing can create opportunity.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/6 p-6 backdrop-blur-xl">
              <div className="text-sm uppercase tracking-[0.22em] text-white/45">
                Best used with
              </div>

              <ul className="mt-4 space-y-3 text-white/72">
                <li>• Support and resistance</li>
                <li>• RSI for momentum and stretch</li>
                <li>• Trend direction on SPY or the S&amp;P 500</li>
                <li>• Stock fundamentals and quality filters</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
