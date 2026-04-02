import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) {
    return NextResponse.json({ inWatchlist: false });
  }

  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ inWatchlist: false });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("active_broker_mode")
      .eq("id", auth.user.id)
      .maybeSingle();

    const mode = profile?.active_broker_mode || "live";
    const table =
      mode === "demo" ? "watchlist_demo" : "watchlist_live";

    const { data } = await supabase
      .from(table)
      .select("symbol")
      .eq("user_id", auth.user.id)
      .eq("symbol", symbol)
      .maybeSingle();

    return NextResponse.json({
      inWatchlist: !!data,
      table,
      mode,
    });
  } catch (err: any) {
    console.error("Watchlist check error:", err.message);
    return NextResponse.json({ inWatchlist: false });
  }
}
