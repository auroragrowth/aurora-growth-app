import { NextRequest, NextResponse } from "next/server";
import { getTrading212ConnectionForUser } from "@/lib/trading212/server";
import { trading212Fetch } from "@/lib/trading212/client";

export const dynamic = "force-dynamic";

type T212HistoryOrder = {
  id: number;
  ticker: string;
  type: string;
  status: string;
  limitPrice: number | null;
  stopPrice: number | null;
  quantity: number | null;
  filledQuantity: number | null;
  filledValue: number | null;
  fillPrice: number | null;
  fillResult: { quantity: number; price: number } | null;
  dateCreated: string;
  dateExecuted: string | null;
  dateModified: string | null;
};

type T212HistoryResponse = {
  items: T212HistoryOrder[];
  nextPagePath: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const connection = await getTrading212ConnectionForUser();
    if (!connection?.api_key_encrypted || !connection.is_connected) {
      return NextResponse.json({ orders: [] });
    }

    const ticker = req.nextUrl.searchParams.get("ticker");

    // Fetch up to 3 pages of order history (150 orders)
    const allOrders: T212HistoryOrder[] = [];
    let path = "/equity/history/orders";
    let pages = 0;

    while (path && pages < 3) {
      try {
        const data = await trading212Fetch<T212HistoryResponse>(
          connection,
          path
        );
        if (data?.items && Array.isArray(data.items)) {
          allOrders.push(...data.items);
        }
        path = data?.nextPagePath || "";
        pages++;
      } catch {
        break;
      }
    }

    // Filter by ticker if requested
    const filtered = ticker
      ? allOrders.filter(
          (o) => o.ticker?.toUpperCase() === ticker.toUpperCase()
        )
      : allOrders;

    // Sort newest first
    filtered.sort(
      (a, b) =>
        new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
    );

    return NextResponse.json({ orders: filtered });
  } catch (e) {
    console.error("[T212 History]", e);
    return NextResponse.json({ orders: [] });
  }
}
