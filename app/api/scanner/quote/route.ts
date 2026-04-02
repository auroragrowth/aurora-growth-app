import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AuroraGrowth/1.0)" },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Yahoo Finance returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const result = data.chart?.result?.[0];
    const meta = result?.meta;

    if (!meta) {
      return NextResponse.json(
        { error: "No data found for ticker" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      ticker,
      price: meta.regularMarketPrice ?? null,
      previousClose: meta.chartPreviousClose ?? meta.previousClose ?? null,
      change: meta.regularMarketChangePercent ?? null,
      marketCap: meta.marketCap ?? null,
      volume: meta.regularMarketVolume ?? null,
      high52w: meta.fiftyTwoWeekHigh ?? null,
      low52w: meta.fiftyTwoWeekLow ?? null,
      currency: meta.currency ?? "USD",
      exchange: meta.exchangeName ?? null,
    });
  } catch (err: any) {
    console.error("Scanner quote error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to fetch quote" },
      { status: 500 }
    );
  }
}
