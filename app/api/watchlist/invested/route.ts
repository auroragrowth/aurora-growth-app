import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWatchlistTable } from "@/lib/watchlist/getTable";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: auth, error } = await supabase.auth.getUser();
    if (error || !auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const symbol = String(body?.symbol || "").trim().toUpperCase();
    const isInvested = Boolean(body?.is_invested);

    if (!symbol) {
      return NextResponse.json({ error: "Symbol required" }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("active_broker_mode")
      .eq("id", auth.user.id)
      .maybeSingle();

    const table = getWatchlistTable(profile?.active_broker_mode);

    const { error: updateError } = await supabase
      .from(table)
      .update({ is_invested: isInvested })
      .eq("user_id", auth.user.id)
      .eq("symbol", symbol);

    if (updateError) {
      console.error("Invested toggle error:", updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, symbol, is_invested: isInvested });
  } catch (e: any) {
    console.error("Invested toggle error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
