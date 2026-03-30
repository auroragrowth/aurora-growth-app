import { NextResponse } from "next/server";
import {
  fetchTrading212Summary,
  getTrading212ConnectionForUser,
} from "@/lib/trading212/server";
import { sanitizeConnection } from "@/lib/trading212/connections";

export async function GET() {
  try {
    const connection = await getTrading212ConnectionForUser();

    console.log("[Trading212 Account]", {
      mode: connection?.mode || "none",
      baseUrl: connection?.base_url || "none",
      isConnected: connection?.is_connected || false,
      hasKey: !!connection?.api_key_encrypted,
    });

    const result = await fetchTrading212Summary();

    return NextResponse.json({
      ok: true,
      connected: result.connected,
      cached: false,
      connection: result.connection,
      data: result.summary,
    });
  } catch (error) {
    console.error("[Trading212 Account] Error:", error instanceof Error ? error.message : error);

    let connection = null;
    try {
      connection = await getTrading212ConnectionForUser();
    } catch { /* ignore */ }

    return NextResponse.json(
      {
        ok: false,
        connected: Boolean(connection?.is_connected),
        error: error instanceof Error ? error.message : "Trading 212 account request failed",
        connection: sanitizeConnection(connection as unknown as Record<string, unknown>),
        data: null,
      },
      { status: 500 }
    );
  }
}
