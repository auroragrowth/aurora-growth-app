import { decryptString, toBasicAuthHeader } from "@/lib/security/encryption";
import type { BrokerConnectionRecord } from "@/lib/trading212/types";
import { TRADING212_BASE_URL } from "@/lib/trading212/connections";

export function getTrading212AuthHeader(connection: BrokerConnectionRecord): string {
  let apiKey = "";
  let apiSecret = "";

  // Decrypt API key
  if (connection.api_key_encrypted) {
    try {
      const decrypted = decryptString(connection.api_key_encrypted);
      if (decrypted && decrypted.length > 5) {
        apiKey = decrypted;
      }
    } catch (err) {
      console.error("[Trading212] Key decryption failed:", err instanceof Error ? err.message : err);
      throw new Error("Broker key decryption failed — please reconnect your broker account");
    }
    if (!apiKey) {
      throw new Error("Broker key decryption failed — please reconnect your broker account");
    }
  } else if (connection.api_key && connection.api_key.length > 5) {
    // Legacy plaintext fallback — only when no encrypted key exists
    apiKey = connection.api_key;
  }

  if (!apiKey) {
    throw new Error("No broker API key found — please reconnect your broker account");
  }

  // Decrypt API secret (if present)
  if (connection.api_secret_encrypted) {
    try {
      apiSecret = decryptString(connection.api_secret_encrypted);
    } catch (err) {
      console.error("[Trading212] Secret decryption failed:", err instanceof Error ? err.message : err);
      throw new Error("Broker secret decryption failed — please reconnect your broker account");
    }
  }

  // Use Basic Auth when we have both key and secret, otherwise plain key
  if (apiSecret) {
    return toBasicAuthHeader(apiKey, apiSecret);
  }
  return apiKey;
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
