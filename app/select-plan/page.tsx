import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SelectPlanClient from "./select-plan-client";

export default async function SelectPlanPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "plan_key, billing_interval, subscription_status, has_completed_plan_selection"
    )
    .eq("id", user.id)
    .single();

  const hasActiveSubscription =
    profile?.subscription_status === "active" ||
    profile?.subscription_status === "trialing";

  const hasCompletedPlanSelection = !!profile?.has_completed_plan_selection;

  if (hasCompletedPlanSelection && hasActiveSubscription) {
    redirect("/dashboard");
  }

  return <SelectPlanClient initialBillingInterval={profile?.billing_interval ?? "yearly"} />;
}
