import { badRequest, ok, serverError, unauthorized } from "@/lib/api/json";
import { encryptString } from "@/lib/security/encryption";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentUser, getUserConnection, sanitizeConnection } from "@/lib/trading212/connections";

const BASE_URL = "https://live.trading212.com/api/v0";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const connection = await getUserConnection(user.id);

    return ok({
      connection: connection
        ? sanitizeConnection(connection as unknown as Record<string, unknown>)
        : null,
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

    if (!apiKey) {
      return badRequest("API key is required.");
    }

    const payload = {
      user_id: user.id,
      broker: "trading212",
      api_key_encrypted: encryptString(apiKey),
      api_key: apiKey,
      api_secret_encrypted: apiSecret ? encryptString(apiSecret) : null,
      is_active: true,
    };

    const { data, error } = await supabaseAdmin
      .from("trading212_connections")
      .upsert(payload, { onConflict: "user_id,broker" })
      .select("id, broker, is_active, created_at, updated_at")
      .single();

    if (error) {
      return serverError(error.message);
    }

    // Verify against Trading 212 API
    try {
      const res = await fetch(`${BASE_URL}/equity/account/info`, {
        method: "GET",
        headers: { Authorization: apiKey, Accept: "application/json" },
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
          account_type: "live",
          display_name: "Trading 212",
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

export async function DELETE() {
  try {
    const user = await getCurrentUser();

    const { error } = await supabaseAdmin
      .from("trading212_connections")
      .delete()
      .eq("user_id", user.id)
      .eq("broker", "trading212");

    if (error) {
      return serverError(error.message);
    }

    await supabaseAdmin
      .from("profiles")
      .update({ trading212_connected: false })
      .eq("id", user.id);

    return ok({ success: true });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Failed to delete connection.");
  }
}
