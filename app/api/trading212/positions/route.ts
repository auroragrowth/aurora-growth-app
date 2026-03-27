import { NextResponse } from "next/server";
import { getTrading212ConnectionForUser } from "@/lib/trading212/server";
import { trading212Fetch } from "@/lib/trading212/client";
import { sanitizeConnection } from "@/lib/trading212/connections";

type CachedPositions = {
  connected: boolean;
  positions: unknown[];
  connection: Record<string, unknown> | null;
  cachedAt: number;
};

const CACHE_TTL_MS = 30000;

declare global {
  // eslint-disable-next-line no-var
  var __auroraTrading212PositionsCache: CachedPositions | undefined;
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

  if (!connection?.api_key_encrypted || !connection.is_connected) {
    console.log("[Trading212] positions: no active connection found");
    return NextResponse.json(
      {
        ok: false,
        connected: false,
        error: "Trading 212 connection not configured",
        connection: sanitizeConnection(connection as unknown as Record<string, unknown>),
        positions: [],
      },
      { status: 404 }
    );
  }

  try {
    const positions = await trading212Fetch<unknown[]>(connection, "/equity/portfolio");

    const safeConn = sanitizeConnection(connection as unknown as Record<string, unknown>);

    if (!Array.isArray(positions)) {
      return NextResponse.json({
        ok: true,
        connected: true,
        cached: false,
        stale: false,
        connection: safeConn,
        positions: [],
      });
    }

    globalThis.__auroraTrading212PositionsCache = {
      connected: true,
      positions,
      connection: safeConn,
      cachedAt: Date.now(),
    };

    return NextResponse.json({
      ok: true,
      connected: true,
      cached: false,
      stale: false,
      connection: safeConn,
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
        connection: sanitizeConnection(connection as unknown as Record<string, unknown>),
        positions: [],
      },
      { status: 500 }
    );
  }
}
