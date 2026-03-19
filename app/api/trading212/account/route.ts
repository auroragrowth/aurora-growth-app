import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TRADING212_BASE =
  process.env.TRADING212_BASE_URL || "https://live.trading212.com/api/v0";

function buildBasicAuth(apiKey: string, apiSecret: string) {
  return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`;
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data: connection, error: connectionError } = await supabase
      .from("user_broker_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("broker", "trading212")
      .eq("is_connected", true)
      .maybeSingle();

    if (connectionError) {
      return NextResponse.json(
        { ok: false, error: connectionError.message },
        { status: 500 }
      );
    }

    if (!connection?.api_key || !connection?.api_secret) {
      return NextResponse.json(
        { ok: false, error: "No active Trading 212 connection found." },
        { status: 400 }
      );
    }

    const authHeader = buildBasicAuth(connection.api_key, connection.api_secret);

    const [summaryRes, cashRes] = await Promise.all([
      fetch(`${TRADING212_BASE}/equity/account/summary`, {
        method: "GET",
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
        },
        cache: "no-store",
      }),
      fetch(`${TRADING212_BASE}/equity/account/cash`, {
        method: "GET",
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
        },
        cache: "no-store",
      }),
    ]);

    const summaryText = await summaryRes.text();
    const cashText = await cashRes.text();

    let summary: unknown = null;
    let cash: unknown = null;

    try {
      summary = summaryText ? JSON.parse(summaryText) : null;
    } catch {
      summary = null;
    }

    try {
      cash = cashText ? JSON.parse(cashText) : null;
    } catch {
      cash = null;
    }

    if (!summaryRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            typeof summary === "object" && summary && "error" in summary
              ? String((summary as { error?: unknown }).error)
              : summaryText || `Trading 212 summary failed (${summaryRes.status})`,
        },
        { status: summaryRes.status }
      );
    }

    if (!cashRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            typeof cash === "object" && cash && "error" in cash
              ? String((cash as { error?: unknown }).error)
              : cashText || `Trading 212 cash failed (${cashRes.status})`,
        },
        { status: cashRes.status }
      );
    }

    await supabase
      .from("user_broker_connections")
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    return NextResponse.json({
      ok: true,
      account: summary,
      cash,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch account data.",
      },
      { status: 500 }
    );
  }
}
