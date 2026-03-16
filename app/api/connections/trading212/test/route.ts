import { badRequest, ok, serverError } from "@/lib/api/json";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentUser, getUserConnectionByMode } from "@/lib/trading212/connections";
import { trading212Fetch } from "@/lib/trading212/client";
import type { TradingMode } from "@/lib/trading212/types";

type T212Summary = {
  accountId?: string;
  id?: string | number;
  currencyCode?: string;
  pieCash?: number;
  result?: number;
  invested?: number;
  freeCash?: number;
  total?: number;
};

type T212Cash = {
  free?: number;
  total?: number;
  pieCash?: number;
  ppl?: number;
  result?: number;
  currencyCode?: string;
};

type T212Position = {
  ticker?: string;
  quantity?: number;
  averagePrice?: number;
  currentPrice?: number;
  ppl?: number;
  result?: number;
};

async function tryConnection(userId: string, mode: TradingMode) {
  const connection = await getUserConnectionByMode(userId, mode);
  if (!connection) {
    return { mode, connection: null, success: false as const, error: `No ${mode} Trading 212 connection found.` };
  }

  try {
    const [summary, cash, positions] = await Promise.all([
      trading212Fetch<T212Summary>(connection, "/equity/account/summary"),
      trading212Fetch<T212Cash>(connection, "/equity/account/cash"),
      trading212Fetch<T212Position[]>(connection, "/equity/positions"),
    ]);

    return {
      mode,
      connection,
      success: true as const,
      summary,
      cash,
      positions,
    };
  } catch (error) {
    return {
      mode,
      connection,
      success: false as const,
      error: error instanceof Error ? error.message : "Trading 212 test failed.",
    };
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const requestedMode = body.mode as TradingMode;

    if (!requestedMode || !["paper", "live"].includes(requestedMode)) {
      return badRequest("Mode must be paper or live.");
    }

    const fallbackMode: TradingMode = requestedMode === "paper" ? "live" : "paper";

    const primary = await tryConnection(user.id, requestedMode);
    const secondary = primary.success ? null : await tryConnection(user.id, fallbackMode);

    const winner = primary.success ? primary : secondary?.success ? secondary : null;

    if (!winner || !winner.connection) {
      return badRequest(
        secondary?.error || primary.error || "Trading 212 connection test failed."
      );
    }

    const summary = winner.summary ?? {};
    const cash = winner.cash ?? {};
    const positions = Array.isArray(winner.positions) ? winner.positions : [];

    const accountId =
      summary.accountId?.toString() ||
      summary.id?.toString() ||
      null;

    const currency =
      cash.currencyCode ||
      summary.currencyCode ||
      null;

    const totalValue =
      typeof cash.total === "number"
        ? cash.total
        : typeof summary.total === "number"
        ? summary.total
        : null;

    const freeCash =
      typeof cash.free === "number"
        ? cash.free
        : typeof summary.freeCash === "number"
        ? summary.freeCash
        : null;

    const invested =
      typeof summary.invested === "number" ? summary.invested : null;

    const pnl =
      typeof cash.result === "number"
        ? cash.result
        : typeof summary.result === "number"
        ? summary.result
        : null;

    const { error } = await supabaseAdmin
      .from("broker_connections")
      .update({
        account_id: accountId,
        account_currency: currency,
        account_type: winner.mode === "paper" ? "paper" : "live",
        display_name: "Trading 212",
        last_tested_at: new Date().toISOString(),
        last_sync_at: new Date().toISOString(),
      })
      .eq("id", winner.connection.id);

    if (error) {
      return serverError(error.message);
    }

    return ok({
      success: true,
      requestedMode,
      detectedMode: winner.mode,
      autoSwitched: winner.mode !== requestedMode,
      account: {
        accountId,
        currency,
        totalValue,
        freeCash,
        invested,
        pnl,
        positionsCount: positions.length,
      },
      positions: positions.slice(0, 10),
    });
  } catch (error) {
    return serverError(
      error instanceof Error ? error.message : "Connection test failed."
    );
  }
}
