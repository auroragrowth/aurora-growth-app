import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram/notify";
import { sendAuroraEmail } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    const { data } = await supabaseAdmin
      .from("profiles")
      .select("notify_telegram, notify_email, notify_in_app")
      .eq("id", user.id)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      prefs: {
        notify_telegram: data?.notify_telegram ?? true,
        notify_email: data?.notify_email ?? true,
        notify_in_app: data?.notify_in_app ?? true,
      },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    // Get old prefs to detect changes
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("notify_telegram, notify_email, notify_in_app, telegram_chat_id, first_name, full_name")
      .eq("id", user.id)
      .maybeSingle();

    const oldTelegram = profile?.notify_telegram ?? true;
    const oldEmail = profile?.notify_email ?? true;
    const oldInApp = profile?.notify_in_app ?? true;

    const newTelegram = !!body.notify_telegram;
    const newEmail = !!body.notify_email;
    const newInApp = !!body.notify_in_app;

    await supabaseAdmin
      .from("profiles")
      .update({
        notify_telegram: newTelegram,
        notify_email: newEmail,
        notify_in_app: newInApp,
      })
      .eq("id", user.id);

    const firstName = profile?.first_name || profile?.full_name?.split(" ")?.[0] || "there";

    // Telegram toggled
    if (oldTelegram !== newTelegram && profile?.telegram_chat_id) {
      const msg = newTelegram
        ? `\u2705 *Telegram Alerts Enabled*\n\nHi ${firstName}! You will now receive price alerts and notifications via Telegram.\n\n_Aurora Growth Academy_`
        : `\u26D4 *Telegram Alerts Disabled*\n\nHi ${firstName}, you have turned off Telegram notifications. You will no longer receive alerts here.\n\nYou can re-enable this anytime from your Connections page.\n\n_Aurora Growth Academy_`;
      sendTelegramMessage(profile.telegram_chat_id, msg).catch(() => {});
    }

    // Email toggled
    if (oldEmail !== newEmail && user.email) {
      const subject = newEmail
        ? "Email Alerts Enabled - Aurora Growth Academy"
        : "Email Alerts Disabled - Aurora Growth Academy";
      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; background: #060e1e; border-radius: 16px; overflow: hidden; border: 1px solid rgba(0,180,255,0.15);">
          <div style="padding: 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06);">
            <div style="font-size: 32px; margin-bottom: 8px;">${newEmail ? "\u2705" : "\u26D4"}</div>
            <h1 style="color: #fff; font-size: 20px; margin: 0;">Email Alerts ${newEmail ? "Enabled" : "Disabled"}</h1>
          </div>
          <div style="padding: 24px;">
            <p style="color: rgba(255,255,255,0.8); font-size: 15px; margin: 0 0 16px 0;">
              Hi ${firstName},
            </p>
            <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 0 0 16px 0;">
              ${newEmail
                ? "You have enabled email notifications. You will now receive price alerts and updates to this email address."
                : "You have disabled email notifications. You will no longer receive alerts via email. You can re-enable this anytime from your Connections page."}
            </p>
          </div>
          <div style="padding: 16px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06);">
            <p style="color: rgba(255,255,255,0.25); font-size: 12px; margin: 0;">Aurora Growth Academy</p>
          </div>
        </div>
      `;
      sendAuroraEmail({
        to: user.email,
        subject,
        html,
        from: "Aurora Growth Academy <alerts@auroragrowth.co.uk>",
      }).catch(() => {});
    }

    // In-App toggled
    if (oldInApp !== newInApp) {
      const title = newInApp
        ? "In-App Notifications Enabled"
        : "In-App Notifications Disabled";
      const message = newInApp
        ? "You will now see alerts inside your Aurora dashboard."
        : "You have turned off in-app notifications. You can re-enable this from your Connections page.";
      await supabaseAdmin
        .from("in_app_notifications")
        .insert({
          user_id: user.id,
          title,
          message,
          type: "system",
        });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
