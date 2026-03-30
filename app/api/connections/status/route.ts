import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getActiveMode, getUserConnection } from "@/lib/trading212/connections";

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
    const activeMode = await getActiveMode(user.id);
    const connection = await getUserConnection(user.id, activeMode);

    return NextResponse.json({
      ok: true,
      authenticated: true,
      active_broker_mode: activeMode,
      trading212: {
        mode: activeMode,
        is_connected: !!connection?.is_connected,
        account_id: connection?.account_id || null,
        account_currency: connection?.account_currency || null,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({
      ok: false,
      authenticated: true,
      active_broker_mode: "live",
      trading212: { is_connected: false },
      error: err instanceof Error ? err.message : "Status failed",
    });
  }
}
