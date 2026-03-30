"use client";

import { useEffect, useMemo, useRef } from "react";
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

export type LadderLine = {
  label: string;
  price: number;
  color: string;
  style: "solid" | "dashed";
  lineWidth?: number;
};

type CandleRow = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

function toUtc(dateStr: string): UTCTimestamp {
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 1000) as UTCTimestamp;
}

export default function LadderMiniChart({
  ticker,
  candles,
  lines,
  height = 400,
}: {
  ticker: string;
  candles: CandleRow[];
  lines: LadderLine[];
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const candleData = useMemo<CandlestickData<UTCTimestamp>[]>(() => {
    return (candles || []).map((c) => ({
      time: toUtc(c.date),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
  }, [candles]);

  // Create chart once
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !document.body.contains(el) || el.clientWidth === 0) return;

    const chart = createChart(el, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#030916" },
        textColor: "rgba(255,255,255,0.68)",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.1)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.1)",
        timeVisible: false,
      },
      crosshair: {
        vertLine: { color: "rgba(255,255,255,0.15)", style: LineStyle.Dashed },
        horzLine: { color: "rgba(255,255,255,0.15)", style: LineStyle.Dashed },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#16a34a",
      downColor: "#dc2626",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      try { chart.remove(); } catch { /* already removed */ }
      chartRef.current = null;
      seriesRef.current = null;
    };
    // Re-run when candles appear (container mounts) or height changes
  }, [height, candleData.length > 0]);

  // Update candle data
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || !candleData.length) return;
    seriesRef.current.setData(candleData);
    chartRef.current.timeScale().fitContent();
  }, [candleData]);

  // Update price lines
  useEffect(() => {
    if (!seriesRef.current) return;
    const series = seriesRef.current;

    const existing = (series as any).__ladderLines || [];
    for (const pl of existing) {
      try { series.removePriceLine(pl); } catch {}
    }

    const created: any[] = [];
    for (const line of lines) {
      if (line.price <= 0) continue;
      const pl = series.createPriceLine({
        price: line.price,
        color: line.color,
        lineWidth: (line.lineWidth || (line.style === "solid" ? 2 : 1)) as 1 | 2 | 3 | 4,
        lineStyle: line.style === "solid" ? LineStyle.Solid : LineStyle.Dashed,
        axisLabelVisible: true,
        title: line.label,
      });
      created.push(pl);
    }
    (series as any).__ladderLines = created;
  }, [lines]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#030916]">
      {candles.length > 0 && <div ref={containerRef} className="w-full" style={{ minHeight: height }} />}
      {candles.length === 0 && (
        <div className="flex h-[300px] items-center justify-center text-sm text-white/40">
          Enter a ticker to load chart data
        </div>
      )}
    </div>
  );
}
