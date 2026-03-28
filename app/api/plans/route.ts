import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { planFeatures, type PlanKey } from "@/lib/billing/plans";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("stripe_plans")
    .select("plan_key, plan_name, display_monthly, display_yearly_monthly, display_yearly_total")
    .eq("is_active", true)
    .order("display_monthly", { ascending: true });

  if (error) {
    console.error("Failed to fetch stripe_plans:", error);
    return NextResponse.json({ error: "Unable to load plans" }, { status: 500 });
  }

  const plans = (data ?? []).map((row) => ({
    key: row.plan_key as PlanKey,
    name: row.plan_name,
    monthlyPrice: row.display_monthly,
    yearlyMonthlyPrice: row.display_yearly_monthly,
    yearlyTotalPrice: row.display_yearly_total,
    features: planFeatures[row.plan_key as PlanKey] ?? [],
  }));

  return NextResponse.json({ plans });
}
