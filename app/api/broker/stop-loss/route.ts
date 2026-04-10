import { NextResponse } from "next/server";
import { getCurrentUser, getUserConnection } from "@/lib/trading212/connections";
import { getTrading212AuthHeader } from "@/lib/trading212/client";
import { getBaseUrl } from "@/lib/trading212/connections";
import type { BrokerMode } from "@/lib/trading212/types";

// Cache instruments per mode
const instrumentCache = new Map<string, { data: any[]; cachedAt: number }>();
const INSTRUMENT_CACHE_TTL = 300_000;

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
  for (const inst of instruments) {
    const t = String(inst.ticker || "").toUpperCase();
    if (t === upper) return inst.ticker;
    if (t === `${upper}_US_EQ`) return inst.ticker;
    if (t === `${upper}_EQ`) return inst.ticker;
  }
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

    const { ticker, quantity, stopPrice, accountMode } = body as {
      ticker: string;
      quantity: number;
      stopPrice: number;
      accountMode?: BrokerMode;
    };

    if (!ticker || !quantity || !stopPrice) {
      return NextResponse.json(
        { error: "Missing required fields: ticker, quantity, stopPrice" },
        { status: 400 }
      );
    }

    const mode: BrokerMode = accountMode === "demo" ? "demo" : "live";
    const connection = await getUserConnection(user.id, mode);

    if (!connection || !connection.is_connected) {
      return NextResponse.json(
        { error: `No ${mode} broker connection found.` },
        { status: 400 }
      );
    }

    const authHeader = getTrading212AuthHeader(connection);
    const baseUrl = connection.base_url || getBaseUrl(mode);

    const instruments = await getInstruments(baseUrl, authHeader, mode);
    const brokerTicker = findInstrument(instruments, ticker) || `${ticker}_US_EQ`;

    // Round price to 2 decimal places
    const roundedPrice = Math.round(stopPrice * 100) / 100;
    // Negative quantity = sell on T212
    const sellQty = -Math.abs(Math.round(quantity * 1000000) / 1000000);

    console.log("[Stop Loss]", { ticker, brokerTicker, quantity: sellQty, limitPrice: roundedPrice, mode });

    // T212 Invest API: stop orders not supported — use limit sell order instead
    // The limit sell will execute when the price reaches or exceeds the limit price
    const response = await fetch(`${baseUrl}/equity/orders/limit`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ticker: brokerTicker,
        quantity: sellQty,
        limitPrice: roundedPrice,
        timeValidity: "GTC",
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("[Stop Loss] Failed:", response.status, result);
      return NextResponse.json(
        { error: result?.message || result?.error || `Stop loss failed (${response.status})`, details: result },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: result?.id,
      status: result?.status || "placed",
      brokerTicker,
      stopPrice,
    });
  } catch (error) {
    console.error("[Stop Loss] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stop loss placement failed" },
      { status: 500 }
    );
  }
}
