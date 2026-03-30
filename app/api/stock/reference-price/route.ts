import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ticker = (req.nextUrl.searchParams.get("ticker") || "").trim().toUpperCase();
    const currentPrice = Number(req.nextUrl.searchParams.get("current_price") || "0");

    if (!ticker) {
      return NextResponse.json({ ok: false, error: "Missing ticker" }, { status: 400 });
    }
    if (!currentPrice || currentPrice <= 0) {
      return NextResponse.json({ ok: false, error: "Missing or invalid current_price" }, { status: 400 });
    }

    // Fetch all price history for this ticker (up to 5 years)
    const { data: rows, error } = await supabaseAdmin
      .from("price_history")
      .select("date,open,high,low,close")
      .eq("ticker", ticker)
      .gte("date", "2019-01-01")
      .order("date", { ascending: false });

    if (error) throw error;
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: "No price history found. Fetch history first." }, { status: 404 });
    }

    // Recent 20% high: simply project 20% above current price
    const recent20PctHigh = Math.round(currentPrice * 1.20 * 100) / 100;
    const recent20PctHighDate: string | null = null;
    const daysSinceHigh: number | null = null;

    // High since COVID (2020-03-01 onward)
    let highSinceCovid: number = 0;
    let highSinceCovidDate: string | null = null;
    for (const row of rows) {
      if (row.date < "2020-03-01") continue;
      const h = Number(row.high);
      if (h > highSinceCovid) {
        highSinceCovid = h;
        highSinceCovidDate = row.date;
      }
    }

    // Low during COVID crash (2020-02-01 to 2020-04-30)
    let lowCovidCrash: number = Infinity;
    let lowCovidDate: string | null = null;
    for (const row of rows) {
      if (row.date < "2020-02-01" || row.date > "2020-04-30") continue;
      const l = Number(row.low);
      if (l < lowCovidCrash) {
        lowCovidCrash = l;
        lowCovidDate = row.date;
      }
    }
    if (lowCovidCrash === Infinity) {
      lowCovidCrash = 0;
      lowCovidDate = null;
    }

    // 52-week high
    const oneYearAgo = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
    let high52w: number = 0;
    let high52wDate: string | null = null;
    for (const row of rows) {
      if (row.date < oneYearAgo) continue;
      const h = Number(row.high);
      if (h > high52w) {
        high52w = h;
        high52wDate = row.date;
      }
    }

    // Derived percentages
    const recentHigh = recent20PctHigh || high52w || highSinceCovid;
    const pctBelowRecent = recentHigh > 0 ? ((recentHigh - currentPrice) / recentHigh) * 100 : 0;
    const pctAboveCovidLow = lowCovidCrash > 0 ? ((currentPrice - lowCovidCrash) / lowCovidCrash) * 100 : 0;

    return NextResponse.json({
      ok: true,
      ticker,
      current_price: currentPrice,
      recent_20pct_high: recent20PctHigh,
      recent_20pct_high_date: recent20PctHighDate,
      days_since_high: daysSinceHigh,
      high_since_covid: Math.round(highSinceCovid * 100) / 100,
      high_since_covid_date: highSinceCovidDate,
      low_covid_crash: Math.round(lowCovidCrash * 100) / 100,
      low_covid_crash_date: lowCovidDate,
      high_52w: Math.round(high52w * 100) / 100,
      high_52w_date: high52wDate,
      pct_below_recent: Math.round(pctBelowRecent * 10) / 10,
      pct_above_covid_low: Math.round(pctAboveCovidLow * 10) / 10,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Reference price calc failed" },
      { status: 500 }
    );
  }
}
