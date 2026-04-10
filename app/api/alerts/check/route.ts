import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { sendTelegramMessage } from "@/lib/telegram/notify";
import { sendAuroraEmail } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key);
}

function alertEmailHtml(
  symbol: string,
  company: string,
  alertType: string,
  targetPrice: number,
  currentPrice: number,
  pct: number
): string {
  const isAbove = alertType === "above";
  const isEntry = alertType === "entry_level";
  const icon = isAbove ? "📈" : isEntry ? "⚡" : "📉";
  const heading = isAbove
    ? "Rise Alert Triggered"
    : isEntry
      ? "Entry Level Reached"
      : "Fall Alert Triggered";
  const description = isAbove
    ? `has risen above your target of $${targetPrice.toFixed(2)}`
    : isEntry
      ? `has reached your entry level of $${targetPrice.toFixed(2)}`
      : `has fallen below your target of $${targetPrice.toFixed(2)}`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; background: #060e1e; border-radius: 16px; overflow: hidden; border: 1px solid rgba(0,180,255,0.15);">
      <div style="padding: 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06);">
        <div style="font-size: 32px; margin-bottom: 8px;">${icon}</div>
        <h1 style="color: #fff; font-size: 20px; margin: 0;">Aurora ${heading}</h1>
      </div>
      <div style="padding: 24px;">
        <h2 style="color: #00b4ff; font-size: 18px; margin: 0 0 4px 0;">${symbol}</h2>
        <p style="color: rgba(255,255,255,0.5); font-size: 14px; margin: 0 0 16px 0;">${company}</p>
        <p style="color: rgba(255,255,255,0.8); font-size: 15px; margin: 0 0 16px 0;">
          ${symbol} ${description}${pct ? ` (${isAbove ? "+" : "-"}${pct}%)` : ""}.
        </p>
        <div style="background: rgba(255,255,255,0.04); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: rgba(255,255,255,0.4); font-size: 13px;">Target Price</span>
            <span style="color: #fff; font-size: 15px; font-weight: 600;">$${targetPrice.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: rgba(255,255,255,0.4); font-size: 13px;">Current Price</span>
            <span style="color: #fff; font-size: 15px; font-weight: 600;">$${currentPrice.toFixed(2)}</span>
          </div>
        </div>
        <a href="https://auroragrowth.co.uk/dashboard/stocks/${symbol}" style="display: block; text-align: center; background: rgba(0,180,255,0.15); color: #00b4ff; padding: 12px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">
          View ${symbol} in Aurora
        </a>
      </div>
      <div style="padding: 16px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06);">
        <p style="color: rgba(255,255,255,0.25); font-size: 12px; margin: 0;">Aurora Growth Academy — Invest with clarity</p>
      </div>
    </div>
  `;
}

export async function GET(req: NextRequest) {
  try {
    // Allow both cron secret and unauthenticated (for watchlist page polling)
    const auth = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isCron = auth === `Bearer ${cronSecret}`;

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "No DB" }, { status: 500 });
    }

    const { data: alerts } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("triggered", false);

    if (!alerts || alerts.length === 0) {
      return NextResponse.json({ ok: true, checked: 0, triggered: 0 });
    }

    const activeAlerts = alerts.filter(
      (a: any) => a.is_active !== false
    );

    if (activeAlerts.length === 0) {
      return NextResponse.json({ ok: true, checked: 0, triggered: 0 });
    }

    const symbols = [...new Set(activeAlerts.map((a: any) => a.symbol))];

    const { data: prices } = await supabase
      .from("scanner_results")
      .select("ticker,price,change_percent,company_name")
      .in("ticker", symbols);

    const priceMap = new Map<string, { price: number; company: string }>();
    (prices || []).forEach((p: any) => {
      if (p.ticker && typeof p.price === "number") {
        priceMap.set(p.ticker, {
          price: p.price,
          company: p.company_name || p.ticker,
        });
      }
    });

    // Get user emails and notification preferences
    const userIds = [...new Set(activeAlerts.map((a: any) => a.user_id))];
    const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map<string, string>();
    (users?.users || []).forEach((u: any) => {
      if (u.id && u.email) emailMap.set(u.id, u.email);
    });

    // Fetch notification prefs for all relevant users
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, notify_telegram, notify_email, notify_in_app")
      .in("id", userIds);

    type NotifyPrefs = { notify_telegram: boolean; notify_email: boolean; notify_in_app: boolean };
    const prefsMap = new Map<string, NotifyPrefs>();
    (profiles || []).forEach((p: any) => {
      prefsMap.set(p.id, {
        notify_telegram: p.notify_telegram ?? true,
        notify_email: p.notify_email ?? true,
        notify_in_app: p.notify_in_app ?? true,
      });
    });

    let triggeredCount = 0;

    for (const alert of activeAlerts) {
      const info = priceMap.get(alert.symbol);
      if (!info) continue;

      const currentPrice = info.price;
      const company = alert.company_name || info.company || alert.symbol;
      let triggered = false;

      if (alert.alert_type === "above" && currentPrice >= alert.target_price) {
        triggered = true;
      } else if (alert.alert_type === "below" && currentPrice <= alert.target_price) {
        triggered = true;
      } else if (alert.alert_type === "entry_level" && currentPrice <= alert.target_price) {
        triggered = true;
      }

      if (!triggered) continue;

      triggeredCount++;
      const pct = alert.percentage || 0;
      const targetPrice = Number(alert.target_price);
      const userPrefs = prefsMap.get(alert.user_id) || { notify_telegram: true, notify_email: true, notify_in_app: true };

      // Mark as triggered
      await supabase
        .from("price_alerts")
        .update({
          triggered: true,
          triggered_at: new Date().toISOString(),
        })
        .eq("id", alert.id);

      // --- TELEGRAM ---
      if (userPrefs.notify_telegram && alert.telegram_chat_id && !alert.notification_sent) {
        let msg = "";

        if (alert.alert_type === "above") {
          msg =
            `\uD83D\uDCC8 *Aurora Rise Alert: ${alert.symbol}*\n` +
            `${company} has risen above your target!\n` +
            `Target: $${targetPrice.toFixed(2)}${pct ? ` (+${pct}%)` : ""}\n` +
            `Current: $${currentPrice.toFixed(2)}\n` +
            `\n[View in Aurora](https://auroragrowth.co.uk/dashboard/stocks/${alert.symbol})`;
        } else if (alert.alert_type === "below") {
          msg =
            `\uD83D\uDCC9 *Aurora Fall Alert: ${alert.symbol}*\n` +
            `${company} has fallen below your target.\n` +
            `Target: $${targetPrice.toFixed(2)}${pct ? ` (-${pct}%)` : ""}\n` +
            `Current: $${currentPrice.toFixed(2)}\n` +
            `\n[View in Aurora](https://auroragrowth.co.uk/dashboard/stocks/${alert.symbol})`;
        } else {
          msg =
            `\u26A1 *Aurora Entry Alert: ${alert.symbol}*\n` +
            `${company} has reached your entry level!\n` +
            `Entry: $${targetPrice.toFixed(2)}\n` +
            `Current: $${currentPrice.toFixed(2)}\n` +
            `Time to consider your first ladder position.\n` +
            `\n[View in Aurora](https://auroragrowth.co.uk/dashboard/stocks/${alert.symbol})`;
        }

        const sent = await sendTelegramMessage(alert.telegram_chat_id, msg);

        if (sent) {
          await supabase
            .from("price_alerts")
            .update({ notification_sent: true })
            .eq("id", alert.id);
        }
      }

      // --- EMAIL ---
      const userEmail = emailMap.get(alert.user_id);
      if (userPrefs.notify_email && userEmail) {
        const isAbove = alert.alert_type === "above";
        const isEntry = alert.alert_type === "entry_level";
        const subject = isAbove
          ? `📈 ${alert.symbol} has risen above $${targetPrice.toFixed(2)}`
          : isEntry
            ? `⚡ ${alert.symbol} has reached your entry level`
            : `📉 ${alert.symbol} has fallen below $${targetPrice.toFixed(2)}`;

        sendAuroraEmail({
          to: userEmail,
          subject,
          html: alertEmailHtml(alert.symbol, company, alert.alert_type, targetPrice, currentPrice, pct),
          from: "Aurora Growth Academy <alerts@auroragrowth.co.uk>",
        }).catch((e) => console.error("[Alert Email] Error:", e));
      }

      // --- IN-APP NOTIFICATION ---
      if (!userPrefs.notify_in_app) continue;
      const isAbove = alert.alert_type === "above";
      const isEntry = alert.alert_type === "entry_level";
      const title = isAbove
        ? `${alert.symbol} rose above $${targetPrice.toFixed(2)}`
        : isEntry
          ? `${alert.symbol} hit entry level $${targetPrice.toFixed(2)}`
          : `${alert.symbol} fell below $${targetPrice.toFixed(2)}`;
      const message = `${company} — Current price: $${currentPrice.toFixed(2)}`;

      const { error: notifError } = await supabase
        .from("in_app_notifications")
        .insert({
          user_id: alert.user_id,
          title,
          message,
          type: "alert",
          link: `/dashboard/stocks/${alert.symbol}`,
        });
      if (notifError) console.error("[In-App Notif] Error:", notifError.message);
    }

    return NextResponse.json({
      ok: true,
      checked: activeAlerts.length,
      triggered: triggeredCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message },
      { status: 500 }
    );
  }
}
