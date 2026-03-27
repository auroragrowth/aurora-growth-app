"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { encryptString } from "@/lib/security/encryption";

const BASE_URL = "https://live.trading212.com/api/v0";

type ConnectResult = {
  ok: boolean;
  error?: string;
};

async function verifyTrading212Key(apiKey: string) {
  const res = await fetch(`${BASE_URL}/equity/account/info`, {
    method: "GET",
    headers: { Authorization: apiKey, Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Trading 212 request failed (${res.status})`);
  }

  return res.json();
}

export async function connectTrading212(
  formData: FormData
): Promise<ConnectResult> {
  const apiKey = String(formData.get("apiKey") || "").trim();
  const apiSecret = String(formData.get("apiSecret") || "").trim();

  if (!apiKey) {
    return { ok: false, error: "API key is required." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: "You must be logged in." };
  }

  try {
    const account = await verifyTrading212Key(apiKey);

    const payload = {
      user_id: user.id,
      broker: "trading212",
      api_key_encrypted: encryptString(apiKey),
      api_key: apiKey,
      api_secret_encrypted: apiSecret ? encryptString(apiSecret) : null,
      is_active: true,
      is_connected: true,
      display_name: "Trading 212",
      account_currency: account?.currencyCode?.toString?.() || "GBP",
      account_id: account?.id?.toString?.() || null,
      account_type: "live",
      last_tested_at: new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
      last_error: null,
    };

    const { error } = await supabase
      .from("trading212_connections")
      .upsert(payload, { onConflict: "user_id,broker" });

    if (error) {
      return { ok: false, error: error.message };
    }

    await supabaseAdmin
      .from("profiles")
      .update({ trading212_connected: true })
      .eq("id", user.id);

    revalidatePath("/dashboard/account");
    revalidatePath("/dashboard/connections");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not connect Trading 212.",
    };
  }
}

export async function disconnectTrading212(): Promise<ConnectResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: "You must be logged in." };
  }

  try {
    const { error } = await supabase
      .from("trading212_connections")
      .update({ is_active: false, is_connected: false })
      .eq("user_id", user.id)
      .eq("broker", "trading212");

    if (error) {
      return { ok: false, error: error.message };
    }

    await supabaseAdmin
      .from("profiles")
      .update({ trading212_connected: false })
      .eq("id", user.id);

    revalidatePath("/dashboard/account");
    revalidatePath("/dashboard/connections");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not disconnect Trading 212.",
    };
  }
}
