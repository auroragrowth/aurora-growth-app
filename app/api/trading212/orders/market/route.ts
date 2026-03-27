import { badRequest, ok, serverError } from "@/lib/api/json";
import { getCurrentUser, getUserConnection } from "@/lib/trading212/connections";
import { trading212Fetch } from "@/lib/trading212/client";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const connection = await getUserConnection(user.id);

    if (!connection) {
      return badRequest("No active Trading 212 connection found.");
    }

    const body = await req.json();
    const ticker = String(body.ticker || "").trim();
    const quantity = Number(body.quantity);
    const extendedHours = Boolean(body.extendedHours ?? false);

    if (!ticker) return badRequest("Ticker is required.");
    if (!Number.isFinite(quantity) || quantity === 0) {
      return badRequest("Quantity must be a non-zero number.");
    }

    const order = await trading212Fetch<unknown>(connection, "/equity/orders/market", {
      method: "POST",
      body: JSON.stringify({ ticker, quantity, extendedHours }),
    });

    return ok({ success: true, order });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Failed to place market order.");
  }
}
