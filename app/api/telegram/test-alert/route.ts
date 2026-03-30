import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram/notify";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("telegram_chat_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.telegram_chat_id) {
      return NextResponse.json(
        { error: "Telegram not connected" },
        { status: 400 }
      );
    }

    const msg =
      "\uD83E\uDDEA *Aurora Test Alert*\n\n" +
      "Your price alerts are working correctly!\n\n" +
      "You\u2019ll receive notifications here when:\n" +
      "\u2022 A stock rises above your target\n" +
      "\u2022 A stock falls below your target\n" +
      "\u2022 A stock reaches your entry level\n\n" +
      "dev.auroragrowth.co.uk";

    const sent = await sendTelegramMessage(profile.telegram_chat_id, msg);

    if (!sent) {
      return NextResponse.json(
        { error: "Failed to send test message" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message },
      { status: 500 }
    );
  }
}
