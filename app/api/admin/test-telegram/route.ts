import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyAdmin } from "@/lib/telegram/admin";

export const dynamic = "force-dynamic";

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

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN not set in .env.local" },
      { status: 500 }
    );
  }

  try {
    await notifyAdmin({
      type: "info",
      title: "Admin Test Notification",
      message: "This is a test notification from Aurora Growth admin panel.",
      data: { sent_by: user.email, platform: "Aurora Growth" },
    });
    return NextResponse.json({ ok: true, message: "Test alert sent" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send" },
      { status: 500 }
    );
  }
}
