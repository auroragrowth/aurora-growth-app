"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Ladder = {
  p30: number;
  p40: number;
  p50: number;
  p60: number;
  p70: number;
};

type Analysis = {
  ok?: boolean;
  ticker: string;
  currentPrice: number;
  majorRisePeak: number;
  majorRisePeakDate?: string | null;
  currentDropPct: number;
  currentAbsDrop?: number;
  worstDropPct: number;
  riskBand: number;
  triggeredLevel: number;
  zone: "Add" | "Starter" | "Prepare" | "Watch";
  ladder: Ladder;
};

type ProfitRow = {
  label: string;
  percent: number;
  price: number;
  profit: number;
};

type Props = {
  ticker: string;
  height?: number;
  avgPrice?: number | null;
  profits?: ProfitRow[];
};

type TradingViewChartApi = {
  createShape?: (
    point: { time: number; price: number },
    options: Record<string, unknown>
  ) => unknown;
  removeEntity?: (id: unknown) => void;
};

type TradingViewWidgetInstance = {
  remove?: () => void;
  onChartReady?: (cb: () => void) => void;
  chart?: () => TradingViewChartApi;
};

const LADDER_LEVELS: Array<{ key: keyof Ladder; label: string; step: number }> = [
  { key: "p30", label: "30%", step: 30 },
  { key: "p40", label: "40%", step: 40 },
  { key: "p50", label: "50%", step: 50 },
  { key: "p60", label: "60%", step: 60 },
  { key: "p70", label: "70%", step: 70 },
];

function formatMoney(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return `$${value.toFixed(2)}`;
}

function formatPercent(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return `${value.toFixed(2)}%`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTradingViewSymbol(ticker: string) {
  const raw = ticker.trim().toUpperCase();
  if (raw === "B") return "NYSE:B";
  if (raw === "ABX") return "TSX:ABX";
  return raw;
}

function getTradingViewIframeSrc(symbol: string) {
  const params = new URLSearchParams({
    symbol,
    interval: "D",
    theme: "dark",
    style: "1",
    locale: "en",
    withdateranges: "1",
    hide_side_toolbar: "0",
    allow_symbol_change: "1",
    saveimage: "0",
    toolbarbg: "#020817",
    hide_top_toolbar: "0",
    studies: "[]",
  });

  return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
}

function createHorizontalRay(
  chart: TradingViewChartApi | undefined,
  price: number,
  color: string,
  lineStyle: number,
  lineWidth: number,
  text: string
) {
  if (!chart?.createShape || !Number.isFinite(price)) return null;

  try {
    const now = Math.floor(Date.now() / 1000);

    return chart.createShape(
      { time: now, price },
      {
        shape: "horizontal_ray",
        lock: true,
        disableSelection: true,
        disableSave: false,
        disableUndo: true,
        text,
        overrides: {
          linecolor: color,
          linestyle: lineStyle,
          linewidth: lineWidth,
          showLabel: true,
          textcolor: color,
          horzLabelsAlign: "right",
          showPrice: true,
        },
      }
    );
  } catch {
    try {
      const now = Math.floor(Date.now() / 1000);

      return chart.createShape(
        { time: now, price },
        {
          shape: "horizontal_line",
          lock: true,
          disableSelection: true,
          disableSave: false,
          disableUndo: true,
          text,
          overrides: {
            linecolor: color,
            linestyle: lineStyle,
            linewidth: lineWidth,
            showLabel: true,
            textcolor: color,
            horzLabelsAlign: "right",
            showPrice: true,
          },
        }
      );
    } catch {
      return null;
    }
  }
}

export default function TradingViewAuroraPanel({
  ticker,
  height = 620,
  avgPrice = null,
  profits = [],
}: Props) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<TradingViewWidgetInstance | null>(null);
  const overlayIdsRef = useRef<unknown[]>([]);
  const redrawTimerRef = useRef<number | null>(null);

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flashLevel, setFlashLevel] = useState(false);

  const [showBuyLadder, setShowBuyLadder] = useState(true);
  const [showBep, setShowBep] = useState(true);
  const [showProfit, setShowProfit] = useState(true);

  const lastLevelRef = useRef<number | null>(null);

  const chartContainerId = useMemo(
    () => `tv-aurora-${ticker.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase()}`,
    [ticker]
  );

  const tradingViewSymbol = useMemo(() => getTradingViewSymbol(ticker), [ticker]);
  const iframeSrc = useMemo(() => getTradingViewIframeSrc(tradingViewSymbol), [tradingViewSymbol]);

  useEffect(() => {
    let alive = true;

    async function loadAnalysis() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/aurora/analysis?ticker=${encodeURIComponent(ticker)}`, {
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Failed to load Aurora analysis");
        }

        if (alive) {
          setAnalysis(json as Analysis);
        }
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : "Failed to load Aurora analysis");
          setAnalysis(null);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    if (ticker) loadAnalysis();

    return () => {
      alive = false;
    };
  }, [ticker]);

  useEffect(() => {
    if (!analysis) return;

    if (lastLevelRef.current === null) {
      lastLevelRef.current = analysis.triggeredLevel;
      return;
    }

    if (analysis.triggeredLevel !== lastLevelRef.current) {
      setFlashLevel(true);
      const timeout = window.setTimeout(() => setFlashLevel(false), 1200);
      lastLevelRef.current = analysis.triggeredLevel;
      return () => window.clearTimeout(timeout);
    }

    lastLevelRef.current = analysis.triggeredLevel;
  }, [analysis]);

  useEffect(() => {
    if (!chartRef.current) return;

    let cancelled = false;
    let readyTimeout: number | null = null;

    setLoadingChart(true);
    setUseIframeFallback(false);
    setChartReady(false);

    const cleanup = () => {
      if (readyTimeout) window.clearTimeout(readyTimeout);
      if (redrawTimerRef.current) window.clearTimeout(redrawTimerRef.current);
      const widget = widgetRef.current;
      if (widget?.remove) {
        try { widget.remove(); } catch { /* container already removed from DOM */ }
      }
      widgetRef.current = null;
      overlayIdsRef.current = [];
      if (chartRef.current) chartRef.current.innerHTML = "";
    };

    cleanup();

    function failToIframe() {
      if (cancelled) return;
      setUseIframeFallback(true);
      setChartReady(false);
      setLoadingChart(false);
    }

    function createWidget() {
      if (
        cancelled ||
        !chartRef.current ||
        typeof window === "undefined" ||
        !window.TradingView?.widget
      ) {
        failToIframe();
        return;
      }

      chartRef.current.innerHTML = "";

      // Verify the container element exists in the DOM before creating widget
      const containerEl = document.getElementById(chartContainerId);
      if (!containerEl) {
        failToIframe();
        return;
      }

      try {
        const widget = new window.TradingView.widget({
          autosize: true,
          symbol: tradingViewSymbol,
          interval: "D",
          timezone: "Europe/London",
          theme: "dark",
          style: "1",
          locale: "en",
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          allow_symbol_change: true,
          save_image: false,
          container_id: chartContainerId,
          withdateranges: true,
          backgroundColor: "#020817",
          gridColor: "rgba(255,255,255,0.06)",
          toolbar_bg: "#020817",
          overrides: {
            "paneProperties.background": "#020817",
            "paneProperties.backgroundType": "solid",
            "paneProperties.vertGridProperties.color": "rgba(255,255,255,0.06)",
            "paneProperties.horzGridProperties.color": "rgba(255,255,255,0.06)",
            "mainSeriesProperties.candleStyle.upColor": "#10b981",
            "mainSeriesProperties.candleStyle.downColor": "#ef4444",
            "mainSeriesProperties.candleStyle.borderUpColor": "#10b981",
            "mainSeriesProperties.candleStyle.borderDownColor": "#ef4444",
            "mainSeriesProperties.candleStyle.wickUpColor": "#10b981",
            "mainSeriesProperties.candleStyle.wickDownColor": "#ef4444",
            "scalesProperties.textColor": "rgba(255,255,255,0.72)",
          },
        }) as TradingViewWidgetInstance;

        widgetRef.current = widget;

        readyTimeout = window.setTimeout(() => {
          failToIframe();
        }, 4500);

        widget.onChartReady?.(() => {
          if (cancelled) return;
          if (readyTimeout) window.clearTimeout(readyTimeout);
          setUseIframeFallback(false);
          setChartReady(true);
          setLoadingChart(false);
        });
      } catch {
        failToIframe();
      }
    }

    if (window.TradingView?.widget) {
      createWidget();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-tradingview-widget="true"]'
      );

      if (existing) {
        const waitForTv = window.setInterval(() => {
          if (window.TradingView?.widget) {
            window.clearInterval(waitForTv);
            createWidget();
          }
        }, 150);

        readyTimeout = window.setTimeout(() => {
          window.clearInterval(waitForTv);
          failToIframe();
        }, 4500);

        return () => {
          cancelled = true;
          if (readyTimeout) window.clearTimeout(readyTimeout);
          window.clearInterval(waitForTv);
          cleanup();
        };
      }

      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.dataset.tradingviewWidget = "true";
      script.onload = () => createWidget();
      script.onerror = () => failToIframe();
      document.body.appendChild(script);

      readyTimeout = window.setTimeout(() => {
        failToIframe();
      }, 4500);
    }

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [chartContainerId, tradingViewSymbol]);

  useEffect(() => {
    if (!chartReady || useIframeFallback) return;

    const widget = widgetRef.current;
    const chart = widget?.chart?.();
    if (!chart) return;

    const drawOverlays = () => {
      if (overlayIdsRef.current.length && chart.removeEntity) {
        overlayIdsRef.current.forEach((id) => {
          try {
            chart.removeEntity?.(id);
          } catch {}
        });
      }
      overlayIdsRef.current = [];

      const ids: unknown[] = [];

      if (analysis) {
        const currentId = createHorizontalRay(
          chart,
          analysis.currentPrice,
          "#ffffff",
          0,
          1,
          `Current ${analysis.currentPrice.toFixed(2)}`
        );
        if (currentId) ids.push(currentId);

        const peakId = createHorizontalRay(
          chart,
          analysis.majorRisePeak,
          "#f59e0b",
          0,
          2,
          `Peak ${analysis.majorRisePeak.toFixed(2)}`
        );
        if (peakId) ids.push(peakId);

        if (showBuyLadder) {
          LADDER_LEVELS.forEach((level) => {
            const price = analysis.ladder[level.key];
            const isActive = analysis.triggeredLevel === level.step;

            const id = createHorizontalRay(
              chart,
              price,
              isActive ? "#22ff88" : "#38bdf8",
              isActive ? 0 : 2,
              isActive ? 3 : 2,
              isActive
                ? `${level.label} BUY ${price.toFixed(2)} ACTIVE`
                : `${level.label} BUY ${price.toFixed(2)}`
            );
            if (id) ids.push(id);
          });
        }
      }

      if (showBep && avgPrice !== null && Number.isFinite(avgPrice) && avgPrice > 0) {
        const bepId = createHorizontalRay(
          chart,
          avgPrice,
          "#60a5fa",
          0,
          3,
          `BEP ${avgPrice.toFixed(2)}`
        );
        if (bepId) ids.push(bepId);
      }

      if (showProfit && profits.length) {
        profits.forEach((row) => {
          if (!Number.isFinite(row.price)) return;
          const id = createHorizontalRay(
            chart,
            row.price,
            "#fbbf24",
            2,
            2,
            `${row.label} ${row.price.toFixed(2)}`
          );
          if (id) ids.push(id);
        });
      }

      overlayIdsRef.current = ids;
    };

    drawOverlays();

    if (redrawTimerRef.current) window.clearTimeout(redrawTimerRef.current);
    redrawTimerRef.current = window.setTimeout(drawOverlays, 900);

    return () => {
      if (redrawTimerRef.current) window.clearTimeout(redrawTimerRef.current);
    };
  }, [chartReady, useIframeFallback, analysis, showBuyLadder, showBep, showProfit, avgPrice, profits]);

  const peakDateLabel = formatDate(analysis?.majorRisePeakDate);

  const nextLevel = useMemo(() => {
    if (!analysis) return null;

    const nextStep = analysis.triggeredLevel + 10;
    if (nextStep > 70) return null;

    const map: Record<number, keyof Ladder> = {
      30: "p30",
      40: "p40",
      50: "p50",
      60: "p60",
      70: "p70",
    };

    const key = map[nextStep];
    if (!key) return null;

    return {
      step: nextStep,
      price: analysis.ladder[key],
    };
  }, [analysis]);

  const distanceToNextPct = useMemo(() => {
    if (!analysis || !nextLevel?.price) return null;
    return ((analysis.currentPrice - nextLevel.price) / nextLevel.price) * 100;
  }, [analysis, nextLevel]);

  const bepDistancePct = useMemo(() => {
    if (!analysis || avgPrice === null || !Number.isFinite(avgPrice) || avgPrice <= 0) return null;
    return ((analysis.currentPrice - avgPrice) / avgPrice) * 100;
  }, [analysis, avgPrice]);

  const zoneClasses =
    analysis?.zone === "Add"
      ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
      : analysis?.zone === "Starter"
      ? "border-sky-400/30 bg-sky-500/15 text-sky-300"
      : analysis?.zone === "Prepare"
      ? "border-amber-400/30 bg-amber-500/15 text-amber-300"
      : "border-white/10 bg-white/5 text-white/70";

  const zoneText =
    analysis?.zone === "Add"
      ? "Strong Add Zone"
      : analysis?.zone === "Starter"
      ? "Starter Position Zone"
      : analysis?.zone === "Prepare"
      ? "Prepare / Watch Closely"
      : "No Action Zone";

  return (
    <div className="aurora-live rounded-3xl border border-white/10 bg-[#07111f] shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
      <style jsx>{`
        @keyframes auroraPulse {
          0% {
            box-shadow:
              0 0 0 0 rgba(34, 255, 136, 0.28),
              0 0 18px rgba(34, 255, 136, 0.16);
          }
          70% {
            box-shadow:
              0 0 0 12px rgba(34, 255, 136, 0),
              0 0 30px rgba(34, 255, 136, 0.28);
          }
          100% {
            box-shadow:
              0 0 0 0 rgba(34, 255, 136, 0),
              0 0 18px rgba(34, 255, 136, 0.16);
          }
        }

        @keyframes auroraBadgePulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.82;
            transform: scale(1.04);
          }
        }

        @keyframes auroraSweep {
          0% {
            transform: translateX(-120%);
            opacity: 0;
          }
          30% {
            opacity: 0.2;
          }
          100% {
            transform: translateX(180%);
            opacity: 0;
          }
        }

        @keyframes auroraBreath {
          0%, 100% {
            box-shadow: 0 0 20px rgba(34,255,136,0.08);
          }
          50% {
            box-shadow: 0 0 35px rgba(34,255,136,0.18);
          }
        }

        .aurora-live {
          animation: auroraBreath 4s ease-in-out infinite;
        }

        .aurora-ladder-hit {
          position: relative;
          overflow: hidden;
          box-shadow:
            inset 0 0 0 1px rgba(52, 211, 153, 0.14),
            0 0 20px rgba(16, 185, 129, 0.08);
        }

        .aurora-ladder-hit::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            110deg,
            transparent 0%,
            rgba(255, 255, 255, 0.04) 45%,
            rgba(34, 255, 136, 0.12) 50%,
            rgba(255, 255, 255, 0.04) 55%,
            transparent 100%
          );
          transform: translateX(-120%);
          animation: auroraSweep 3.6s linear infinite;
          pointer-events: none;
        }

        .aurora-ladder-active {
          animation: auroraPulse 2s ease-in-out infinite;
          box-shadow:
            inset 0 0 0 1px rgba(34, 255, 136, 0.28),
            0 0 26px rgba(34, 255, 136, 0.18);
        }

        .aurora-ladder-badge-active {
          animation: auroraBadgePulse 1.6s ease-in-out infinite;
        }
      `}</style>

      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">
              Aurora Ladder Panel
            </div>
            <div className="mt-1 flex items-end gap-3">
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                {ticker.toUpperCase()}
              </h2>
              <div className="pb-1 text-sm text-white/45">
                Major-rise drawdown engine
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBuyLadder((v) => !v)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                showBuyLadder
                  ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-300"
                  : "border-white/10 bg-white/5 text-white/55"
              }`}
            >
              Buy Ladder
            </button>

            <button
              type="button"
              onClick={() => setShowBep((v) => !v)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                showBep
                  ? "border-sky-400/35 bg-sky-500/15 text-sky-300"
                  : "border-white/10 bg-white/5 text-white/55"
              }`}
            >
              BEP
            </button>

            <button
              type="button"
              onClick={() => setShowProfit((v) => !v)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                showProfit
                  ? "border-amber-400/35 bg-amber-500/15 text-amber-300"
                  : "border-white/10 bg-white/5 text-white/55"
              }`}
            >
              Profit
            </button>

            <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${zoneClasses}`}>
              {zoneText}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.5fr)_390px]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#020817]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="text-sm font-medium text-white">
              TradingView Chart
              <span className="ml-2 text-xs text-white/40">{tradingViewSymbol}</span>
            </div>
            <div className="text-xs text-white/45">
              {loadingChart
                ? "Loading chart..."
                : useIframeFallback
                ? "Iframe fallback live"
                : "Live chart ready"}
            </div>
          </div>

          <div className="border-b border-white/10 px-4 py-2">
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className={`rounded-full border px-2 py-1 ${showBuyLadder ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/5 text-white/45"}`}>
                Buy ladder {showBuyLadder ? "on" : "off"}
              </span>
              <span className={`rounded-full border px-2 py-1 ${showBep ? "border-sky-400/30 bg-sky-500/10 text-sky-300" : "border-white/10 bg-white/5 text-white/45"}`}>
                BEP {showBep ? "on" : "off"}
              </span>
              <span className={`rounded-full border px-2 py-1 ${showProfit ? "border-amber-400/30 bg-amber-500/10 text-amber-300" : "border-white/10 bg-white/5 text-white/45"}`}>
                Profit {showProfit ? "on" : "off"}
              </span>
            </div>
          </div>

          <div className="relative" style={{ height }}>
            {!useIframeFallback && (
              <div id={chartContainerId} ref={chartRef} className="h-full w-full" />
            )}

            {useIframeFallback && (
              <iframe
                title={`TradingView ${tradingViewSymbol}`}
                src={iframeSrc}
                className="h-full w-full border-0"
                loading="lazy"
              />
            )}

            {loadingChart && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#020817]/70 text-sm text-white/50">
                Loading TradingView…
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                Current Price
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {loading ? "—" : formatMoney(analysis?.currentPrice)}
              </div>
            </div>

            <div
              className={`rounded-2xl border px-4 py-3 transition-all duration-500 ${
                flashLevel
                  ? "border-emerald-400/40 bg-emerald-500/20 shadow-[0_0_25px_rgba(34,255,136,0.25)]"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                Active Level
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {loading ? "—" : `${analysis?.triggeredLevel ?? 0}%`}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                Major Rise Peak
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {loading ? "—" : formatMoney(analysis?.majorRisePeak)}
              </div>
              <div className="mt-1 text-xs text-white/50">
                {loading ? "—" : peakDateLabel}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                Risk Band
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {loading ? "—" : formatPercent(analysis?.riskBand)}
              </div>
              <div className="mt-1 text-xs text-white/50">
                Depth vs worst normal drop
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                Current Drop
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {loading ? "—" : formatPercent(Math.abs(analysis?.currentDropPct ?? 0))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                Worst Drop
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {loading ? "—" : formatPercent(analysis?.worstDropPct)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                Zone
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {loading ? "—" : analysis?.zone ?? "—"}
              </div>
            </div>
          </div>

          {showBuyLadder && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-white">Aurora Buy Ladder</div>
                <div className="text-xs text-white/45">
                  Triggered when price falls through level
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {LADDER_LEVELS.map((level) => {
                  const levelPrice = analysis?.ladder?.[level.key];
                  const isHit =
                    analysis && levelPrice !== undefined
                      ? analysis.currentPrice <= levelPrice
                      : false;
                  const isActive = analysis?.triggeredLevel === level.step;

                  const stateClasses = isActive
                    ? `aurora-ladder-hit aurora-ladder-active border-[#22ff88]/40 bg-emerald-500/18 text-emerald-200 ${
                        flashLevel ? "scale-[1.02] shadow-[0_0_35px_rgba(34,255,136,0.35)]" : ""
                      }`
                    : isHit
                    ? "aurora-ladder-hit border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 bg-white/5 text-white/70";

                  return (
                    <div
                      key={level.key}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 transition-all duration-300 hover:-translate-y-[1px] hover:border-white/15 hover:bg-white/[0.07] ${stateClasses}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="min-w-[44px] font-medium">{level.label}</span>
                        {isActive && (
                          <span className="aurora-ladder-badge-active rounded-full border border-[#22ff88]/35 bg-[#22ff88]/12 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[#7dffbc]">
                            Active
                          </span>
                        )}
                        {!isActive && isHit && (
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                            Hit
                          </span>
                        )}
                      </div>
                      <span className={`font-semibold ${isActive ? "text-[#9dffcd]" : ""}`}>
                        {loading ? "—" : formatMoney(levelPrice)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/75">
                <div>
                  Current Depth:{" "}
                  <span className="font-semibold text-white">
                    {loading ? "—" : formatPercent(analysis?.riskBand)}
                  </span>
                </div>
                <div className="mt-1">
                  Active Level:{" "}
                  <span className="font-semibold text-emerald-300">
                    {loading ? "—" : `${analysis?.triggeredLevel ?? 0}%`}
                  </span>
                </div>
                <div className="mt-1">
                  Next Level:{" "}
                  <span className="font-semibold text-white">
                    {loading
                      ? "—"
                      : nextLevel
                      ? `${nextLevel.step}% at ${formatMoney(nextLevel.price)}`
                      : "Fully triggered"}
                  </span>
                </div>
                <div className="mt-1">
                  Distance to Next:{" "}
                  <span className="font-semibold text-white">
                    {loading
                      ? "—"
                      : distanceToNextPct === null
                      ? "—"
                      : formatPercent(distanceToNextPct)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {showBep && (
            <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-sky-200">BEP</div>
                <div className="text-xs text-sky-200/60">Break-even position</div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                    Average / BEP
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {formatMoney(avgPrice)}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                    Vs Current
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {bepDistancePct === null ? "—" : formatPercent(bepDistancePct)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {showProfit && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-amber-200">Profit Ladder</div>
                <div className="text-xs text-amber-200/60">Targets from BEP</div>
              </div>

              <div className="mt-3 space-y-2">
                {profits.length ? (
                  profits.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                    >
                      <div>
                        <div className="text-sm font-medium text-white">{row.label}</div>
                        <div className="text-xs text-white/45">{formatPercent(row.percent)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-white">{formatMoney(row.price)}</div>
                        <div className="text-xs text-amber-200">{formatMoney(row.profit)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/55">
                    No profit ladder data passed in.
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/80">
            <div className="mb-2 text-white/50">Execution Plan</div>
            {analysis && analysis.triggeredLevel >= 30 && <div>• 30% → Starter buy</div>}
            {analysis && analysis.triggeredLevel >= 40 && <div>• 40% → Add</div>}
            {analysis && analysis.triggeredLevel >= 50 && <div>• 50% → Strong add</div>}
            {analysis && analysis.triggeredLevel >= 60 && <div>• 60% → Heavy add</div>}
            {analysis && analysis.triggeredLevel >= 70 && (
              <div className="font-semibold text-[#7dffbc]">• 70% → Max allocation zone</div>
            )}
          </div>

          {error && (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
