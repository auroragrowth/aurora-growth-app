import { badRequest, ok, serverError, unauthorized } from "@/lib/api/json";
import { encryptString } from "@/lib/security/encryption";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getCurrentUser,
  getActiveMode,
  getUserConnection,
  getUserConnections,
  sanitizeConnection,
  getBaseUrl,
} from "@/lib/trading212/connections";
import type { BrokerMode } from "@/lib/trading212/types";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    const url = new URL(req.url);
    const queryMode = url.searchParams.get("mode");

    if (queryMode === "all") {
      const connections = await getUserConnections(user.id);
      return ok({
        connections: connections.map((c) =>
          sanitizeConnection(c as unknown as Record<string, unknown>)
        ),
        activeMode: await getActiveMode(user.id),
      });
    }

    const connection = await getUserConnection(user.id, (queryMode as BrokerMode) || undefined);
    return ok({
      connection: connection
        ? sanitizeConnection(connection as unknown as Record<string, unknown>)
        : null,
      activeMode: await getActiveMode(user.id),
    });
  } catch (error) {
    return unauthorized(error instanceof Error ? error.message : "Unauthorized");
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const apiKey = String(body.apiKey || "").trim();
    const apiSecret = String(body.apiSecret || "").trim();
    const mode: BrokerMode = body.mode === "demo" ? "demo" : "live";

    if (!apiKey) {
      return badRequest("API key is required.");
    }

    const baseUrl = getBaseUrl(mode);

    const payload = {
      user_id: user.id,
      broker: "trading212",
      mode,
      base_url: baseUrl,
      api_key_encrypted: encryptString(apiKey),
      api_key: apiKey,
      api_secret_encrypted: apiSecret ? encryptString(apiSecret) : null,
      is_active: true,
    };

    const { data, error } = await supabaseAdmin
      .from("trading212_connections")
      .upsert(payload, { onConflict: "user_id,broker,mode" })
      .select("id, broker, mode, is_active, created_at, updated_at")
      .single();

    if (error) {
      return serverError(error.message);
    }

    // Verify against Trading 212 API
    try {
      const authValue = apiSecret
        ? `Basic ${Buffer.from(`${apiKey}:${apiSecret}`, "utf8").toString("base64")}`
        : apiKey;

      const res = await fetch(`${baseUrl}/equity/account/info`, {
        method: "GET",
        headers: { Authorization: authValue, Accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const errMsg = text || `Trading 212 verification failed (${res.status})`;

        await supabaseAdmin
          .from("trading212_connections")
          .update({ is_connected: false, last_error: errMsg, last_tested_at: new Date().toISOString() })
          .eq("id", data.id);

        return ok({ success: true, verified: false, error: errMsg, connection: data });
      }

      const account = await res.json();

      await supabaseAdmin
        .from("trading212_connections")
        .update({
          is_connected: true,
          account_id: account?.id?.toString() || null,
          account_currency: account?.currencyCode || null,
          account_type: mode,
          display_name: `Trading 212 ${mode === "demo" ? "Demo" : "Live"}`,
          last_tested_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", data.id);

      await supabaseAdmin
        .from("profiles")
        .update({ trading212_connected: true })
        .eq("id", user.id);

      return ok({ success: true, verified: true, connection: data });
    } catch (verifyErr) {
      const errMsg = verifyErr instanceof Error ? verifyErr.message : "Verification failed";

      await supabaseAdmin
        .from("trading212_connections")
        .update({ is_connected: false, last_error: errMsg, last_tested_at: new Date().toISOString() })
        .eq("id", data.id);

      return ok({ success: true, verified: false, error: errMsg, connection: data });
    }
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Failed to save connection.");
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") as BrokerMode | null;

    const q = supabaseAdmin
      .from("trading212_connections")
      .delete()
      .eq("user_id", user.id)
      .eq("broker", "trading212");

    if (mode) q.eq("mode", mode);

    const { error } = await q;

    if (error) {
      return serverError(error.message);
    }

    // Check if any connections remain
    const remaining = await getUserConnections(user.id);
    if (remaining.length === 0) {
      await supabaseAdmin
        .from("profiles")
        .update({ trading212_connected: false })
        .eq("id", user.id);
    }

    return ok({ success: true });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Failed to delete connection.");
  }
}
