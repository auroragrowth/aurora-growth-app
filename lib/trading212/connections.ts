import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { BrokerConnectionRecord, TradingMode } from "@/lib/trading212/types";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Not authenticated");
  }

  return data.user;
}

export async function getUserTradingMode(userId: string): Promise<TradingMode> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("trading_mode")
    .eq("id", userId)
    .single();

  if (error || !data?.trading_mode) return "paper";
  return data.trading_mode as TradingMode;
}

export async function setUserTradingMode(userId: string, mode: TradingMode) {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ trading_mode: mode })
    .eq("id", userId);

  if (error) throw error;
}

export async function getUserConnectionByMode(userId: string, mode: TradingMode) {
  const { data, error } = await supabaseAdmin
    .from("broker_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("broker", "trading212")
    .eq("mode", mode)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data as BrokerConnectionRecord | null;
}

export async function getAllUserConnections(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("broker_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("broker", "trading212")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as BrokerConnectionRecord[];
}
