import { NextResponse } from "next/server";
import { getTrading212ConnectionForUser } from "@/lib/trading212/server";
import { trading212Fetch } from "@/lib/trading212/client";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getWatchlistTable } from "@/lib/watchlist/getTable";

export const dynamic = "force-dynamic";

type T212Position = {
  ticker: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  ppl: number;
  fxPpl: number;
};

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const connection = await getTrading212ConnectionForUser();
    if (!connection?.api_key_encrypted || !connection.is_connected) {
      return NextResponse.json(
        { error: "No broker connected. Please connect Trading 212 first." },
        { status: 400 }
      );
    }

    // Fetch open positions from T212
    const positions = await trading212Fetch<T212Position[]>(
      connection,
      "/equity/portfolio"
    );

    if (!Array.isArray(positions) || positions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No open positions found in your T212 account",
        imported: 0,
      });
    }

    // Get current broker mode
    const { data: profile } = await supabase
      .from("profiles")
      .select("active_broker_mode")
      .eq("id", user.id)
      .maybeSingle();

    const mode = profile?.active_broker_mode || "live";
    const table = getWatchlistTable(mode);

    // Extract clean symbols
    const symbols = positions
      .map((pos) => pos.ticker?.replace(/_US_EQ$|_EQ$/, "").toUpperCase())
      .filter((s): s is string => Boolean(s) && s.length <= 8);

    if (symbols.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No valid tickers found in positions",
        imported: 0,
      });
    }

    // Look up company names from scanner_results in bulk
    const { data: scannerRows } = await supabaseAdmin
      .from("scanner_results")
      .select("ticker, company, company_name")
      .in("ticker", symbols);

    const companyMap: Record<string, string> = {};
    for (const row of scannerRows || []) {
      companyMap[row.ticker] = row.company || row.company_name || row.ticker;
    }

    // Upsert all positions to watchlist
    const rows = symbols.map((symbol) => ({
      user_id: user.id,
      symbol,
      company_name: companyMap[symbol] || symbol,
      source: "Trading 212",
      is_aurora_recommended: false,
      added_by: "broker_sync",
      is_invested: true,
    }));

    const { error: upsertError } = await supabaseAdmin
      .from(table)
      .upsert(rows, { onConflict: "user_id,symbol" });

    if (upsertError) {
      console.error("[sync-positions] upsert error:", upsertError.message);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    // Also mark any existing watchlist entries that match as invested
    await supabaseAdmin
      .from(table)
      .update({ is_invested: true })
      .eq("user_id", user.id)
      .in("symbol", symbols);

    return NextResponse.json({
      success: true,
      message: `Synced ${symbols.length} positions from T212 ${mode} account`,
      imported: symbols.length,
      symbols,
      mode,
    });
  } catch (e: any) {
    console.error("[sync-positions]", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
