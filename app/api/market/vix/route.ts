import { NextResponse } from "next/server";

/*
 Aurora Volatility Compass API
 Fetches the live VIX index from Yahoo Finance
 Endpoint: /api/market/vix
*/

export async function GET() {
  try {
    const response = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AuroraGrowth/1.0)",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(`Yahoo Finance returned ${response.status}`);
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    const closes = result?.indicators?.quote?.[0]?.close || [];

    const vix = meta?.regularMarketPrice ?? null;

    // Find previous trading day's close
    let prevClose = vix;
    for (let i = closes.length - 2; i >= 0; i--) {
      if (closes[i] != null) {
        prevClose = closes[i];
        break;
      }
    }

    const change = vix != null && prevClose != null ? vix - prevClose : null;
    const changePercent =
      vix != null && prevClose != null && prevClose > 0
        ? (change! / prevClose) * 100
        : null;
    const timestamp = meta?.regularMarketTime ?? null;

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
