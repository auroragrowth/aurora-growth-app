import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function cleanTicker(v: unknown) {
  return String(v || "").trim().toUpperCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const ticker = cleanTicker(body?.ticker);

    if (!ticker) {
      return NextResponse.json({ error: "Ticker is required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 401 });
    }

    if (!auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: existing, error: exErr } = await supabase
      .from("watchlist_items")
      .select("id")
      .eq("user_id", auth.user.id)
      .eq("ticker", ticker)
      .maybeSingle();

    if (exErr) {
      return NextResponse.json({ error: exErr.message }, { status: 500 });
    }

    if (existing?.id) {
      const { error: delErr } = await supabase
        .from("watchlist_items")
        .delete()
        .eq("id", existing.id);

      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        added: false,
        ticker,
      });
    }

    const { error: insErr } = await supabase
      .from("watchlist_items")
      .insert([{ user_id: auth.user.id, ticker }]);

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      added: true,
      ticker,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to toggle watchlist" },
      { status: 500 }
    );
  }
}
