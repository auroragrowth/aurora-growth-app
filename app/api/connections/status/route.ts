import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchTrading212Summary } from "@/lib/trading212/server";
import { getUserTradingMode } from "@/lib/trading212/connections";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { ok: false, authenticated: false },
      { status: 401 }
    );
  }

  const mode = await getUserTradingMode(user.id);

  try {
    const result = await fetchTrading212Summary();

    return NextResponse.json({
      ok: true,
      authenticated: true,
      trading212: {
        is_connected: result.connected,
        mode,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({
      ok: false,
      authenticated: true,
      trading212: {
        is_connected: false,
        mode,
      },
      error: err instanceof Error ? err.message : "Status failed",
    });
  }
}
