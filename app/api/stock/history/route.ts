import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RangeKey = "3m" | "6m" | "1y" | "2y" | "5y" | "max";

const RANGE_DAYS: Record<RangeKey, number> = {
  "3m": 90,
  "6m": 180,
  "1y": 365,
  "2y": 730,
  "5y": 1825,
  max: 7300,
};

const YAHOO_RANGE: Record<RangeKey, string> = {
  "3m": "3mo",
  "6m": "6mo",
  "1y": "1y",
  "2y": "2y",
  "5y": "5y",
  max: "max",
};

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

type Candle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

async function fetchYahooHistory(symbol: string, range: RangeKey): Promise<Candle[]> {
  const yahooRange = YAHOO_RANGE[range] || "1y";
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=${yahooRange}&interval=1d`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 AuroraGrowth/1.0",
      Accept: "application/json,text/plain,*/*",
    },
  });

  const raw = await res.text();
  if (!res.ok) throw new Error(`Yahoo error (${res.status}) ${raw.slice(0, 200)}`);

  const data = JSON.parse(raw);
  const result = data?.chart?.result?.[0];
  const timestamps: number[] = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0];

  if (!timestamps.length || !quote) throw new Error("No Yahoo data returned");

  const out: Candle[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const ts = Number(timestamps[i]);
    const open = toNum(quote.open?.[i]);
    const high = toNum(quote.high?.[i]);
    const low = toNum(quote.low?.[i]);
    const close = toNum(quote.close?.[i]);
    const volume = toNum(quote.volume?.[i]);

    if (!ts || !open || !high || !low || !close) continue;

    out.push({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: Math.round(volume),
    });
  }

  if (!out.length) throw new Error("No usable Yahoo candles");
  return out;
}

async function upsertHistory(ticker: string, candles: Candle[]) {
  const rows = candles.map((c) => ({
    ticker,
    date: c.date,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  }));

  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await supabaseAdmin
      .from("price_history")
      .upsert(batch, { onConflict: "ticker,date", ignoreDuplicates: false });
  }
}

export async function GET(req: NextRequest) {
  try {
    const ticker = (req.nextUrl.searchParams.get("ticker") || "").trim().toUpperCase();
    const range = (req.nextUrl.searchParams.get("range") || "1y") as RangeKey;

    if (!ticker) {
      return NextResponse.json({ ok: false, error: "Missing ticker" }, { status: 400 });
    }

    const validRange = RANGE_DAYS[range] ? range : "1y";
    const days = RANGE_DAYS[validRange];

    // Check cached data
    const { data: cached, error: cacheErr } = await supabaseAdmin
      .from("price_history")
      .select("date,open,high,low,close,volume")
      .eq("ticker", ticker)
      .gte("date", new Date(Date.now() - days * 86400000).toISOString().slice(0, 10))
      .order("date", { ascending: true });

    if (!cacheErr && cached && cached.length > 10) {
      const lastDate = cached[cached.length - 1].date;
      const lastTime = new Date(lastDate + "T00:00:00Z").getTime();
      const ageHours = (Date.now() - lastTime) / 3600000;

      // If last entry is within ~36 hours (accounts for weekends), use cache
      if (ageHours < 36) {
        return NextResponse.json({
          ok: true,
          ticker,
          range: validRange,
          source: "cache",
          candles: cached,
          count: cached.length,
        });
      }
    }

    // Fetch fresh data — always fetch max available to fill the cache
    const fetchRange = days > 365 ? validRange : "5y";
    const candles = await fetchYahooHistory(ticker, fetchRange as RangeKey);

    // Store in background — don't block the response
    upsertHistory(ticker, candles).catch((e) =>
      console.error("price_history upsert failed:", e)
    );

    // Filter to requested range
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const filtered = candles.filter((c) => c.date >= cutoff);

    return NextResponse.json({
      ok: true,
      ticker,
      range: validRange,
      source: "yahoo",
      candles: filtered,
      count: filtered.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "History load failed" },
      { status: 500 }
    );
  }
}
