import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const mode = req.nextUrl.searchParams.get("mode") || "live";

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, ticker, broker_ticker, order_type, order_mode, quantity, limit_price, status, placed_at, ladder_step, notes")
      .eq("user_id", user.id)
      .eq("account_mode", mode)
      .order("placed_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ orders: [] });
    }

    return NextResponse.json({ orders: orders || [] });
  } catch {
    return NextResponse.json({ orders: [] });
  }
}
