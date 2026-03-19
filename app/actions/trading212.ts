"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ConnectResult = {
  ok: boolean;
  error?: string;
};

const TRADING212_BASE =
  process.env.TRADING212_BASE_URL || "https://live.trading212.com/api/v0";

async function getTrading212AccountSummary(apiKey: string, apiSecret: string) {
  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  const res = await fetch(`${TRADING212_BASE}/equity/account/summary`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    },
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

  if (!apiKey || !apiSecret) {
    return { ok: false, error: "API key and API secret are required." };
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
    const account = await getTrading212AccountSummary(apiKey, apiSecret);

    const payload = {
      user_id: user.id,
      broker: "trading212",
      api_key: apiKey,
      api_secret: apiSecret,
      is_connected: true,
      account_name:
        account?.accountId?.toString?.() ||
        account?.accountId ||
        "Trading 212",
      account_currency:
        account?.currencyCode?.toString?.() ||
        account?.currency?.toString?.() ||
        "GBP",
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("user_broker_connections")
      .upsert(payload, { onConflict: "user_id,broker" });

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath("/dashboard/account");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not connect Trading 212.",
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

  const { error } = await supabase
    .from("user_broker_connections")
    .update({
      api_key: null,
      api_secret: null,
      is_connected: false,
      account_name: null,
      account_currency: null,
      last_sync_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("broker", "trading212");

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/account");
  return { ok: true };
}
