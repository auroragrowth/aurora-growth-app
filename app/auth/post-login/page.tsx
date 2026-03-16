import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function isActive(status?: string | null) {
  return status === "active" || status === "trialing";
}

export default async function PostLoginPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || "",
        role: "member",
      },
      { onConflict: "id" }
    );
  }

  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("plan_key, subscription_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!subscription || !isActive(subscription.subscription_status) || !subscription.plan_key) {
    redirect("/dashboard/upgrade");
  }

  redirect("/dashboard");
}
