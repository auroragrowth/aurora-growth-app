import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function fetchQuote(ticker: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=90d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AuroraGrowth/1.0)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) return null;

    const highs = result?.indicators?.quote?.[0]?.high || [];
    const timestamps = result?.timestamp || [];
    let high90d = 0;
    let high90dDate: string | null = null;
    highs.forEach((h: number, i: number) => {
      if (h > high90d) {
        high90d = h;
        high90dDate = timestamps[i]
          ? new Date(timestamps[i] * 1000).toISOString().split("T")[0]
          : null;
      }
    });

    return {
      price: meta.regularMarketPrice ?? null,
      change_percent: meta.regularMarketChangePercent ?? null,
      market_cap: meta.marketCap ?? null,
      volume: meta.regularMarketVolume ?? null,
      high_52w: meta.fiftyTwoWeekHigh ?? null,
      high_90d: high90d || null,
      high_90d_date: high90dDate,
    };
  } catch {
    return null;
  }
}

function formatMarketCap(value: number | null): string | null {
  if (!value) return null;
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  return String(value);
}

export async function GET() {
  return refreshScanner();
}

export async function POST() {
  return refreshScanner();
}

async function refreshScanner() {
  try {
    // Get all tickers from scanner_results
    const { data: rows, error } = await supabaseAdmin
      .from("scanner_results")
      .select("id, ticker")
      .not("ticker", "is", null);

    if (error || !rows?.length) {
      return NextResponse.json({
        ok: false,
        error: error?.message || "No scanner rows found",
      });
    }

    const tickers = rows.map((r) => r.ticker).filter(Boolean);
    let updated = 0;
    let failed = 0;

    // Process in batches of 5 to avoid rate limiting
    for (let i = 0; i < tickers.length; i += 5) {
      const batch = tickers.slice(i, i + 5);
      const results = await Promise.all(batch.map((t) => fetchQuote(t)));

      for (let j = 0; j < batch.length; j++) {
        const quote = results[j];
        if (!quote || !quote.price) {
          failed++;
          continue;
        }

        const updateData: Record<string, unknown> = {
            price: quote.price,
            change_percent: quote.change_percent,
            market_cap: formatMarketCap(quote.market_cap),
        };
        if (quote.high_52w) updateData.high_52w = quote.high_52w;
        if (quote.high_90d) {
          updateData.high_90d = quote.high_90d;
          updateData.high_recent_20pct = quote.high_90d;
          updateData.high_recent_20pct_date = quote.high_90d_date;
        }

        const { error: updateErr } = await supabaseAdmin
          .from("scanner_results")
          .update(updateData)
          .eq("ticker", batch[j]);

        if (updateErr) {
          console.error(`Failed to update ${batch[j]}:`, updateErr.message);
          failed++;
        } else {
          updated++;
        }
      }

      // Small delay between batches
      if (i + 5 < tickers.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return NextResponse.json({
      ok: true,
      total: tickers.length,
      updated,
      failed,
    });
  } catch (err: any) {
    console.error("Scanner refresh error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to refresh scanner" },
      { status: 500 }
    );
  }
}
