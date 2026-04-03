import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendAdminAlert } from "@/lib/telegram/admin";

export const dynamic = "force-dynamic";

export default async function PostLoginPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Use admin client to bypass RLS and avoid false nulls
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan_key, has_completed_plan_selection")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // First login — create a bare profile and send to plan selection
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || "",
        phone: user.user_metadata?.phone || null,
        referred_by: user.user_metadata?.referred_by || null,
        role: "member",
        login_count: 1,
        last_login: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    sendAdminAlert(
      `👤 New signup\nEmail: ${user.email}\nName: ${user.user_metadata?.full_name || "—"}`,
      "info"
    );

    redirect("/select-plan");
  }

  // Increment login_count and update last_login on every login
  try {
    await supabase.rpc("increment_login_count", { uid: user.id });
  } catch {
    // Fallback: direct update if RPC not available
    await supabase
      .from("profiles")
      .update({ last_login: new Date().toISOString() })
      .eq("id", user.id);
  }

  // Go to dashboard if user has any plan OR has completed plan selection
  const hasPlan =
    ["free", "core", "pro", "elite"].includes(profile.plan_key ?? "") ||
    profile.has_completed_plan_selection === true;

  if (hasPlan) {
    redirect("/dashboard");
  }

  redirect("/select-plan");
}
