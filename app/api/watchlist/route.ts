import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function cleanTicker(v: unknown) {
  return String(v || "").trim().toUpperCase();
}

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 401 });
    }

    if (!auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("watchlist_items")
      .select("id,ticker,created_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      items: (data || []).map((row) => ({
        id: row.id,
        ticker: cleanTicker(row.ticker),
        created_at: row.created_at,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load watchlist" },
      { status: 500 }
    );
  }
}
