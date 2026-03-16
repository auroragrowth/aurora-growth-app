import { badRequest, ok, serverError } from "@/lib/api/json";
import { getCurrentUser, getUserTradingMode, setUserTradingMode } from "@/lib/trading212/connections";
import type { TradingMode } from "@/lib/trading212/types";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const mode = await getUserTradingMode(user.id);
    return ok({ tradingMode: mode });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Failed to load trading mode.");
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const mode = body.mode as TradingMode;

    if (!mode || !["paper", "live"].includes(mode)) {
      return badRequest("Mode must be paper or live.");
    }

    await setUserTradingMode(user.id, mode);
    return ok({ success: true, tradingMode: mode });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Failed to update trading mode.");
  }
}
