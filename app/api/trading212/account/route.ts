import { badRequest, ok, serverError } from "@/lib/api/json";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentUser, getUserConnectionByMode, getUserTradingMode } from "@/lib/trading212/connections";
import { trading212Fetch } from "@/lib/trading212/client";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const mode = await getUserTradingMode(user.id);
    const connection = await getUserConnectionByMode(user.id, mode);

    if (!connection) {
      return badRequest(`No active Trading 212 ${mode} connection found.`);
    }

    const [info, cash] = await Promise.all([
      trading212Fetch<any>(connection, "/equity/account/info"),
      trading212Fetch<any>(connection, "/equity/account/cash"),
    ]);

    await supabaseAdmin
      .from("broker_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", connection.id);

    return ok({ mode, info, cash });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Failed to fetch account data.");
  }
}
