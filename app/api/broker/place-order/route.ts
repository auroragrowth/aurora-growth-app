import { NextResponse } from "next/server";
import { getCurrentUser, getUserConnection } from "@/lib/trading212/connections";
import { getTrading212AuthHeader } from "@/lib/trading212/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { BrokerMode } from "@/lib/trading212/types";

// Cache instruments per mode to avoid repeated lookups
const instrumentCache = new Map<string, { data: any[]; cachedAt: number }>();
const INSTRUMENT_CACHE_TTL = 300_000; // 5 minutes

async function getInstruments(baseUrl: string, authHeader: string, mode: string): Promise<any[]> {
  const cached = instrumentCache.get(mode);
  if (cached && Date.now() - cached.cachedAt < INSTRUMENT_CACHE_TTL) return cached.data;

  const res = await fetch(`${baseUrl}/equity/metadata/instruments`, {
    headers: { Authorization: authHeader },
    cache: "no-store",
  });

  if (!res.ok) return [];

  const data = await res.json();
  const instruments = Array.isArray(data) ? data : [];
  instrumentCache.set(mode, { data: instruments, cachedAt: Date.now() });
  return instruments;
}

function findInstrument(instruments: any[], ticker: string): string | null {
  const upper = ticker.toUpperCase();

  // Try exact matches first
  for (const inst of instruments) {
    const t = String(inst.ticker || "").toUpperCase();
    if (t === upper) return inst.ticker;
    if (t === `${upper}_US_EQ`) return inst.ticker;
    if (t === `${upper}_EQ`) return inst.ticker;
  }

  // Try shortName/name match
  for (const inst of instruments) {
    const short = String(inst.shortName || inst.name || "").toUpperCase();
    if (short === upper) return inst.ticker;
  }

  // Try prefix match
  for (const inst of instruments) {
    const t = String(inst.ticker || "").toUpperCase();
    if (t.startsWith(`${upper}_`)) return inst.ticker;
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const { ticker, quantity, limitPrice, accountMode, ladderStep } = body as {
      ticker: string;
      quantity: number;
      limitPrice: number;
      accountMode?: BrokerMode;
      ladderStep?: number;
    };

    if (!ticker || !quantity || !limitPrice) {
      return NextResponse.json({ error: "Missing required fields: ticker, quantity, limitPrice" }, { status: 400 });
    }

    const mode: BrokerMode = accountMode === "demo" ? "demo" : "live";
    const connection = await getUserConnection(user.id, mode);

    if (!connection || !connection.is_connected) {
      return NextResponse.json(
        { error: `No ${mode} broker connection found. Please connect your broker first.` },
        { status: 400 }
      );
    }

    const authHeader = getTrading212AuthHeader(connection);
    const baseUrl = connection.base_url || (mode === "demo"
      ? "https://demo.trading212.com/api/v0"
      : "https://live.trading212.com/api/v0");

    // Step 1: Look up correct instrument ticker
    const instruments = await getInstruments(baseUrl, authHeader, mode);
    const brokerTicker = findInstrument(instruments, ticker) || `${ticker}_US_EQ`;

    console.log("[Place Order]", { ticker, brokerTicker, quantity, limitPrice, mode, ladderStep });

    // Step 2: Place the order
    const response = await fetch(`${baseUrl}/equity/orders/limit`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ticker: brokerTicker,
        quantity,
        limitPrice,
        timeValidity: "GTC",
      }),
    });

    const result = await response.json().catch(() => ({}));
    const success = response.ok;
    const errorMsg = !success ? (result?.message || result?.error || `Order failed (${response.status})`) : null;

    // Step 3: Save to orders table (success or failure)
    try {
      await supabaseAdmin.from("orders").insert({
        user_id: user.id,
        ticker,
        broker_ticker: brokerTicker,
        order_type: "buy",
        order_mode: "limit",
        account_mode: mode,
        quantity,
        limit_price: limitPrice,
        status: success ? "placed" : "rejected",
        broker_order_id: result?.id?.toString() || null,
        broker_response: result,
        ladder_step: ladderStep || null,
        placed_at: new Date().toISOString(),
        notes: errorMsg,
      });
    } catch {
      // Table may not exist yet
    }

    if (!success) {
      console.error("[Place Order] Failed:", response.status, result);
      return NextResponse.json({ error: errorMsg, details: result }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      orderId: result?.id,
      status: result?.status || "placed",
      brokerTicker,
    });
  } catch (error) {
    console.error("[Place Order] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Order placement failed" },
      { status: 500 }
    );
  }
}
