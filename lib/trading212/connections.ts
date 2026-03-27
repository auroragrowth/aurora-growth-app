import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { BrokerConnectionRecord } from "@/lib/trading212/types";

const BASE_URL = "https://live.trading212.com/api/v0";

export { BASE_URL as TRADING212_BASE_URL };

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Not authenticated");
  }

  return data.user;
}

export async function getUserConnection(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("trading212_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("broker", "trading212")
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data as BrokerConnectionRecord | null;
}

/**
 * Strip sensitive fields before returning connection data to the client.
 */
export function sanitizeConnection(connection: Record<string, unknown> | null) {
  if (!connection) return null;

  const {
    api_key,
    api_secret,
    api_key_encrypted,
    api_secret_encrypted,
    access_token,
    refresh_token,
    ...safe
  } = connection;

  return safe;
}
