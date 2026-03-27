import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
  }

  try {
    const { data: connection } = await supabaseAdmin
      .from("trading212_connections")
      .select("id, is_connected, account_id, account_currency")
      .eq("user_id", user.id)
      .eq("broker", "trading212")
      .eq("is_active", true)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      authenticated: true,
      trading212: {
        is_connected: !!connection?.is_connected,
        account_id: connection?.account_id || null,
        account_currency: connection?.account_currency || null,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({
      ok: false,
      authenticated: true,
      trading212: { is_connected: false },
      error: err instanceof Error ? err.message : "Status failed",
    });
  }
}
