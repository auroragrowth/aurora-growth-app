import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      totalUsersRes,
      activeSubsRes,
      coreRes,
      proRes,
      eliteRes,
      recentSignupsRes,
      t212Res,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("user_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("subscription_status", "active"),
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .in("plan_key", ["core"])
        .in("subscription_status", ["active", "trialing"]),
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .in("plan_key", ["pro"])
        .in("subscription_status", ["active", "trialing"]),
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .in("plan_key", ["elite"])
        .in("subscription_status", ["active", "trialing"]),
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      supabaseAdmin
        .from("trading212_connections")
        .select("user_id", { count: "exact", head: true })
        .eq("is_connected", true),
    ]);

    return NextResponse.json({
      totalUsers: totalUsersRes.count ?? 0,
      activeSubs: activeSubsRes.count ?? 0,
      core: coreRes.count ?? 0,
      pro: proRes.count ?? 0,
      elite: eliteRes.count ?? 0,
      recentSignups: recentSignupsRes.count ?? 0,
      trading212Connected: t212Res.count ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load stats" },
      { status: 500 }
    );
  }
}
