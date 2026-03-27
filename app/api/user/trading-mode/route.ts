import { ok, serverError } from "@/lib/api/json";
import { getCurrentUser } from "@/lib/trading212/connections";

export async function GET() {
  try {
    await getCurrentUser();
    return ok({ tradingMode: "live" });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Failed.");
  }
}

export async function PATCH() {
  try {
    await getCurrentUser();
    return ok({ success: true, tradingMode: "live" });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Failed.");
  }
}
