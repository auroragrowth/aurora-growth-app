import { NextResponse } from "next/server";
import { getTrading212ConnectionForUser } from "@/lib/trading212/server";
import { trading212Fetch } from "@/lib/trading212/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const connection = await getTrading212ConnectionForUser();
    if (!connection?.api_key_encrypted || !connection.is_connected) {
      return NextResponse.json({ orders: [] });
    }

    const orders = await trading212Fetch<unknown[]>(
      connection,
      "/equity/orders"
    );

    return NextResponse.json({
      orders: Array.isArray(orders) ? orders : [],
    });
  } catch (e) {
    console.error("[T212 Pending Orders]", e);
    return NextResponse.json({ orders: [] });
  }
}
