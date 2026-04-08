export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { planFeatures, type Plan, type PlanKey } from "@/lib/billing/plans";
import SelectPlanClient from "./select-plan-client";

export default async function SelectPlanPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan_key, billing_interval, subscription_status, has_completed_plan_selection")
    .eq("id", user.id)
    .maybeSingle();

  // Already has a plan or completed selection — go to dashboard
  const hasPlan =
    (profile?.plan_key && profile.plan_key !== "none") ||
    profile?.has_completed_plan_selection === true ||
    profile?.subscription_status === "active" ||
    profile?.subscription_status === "trialing";

  if (hasPlan) {
    redirect("/dashboard");
  }

  // Fetch plans from stripe_plans table
  const { data: dbPlans } = await supabaseAdmin
    .from("stripe_plans")
    .select("plan_key, plan_name, display_monthly, display_yearly_monthly, display_yearly_total")
    .eq("is_active", true)
    .order("display_monthly", { ascending: true });

  const plans: Plan[] = (dbPlans ?? []).map((row) => ({
    key: row.plan_key as PlanKey,
    name: row.plan_name,
    monthlyPrice: row.display_monthly,
    yearlyMonthlyPrice: row.display_yearly_monthly,
    yearlyTotalPrice: row.display_yearly_total,
    features: planFeatures[row.plan_key as PlanKey] ?? [],
  }));

  const showWelcome = !profile?.has_completed_plan_selection;

  return (
    <SelectPlanClient
      plans={plans}
      initialBillingInterval={profile?.billing_interval ?? "yearly"}
      showWelcome={showWelcome}
    />
  );
}
