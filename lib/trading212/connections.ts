import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { BrokerConnectionRecord, BrokerMode } from "@/lib/trading212/types";

export const LIVE_BASE_URL = "https://live.trading212.com/api/v0";
export const DEMO_BASE_URL = "https://demo.trading212.com/api/v0";

/** @deprecated Use getBaseUrl(mode) instead */
export const TRADING212_BASE_URL = LIVE_BASE_URL;

export function getBaseUrl(mode: BrokerMode): string {
  return mode === "demo" ? DEMO_BASE_URL : LIVE_BASE_URL;
}

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Not authenticated");
  }

  return data.user;
}

export async function getActiveMode(userId: string): Promise<BrokerMode> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("active_broker_mode")
    .eq("id", userId)
    .maybeSingle();

  return (data?.active_broker_mode === "demo" ? "demo" : "live") as BrokerMode;
}

export async function getUserConnection(userId: string, mode?: BrokerMode) {
  const resolvedMode = mode ?? await getActiveMode(userId);

  const { data, error } = await supabaseAdmin
    .from("trading212_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("broker", "trading212")
    .eq("is_active", true)
    .eq("mode", resolvedMode)
    .maybeSingle();

  if (error) throw error;
  return data as BrokerConnectionRecord | null;
}

export async function getUserConnections(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("trading212_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("broker", "trading212")
    .eq("is_active", true)
    .order("mode", { ascending: true });

  if (error) throw error;
  return (data || []) as BrokerConnectionRecord[];
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
