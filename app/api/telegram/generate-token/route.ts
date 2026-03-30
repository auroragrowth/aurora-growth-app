import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const BOT_USERNAME = "auroragrowth_admin_bot";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const token = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from("telegram_connect_tokens").insert({
      user_id: user.id,
      token,
      expires_at: expiresAt,
      used: false,
    });

    if (error) {
      const msg = error.message || "";
      if (msg.includes("telegram_connect_tokens")) {
        return NextResponse.json({
          ok: true,
          token,
          qr_url: `https://t.me/${BOT_USERNAME}?start=${token}`,
          note: "Token generated but table may need creating",
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      token,
      qr_url: `https://t.me/${BOT_USERNAME}?start=${token}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message },
      { status: 500 }
    );
  }
}
