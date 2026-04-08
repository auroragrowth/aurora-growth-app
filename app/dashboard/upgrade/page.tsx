import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { planFeatures, type PlanKey } from "@/lib/billing/plans";
import UpgradeClient from "./UpgradeClient";

export const dynamic = "force-dynamic";

export default async function UpgradePage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, plan_key, subscription_status, current_period_end")
    .eq("id", user.id)
    .single();

  const currentPlan = (profile?.plan_key ?? profile?.plan ?? "core") as string;
  const subscriptionStatus = profile?.subscription_status ?? null;
  const currentPeriodEnd = profile?.current_period_end ?? null;

  const { data: dbPlans } = await supabaseAdmin
    .from("stripe_plans")
    .select("plan_key, plan_name, display_monthly, display_yearly_monthly, display_yearly_total")
    .eq("is_active", true)
    .order("display_monthly", { ascending: true });

  const plans = (dbPlans ?? []).map((row) => ({
    key: row.plan_key as PlanKey,
    name: row.plan_name as string,
    monthlyPrice: row.display_monthly as number,
    yearlyMonthlyPrice: row.display_yearly_monthly as number,
    yearlyTotalPrice: row.display_yearly_total as number,
    features: planFeatures[row.plan_key as PlanKey] ?? [],
  }));

  return (
    <UpgradeClient
      plans={plans}
      currentPlan={currentPlan}
      subscriptionStatus={subscriptionStatus}
      currentPeriodEnd={currentPeriodEnd}
    />
  );
}
