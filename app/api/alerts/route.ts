import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, alerts: [] }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("price_alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[Alerts GET]", error.message);
      return NextResponse.json({ ok: true, alerts: [] });
    }

    return NextResponse.json({ ok: true, alerts: data || [] });
  } catch (error: any) {
    console.error("[Alerts GET]", error?.message);
    return NextResponse.json({ ok: false, alerts: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const symbol = String(body.symbol || "").trim().toUpperCase();
    const alert_type = String(body.alert_type || "").trim();
    const target_price = Number(body.target_price);
    const reference_price = Number(body.reference_price) || null;
    const current_price = Number(body.current_price) || null;
    const company_name = body.company_name || null;
    const alert_source = body.alert_source || "custom";
    const alert_label = body.alert_label || null;

    if (!symbol || !alert_type || !Number.isFinite(target_price)) {
      return NextResponse.json(
        { error: "symbol, alert_type and target_price are required" },
        { status: 400 }
      );
    }

    // Get user's telegram chat_id for the alert row
    const { data: profile } = await supabase
      .from("profiles")
      .select("telegram_chat_id, telegram_connected, first_name, full_name")
      .eq("id", user.id)
      .maybeSingle();

    const { data, error } = await supabaseAdmin
      .from("price_alerts")
      .insert({
        user_id: user.id,
        symbol,
        company_name,
        alert_type,
        target_price,
        reference_price,
        current_price,
        alert_source,
        alert_label,
        telegram_chat_id: profile?.telegram_chat_id || null,
        is_active: true,
        triggered: false,
        notification_sent: false,
      })
      .select()
      .single();

    if (error) {
      console.error("[Alerts POST] DB error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send Telegram confirmation
    if (profile?.telegram_chat_id && process.env.TELEGRAM_BOT_TOKEN) {
      const firstName = profile.first_name || profile.full_name?.split(" ")?.[0] || "there";
      const isAbove = alert_type.includes("above");
      const isEntry = alert_type.includes("entry");
      const icon = isAbove ? "📈" : isEntry ? "⚡" : "📉";
      const direction = isAbove
        ? "rises above"
        : isEntry
          ? "hits entry level"
          : "falls below";

      fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: profile.telegram_chat_id,
            text: `${icon} *Aurora Alert Set*\n\nHi ${firstName}!\n\n*${symbol}*${company_name ? ` — ${company_name}` : ""}\n\nYou will be notified when ${symbol} ${direction} *$${target_price.toFixed(2)}*${reference_price ? `\n\nReference price: $${reference_price.toFixed(2)}` : ""}\n\n_Aurora Growth Academy_`,
            parse_mode: "Markdown",
          }),
        }
      ).catch((e) => console.error("[Alerts] Telegram error:", e));
    }

    return NextResponse.json({ ok: true, alert: data });
  } catch (error: any) {
    console.error("[Alerts POST]", error?.message);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const symbol = searchParams.get("symbol");

    if (id) {
      await supabaseAdmin
        .from("price_alerts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
    } else if (symbol) {
      await supabaseAdmin
        .from("price_alerts")
        .delete()
        .eq("symbol", symbol.toUpperCase())
        .eq("user_id", user.id);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message }, { status: 500 });
  }
}
