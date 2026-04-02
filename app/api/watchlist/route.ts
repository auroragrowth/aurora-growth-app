import { NextRequest, NextResponse } from "next/server";
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

async function getAuthUser() {
  const supabase = await createClient();
  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth?.user) return null;
  return auth.user;
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

    console.log("Watchlist GET from table:", table, "user:", auth.user.id);

    const { data, error } = await supabaseAdmin
      .from(table)
      .select("*")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Watchlist GET error:", error.message, "table:", table);
      // Table may not exist — fall back to watchlist_live
      if (error.message?.includes("relation") || error.code === "42P01") {
        const { data: fallback } = await supabaseAdmin
          .from("watchlist_live")
          .select("*")
          .eq("user_id", auth.user.id)
          .order("created_at", { ascending: false });
        return NextResponse.json({
          ok: true,
          mode,
          items: (fallback || []).map((row: any) => ({
            ...row,
            symbol: cleanSymbol(row.symbol),
          })),
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      mode,
      items: (data || []).map((row: any) => ({
        ...row,
        symbol: cleanSymbol(row.symbol),
      })),
    });
  } catch (err: any) {
    console.error("Watchlist GET error:", err.message);
    return NextResponse.json(
      { error: err?.message || "Failed to load watchlist" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const symbol = cleanSymbol(body?.symbol || body?.ticker);
    if (!symbol) {
      return NextResponse.json({ error: "Symbol required" }, { status: 400 });
    }

    const mode = await getActiveMode(user.id);
    const table = getWatchlistTable(mode);

    console.log(`Adding ${symbol} to ${table} for user ${user.id}`);

    const { error } = await supabaseAdmin
      .from(table)
      .upsert(
        {
          user_id: user.id,
          symbol,
          company_name: body.company_name || symbol,
          source: body.source || "My List",
          is_aurora_recommended: (body.source || "").includes("Aurora"),
          added_by: "user",
        },
        { onConflict: "user_id,symbol" }
      );

    if (error) {
      console.error("Watchlist POST insert error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      symbol,
      table,
      mode,
      message: `Added to ${mode} watchlist`,
    });
  } catch (e: any) {
    console.error("Watchlist POST error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { symbol: rawSymbol } = await req.json().catch(() => ({ symbol: "" }));
    const symbol = cleanSymbol(rawSymbol);
    if (!symbol) {
      return NextResponse.json({ error: "Symbol required" }, { status: 400 });
    }

    const mode = await getActiveMode(user.id);
    const table = getWatchlistTable(mode);

    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq("user_id", user.id)
      .eq("symbol", symbol);

    if (error) throw error;
    return NextResponse.json({ success: true, table });
  } catch (e: any) {
    console.error("Watchlist DELETE error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
