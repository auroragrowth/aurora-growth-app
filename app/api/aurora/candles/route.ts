import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FINNHUB_KEY = process.env.FINNHUB_KEY || "";

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

async function getFinnhubCandles(symbol: string): Promise<Candle[]> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - 60 * 60 * 24 * 365; // 1 year

  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(
    symbol
  )}&resolution=D&from=${from}&to=${now}&token=${FINNHUB_KEY}`;

  const res = await fetch(url, { cache: "no-store" });
  const raw = await res.text();

  if (!res.ok) {
    throw new Error(`Finnhub candle error (${res.status}) ${raw.slice(0, 200)}`);
  }

  const data = JSON.parse(raw);

  if (data?.s !== "ok") {
    throw new Error(`Finnhub bad candle response: ${raw.slice(0, 200)}`);
  }

  const out: Candle[] = [];

  for (let i = 0; i < (data.t || []).length; i++) {
    const ts = Number(data.t[i]);
    const open = toNum(data.o?.[i]);
    const high = toNum(data.h?.[i]);
    const low = toNum(data.l?.[i]);
    const close = toNum(data.c?.[i]);

    if (!ts || !open || !high || !low || !close) continue;

    out.push({
      time: new Date(ts * 1000).toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
    });
  }

  if (!out.length) {
    throw new Error("No usable Finnhub candles returned");
  }

  return out;
}

async function getYahooCandles(symbol: string): Promise<Candle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=1y&interval=1d`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 AuroraGrowth/1.0",
      Accept: "application/json,text/plain,*/*",
    },
  });

  const raw = await res.text();

  if (!res.ok) {
    throw new Error(`Yahoo candle error (${res.status}) ${raw.slice(0, 200)}`);
  }

  const data = JSON.parse(raw);
  const result = data?.chart?.result?.[0];
  const timestamps: number[] = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0];

  if (!timestamps.length || !quote) {
    throw new Error("No Yahoo candle data returned");
  }

  const out: Candle[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const ts = Number(timestamps[i]);
    const open = toNum(quote.open?.[i]);
    const high = toNum(quote.high?.[i]);
    const low = toNum(quote.low?.[i]);
    const close = toNum(quote.close?.[i]);

    if (!ts || !open || !high || !low || !close) continue;

    out.push({
      time: new Date(ts * 1000).toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
    });
  }

  if (!out.length) {
    throw new Error("No usable Yahoo candles returned");
  }

  return out;
}

async function getCandles(symbol: string) {
  if (FINNHUB_KEY) {
    try {
      return {
        source: "finnhub",
        candles: await getFinnhubCandles(symbol),
      };
    } catch {
      // fallback below
    }
  }

  return {
    source: "yahoo",
    candles: await getYahooCandles(symbol),
  };
}

export async function GET(req: NextRequest) {
  try {
    const ticker = (req.nextUrl.searchParams.get("ticker") || "")
      .trim()
      .toUpperCase();

    if (!ticker) {
      return NextResponse.json(
        { ok: false, error: "Missing ticker" },
        { status: 400 }
      );
    }

    const { source, candles } = await getCandles(ticker);

    return NextResponse.json({
      ok: true,
      ticker,
      source,
      candles,
      count: candles.length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Candle load failed",
      },
      { status: 500 }
    );
  }
}
