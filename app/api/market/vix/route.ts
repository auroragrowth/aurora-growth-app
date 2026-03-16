import { NextResponse } from "next/server";

/*
 Aurora Volatility Compass API
 Fetches the live VIX index from Yahoo Finance
 Endpoint: /api/market/vix
*/

export async function GET() {
  try {
    const response = await fetch(
      "https://query1.finance.yahoo.com/v7/finance/quote?symbols=%5EVIX",
      {
        headers: {
          "User-Agent": "Aurora-Growth-App",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch VIX data");
    }

    const data = await response.json();

    const result = data?.quoteResponse?.result?.[0];

    const vix = result?.regularMarketPrice ?? null;
    const change = result?.regularMarketChange ?? null;
    const changePercent = result?.regularMarketChangePercent ?? null;
    const timestamp = result?.regularMarketTime ?? null;

    return NextResponse.json({
      vix,
      change,
      changePercent,
      timestamp,
      source: "Yahoo Finance",
    });
  } catch (error) {
    console.error("VIX API error:", error);

    return NextResponse.json(
      {
        vix: null,
        change: null,
        changePercent: null,
        timestamp: null,
        error: "Unable to fetch VIX data",
      },
      { status: 500 }
    );
  }
}
