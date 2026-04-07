import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendAdminAlert, adminNotify } from "@/lib/telegram/admin";
import { sendUserAlert } from "@/lib/telegram/alerts";

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
    .select("plan_key, has_completed_plan_selection, subscription_status, telegram_chat_id, telegram_connected, first_name, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // First login — create a bare profile and send to plan selection
    await supabaseAdmin.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || "",
        phone: user.user_metadata?.phone || null,
        referred_by: user.user_metadata?.referred_by || null,
        role: "member",
        login_count: 1,
        last_login_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    sendAdminAlert(
      `👤 New signup\nEmail: ${user.email}\nName: ${user.user_metadata?.full_name || "—"}`,
      "info"
    );

    redirect("/select-plan");
  }

  // Increment login_count and update last_login_at on every login
  try {
    await supabase.rpc("increment_login_count", { uid: user.id });
  } catch {
    // Fallback: direct update if RPC not available
    await supabaseAdmin
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  // Go to dashboard if user has any plan OR has completed plan selection
  // Also go to dashboard if they have an active subscription
  const hasPlan =
    (profile.plan_key && profile.plan_key !== "none") ||
    profile.has_completed_plan_selection === true ||
    profile.subscription_status === "active";

  if (hasPlan) {
    adminNotify.login(user.email || "unknown").catch(() => {});

    // Send Telegram login notification to user
    if (profile.telegram_chat_id && profile.telegram_connected) {
      const firstName = profile.first_name ||
        profile.full_name?.split(" ")[0] || "there";
      const now = new Date().toLocaleString("en-GB", {
        timeZone: "Europe/London",
        day: "2-digit", month: "short",
        hour: "2-digit", minute: "2-digit",
      });
      sendUserAlert(
        profile.telegram_chat_id,
        `🔐 *Aurora Growth*\n\nHi ${firstName}, you just logged in to Aurora Growth.\n\n_${now}_`
      ).catch(() => {});
    }

    redirect("/dashboard");
  }

  redirect("/select-plan");
}
