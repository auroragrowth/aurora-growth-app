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
      "plan_key, billing_interval, subscription_status, has_seen_plan_selection"
    )
    .eq("id", user.id)
    .single();

  // Already has an active subscription — never redirect back here
  const hasActiveSubscription =
    profile?.subscription_status === "active" ||
    profile?.subscription_status === "trialing";

  if (hasActiveSubscription && profile?.plan_key) {
    redirect("/dashboard");
  }

  // Show the welcome popup on first visit (before they've seen plan selection)
  const showWelcome = !profile?.has_seen_plan_selection;

  return (
    <SelectPlanClient
      initialBillingInterval={profile?.billing_interval ?? "yearly"}
      showWelcome={showWelcome}
    />
  );
}
