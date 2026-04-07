import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const cutoff = new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: peaks } = await admin
    .from("stock_peaks")
    .select("ticker, peak_date, peak_price, rise_percent")
    .gte("rise_percent", 20)
    .gte("peak_date", cutoff);

  const byTicker: Record<string, any[]> = {};
  for (const p of peaks || []) {
    if (!byTicker[p.ticker]) byTicker[p.ticker] = [];
    byTicker[p.ticker].push(p);
  }

  const { data: stocks } = await admin
    .from("scanner_results")
    .select("ticker, price");

  let green = 0,
    amber = 0,
    red = 0,
    grey = 0;

  for (const stock of stocks || []) {
    const tickerPeaks = byTicker[stock.ticker] || [];
    const risesCount = tickerPeaks.length;
    const sorted = [...tickerPeaks].sort(
      (a, b) => new Date(b.peak_date).getTime() - new Date(a.peak_date).getTime()
    );
    const latestHat = sorted[0]?.peak_price || null;
    const latestHatDate = sorted[0]?.peak_date || null;
    const currentPrice = parseFloat(stock.price || "0");
    const dropPct =
      latestHat && currentPrice > 0
        ? Math.round(((latestHat - currentPrice) / latestHat) * 100 * 10) / 10
        : null;

    let readiness = "grey";
    if (risesCount >= 3 && dropPct !== null) {
      if (dropPct >= 20) {
        readiness = "green";
        green++;
      } else if (dropPct >= 10) {
        readiness = "amber";
        amber++;
      } else {
        readiness = "red";
        red++;
      }
    } else {
      grey++;
    }

    await admin
      .from("scanner_results")
      .update({
        rises_count_18m: risesCount,
        most_recent_hat_price: latestHat,
        most_recent_hat_date: latestHatDate,
        drop_from_hat_pct: dropPct,
        readiness,
      })
      .eq("ticker", stock.ticker);
  }

  return NextResponse.json({
    success: true,
    readiness: { green, amber, red, grey },
    total: (stocks || []).length,
  });
}
