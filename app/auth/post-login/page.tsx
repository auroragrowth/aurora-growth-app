import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendAdminAlert, adminNotify } from "@/lib/telegram/admin";
import { sendUserAlert } from "@/lib/telegram/alerts";
import { sendAuroraEmail } from "@/lib/email/resend";

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
    .select("plan_key, has_completed_plan_selection, subscription_status, trading212_connected, telegram_chat_id, telegram_connected, first_name, full_name, notify_telegram, notify_email, notify_in_app")
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

    // Send login notifications based on user preferences
    const firstName = profile.first_name ||
      profile.full_name?.split(" ")[0] || "there";
    const now = new Date().toLocaleString("en-GB", {
      timeZone: "Europe/London",
      day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit",
    });

    // Telegram
    if ((profile.notify_telegram ?? true) && profile.telegram_chat_id) {
      sendUserAlert(
        profile.telegram_chat_id,
        `\uD83D\uDD10 *Aurora Growth Academy*\n\nHi ${firstName}, you just logged in.\n\n_${now}_`
      ).catch(() => {});
    }

    // Email
    if ((profile.notify_email ?? true) && user.email) {
      sendAuroraEmail({
        to: user.email,
        subject: "New login to Aurora Growth Academy",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; background: #060e1e; border-radius: 16px; overflow: hidden; border: 1px solid rgba(0,180,255,0.15);">
            <div style="padding: 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06);">
              <div style="font-size: 32px; margin-bottom: 8px;">\uD83D\uDD10</div>
              <h1 style="color: #fff; font-size: 20px; margin: 0;">New Login Detected</h1>
            </div>
            <div style="padding: 24px;">
              <p style="color: rgba(255,255,255,0.8); font-size: 15px; margin: 0 0 12px 0;">Hi ${firstName},</p>
              <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 0 0 16px 0;">A new login to your Aurora Growth Academy account was detected on ${now}.</p>
              <p style="color: rgba(255,255,255,0.4); font-size: 13px; margin: 0;">If this wasn't you, please reset your password immediately.</p>
            </div>
            <div style="padding: 16px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06);">
              <p style="color: rgba(255,255,255,0.25); font-size: 12px; margin: 0;">Aurora Growth Academy</p>
            </div>
          </div>
        `,
        from: "Aurora Growth Academy <alerts@auroragrowth.co.uk>",
      }).catch(() => {});
    }

    // In-App
    if (profile.notify_in_app ?? true) {
      supabaseAdmin
        .from("in_app_notifications")
        .insert({
          user_id: user.id,
          title: "New login detected",
          message: `You logged in on ${now}`,
          type: "security",
        });
    }

    if (!profile.trading212_connected) {
      redirect("/dashboard/connections");
    }

    redirect("/dashboard");
  }

  redirect("/select-plan");
}
