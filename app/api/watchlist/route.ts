import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getWatchlistTable } from "@/lib/watchlist/getTable";

function cleanSymbol(v: unknown) {
  return String(v || "").trim().toUpperCase();
}

async function getActiveMode(userId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("active_broker_mode")
    .eq("id", userId)
    .maybeSingle();
  return data?.active_broker_mode || "live";
}

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const mode = await getActiveMode(auth.user.id);
    const table = getWatchlistTable(mode);

    const { data, error } = await supabase
      .from(table)
      .select("id,symbol,company_name,market,created_at,updated_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      // Table may not exist — fall back to watchlist_items
      if (error.message?.includes("relation") || error.code === "42P01") {
        const { data: fallback } = await supabase
          .from("watchlist_items")
          .select("id,symbol,company_name,market,created_at,updated_at")
          .eq("user_id", auth.user.id)
          .order("created_at", { ascending: false });
        return NextResponse.json({
          ok: true,
          mode,
          items: (fallback || []).map((row) => ({
            id: row.id,
            symbol: cleanSymbol(row.symbol),
            company_name: row.company_name || null,
            market: row.market || null,
            created_at: row.created_at,
            updated_at: row.updated_at,
          })),
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      mode,
      items: (data || []).map((row) => ({
        id: row.id,
        symbol: cleanSymbol(row.symbol),
        company_name: row.company_name || null,
        market: row.market || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load watchlist" },
      { status: 500 }
    );
  }
}
