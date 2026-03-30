import { NextResponse } from "next/server";
import { getCurrentUser, getUserConnection } from "@/lib/trading212/connections";
import { getTrading212AuthHeader } from "@/lib/trading212/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { BrokerMode } from "@/lib/trading212/types";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const { ticker, quantity, limitPrice, accountMode } = body as {
      ticker: string;
      quantity: number;
      limitPrice: number;
      accountMode?: BrokerMode;
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

    // Map ticker to broker format (US stocks use _US_EQ suffix)
    const brokerTicker = ticker.includes("_") ? ticker : `${ticker}_US_EQ`;

    console.log("[Place Order]", { ticker: brokerTicker, quantity, limitPrice, mode, baseUrl });

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

    if (!response.ok) {
      console.error("[Place Order] Failed:", response.status, result);

      const errorMsg = result?.message || result?.error || `Order failed (${response.status})`;
      return NextResponse.json(
        { error: errorMsg, details: result },
        { status: response.status }
      );
    }

    // Save to orders table
    try {
      await supabaseAdmin.from("orders").insert({
        user_id: user.id,
        ticker,
        order_type: "buy",
        order_mode: "limit",
        account_mode: mode,
        quantity,
        limit_price: limitPrice,
        status: "placed",
        broker_order_id: result?.id?.toString() || null,
        broker_response: result,
        placed_at: new Date().toISOString(),
      });
    } catch {
      // Table may not exist yet — don't block the response
    }

    return NextResponse.json({
      success: true,
      orderId: result?.id,
      status: result?.status || "placed",
    });
  } catch (error) {
    console.error("[Place Order] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Order placement failed" },
      { status: 500 }
    );
  }
}
