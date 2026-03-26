"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { encryptString, toBasicAuthHeader } from "@/lib/security/encryption";
import { getUserTradingMode } from "@/lib/trading212/connections";

type ConnectResult = {
  ok: boolean;
  error?: string;
};

const TRADING212_BASE =
  process.env.TRADING212_BASE_URL || "https://live.trading212.com/api/v0";

async function getTrading212AccountSummary(apiKey: string, apiSecret: string) {
  const res = await fetch(`${TRADING212_BASE}/equity/account/summary`, {
    method: "GET",
    headers: {
      Authorization: toBasicAuthHeader(apiKey, apiSecret),
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
    const [account, mode] = await Promise.all([
      getTrading212AccountSummary(apiKey, apiSecret),
      getUserTradingMode(user.id),
    ]);

    const payload = {
      user_id: user.id,
      broker: "trading212",
      mode,
      api_key_encrypted: encryptString(apiKey),
      api_secret_encrypted: encryptString(apiSecret),
      is_active: true,
      display_name:
        account?.accountId?.toString?.() ||
        account?.accountId ||
        "Trading 212",
      account_currency:
        account?.currencyCode?.toString?.() ||
        account?.currency?.toString?.() ||
        "GBP",
      last_sync_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("broker_connections")
      .upsert(payload, { onConflict: "user_id,broker,mode" });

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

  try {
    const mode = await getUserTradingMode(user.id);

    const { error } = await supabase
      .from("broker_connections")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("broker", "trading212")
      .eq("mode", mode);

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
          : "Could not disconnect Trading 212.",
    };
  }
}
