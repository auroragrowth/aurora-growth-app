import { NextResponse } from "next/server";
import {
  fetchTrading212Summary,
  getTrading212ConnectionForUser,
} from "@/lib/trading212/server";
import { sanitizeConnection } from "@/lib/trading212/connections";

type CachedOverview = {
  connected: boolean;
  overview: {
    portfolio_value: number;
    total_value: number;
    total_cost: number;
    total_pnl: number;
    total_return_pct: number;
    today_change: number;
    open_value: number;
    positions_count: number;
    free_cash: number;
    invested: number;
  };
  connection: Record<string, unknown> | null;
  cachedAt: number;
};

const CACHE_TTL_MS = 30000;

declare global {
  // eslint-disable-next-line no-var
  var __auroraTrading212OverviewCache: CachedOverview | undefined;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getCache() {
  const cache = globalThis.__auroraTrading212OverviewCache;
  if (!cache) return null;

  const isFresh = Date.now() - cache.cachedAt < CACHE_TTL_MS;
  return {
    ...cache,
    isFresh,
  };
}

export async function GET() {
  // Cache disabled — mode switching requires fresh data each time
  if (false && getCache()?.isFresh) {
    const cached = getCache()!;
    return NextResponse.json({
      ok: true,
      connected: cached.connected,
      cached: true,
      stale: false,
      connection: cached.connection,
      overview: cached.overview,
    });
  }

  try {
    const result = await fetchTrading212Summary();
    const summary = result.summary;

    const freeCash = toNumber(summary?.free);
    const invested = toNumber(summary?.invested);
    const totalPnl = toNumber(summary?.ppl ?? summary?.result);
    const totalValue = toNumber(summary?.total);

    const portfolioValue = totalValue || invested + totalPnl;
    const totalCost = invested;
    const totalReturnPct =
      totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    const overview = {
      portfolio_value: portfolioValue,
      total_value: totalValue || portfolioValue,
      total_cost: totalCost,
      total_pnl: totalPnl,
      total_return_pct: totalReturnPct,
      today_change: 0,
      open_value: portfolioValue,
      positions_count: 0,
      free_cash: freeCash,
      invested,
    };

    globalThis.__auroraTrading212OverviewCache = {
      connected: result.connected,
      overview,
      connection: result.connection,
      cachedAt: Date.now(),
    };

    return NextResponse.json({
      ok: true,
      connected: result.connected,
      cached: false,
      stale: false,
      connection: result.connection,
      overview,
    });
  } catch (error) {
    const stale = getCache();

    if (stale) {
      return NextResponse.json({
        ok: true,
        connected: stale.connected,
        cached: true,
        stale: true,
        warning: "Using cached Trading 212 overview data",
        connection: stale.connection,
        overview: stale.overview,
      });
    }

    const connection = await getTrading212ConnectionForUser();

    return NextResponse.json(
      {
        ok: false,
        connected: Boolean(connection?.is_connected),
        error:
          error instanceof Error
            ? error.message
            : "Trading 212 overview request failed",
        connection: sanitizeConnection(connection as unknown as Record<string, unknown>),
        overview: null,
      },
      { status: 500 }
    );
  }
}
