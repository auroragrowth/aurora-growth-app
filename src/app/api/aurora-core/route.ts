import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRESET_QUERY =
  "v=150&f=cap_midover,fa_curratio_o2,fa_debteq_u0.4,fa_epsyoy_o10,fa_epsyoy1_o10,fa_estltgrowth_o10,fa_peg_u2,fa_quickratio_o1,fa_roa_o10,fa_roe_o10,fa_roi_o10,sh_instown_o30&o=-marketcap&c=0,1,2,6,78,17,18,20,32,33,34,36,35,38,9,28,3";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36";

function clean(s: string) {
  return (s || "").replace(/\s+/g, " ").trim();
}

export async function GET() {
  const url = `https://finviz.com/screener.ashx?${PRESET_QUERY}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: `Finviz fetch failed: ${res.status}` },
      { status: 502 }
    );
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  // Finviz uses screener_table class for the results table
  const table = $("table.screener_table").first();
  if (!table.length) {
    return NextResponse.json(
      { ok: false, error: "Could not find Finviz screener_table (markup changed?)" },
      { status: 502 }
    );
  }

  const trs = table.find("tr").toArray();
  const headerTds = $(trs[0]).find("td").toArray().map((td) => clean($(td).text()));

  const results = trs
    .slice(1)
    .map((tr) => {
      const row = $(tr);

      const ticker =
        clean(row.find("a.screener-link-primary").first().text()) ||
        clean(row.find("a.screener-link").first().text());

      if (!ticker) return null;

      const cols = row.find("td").toArray().map((td) => clean($(td).text()));

      return { ticker, cols };
    })
    .filter(Boolean);

  return NextResponse.json({
    ok: true,
    engine: "Aurora Core",
    source: "Finviz",
    preset: PRESET_QUERY,
    url,
    count: results.length,
    header: headerTds,
    results,
  });
}
