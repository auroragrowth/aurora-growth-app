import { NextResponse } from "next/server";
import {
  fetchTrading212Summary,
  getTrading212ConnectionForUser,
} from "@/lib/trading212/server";

type CachedAccount = {
  connected: boolean;
  data: any;
  connection: any;
  cachedAt: number;
};

const CACHE_TTL_MS = 30000;

declare global {
  // eslint-disable-next-line no-var
  var __auroraTrading212AccountCache: CachedAccount | undefined;
}

function getCache() {
  const cache = globalThis.__auroraTrading212AccountCache;
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
      data: cached.data,
    });
  }

  try {
    const result = await fetchTrading212Summary();

    globalThis.__auroraTrading212AccountCache = {
      connected: result.connected,
      data: result.summary,
      connection: result.connection,
      cachedAt: Date.now(),
    };

    return NextResponse.json({
      ok: true,
      connected: result.connected,
      cached: false,
      stale: false,
      connection: result.connection,
      data: result.summary,
    });
  } catch (error) {
    const stale = getCache();

    if (stale) {
      return NextResponse.json({
        ok: true,
        connected: stale.connected,
        cached: true,
        stale: true,
        warning: "Using cached Trading 212 account data",
        connection: stale.connection,
        data: stale.data,
      });
    }

    const connection = await getTrading212ConnectionForUser();

    return NextResponse.json(
      {
        ok: false,
        connected: Boolean(connection?.is_active),
        error:
          error instanceof Error
            ? error.message
            : "Trading 212 account request failed",
        connection,
        data: null,
      },
      { status: 500 }
    );
  }
}
