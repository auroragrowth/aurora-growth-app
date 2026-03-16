import dotenv from "dotenv";
dotenv.config({ path: "/var/www/aurora-app/.env.production" });

import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

console.log("Scanner started");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing");
}

if (!supabaseKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const FILTERS =
  "cap_midover,fa_curratio_o2,fa_debteq_u0.4,fa_epsyoy_o10,fa_epsyoy1_o10,fa_estltgrowth_o10,fa_peg_u2,fa_quickratio_o1,fa_roa_o10,fa_roe_o10,fa_roi_o10,sh_instown_o30";

const COLUMNS =
  "0,1,2,6,78,17,18,20,32,33,34,36,35,38,9,28,3,31";

function clean(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function parseNumber(value) {
  if (!value) return 0;

  const v = String(value).replace(/[%,$]/g, "").trim();

  if (v === "-" || v === "N/A") return 0;
  if (v.endsWith("B")) return parseFloat(v) * 1000;
  if (v.endsWith("M")) return parseFloat(v);
  if (v.endsWith("K")) return parseFloat(v) / 1000;

  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
}

function scoreRow(row) {
  const peg = parseNumber(row.peg);
  const roe = parseNumber(row.roe);
  const roa = parseNumber(row.roa);
  const epsThisY = parseNumber(row.epsThisY);
  const epsNextY = parseNumber(row.epsNextY);
  const epsPast5Y = parseNumber(row.epsPast5Y);
  const salesPast5Y = parseNumber(row.salesPast5Y);

  let score = 0;

  if (peg > 0) {
    if (peg <= 1) score += 25;
    else if (peg <= 1.5) score += 20;
    else if (peg <= 2) score += 12;
  }

  if (roe >= 25) score += 20;
  else if (roe >= 15) score += 14;
  else if (roe >= 10) score += 8;

  if (roa >= 15) score += 15;
  else if (roa >= 10) score += 10;
  else if (roa >= 5) score += 5;

  if (epsThisY >= 25) score += 10;
  else if (epsThisY >= 10) score += 6;

  if (epsNextY >= 20) score += 10;
  else if (epsNextY >= 10) score += 6;

  if (epsPast5Y >= 20) score += 10;
  else if (epsPast5Y >= 10) score += 6;

  if (salesPast5Y >= 20) score += 10;
  else if (salesPast5Y >= 10) score += 6;

  return Math.min(100, score);
}

async function fetchPage(page = 1) {
  console.log(`Fetching page ${page}...`);

  const start = (page - 1) * 20 + 1;
  const finvizUrl =
    `https://finviz.com/screener.ashx?v=150&f=${FILTERS}&o=-marketcap&c=${COLUMNS}&r=${start}`;

  const res = await fetch(finvizUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": "en-GB,en;q=0.9",
      "Referer": "https://finviz.com/",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Finviz fetch failed: ${res.status}`);
  }

  const html = await res.text();

  console.log(`Page ${page} HTML length: ${html.length}`);
  console.log(html.slice(0, 300));

  const $ = cheerio.load(html);
  const rows = [];

  $("table tr").each((_, tr) => {
    const cells = $(tr).find("td");

    if (cells.length < 18) return;

    const ticker = clean($(cells[1]).text());
    const company = clean($(cells[2]).text());
    const sector = clean($(cells[3]).text());

    if (!ticker || !company) return;
    if (ticker === "Ticker" || company === "Company") return;
    if (!/^[A-Z.\-]{1,6}$/.test(ticker)) return;
    if (company.length > 80) return;
    if (sector.length > 40) return;

    rows.push({
      ticker,
      company,
      sector,
      industry: clean($(cells[4]).text()),
      country: clean($(cells[5]).text()),
      marketCap: clean($(cells[6]).text()),
      pe: clean($(cells[7]).text()),
      fwdPe: clean($(cells[8]).text()),
      peg: clean($(cells[9]).text()),
      epsThisY: clean($(cells[10]).text()),
      epsNextY: clean($(cells[11]).text()),
      epsPast5Y: clean($(cells[12]).text()),
      salesPast5Y: clean($(cells[13]).text()),
      roe: clean($(cells[14]).text()),
      roa: clean($(cells[15]).text()),
      price: clean($(cells[16]).text()),
      change: clean($(cells[17]).text()),
    });
  });

  console.log(`Page ${page}: parsed ${rows.length} clean rows`);
  return rows;
}

async function run() {
  console.log("Running daily scan...");

  const today = new Date().toISOString().slice(0, 10);

  const firstPage = await fetchPage(1);
  const secondPage = await fetchPage(2);

  const combined = [...firstPage, ...secondPage];

  console.log(`Combined rows before scoring: ${combined.length}`);

  const scored = combined
    .map((row) => ({
      ...row,
      auroraScore: scoreRow(row),
    }))
    .sort((a, b) => b.auroraScore - a.auroraScore)
    .slice(0, 20)
    .map((row, index) => ({
      scan_date: today,
      rank: index + 1,
      ticker: row.ticker,
      company: row.company,
      sector: row.sector,
      industry: row.industry,
      country: row.country,
      market_cap: row.marketCap,
      pe: row.pe,
      fwd_pe: row.fwdPe,
      peg: row.peg,
      eps_this_y: row.epsThisY,
      eps_next_y: row.epsNextY,
      eps_past_5y: row.epsPast5Y,
      sales_past_5y: row.salesPast5Y,
      roe: row.roe,
      roa: row.roa,
      price: row.price,
      change: row.change,
      aurora_score: row.auroraScore,
    }));

  console.log(`Rows to save: ${scored.length}`);
  console.log(scored.slice(0, 3));

  const { error: deleteError } = await supabase
    .from("daily_stock_scans")
    .delete()
    .eq("scan_date", today);

  if (deleteError) {
    throw deleteError;
  }

  if (scored.length === 0) {
    console.log(`Saved 0 ranked stocks for ${today}`);
    return;
  }

  const { error: insertError } = await supabase
    .from("daily_stock_scans")
    .insert(scored);

  if (insertError) {
    throw insertError;
  }

  console.log(`Saved ${scored.length} ranked stocks for ${today}`);
}

run().catch((err) => {
  console.error("Scanner failed:");
  console.error(err);
  process.exit(1);
});
