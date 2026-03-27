import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendAdminAlert } from "@/lib/telegram/admin";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_ADMIN_CHAT_ID) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID not set in .env.local" },
      { status: 500 }
    );
  }

  try {
    await sendAdminAlert(
      `✅ Test alert from Aurora Admin\nTriggered by: ${user.email}`,
      "info"
    );
    return NextResponse.json({ ok: true, message: "Test alert sent" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send" },
      { status: 500 }
    );
  }
}
