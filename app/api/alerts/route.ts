import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: true, alerts: [] });
    }

    return NextResponse.json({ ok: true, alerts: data || [] });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message },
      { status: 500 }
    );
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
    const percentage = Number(body.percentage) || null;
    const company_name = body.company_name || null;

    if (!symbol || !alert_type || !Number.isFinite(target_price)) {
      return NextResponse.json(
        { error: "symbol, alert_type and target_price are required" },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("telegram_chat_id")
      .eq("id", user.id)
      .maybeSingle();

    const row: Record<string, any> = {
      user_id: user.id,
      symbol,
      company_name,
      alert_type,
      target_price,
      reference_price,
      percentage,
      telegram_chat_id: profile?.telegram_chat_id || null,
      is_active: true,
      triggered: false,
      notification_sent: false,
    };

    const { data, error } = await supabase
      .from("price_alerts")
      .insert(row)
      .select()
      .single();

    if (error) {
      const msg = error.message || "";
      if (msg.includes("reference_price") || msg.includes("percentage") || msg.includes("is_active")) {
        const { reference_price: _r, percentage: _p, is_active: _a, ...fallback } = row;
        const retry = await supabase
          .from("price_alerts")
          .insert(fallback)
          .select()
          .single();

        if (retry.error) {
          return NextResponse.json({ error: retry.error.message }, { status: 500 });
        }
        return NextResponse.json({ ok: true, alert: retry.data });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, alert: data });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message },
      { status: 500 }
    );
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
      await supabase
        .from("price_alerts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
    } else if (symbol) {
      await supabase
        .from("price_alerts")
        .delete()
        .eq("symbol", symbol.toUpperCase())
        .eq("user_id", user.id);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message },
      { status: 500 }
    );
  }
}
