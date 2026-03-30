import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { sendTelegramMessage } from "@/lib/telegram/notify";

export const dynamic = "force-dynamic";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key);
}

export async function GET() {
  try {
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

    let triggeredCount = 0;

    for (const alert of activeAlerts) {
      const info = priceMap.get(alert.symbol);
      if (!info) continue;

      const currentPrice = info.price;
      const company = alert.company_name || info.company || alert.symbol;
      let triggered = false;

      if (alert.alert_type === "price_above" && currentPrice >= alert.target_price) {
        triggered = true;
      } else if (alert.alert_type === "price_below" && currentPrice <= alert.target_price) {
        triggered = true;
      } else if (alert.alert_type === "entry_level" && currentPrice <= alert.target_price) {
        triggered = true;
      }

      if (!triggered) continue;

      triggeredCount++;

      await supabase
        .from("price_alerts")
        .update({
          triggered: true,
          triggered_at: new Date().toISOString(),
        })
        .eq("id", alert.id);

      if (alert.telegram_chat_id && !alert.notification_sent) {
        const pct = alert.percentage || 0;
        let msg = "";

        if (alert.alert_type === "price_above") {
          msg =
            `\uD83D\uDCC8 *Aurora Rise Alert: ${alert.symbol}*\n` +
            `${company} has risen above your target!\n` +
            `Target: \u00A3${alert.target_price.toFixed(2)}${pct ? ` (+${pct}%)` : ""}\n` +
            `Current: \u00A3${currentPrice.toFixed(2)}\n` +
            `\n[View in Aurora](https://dev.auroragrowth.co.uk/dashboard/stocks/${alert.symbol})`;
        } else if (alert.alert_type === "price_below") {
          msg =
            `\uD83D\uDCC9 *Aurora Fall Alert: ${alert.symbol}*\n` +
            `${company} has fallen below your target.\n` +
            `Target: \u00A3${alert.target_price.toFixed(2)}${pct ? ` (-${pct}%)` : ""}\n` +
            `Current: \u00A3${currentPrice.toFixed(2)}\n` +
            `\n[View in Aurora](https://dev.auroragrowth.co.uk/dashboard/stocks/${alert.symbol})`;
        } else {
          msg =
            `\u26A1 *Aurora Entry Alert: ${alert.symbol}*\n` +
            `${company} has reached your entry level!\n` +
            `Entry: \u00A3${alert.target_price.toFixed(2)}\n` +
            `Current: \u00A3${currentPrice.toFixed(2)}\n` +
            `Time to consider your first ladder position.\n` +
            `\n[View in Aurora](https://dev.auroragrowth.co.uk/dashboard/stocks/${alert.symbol})`;
        }

        const sent = await sendTelegramMessage(alert.telegram_chat_id, msg);

        if (sent) {
          await supabase
            .from("price_alerts")
            .update({ notification_sent: true })
            .eq("id", alert.id);
        }
      }
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
