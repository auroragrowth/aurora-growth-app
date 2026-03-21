"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ColorType,
  createChart,
  CandlestickSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp,
} from "lightweight-charts";

type Line = {
  label: string;
  price: number;
  color: string;
  kind?: "peak" | "entry" | "average" | "profit" | "current";
};

type CandleRow = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

function toUtcTimestamp(dateStr: string): UTCTimestamp {
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 1000) as UTCTimestamp;
}

function shortLabel(label: string) {
  if (label === "Peak") return "Peak";
  if (label === "Average") return "Average";
  return label;
}

export default function AuroraOverlayChart({
  ticker,
  lines,
  selectedLabel,
}: {
  ticker: string;
  lines: Line[];
  selectedLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [candles, setCandles] = useState<CandleRow[]>([]);
  const [source, setSource] = useState<string>("");
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [tickDirection, setTickDirection] = useState<"up" | "down" | "flat">("flat");
  const prevPriceRef = useRef<number | null>(null);

  useEffect(() => {
    let ignore = false;
    let timer: NodeJS.Timeout | null = null;

    async function load() {
      try {
        const res = await fetch(`/api/aurora/candles?ticker=${ticker}`, {
          cache: "no-store",
        });
        const json = await res.json();

        if (!ignore && json?.ok && Array.isArray(json.candles)) {
          const nextCandles = json.candles as CandleRow[];
          setCandles(nextCandles);
          setSource(json.source || "");

          const latest = nextCandles[nextCandles.length - 1]?.close ?? null;
          if (latest !== null) {
            const prev = prevPriceRef.current;
            if (prev !== null) {
              if (latest > prev) setTickDirection("up");
              else if (latest < prev) setTickDirection("down");
              else setTickDirection("flat");
            }
            prevPriceRef.current = latest;
            setLastPrice(latest);
          }
        }
      } catch {
        if (!ignore) {
          setCandles([]);
          setSource("");
        }
      }
    }

    if (ticker) {
      load();
      timer = setInterval(load, 10000);
    }

    return () => {
      ignore = true;
      if (timer) clearInterval(timer);
    };
  }, [ticker]);

  const candleData = useMemo<CandlestickData<UTCTimestamp>[]>(() => {
    return (candles || []).map((c) => ({
      time: toUtcTimestamp(c.time),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
  }, [candles]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      height: 420,
      layout: {
        background: { type: ColorType.Solid, color: "#030916" },
        textColor: "rgba(255,255,255,0.68)",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.05)" },
        horzLines: { color: "rgba(255,255,255,0.05)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.12)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.12)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: {
          color: "rgba(255,255,255,0.18)",
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: "rgba(255,255,255,0.18)",
          style: LineStyle.Dashed,
        },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#16a34a",
      downColor: "#dc2626",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceLineVisible: false,
      lastValueVisible: true,
    });

    chartRef.current = chart;
    candleSeriesRef.current = series;

    const handleResize = () => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !chartRef.current) return;
    if (!candleData.length) return;

    candleSeriesRef.current.setData(candleData);
    chartRef.current.timeScale().fitContent();
  }, [candleData]);

  useEffect(() => {
    if (!candleSeriesRef.current) return;

    const series = candleSeriesRef.current;
    const existing = (series as any).__auroraPriceLines || [];

    for (const line of existing) {
      try {
        series.removePriceLine(line);
      } catch {}
    }

    const created: any[] = [];

    lines.forEach((line) => {
      const isSelected = selectedLabel && selectedLabel === line.label;

      const priceLine = series.createPriceLine({
        price: line.price,
        color: line.color,
        lineWidth: isSelected ? 3 : line.label === "Peak" || line.label === "Average" ? 2 : 1,
        lineStyle:
          line.label === "Peak" || line.label === "Average"
            ? LineStyle.Solid
            : LineStyle.Dashed,
        axisLabelVisible: true,
        title: shortLabel(line.label),
      });

      created.push(priceLine);
    });

    (series as any).__auroraPriceLines = created;
  }, [lines, selectedLabel]);

  const tickClass =
    tickDirection === "up"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      : tickDirection === "down"
      ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
      : "border-white/10 bg-white/5 text-white/80";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">
            Aurora Candlestick Overlay
          </h3>
          <p className="mt-1 text-sm text-white/45">
            Real candles with Aurora ladder, average line and profit targets
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {lastPrice !== null ? (
            <span className={`rounded-full border px-3 py-1 font-medium transition ${tickClass}`}>
              {ticker} ${lastPrice.toFixed(2)}
            </span>
          ) : null}
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-cyan-200">
            Peak
          </span>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-emerald-200">
            Entries
          </span>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white">
            Average
          </span>
          <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-yellow-200">
            Profit
          </span>
          {source ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/65">
              {source}
            </span>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#030916]">
        <div ref={containerRef} className="w-full" />
      </div>
    </div>
  );
}
