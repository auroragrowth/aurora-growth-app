import { NextResponse } from "next/server";
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("telegram_chat_id,telegram_username,telegram_connected_at")
      .eq("id", user.id)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      connected: !!profile?.telegram_chat_id,
      username: profile?.telegram_username || null,
      connected_at: profile?.telegram_connected_at || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message },
      { status: 500 }
    );
  }
}
