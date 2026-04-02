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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const symbol = cleanSymbol(body?.symbol || body?.ticker);
    const company_name =
      typeof body?.company_name === "string" ? body.company_name.trim() : null;
    const source =
      typeof body?.source === "string" ? body.source.trim() : null;

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const mode = await getActiveMode(auth.user.id);
    const table = getWatchlistTable(mode);

    console.log("Watchlist toggle:", { symbol, mode, table, userId: auth.user.id });

    // Use supabaseAdmin for lookups/writes to bypass RLS issues on demo table
    const { data: existing } = await supabaseAdmin
      .from(table)
      .select("id")
      .eq("user_id", auth.user.id)
      .eq("symbol", symbol)
      .maybeSingle();

    if (existing?.id) {
      await supabaseAdmin.from(table).delete().eq("id", existing.id);
      return NextResponse.json({ ok: true, added: false, symbol, mode });
    }

    const isAurora = source === "Aurora Core" || source === "Aurora Alternative";

    const insertRow: Record<string, unknown> = {
      user_id: auth.user.id,
      symbol,
      company_name,
      source,
      is_aurora_recommended: isAurora,
      added_by: isAurora ? "scanner" : "manual",
    };

    const { error: insErr } = await supabaseAdmin.from(table).insert([insertRow]);

    if (insErr) {
      console.error("Watchlist insert error:", insErr.message, "table:", table);
      // Fallback with only core columns
      const { error: retryErr } = await supabaseAdmin.from(table).insert([{
        user_id: auth.user.id,
        symbol,
        company_name,
        source,
      }]);
      if (retryErr) {
        console.error("Watchlist fallback insert error:", retryErr.message);
        return NextResponse.json({ error: retryErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, added: true, symbol, mode });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to toggle watchlist" },
      { status: 500 }
    );
  }
}
