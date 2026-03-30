import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function sendTgReply(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json().catch(() => null);
    if (!update?.message) {
      return NextResponse.json({ ok: true });
    }

    const msg = update.message;
    const chatId = msg.chat?.id;
    const text = String(msg.text || "").trim();
    const username = msg.from?.username || null;

    if (!chatId || !text.startsWith("/start")) {
      return NextResponse.json({ ok: true });
    }

    const parts = text.split(/\s+/);
    const token = parts[1] || "";

    if (!token || token.length < 16) {
      await sendTgReply(
        chatId,
        "\u274C This link has expired.\nPlease generate a new QR code in Aurora."
      );
      return NextResponse.json({ ok: true });
    }

    const supabase = getSupabase();
    if (!supabase) {
      await sendTgReply(chatId, "\u274C Service temporarily unavailable.");
      return NextResponse.json({ ok: true });
    }

    const { data: tokenRow } = await supabase
      .from("telegram_connect_tokens")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .maybeSingle();

    if (!tokenRow) {
      await sendTgReply(
        chatId,
        "\u274C This link has expired.\nPlease generate a new QR code in Aurora."
      );
      return NextResponse.json({ ok: true });
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      await sendTgReply(
        chatId,
        "\u274C This link has expired.\nPlease generate a new QR code in Aurora."
      );
      return NextResponse.json({ ok: true });
    }

    await supabase
      .from("profiles")
      .update({
        telegram_chat_id: String(chatId),
        telegram_username: username,
        telegram_connected_at: new Date().toISOString(),
      })
      .eq("id", tokenRow.user_id);

    await supabase
      .from("telegram_connect_tokens")
      .update({ used: true })
      .eq("id", tokenRow.id);

    await sendTgReply(
      chatId,
      "\u2705 *Aurora Growth alerts connected!*\n\n" +
        "You\u2019ll now receive price alerts and entry level notifications here.\n\n" +
        "To test: go back to Aurora and set a price alert on any watchlist stock."
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}
