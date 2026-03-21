import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PROVIDER = process.env.AURORA_QUOTE_PROVIDER || "yahoo";
const FINNHUB_KEY = process.env.FINNHUB_KEY || "";

type QuoteResult = {
  symbol: string;
  name: string;
  price: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  currency: string;
  marketState?: string | null;
  source: string;
  fetchedAt: string;
};

function toNum(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

async function fetchYahoo(symbol: string): Promise<QuoteResult> {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 AuroraGrowth/1.0" },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Yahoo quote request failed (${res.status})`);

  const raw = await res.json();
  const result = raw?.quoteResponse?.result?.[0];

  if (!result?.symbol) throw new Error(`No quote found for ${symbol}`);

  const price =
    toNum(result.regularMarketPrice) ??
    toNum(result.regularMarketPreviousClose);

  if (price === undefined)
    throw new Error(`No usable price returned for ${symbol}`);

  return {
    symbol: result.symbol,
    name: result.longName || result.shortName || result.symbol,
    price,
    previousClose: toNum(result.regularMarketPreviousClose),
    change: toNum(result.regularMarketChange),
    changePercent: toNum(result.regularMarketChangePercent),
    currency: result.currency || "USD",
    marketState: result.marketState || null,
    source: "yahoo",
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchFinnhub(symbol: string): Promise<QuoteResult> {
  if (!FINNHUB_KEY) throw new Error("Missing FINNHUB_KEY");

  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`;

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok)
    throw new Error(`Finnhub quote request failed (${res.status})`);

  const data = await res.json();

  if (!data?.c)
    throw new Error(`Finnhub no price returned for ${symbol}`);

  return {
    symbol,
    name: symbol,
    price: data.c,
    previousClose: data.pc,
    change: data.c - data.pc,
    changePercent: ((data.c - data.pc) / data.pc) * 100,
    currency: "USD",
    marketState: null,
    source: "finnhub",
    fetchedAt: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const symbol = (req.nextUrl.searchParams.get("symbol") || "")
      .trim()
      .toUpperCase();

    if (!symbol) {
      return NextResponse.json(
        { ok: false, error: "Missing symbol" },
        { status: 400 }
      );
    }

    const quote =
      PROVIDER === "finnhub"
        ? await fetchFinnhub(symbol)
        : await fetchYahoo(symbol);

    return NextResponse.json({ ok: true, ...quote });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
