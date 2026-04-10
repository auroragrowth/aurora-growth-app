import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram/notify";
import { sendAuroraEmail } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("first_name, full_name, telegram_chat_id, notify_telegram, notify_email, notify_in_app")
      .eq("id", user.id)
      .maybeSingle();

    const firstName = profile?.first_name || profile?.full_name?.split(" ")?.[0] || "there";
    const now = new Date().toLocaleString("en-GB", {
      timeZone: "Europe/London",
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    // Telegram
    if ((profile?.notify_telegram ?? true) && profile?.telegram_chat_id) {
      sendTelegramMessage(
        profile.telegram_chat_id,
        `\uD83D\uDD12 *Aurora Growth Academy*\n\nHi ${firstName}, your password was just changed.\n\n_${now}_\n\nIf this wasn't you, please contact support immediately.`
      ).catch(() => {});
    }

    // Email
    if ((profile?.notify_email ?? true) && user.email) {
      sendAuroraEmail({
        to: user.email,
        subject: "Password Changed - Aurora Growth Academy",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; background: #060e1e; border-radius: 16px; overflow: hidden; border: 1px solid rgba(0,180,255,0.15);">
            <div style="padding: 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06);">
              <div style="font-size: 32px; margin-bottom: 8px;">\uD83D\uDD12</div>
              <h1 style="color: #fff; font-size: 20px; margin: 0;">Password Changed</h1>
            </div>
            <div style="padding: 24px;">
              <p style="color: rgba(255,255,255,0.8); font-size: 15px; margin: 0 0 12px 0;">Hi ${firstName},</p>
              <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 0 0 16px 0;">Your Aurora Growth Academy password was changed on ${now}.</p>
              <p style="color: rgba(255,255,255,0.4); font-size: 13px; margin: 0;">If you did not make this change, please reset your password immediately or contact support.</p>
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
    if (profile?.notify_in_app ?? true) {
      await supabaseAdmin
        .from("in_app_notifications")
        .insert({
          user_id: user.id,
          title: "Password changed",
          message: `Your password was updated on ${now}`,
          type: "security",
        });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
