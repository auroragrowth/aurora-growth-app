import { NextResponse } from "next/server";
import { getTrading212ConnectionForUser } from "@/lib/trading212/server";
import { trading212Fetch, getTrading212AuthHeader } from "@/lib/trading212/client";
import { getBaseUrl } from "@/lib/trading212/connections";

export const dynamic = "force-dynamic";

// Cache instruments per mode
const instrumentCache = new Map<string, { data: any[]; cachedAt: number }>();
const CACHE_TTL = 300_000; // 5 min

async function getInstruments(connection: any): Promise<any[]> {
  const mode = connection.mode || "live";
  const cached = instrumentCache.get(mode);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) return cached.data;

  try {
    const baseUrl = connection.base_url || getBaseUrl(mode);
    const auth = getTrading212AuthHeader(connection);
    const res = await fetch(`${baseUrl}/equity/metadata/instruments`, {
      headers: { Authorization: auth },
      cache: "no-store",
    });
    if (!res.ok) return cached?.data || [];
    const data = await res.json();
    const instruments = Array.isArray(data) ? data : [];
    instrumentCache.set(mode, { data: instruments, cachedAt: Date.now() });
    return instruments;
  } catch {
    return cached?.data || [];
  }
}

export async function GET() {
  try {
    const connection = await getTrading212ConnectionForUser();
    if (!connection?.api_key_encrypted || !connection.is_connected) {
      return NextResponse.json({ positions: [], instruments: {} });
    }

    // Fetch positions and instruments in parallel
    const [positions, instruments] = await Promise.all([
      trading212Fetch<any[]>(connection, "/equity/portfolio"),
      getInstruments(connection),
    ]);

    // Build ticker → instrument name map
    const nameMap: Record<string, { shortName: string; name: string; type: string; currencyCode: string }> = {};
    for (const inst of instruments) {
      if (inst.ticker) {
        nameMap[inst.ticker] = {
          shortName: inst.shortName || inst.name || inst.ticker,
          name: inst.name || inst.shortName || inst.ticker,
          type: inst.type || "",
          currencyCode: inst.currencyCode || "USD",
        };
      }
    }

    // Enrich positions with company names
    const enriched = (Array.isArray(positions) ? positions : []).map((p: any) => {
      const ticker = p.ticker || "";
      const meta = nameMap[ticker] || null;
      return {
        ...p,
        companyName: meta?.shortName || meta?.name || ticker.replace(/_US_EQ$|_EQ$/, ""),
        fullName: meta?.name || meta?.shortName || ticker,
        instrumentType: meta?.type || "",
        currencyCode: meta?.currencyCode || "USD",
      };
    });

    return NextResponse.json({ positions: enriched });
  } catch (e) {
    console.error("[T212 Portfolio]", e);
    return NextResponse.json({ positions: [] });
  }
}
