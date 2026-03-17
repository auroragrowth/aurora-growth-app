import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type YahooQuoteResult = {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  currency?: string;
  marketState?: string;
};

function toNum(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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

    const url =
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;

    const upstream = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 AuroraGrowth/1.0",
        "Accept": "application/json,text/plain,*/*",
      },
    });

    const raw = await upstream.text();

    if (!upstream.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `Upstream quote request failed (${upstream.status})`,
          details: raw.slice(0, 500),
        },
        { status: 502 }
      );
    }

    let parsed: any = null;

    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "Quote service returned non-JSON",
          details: raw.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const result: YahooQuoteResult | undefined =
      parsed?.quoteResponse?.result?.[0];

    if (!result || !result.symbol) {
      return NextResponse.json(
        {
          ok: false,
          error: `No quote found for ${symbol}`,
        },
        { status: 404 }
      );
    }

    const price =
      toNum(result.regularMarketPrice) ??
      toNum(result.regularMarketPreviousClose);

    if (price === null) {
      return NextResponse.json(
        {
          ok: false,
          error: `No usable price returned for ${symbol}`,
          quote: result,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        symbol: result.symbol || symbol,
        name: result.longName || result.shortName || result.symbol || symbol,
        price,
        previousClose: toNum(result.regularMarketPreviousClose),
        change: toNum(result.regularMarketChange),
        changePercent: toNum(result.regularMarketChangePercent),
        currency: result.currency || "USD",
        marketState: result.marketState || null,
        source: "yahoo",
        fetchedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Unknown server error",
      },
      { status: 500 }
    );
  }
}
