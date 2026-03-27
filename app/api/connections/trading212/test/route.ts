import { badRequest, ok, serverError } from "@/lib/api/json";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentUser, getUserConnection } from "@/lib/trading212/connections";
import { trading212Fetch } from "@/lib/trading212/client";

type T212AccountInfo = { id?: number; currencyCode?: string };
type T212Cash = { free?: number; total?: number; ppl?: number; result?: number; invested?: number; currencyCode?: string };
type T212Position = { ticker?: string; quantity?: number; averagePrice?: number; currentPrice?: number; ppl?: number };

export async function POST() {
  try {
    const user = await getCurrentUser();
    const connection = await getUserConnection(user.id);

    if (!connection) {
      return badRequest("No Trading 212 connection found.");
    }

    try {
      const [accountInfo, cash, positions] = await Promise.all([
        trading212Fetch<T212AccountInfo>(connection, "/equity/account/info"),
        trading212Fetch<T212Cash>(connection, "/equity/account/cash"),
        trading212Fetch<T212Position[]>(connection, "/equity/positions"),
      ]);

      const accountId = accountInfo?.id?.toString() || null;
      const currency = accountInfo?.currencyCode || cash?.currencyCode || null;
      const posArr = Array.isArray(positions) ? positions : [];

      await supabaseAdmin
        .from("trading212_connections")
        .update({
          is_connected: true,
          account_id: accountId,
          account_currency: currency,
          account_type: "live",
          display_name: "Trading 212",
          last_tested_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", connection.id);

      await supabaseAdmin
        .from("profiles")
        .update({ trading212_connected: true })
        .eq("id", user.id);

      return ok({
        success: true,
        account: {
          accountId,
          currency,
          totalValue: typeof cash?.total === "number" ? cash.total : null,
          freeCash: typeof cash?.free === "number" ? cash.free : null,
          invested: typeof cash?.invested === "number" ? cash.invested : null,
          pnl: typeof cash?.ppl === "number" ? cash.ppl : typeof cash?.result === "number" ? cash.result : null,
          positionsCount: posArr.length,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Trading 212 test failed.";

      await supabaseAdmin
        .from("trading212_connections")
        .update({ last_error: message, is_connected: false, last_tested_at: new Date().toISOString() })
        .eq("id", connection.id);

      return badRequest(message);
    }
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Connection test failed.");
  }
}
