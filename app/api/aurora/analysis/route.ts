import { NextRequest, NextResponse } from "next/server";

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
    error?: {
      code?: string;
      description?: string;
    } | null;
  };
};

function toIsoDate(unixSeconds: number | null | undefined) {
  if (!unixSeconds) return null;
  const d = new Date(unixSeconds * 1000);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function mapTicker(input: string) {
  const raw = input.trim().toUpperCase();

  // Barrick support:
  // NYSE:B
  // TSX:ABX
  if (raw === "B" || raw === "NYSE:B") return "B";
  if (raw === "ABX" || raw === "TSX:ABX") return "ABX.TO";

  // pass through common Yahoo-style tickers
  return raw;
}

async function fetchYahooCandles(symbol: string): Promise<Candle[]> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?range=3y&interval=1d&includePrePost=false&events=div,splits`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Yahoo request failed (${res.status})`);
  }

  const json = (await res.json()) as YahooChartResponse;

  const result = json.chart?.result?.[0];
  const error = json.chart?.error;

  if (error) {
    throw new Error(error.description || error.code || "Yahoo chart error");
  }

  if (!result?.timestamp?.length) {
    throw new Error("No chart timestamps returned");
  }

  const quote = result.indicators?.quote?.[0];
  if (!quote) {
    throw new Error("No quote data returned");
  }

  const timestamps = result.timestamp || [];
  const opens = quote.open || [];
  const highs = quote.high || [];
  const lows = quote.low || [];
  const closes = quote.close || [];

  const candles: Candle[] = [];

  for (let i = 0; i < timestamps.length; i += 1) {
    const time = timestamps[i];
    const open = opens[i];
    const high = highs[i];
    const low = lows[i];
    const close = closes[i];

    if (
      isFiniteNumber(time) &&
      isFiniteNumber(open) &&
      isFiniteNumber(high) &&
      isFiniteNumber(low) &&
      isFiniteNumber(close)
    ) {
      candles.push({
        time,
        open,
        high,
        low,
        close,
      });
    }
  }

  if (!candles.length) {
    throw new Error("No valid candles after filtering");
  }

  return candles;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const inputTicker = (searchParams.get("ticker") || "B").trim();

    if (!inputTicker) {
      return NextResponse.json(
        { ok: false, error: "Ticker is required" },
        { status: 400 }
      );
    }

    const yahooSymbol = mapTicker(inputTicker);
    const candles = await fetchYahooCandles(yahooSymbol);

    const latest = candles[candles.length - 1];
    const currentPrice = latest.close;

    // Major rise peak = highest high in the loaded set
    const peakCandle = candles.reduce((best, candle) =>
      candle.high > best.high ? candle : best
    );

    const majorRisePeak = peakCandle.high;
    const majorRisePeakDate = toIsoDate(peakCandle.time);

    // Current drop from peak
    const currentDropPct =
      majorRisePeak > 0
        ? ((currentPrice - majorRisePeak) / majorRisePeak) * 100
        : 0;

    const currentAbsDrop = Math.abs(currentDropPct);

    // Worst drop after peak = lowest low after the peak candle
    const peakIndex = candles.findIndex((c) => c.time === peakCandle.time);
    const afterPeak = peakIndex >= 0 ? candles.slice(peakIndex) : candles;

    const lowestAfterPeak = afterPeak.reduce((best, candle) =>
      candle.low < best.low ? candle : best
    );

    const worstDropPct =
      majorRisePeak > 0
        ? ((majorRisePeak - lowestAfterPeak.low) / majorRisePeak) * 100
        : 0;

    const riskBandRaw =
      worstDropPct > 0 ? (currentAbsDrop / worstDropPct) * 100 : 0;

    const riskBand = Math.max(0, Math.min(100, riskBandRaw));

    const triggeredLevel =
      riskBand >= 70 ? 70 :
      riskBand >= 60 ? 60 :
      riskBand >= 50 ? 50 :
      riskBand >= 40 ? 40 :
      riskBand >= 30 ? 30 : 0;

    const ladder = {
      p30: majorRisePeak * (1 - (worstDropPct * 0.30) / 100),
      p40: majorRisePeak * (1 - (worstDropPct * 0.40) / 100),
      p50: majorRisePeak * (1 - (worstDropPct * 0.50) / 100),
      p60: majorRisePeak * (1 - (worstDropPct * 0.60) / 100),
      p70: majorRisePeak * (1 - (worstDropPct * 0.70) / 100),
    };

    const zone =
      triggeredLevel >= 70 ? "Add" :
      triggeredLevel >= 50 ? "Starter" :
      triggeredLevel >= 30 ? "Prepare" :
      "Watch";

    return NextResponse.json({
      ok: true,
      ticker: inputTicker.toUpperCase(),
      yahooSymbol,
      currentPrice: round2(currentPrice),
      majorRisePeak: round2(majorRisePeak),
      majorRisePeakDate,
      currentDropPct: round2(currentDropPct),
      currentAbsDrop: round2(currentAbsDrop),
      worstDropPct: round2(worstDropPct),
      riskBand: round2(riskBand),
      triggeredLevel,
      zone,
      candleCount: candles.length,
      ladder: {
        p30: round2(ladder.p30),
        p40: round2(ladder.p40),
        p50: round2(ladder.p50),
        p60: round2(ladder.p60),
        p70: round2(ladder.p70),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Analysis failed",
      },
      { status: 500 }
    );
  }
}
