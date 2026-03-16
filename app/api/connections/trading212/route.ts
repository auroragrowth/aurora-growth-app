import { badRequest, ok, serverError, unauthorized } from "@/lib/api/json";
import { encryptString } from "@/lib/security/encryption";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getAllUserConnections,
  getCurrentUser,
  getUserTradingMode,
} from "@/lib/trading212/connections";
import type { TradingMode } from "@/lib/trading212/types";

export async function GET() {
  try {
    const user = await getCurrentUser();

    const [connections, tradingMode] = await Promise.all([
      getAllUserConnections(user.id),
      getUserTradingMode(user.id),
    ]);

    return ok({
      tradingMode,
      connections: connections.map((c) => ({
        id: c.id,
        broker: c.broker,
        mode: c.mode,
        display_name: c.display_name,
        account_id: c.account_id,
        account_currency: c.account_currency,
        account_type: c.account_type,
        is_active: c.is_active,
        last_tested_at: c.last_tested_at,
        last_sync_at: c.last_sync_at,
        created_at: c.created_at,
        updated_at: c.updated_at,
      })),
    });
  } catch (error) {
    return unauthorized(
      error instanceof Error ? error.message : "Unauthorized"
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const mode = body.mode as TradingMode;
    const apiKey = String(body.apiKey || "").trim();
    const apiSecret = String(body.apiSecret || "").trim();

    if (!mode || !["paper", "live"].includes(mode)) {
      return badRequest("Mode must be paper or live.");
    }

    if (!apiKey || !apiSecret) {
      return badRequest("API key and API secret are required.");
    }

    const payload = {
      user_id: user.id,
      broker: "trading212",
      mode,
      api_key_encrypted: encryptString(apiKey),
      api_secret_encrypted: encryptString(apiSecret),
      is_active: true,
    };

    const { data, error } = await supabaseAdmin
      .from("broker_connections")
      .upsert(payload, { onConflict: "user_id,broker,mode" })
      .select("id, broker, mode, is_active, created_at, updated_at")
      .single();

    if (error) {
      return serverError(error.message);
    }

    return ok({ success: true, connection: data });
  } catch (error) {
    return serverError(
      error instanceof Error ? error.message : "Failed to save connection."
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") as TradingMode | null;

    if (!mode || !["paper", "live"].includes(mode)) {
      return badRequest("Mode must be paper or live.");
    }

    const { error } = await supabaseAdmin
      .from("broker_connections")
      .delete()
      .eq("user_id", user.id)
      .eq("broker", "trading212")
      .eq("mode", mode);

    if (error) {
      return serverError(error.message);
    }

    return ok({ success: true });
  } catch (error) {
    return serverError(
      error instanceof Error ? error.message : "Failed to delete connection."
    );
  }
}
