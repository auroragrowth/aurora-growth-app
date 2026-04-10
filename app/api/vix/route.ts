import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1y",
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AuroraGrowth/1.0)" },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Yahoo Finance returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    const closes = result?.indicators?.quote?.[0]?.close || [];
    const timestamps = result?.timestamp || [];

    const current = meta?.regularMarketPrice ?? 0;

    // Find previous trading day's close (last non-null close before the most recent)
    let prevClose = current;
    for (let i = closes.length - 2; i >= 0; i--) {
      if (closes[i] != null) {
        prevClose = closes[i];
        break;
      }
    }

    const change = current - prevClose;
    const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

    const now = Date.now() / 1000;
    let weekAgo: number | null = null;
    let monthAgo: number | null = null;
    let yearHigh: number | null = null;
    let yearHighDate: string | null = null;

    for (let i = timestamps.length - 1; i >= 0; i--) {
      const age = now - timestamps[i];
      const c = closes[i];
      if (c == null) continue;

      if (!weekAgo && age >= 7 * 86400) weekAgo = c;
      if (!monthAgo && age >= 30 * 86400) monthAgo = c;

      if (yearHigh === null || c > yearHigh) {
        yearHigh = c;
        yearHighDate = new Date(timestamps[i] * 1000).toLocaleDateString(
          "en-GB",
          { day: "2-digit", month: "short", year: "numeric" }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      current,
      change,
      changePct,
      weekAgo,
      monthAgo,
      yearHigh,
      yearHighDate,
    });
  } catch (err: any) {
    console.error("VIX fetch error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to fetch VIX data" },
      { status: 500 }
    );
  }
}
