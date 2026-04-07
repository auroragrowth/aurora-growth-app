import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWatchlistTable } from "@/lib/watchlist/getTable";
import { sendUserAlert } from "@/lib/telegram/alerts";

export const dynamic = "force-dynamic";

function cleanSymbol(v: unknown) {
  return String(v || "").trim().toUpperCase();
}

async function getAuthAndMode() {
  const supabase = await createClient();
  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth?.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_broker_mode")
    .eq("id", auth.user.id)
    .maybeSingle();

  const mode = profile?.active_broker_mode || "live";
  return { supabase, user: auth.user, mode };
}

export async function GET() {
  try {
    const ctx = await getAuthAndMode();
    if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const table = getWatchlistTable(ctx.mode);

    console.log("Watchlist GET from table:", table, "user:", ctx.user.id);

    const { data, error } = await ctx.supabase
      .from(table)
      .select("*")
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Watchlist GET error:", error.message, "table:", table);
      // Table may not exist — fall back to watchlist_live
      if (error.message?.includes("relation") || error.code === "42P01") {
        const { data: fallback } = await ctx.supabase
          .from("watchlist_live")
          .select("*")
          .eq("user_id", ctx.user.id)
          .order("created_at", { ascending: false });
        return NextResponse.json({
          ok: true,
          mode: ctx.mode,
          items: (fallback || []).map((row: any) => ({
            ...row,
            symbol: cleanSymbol(row.symbol),
          })),
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      mode: ctx.mode,
      items: (data || []).map((row: any) => ({
        ...row,
        symbol: cleanSymbol(row.symbol),
      })),
    });
  } catch (err: any) {
    console.error("Watchlist GET error:", err.message);
    return NextResponse.json(
      { error: err?.message || "Failed to load watchlist" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthAndMode();
    if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const symbol = cleanSymbol(body?.symbol || body?.ticker);
    if (!symbol) {
      return NextResponse.json({ error: "Symbol required" }, { status: 400 });
    }

    const table = getWatchlistTable(ctx.mode);

    console.log(`Adding ${symbol} to ${table} for user ${ctx.user.id}`);

    const { error } = await ctx.supabase
      .from(table)
      .upsert(
        {
          user_id: ctx.user.id,
          symbol,
          company_name: body.company_name || symbol,
          source: body.source || "My List",
          is_aurora_recommended: (body.source || "").includes("Aurora"),
          added_by: "user",
        },
        { onConflict: "user_id,symbol" }
      );

    if (error) {
      console.error("Watchlist POST insert error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send Telegram notification to user
    try {
      const { data: tgProfile } = await ctx.supabase
        .from("profiles")
        .select("telegram_chat_id, telegram_connected, first_name, full_name")
        .eq("id", ctx.user.id)
        .single();

      if (tgProfile?.telegram_chat_id && tgProfile?.telegram_connected) {
        const firstName = tgProfile.first_name ||
          tgProfile.full_name?.split(" ")[0] || "there";
        sendUserAlert(
          tgProfile.telegram_chat_id,
          `⭐ *Aurora Watchlist*\n\nHi ${firstName}, *${symbol}* has been added to your ${ctx.mode} watchlist.\n\nOpen Aurora to set a price alert or plan your entry with the Investment Calculator.\n\n_Aurora Growth_`
        ).catch(() => {});
      }
    } catch {}

    return NextResponse.json({
      success: true,
      symbol,
      table,
      mode: ctx.mode,
      message: `Added to ${ctx.mode} watchlist`,
    });
  } catch (e: any) {
    console.error("Watchlist POST error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getAuthAndMode();
    if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { symbol: rawSymbol } = await req.json().catch(() => ({ symbol: "" }));
    const symbol = cleanSymbol(rawSymbol);
    if (!symbol) {
      return NextResponse.json({ error: "Symbol required" }, { status: 400 });
    }

    const table = getWatchlistTable(ctx.mode);

    const { error } = await ctx.supabase
      .from(table)
      .delete()
      .eq("user_id", ctx.user.id)
      .eq("symbol", symbol);

    if (error) throw error;
    return NextResponse.json({ success: true, table });
  } catch (e: any) {
    console.error("Watchlist DELETE error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
