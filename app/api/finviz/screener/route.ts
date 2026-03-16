import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const CORE_QUERY =
  "v=150&f=cap_midover,fa_curratio_o2,fa_debteq_u0.4,fa_epsyoy_o10,fa_epsyoy1_o10,fa_estltgrowth_o10,fa_peg_u2,fa_quickratio_o1,fa_roa_o10,fa_roe_o10,fa_roi_o10,sh_instown_o30&o=-marketcap&c=0,1,2,6,78,17,18,20,32,33,34,36,35,38,9,28,3";

const ALTERNATIVE_QUERY =
  "v=150&f=cap_midover,fa_curratio_o1.5,fa_debteq_u0.5,fa_epsyoy_o10,fa_epsyoy1_o10,fa_estltgrowth_o10,fa_quickratio_o0.5,fa_roa_o5,fa_roe_o5,fa_roi_o5,sh_instown_o30&o=-marketcap&c=0,1,2,6,78,17,18,20,32,33,34,36,35,38,9,28,3";

type ScannerType = "core" | "alternative";

type ScannerRow = {
  ticker: string;
  company: string;
  sector: string;
  industry: string;
  marketCap: string;
  price: string;
  change: string;
};

type CacheEntry = {
  rows: ScannerRow[];
  lastUpdated: number;
  lastUpdatedIso: string;
  refreshing: boolean;
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 mins
const MAX_PAGES = 5; // 100 rows
const PAGE_STEP = 20;

declare global {
  // eslint-disable-next-line no-var
  var __auroraScannerCache:
    | Record<ScannerType, CacheEntry>
    | undefined;
}

const scannerCache: Record<ScannerType, CacheEntry> =
  global.__auroraScannerCache ??
  (global.__auroraScannerCache = {
    core: {
      rows: [],
      lastUpdated: 0,
      lastUpdatedIso: "",
      refreshing: false,
    },
    alternative: {
      rows: [],
      lastUpdated: 0,
      lastUpdatedIso: "",
      refreshing: false,
    },
  });

function getQuery(scanner: ScannerType) {
  return scanner === "alternative" ? ALTERNATIVE_QUERY : CORE_QUERY;
}

async function fetchPage(url: string): Promise<ScannerRow[]> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-GB,en;q=0.9",
      Referer: "https://finviz.com/",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Finviz request failed (${response.status})`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const rows: ScannerRow[] = [];

  $("table.screener_table tr[valign='top']").each((_, el) => {
    const tds = $(el).find("td");

    if (tds.length < 17) return;

    const ticker = $(tds[1]).text().trim();
    const company = $(tds[2]).text().trim();
    const sector = $(tds[3]).text().trim();
    const industry = $(tds[4]).text().trim();
    const marketCap = $(tds[5]).text().trim();
    const price = $(tds[15]).text().trim();
    const change = $(tds[16]).text().trim();

    if (!ticker) return;

    rows.push({
      ticker,
      company,
      sector,
      industry,
      marketCap,
      price,
      change,
    });
  });

  return rows;
}

async function scrapeScanner(scanner: ScannerType): Promise<ScannerRow[]> {
  const query = getQuery(scanner);
  const baseUrl = `https://finviz.com/screener.ashx?${query}`;

  let allRows: ScannerRow[] = [];

  for (let i = 0; i < MAX_PAGES; i++) {
    const start = i * PAGE_STEP + 1;
    const url = `${baseUrl}&r=${start}`;

    const pageRows = await fetchPage(url);
    allRows = [...allRows, ...pageRows];

    if (pageRows.length < PAGE_STEP) {
      break;
    }
  }

  const unique = new Map<string, ScannerRow>();
  for (const row of allRows) {
    unique.set(row.ticker, row);
  }

  return Array.from(unique.values());
}

async function refreshCache(scanner: ScannerType) {
  const entry = scannerCache[scanner];

  if (entry.refreshing) return;

  entry.refreshing = true;

  try {
    const rows = await scrapeScanner(scanner);
    entry.rows = rows;
    entry.lastUpdated = Date.now();
    entry.lastUpdatedIso = new Date(entry.lastUpdated).toISOString();
  } catch (error) {
    console.error(`Scanner refresh failed for ${scanner}:`, error);
  } finally {
    entry.refreshing = false;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scannerParam = searchParams.get("scanner");
    const forceRefresh = searchParams.get("refresh") === "1";

    const scanner: ScannerType =
      scannerParam === "alternative" ? "alternative" : "core";

    const entry = scannerCache[scanner];
    const age = Date.now() - entry.lastUpdated;
    const isExpired = age > CACHE_TTL_MS;
    const hasCache = entry.rows.length > 0;

    if (forceRefresh || (!hasCache && !entry.refreshing)) {
      await refreshCache(scanner);
    } else if (isExpired && !entry.refreshing) {
      void refreshCache(scanner);
    }

    return NextResponse.json(
      {
        scanner,
        count: scannerCache[scanner].rows.length,
        rows: scannerCache[scanner].rows,
        cached: true,
        refreshing: scannerCache[scanner].refreshing,
        cacheAgeMs: Date.now() - scannerCache[scanner].lastUpdated,
        lastUpdated: scannerCache[scanner].lastUpdatedIso,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("Finviz screener route error:", error);

    return NextResponse.json(
      {
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
