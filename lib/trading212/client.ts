import { decryptString } from "@/lib/security/encryption";
import type { BrokerConnectionRecord } from "@/lib/trading212/types";
import { TRADING212_BASE_URL } from "@/lib/trading212/connections";

export function getTrading212AuthHeader(connection: BrokerConnectionRecord): string {
  try {
    const decrypted = decryptString(connection.api_key_encrypted);
    if (decrypted && decrypted.length > 5) return decrypted;
  } catch (err) {
    console.error("[Trading212] Decryption failed:", err instanceof Error ? err.message : err);
  }

  if (connection.api_key && connection.api_key.length > 5) {
    return connection.api_key;
  }

  throw new Error("Cannot resolve Trading 212 API key");
}

export async function trading212Fetch<T>(
  connection: BrokerConnectionRecord,
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${TRADING212_BASE_URL}${path}`;
  const authHeader = getTrading212AuthHeader(connection);

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trading212 error ${res.status}: ${text}`);
  }

  if (res.status === 204) return null as T;

  return res.json() as Promise<T>;
}
