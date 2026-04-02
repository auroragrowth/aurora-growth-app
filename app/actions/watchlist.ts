"use server";

import { createClient } from "@/lib/supabase/server";
import { getWatchlistTable } from "@/lib/watchlist/getTable";

async function getTable() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "watchlist_live";
  const { data } = await supabase
    .from("profiles")
    .select("active_broker_mode")
    .eq("id", user.id)
    .maybeSingle();
  return getWatchlistTable(data?.active_broker_mode);
}

export type WatchlistItem = {
  id?: string;
  symbol: string;
  company_name?: string | null;
  created_at?: string | null;
};

function normaliseSymbol(symbol?: string | null) {
  return (symbol || "").trim().toUpperCase();
}

export async function getWatchlistItems(): Promise<WatchlistItem[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const table = await getTable();
  const { data, error } = await supabase
    .from(table)
    .select("id, symbol, company_name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getWatchlistItems error:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    symbol: row.symbol,
    company_name: row.company_name,
    created_at: row.created_at,
  }));
}

export async function addWatchlistItem(
  symbol?: string | null,
  companyName?: string | null
): Promise<{ ok: boolean; message?: string }> {
  const cleanSymbol = normaliseSymbol(symbol);

  if (!cleanSymbol) {
    return { ok: false, message: "Missing symbol" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Not signed in" };
  }

  const table = await getTable();
  const { error } = await supabase.from(table).upsert(
    {
      user_id: user.id,
      symbol: cleanSymbol,
      company_name: companyName?.trim() || null,
    },
    {
      onConflict: "user_id,symbol",
    }
  );

  if (error) {
    console.error("addWatchlistItem error:", error);
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

export async function removeWatchlistItem(
  symbol?: string | null
): Promise<{ ok: boolean; message?: string }> {
  const cleanSymbol = normaliseSymbol(symbol);

  if (!cleanSymbol) {
    return { ok: false, message: "Missing symbol" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Not signed in" };
  }

  const table = await getTable();
  const { error } = await supabase
    .from(table)
    .delete()
    .eq("user_id", user.id)
    .eq("symbol", cleanSymbol);

  if (error) {
    console.error("removeWatchlistItem error:", error);
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

export async function toggleWatchlist(
  symbol?: string | null,
  companyName?: string | null
): Promise<{ ok: boolean; added?: boolean; removed?: boolean; message?: string }> {
  const cleanSymbol = normaliseSymbol(symbol);

  if (!cleanSymbol) {
    return { ok: false, message: "Missing symbol" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Not signed in" };
  }

  const table = await getTable();
  const { data: existing, error: existingError } = await supabase
    .from(table)
    .select("id")
    .eq("user_id", user.id)
    .eq("symbol", cleanSymbol)
    .maybeSingle();

  if (existingError) {
    console.error("toggleWatchlist lookup error:", existingError);
    return { ok: false, message: existingError.message };
  }

  if (existing?.id) {
    const removed = await removeWatchlistItem(cleanSymbol);
    return {
      ok: removed.ok,
      removed: removed.ok,
      message: removed.message,
    };
  }

  const added = await addWatchlistItem(cleanSymbol, companyName);
  return {
    ok: added.ok,
    added: added.ok,
    message: added.message,
  };
}
