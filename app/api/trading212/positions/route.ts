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
        {
          ok: false,
          error: "Not authenticated",
          positions: [],
        },
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
        {
          ok: false,
          error: connectionError.message,
          positions: [],
        },
        { status: 500 }
      );
    }

    if (!connection?.api_key || !connection?.api_secret) {
      return NextResponse.json(
        {
          ok: false,
          error: "No active Trading 212 connection found.",
          positions: [],
        },
        { status: 400 }
      );
    }

    const response = await fetch(`${TRADING212_BASE}/equity/positions`, {
      method: "GET",
      headers: {
        Authorization: buildBasicAuth(connection.api_key, connection.api_secret),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await response.text();

    let data: unknown = [];
    try {
      data = text ? JSON.parse(text) : [];
    } catch {
      data = [];
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            typeof data === "object" && data && "error" in data
              ? String((data as { error?: unknown }).error)
              : text || `Trading 212 request failed (${response.status})`,
          positions: [],
        },
        { status: response.status }
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
      positions: Array.isArray(data) ? data : [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch Trading 212 positions.",
        positions: [],
      },
      { status: 500 }
    );
  }
}
