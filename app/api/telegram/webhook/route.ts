import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  answerCallbackQuery,
  editTelegramMessage,
  sendTelegramMessage,
} from "@/lib/telegram/notify";
import { getTrading212AuthHeader } from "@/lib/trading212/client";
import { getBaseUrl } from "@/lib/trading212/connections";

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

// Find the broker ticker for a symbol
async function findBrokerTicker(
  baseUrl: string,
  authHeader: string,
  symbol: string
): Promise<string> {
  try {
    const res = await fetch(`${baseUrl}/equity/metadata/instruments`, {
      headers: { Authorization: authHeader },
      cache: "no-store",
    });
    if (!res.ok) return `${symbol}_US_EQ`;
    const instruments = await res.json();
    if (!Array.isArray(instruments)) return `${symbol}_US_EQ`;

    const upper = symbol.toUpperCase();
    for (const inst of instruments) {
      const t = String(inst.ticker || "").toUpperCase();
      if (t === upper || t === `${upper}_US_EQ` || t === `${upper}_EQ`)
        return inst.ticker;
    }
    for (const inst of instruments) {
      const t = String(inst.ticker || "").toUpperCase();
      if (t.startsWith(`${upper}_`)) return inst.ticker;
    }
  } catch {}
  return `${symbol}_US_EQ`;
}

async function handleCallbackQuery(
  supabase: any,
  callbackQuery: any
) {
  const callbackId = callbackQuery.id;
  const chatId = callbackQuery.message?.chat?.id;
  const messageId = callbackQuery.message?.message_id;
  const data = callbackQuery.data || "";

  if (!chatId || !data) return;

  // Look up the user by telegram_chat_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("telegram_chat_id", String(chatId))
    .maybeSingle() as { data: { id: string } | null };

  if (!profile) {
    await answerCallbackQuery(callbackId, "Account not linked. Connect Telegram in Aurora first.");
    return;
  }

  const userId = profile.id;

  // Parse callback data
  if (data.startsWith("stoploss:")) {
    // Format: stoploss:SYMBOL:QUANTITY:PRICE:MODE
    const parts = data.split(":");
    if (parts.length < 5) {
      await answerCallbackQuery(callbackId, "Invalid stop loss data.");
      return;
    }

    const symbol = parts[1];
    const quantity = parseFloat(parts[2]);
    const stopPrice = parseFloat(parts[3]);
    const mode = parts[4] as "live" | "demo";

    // Get user's broker connection
    const { data: connection } = await supabase
      .from("broker_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("mode", mode)
      .eq("is_connected", true)
      .maybeSingle() as { data: any };

    if (!connection) {
      await answerCallbackQuery(callbackId, `No ${mode} broker connection found.`);
      return;
    }

    const authHeader = getTrading212AuthHeader(connection);
    const baseUrl = connection.base_url || getBaseUrl(mode);
    const brokerTicker = await findBrokerTicker(baseUrl, authHeader, symbol);

    // Place limit sell order (T212 Invest doesn't support stop orders via API)
    try {
      const res = await fetch(`${baseUrl}/equity/orders/limit`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticker: brokerTicker,
          quantity: -Math.abs(Math.round(quantity * 1000000) / 1000000),
          limitPrice: Math.round(stopPrice * 100) / 100,
          timeValidity: "GTC",
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (res.ok) {
        await answerCallbackQuery(callbackId, `Stop loss placed for ${symbol} @ $${stopPrice.toFixed(2)}`);
        if (messageId) {
          await editTelegramMessage(
            String(chatId),
            messageId,
            callbackQuery.message.text +
              `\n\n✅ *Stop loss placed* @ $${stopPrice.toFixed(2)}`
          );
        }
      } else {
        const errMsg = result?.message || result?.error || `Failed (${res.status})`;
        await answerCallbackQuery(callbackId, `Failed: ${errMsg}`);
        await sendTelegramMessage(
          String(chatId),
          `❌ Stop loss failed for *${symbol}*: ${errMsg}`
        );
      }
    } catch (e: any) {
      await answerCallbackQuery(callbackId, "Error placing stop loss.");
      await sendTelegramMessage(
        String(chatId),
        `❌ Error placing stop loss for *${symbol}*: ${e.message}`
      );
    }
  } else if (data.startsWith("marketsell:")) {
    // Format: marketsell:SYMBOL:QUANTITY:MODE
    const parts = data.split(":");
    if (parts.length < 4) {
      await answerCallbackQuery(callbackId, "Invalid sell data.");
      return;
    }

    const symbol = parts[1];
    const quantity = parseFloat(parts[2]);
    const mode = parts[3] as "live" | "demo";

    const { data: connection2 } = await supabase
      .from("broker_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("mode", mode)
      .eq("is_connected", true)
      .maybeSingle() as { data: any };

    if (!connection2) {
      await answerCallbackQuery(callbackId, `No ${mode} broker connection found.`);
      return;
    }

    const authHeader = getTrading212AuthHeader(connection2);
    const baseUrl = connection2.base_url || getBaseUrl(mode);
    const brokerTicker = await findBrokerTicker(baseUrl, authHeader, symbol);

    try {
      const res = await fetch(`${baseUrl}/equity/orders/market`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticker: brokerTicker,
          quantity: Math.round(Math.abs(quantity) * 1000000) / 1000000,
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (res.ok) {
        await answerCallbackQuery(callbackId, `Market sell placed for ${symbol}`);
        if (messageId) {
          await editTelegramMessage(
            String(chatId),
            messageId,
            callbackQuery.message.text +
              `\n\n✅ *Market sell placed* for ${quantity} shares`
          );
        }
      } else {
        const errMsg = result?.message || result?.error || `Failed (${res.status})`;
        await answerCallbackQuery(callbackId, `Failed: ${errMsg}`);
        await sendTelegramMessage(
          String(chatId),
          `❌ Market sell failed for *${symbol}*: ${errMsg}`
        );
      }
    } catch (e: any) {
      await answerCallbackQuery(callbackId, "Error placing sell order.");
    }
  } else if (data.startsWith("view:")) {
    const symbol = data.split(":")[1];
    await answerCallbackQuery(callbackId, `Open Aurora to view ${symbol}`);
    await sendTelegramMessage(
      String(chatId),
      `📊 [View ${symbol} in Aurora](https://dev.auroragrowth.co.uk/dashboard/investments/${symbol})`
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json().catch(() => null);

    // Handle callback queries (inline button presses)
    if (update?.callback_query) {
      const supabase = getSupabase();
      if (supabase) {
        await handleCallbackQuery(supabase, update.callback_query);
      }
      return NextResponse.json({ ok: true });
    }

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
