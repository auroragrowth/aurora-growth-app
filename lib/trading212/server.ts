import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptString, toBasicAuthHeader } from "@/lib/security/encryption";
import { getCurrentUser, getUserConnectionByMode, getUserTradingMode } from "@/lib/trading212/connections";
import type { TradingMode } from "@/lib/trading212/types";

const TRADING212_BASE =
  process.env.TRADING212_BASE_URL || "https://live.trading212.com/api/v0";

export type Trading212Summary = {
  accountId?: string | number | null;
  currencyCode?: string | null;
  freeCash?: number | null;
  invested?: number | null;
  result?: number | null;
  total?: number | null;
};

function sanitizeConnection(connection: any) {
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

export async function getTrading212ConnectionForUser() {
  const user = await getCurrentUser();
  const mode = await getUserTradingMode(user.id);
  const connection = await getUserConnectionByMode(user.id, mode);

  return connection || null;
}

export async function fetchTrading212Summary(): Promise<{
  connected: boolean;
  summary: Trading212Summary | null;
  connection: any;
}> {
  const connection = await getTrading212ConnectionForUser();

  if (!connection?.api_key_encrypted || !connection?.api_secret_encrypted) {
    return {
      connected: false,
      summary: null,
      connection: sanitizeConnection(connection),
    };
  }

  const apiKey = decryptString(connection.api_key_encrypted);
  const apiSecret = decryptString(connection.api_secret_encrypted);

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
    throw new Error(text || `Trading 212 summary failed (${res.status})`);
  }

  const summary = (await res.json()) as Trading212Summary;

  return {
    connected: true,
    summary,
    connection: sanitizeConnection(connection),
  };
}
