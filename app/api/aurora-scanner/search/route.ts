import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 15 * 60 * 1000;

type CacheEntry = { rows: any[]; ts: number };
const cache = new Map<string, CacheEntry>();

function pruneCache() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.ts > CACHE_TTL_MS) cache.delete(key);
  }
}

function clean(text: string) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNum(value: string) {
  if (!value) return 0;
  const v = value.replace(/[%,$,+]/g, "").trim();
  if (v === "-" || v === "N/A" || v === "") return 0;
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
}

function parseMktCap(value: string) {
  if (!value) return 0;
  const v = value.replace(/[$,]/g, "").trim();
  if (v.endsWith("T")) return parseFloat(v) * 1_000_000_000_000;
  if (v.endsWith("B")) return parseFloat(v) * 1_000_000_000;
  if (v.endsWith("M")) return parseFloat(v) * 1_000_000;
  if (v.endsWith("K")) return parseFloat(v) * 1_000;
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
}

async function searchMarket(term: string) {
  const cacheKey = term.toUpperCase();

  pruneCache();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.rows;
  }

  const url = `https://finviz.com/screener.ashx?v=111&t=${encodeURIComponent(term)}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": "en-GB,en;q=0.9",
      Referer: "https://finviz.com/",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const rows: any[] = [];

  $("table tr").each((_, tr) => {
    const cells = $(tr).find("td");
    if (cells.length < 11) return;

    const ticker = clean($(cells[1]).text());
    const company = clean($(cells[2]).text());

    if (!ticker || !company) return;
    if (ticker === "Ticker" || company === "Company") return;
    if (!/^[A-Z.\-]{1,8}$/.test(ticker)) return;

    rows.push({
      ticker,
      company_name: company,
      sector: clean($(cells[3]).text()),
      industry: clean($(cells[4]).text()),
      country: clean($(cells[5]).text()),
      market_cap: parseMktCap(clean($(cells[6]).text())),
      price: parseNum(clean($(cells[8]).text())),
      change_percent: parseNum(clean($(cells[9]).text())),
      score: null,
      trend: "flat",
      scanner_type: "search",
      updated_at: new Date().toISOString(),
    });
  });

  cache.set(cacheKey, { rows, ts: Date.now() });

  return rows;
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim();

    if (!q) {
      return NextResponse.json(
        { ok: false, error: "q parameter is required", rows: [] },
        { status: 400 }
      );
    }

    const rows = await searchMarket(q);

    return NextResponse.json({ ok: true, rows });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Search failed", rows: [] },
      { status: 500 }
    );
  }
}
