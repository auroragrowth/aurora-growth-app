import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("active_broker_mode")
      .eq("id", user.id)
      .maybeSingle();

    const table =
      profile?.active_broker_mode === "demo"
        ? "watchlist_demo"
        : "watchlist_live";

    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq("user_id", user.id)
      .eq("symbol", symbol.toUpperCase());

    if (error) throw error;
    return NextResponse.json({ success: true, table });
  } catch (e: any) {
    console.error("Watchlist [symbol] DELETE error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
