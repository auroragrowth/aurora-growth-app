import { NextResponse } from "next/server";
import { decryptString, toBasicAuthHeader } from "@/lib/security/encryption";
import { getTrading212ConnectionForUser } from "@/lib/trading212/server";

const TRADING212_BASE =
  process.env.TRADING212_BASE_URL || "https://live.trading212.com/api/v0";

type CachedPositions = {
  connected: boolean;
  positions: any[];
  connection: any;
  cachedAt: number;
};

const CACHE_TTL_MS = 30000;

declare global {
  // eslint-disable-next-line no-var
  var __auroraTrading212PositionsCache: CachedPositions | undefined;
}

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

function getCache() {
  const cache = globalThis.__auroraTrading212PositionsCache;
  if (!cache) return null;

  const isFresh = Date.now() - cache.cachedAt < CACHE_TTL_MS;
  return {
    ...cache,
    isFresh,
  };
}

export async function GET() {
  const cached = getCache();

  if (cached?.isFresh) {
    return NextResponse.json({
      ok: true,
      connected: cached.connected,
      cached: true,
      stale: false,
      connection: cached.connection,
      positions: cached.positions,
    });
  }

  const connection = await getTrading212ConnectionForUser();

  if (!connection?.api_key_encrypted || !connection?.api_secret_encrypted) {
    return NextResponse.json(
      {
        ok: false,
        connected: false,
        error: "Trading 212 connection not configured",
        connection: sanitizeConnection(connection),
        positions: [],
      },
      { status: 404 }
    );
  }

  try {
    const apiKey = decryptString(connection.api_key_encrypted);
    const apiSecret = decryptString(connection.api_secret_encrypted);

    const res = await fetch(`${TRADING212_BASE}/equity/portfolio`, {
      method: "GET",
      headers: {
        Authorization: toBasicAuthHeader(apiKey, apiSecret),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await res.text();
    const parsed = text ? JSON.parse(text) : [];
    const positions = Array.isArray(parsed) ? parsed : [];

    if (res.status === 429 && cached) {
      return NextResponse.json({
        ok: true,
        connected: true,
        cached: true,
        stale: true,
        warning: "Rate limited - using cached Trading 212 positions",
        connection: cached.connection,
        positions: cached.positions,
      });
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          connected: true,
          error:
            Array.isArray(parsed)
              ? `Trading 212 positions request failed (${res.status})`
              : parsed?.message ||
                parsed?.error ||
                text ||
                `Trading 212 positions request failed (${res.status})`,
          connection: sanitizeConnection(connection),
          positions: [],
        },
        { status: res.status }
      );
    }

    globalThis.__auroraTrading212PositionsCache = {
      connected: true,
      positions,
      connection: sanitizeConnection(connection),
      cachedAt: Date.now(),
    };

    return NextResponse.json({
      ok: true,
      connected: true,
      cached: false,
      stale: false,
      connection: sanitizeConnection(connection),
      positions,
    });
  } catch (error) {
    const stale = getCache();

    if (stale) {
      return NextResponse.json({
        ok: true,
        connected: stale.connected,
        cached: true,
        stale: true,
        warning: "Using cached Trading 212 positions due to request error",
        connection: stale.connection,
        positions: stale.positions,
      });
    }

    return NextResponse.json(
      {
        ok: false,
        connected: true,
        error:
          error instanceof Error
            ? error.message
            : "Trading 212 positions request failed",
        connection: sanitizeConnection(connection),
        positions: [],
      },
      { status: 500 }
    );
  }
}
