import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  // Try scanner_results first
  const { data: scannerData } = await supabaseAdmin
    .from("scanner_results")
    .select("ticker, price, high_recent_20pct, high_recent_20pct_date, high_52w, high_90d, company, score, market_cap, change_percent")
    .eq("ticker", ticker)
    .limit(1)
    .maybeSingle();

  // Fetch live data from Yahoo Finance
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=90d`,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; AuroraGrowth/1.0)" } }
    );
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    const highs = result?.indicators?.quote?.[0]?.high || [];
    const volumes = result?.indicators?.quote?.[0]?.volume || [];
    const timestamps = result?.timestamp || [];

    let high90d = 0;
    let high90dDate: string | null = null;
    highs.forEach((h: number, i: number) => {
      if (h > high90d) {
        high90d = h;
        high90dDate = timestamps[i]
          ? new Date(timestamps[i] * 1000).toLocaleDateString("en-US", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : null;
      }
    });

    const currentPrice = meta?.regularMarketPrice;
    const previousClose = meta?.chartPreviousClose ?? meta?.previousClose;
    const high52w = meta?.fiftyTwoWeekHigh;
    const volume = meta?.regularMarketVolume ?? (volumes.length ? volumes[volumes.length - 1] : null);
    const changePct = previousClose && currentPrice
      ? ((currentPrice - previousClose) / previousClose) * 100
      : null;

    return NextResponse.json({
      ticker,
      company: scannerData?.company || ticker,
      price: currentPrice,
      previousClose,
      changePct: changePct ?? (scannerData?.change_percent ? parseFloat(scannerData.change_percent) : null),
      high90d: high90d || scannerData?.high_90d || null,
      high90dDate: high90dDate || scannerData?.high_recent_20pct_date || null,
      high52w: high52w || scannerData?.high_52w || null,
      recentHigh: high90d || scannerData?.high_recent_20pct || null,
      recentHighDate: high90dDate || scannerData?.high_recent_20pct_date || null,
      score: scannerData?.score ?? null,
      marketCap: scannerData?.market_cap ?? null,
      volume: volume ?? null,
      currency: "USD",
    });
  } catch {
    // Fallback to scanner data only
    return NextResponse.json({
      ticker,
      company: scannerData?.company || ticker,
      price: parseFloat(scannerData?.price || "0"),
      previousClose: null,
      changePct: scannerData?.change_percent ? parseFloat(scannerData.change_percent) : null,
      high90d: scannerData?.high_90d || null,
      high90dDate: scannerData?.high_recent_20pct_date || null,
      high52w: scannerData?.high_52w || null,
      recentHigh: scannerData?.high_recent_20pct || null,
      recentHighDate: scannerData?.high_recent_20pct_date || null,
      score: scannerData?.score ?? null,
      marketCap: scannerData?.market_cap ?? null,
      volume: null,
      currency: "USD",
    });
  }
}
