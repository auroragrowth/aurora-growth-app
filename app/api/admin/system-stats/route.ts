import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();

    const [
      { data: profiles },
      { data: watchlistLive },
      { data: watchlistDemo },
      { data: alerts },
      { data: scannerStocks },
      { data: logs },
      { data: connections },
    ] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("plan_key, subscription_status, telegram_connected"),
      supabaseAdmin.from("watchlist_live").select("id"),
      supabaseAdmin.from("watchlist_demo").select("id"),
      supabaseAdmin.from("price_alerts").select("id").eq("is_active", true),
      supabaseAdmin.from("scanner_results").select("scanner_type, readiness"),
      supabaseAdmin
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("trading212_connections")
        .select("account_type, is_connected")
        .eq("is_connected", true),
    ]);

    return NextResponse.json({
      users: {
        total: profiles?.length || 0,
        active: profiles?.filter((p) => p.subscription_status === "active").length || 0,
        telegram: profiles?.filter((p) => p.telegram_connected).length || 0,
        byPlan: {
          elite: profiles?.filter((p) => p.plan_key === "elite").length || 0,
          pro: profiles?.filter((p) => p.plan_key === "pro").length || 0,
          core: profiles?.filter((p) => p.plan_key === "core").length || 0,
        },
      },
      watchlist: {
        live: watchlistLive?.length || 0,
        demo: watchlistDemo?.length || 0,
      },
      alerts: alerts?.length || 0,
      scanner: {
        total: scannerStocks?.length || 0,
        core: scannerStocks?.filter((s) => s.scanner_type === "core").length || 0,
        alternative: scannerStocks?.filter((s) => s.scanner_type === "alternative").length || 0,
        green: scannerStocks?.filter((s) => s.readiness === "green").length || 0,
        amber: scannerStocks?.filter((s) => s.readiness === "amber").length || 0,
        red: scannerStocks?.filter((s) => s.readiness === "red").length || 0,
      },
      connections: connections?.length || 0,
      logs: logs || [],
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
