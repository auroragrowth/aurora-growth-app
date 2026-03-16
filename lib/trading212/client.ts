import { decryptString, toBasicAuthHeader } from "@/lib/security/encryption";
import type { BrokerConnectionRecord, TradingMode } from "@/lib/trading212/types";

const BASE_URLS: Record<TradingMode, string> = {
  paper: "https://demo.trading212.com/api/v0",
  live: "https://live.trading212.com/api/v0",
};

export function getTrading212BaseUrl(mode: TradingMode) {
  return BASE_URLS[mode];
}

export function getTrading212AuthHeader(connection: BrokerConnectionRecord) {
  const apiKey = decryptString(connection.api_key_encrypted);
  const apiSecret = decryptString(connection.api_secret_encrypted);
  return toBasicAuthHeader(apiKey, apiSecret);
}

export async function trading212Fetch<T>(
  connection: BrokerConnectionRecord,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${getTrading212BaseUrl(connection.mode)}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: getTrading212AuthHeader(connection),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trading212 error ${res.status}: ${text}`);
  }

  if (res.status === 204) {
    return null as T;
  }

  return res.json() as Promise<T>;
}
