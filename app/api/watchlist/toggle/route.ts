import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function cleanSymbol(v: unknown) {
  return String(v || "").trim().toUpperCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const symbol = cleanSymbol(body?.symbol || body?.ticker);
    const company_name =
      typeof body?.company_name === "string" ? body.company_name.trim() : null;
    const market =
      typeof body?.market === "string" ? body.market.trim() : null;

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
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
      .eq("symbol", symbol)
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
        symbol,
      });
    }

    const { error: insErr } = await supabase.from("watchlist_items").insert([
      {
        user_id: auth.user.id,
        symbol,
        company_name,
        market,
        updated_at: new Date().toISOString(),
      },
    ]);

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      added: true,
      symbol,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to toggle watchlist" },
      { status: 500 }
    );
  }
}
