import dotenv from "dotenv";
dotenv.config({ path: "/var/www/aurora-app-dev/.env.local" });

import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing");
if (!supabaseKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");

const supabase = createClient(supabaseUrl, supabaseKey);

const CORE_FILTERS =
  "cap_midover,fa_curratio_o2,fa_debteq_u0.4,fa_epsyoy_o10,fa_epsyoy1_o10,fa_estltgrowth_o10,fa_peg_u2,fa_quickratio_o1,fa_roa_o10,fa_roe_o10,fa_roi_o10,sh_instown_o30";

const ALT_FILTERS =
  "cap_midover,fa_curratio_o1.5,fa_debteq_u0.5,fa_epsyoy_o10,fa_epsyoy1_o10,fa_estltgrowth_o10,fa_quickratio_o0.5,fa_roa_o5,fa_roe_o5,fa_roi_o5,sh_instown_o30";

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

function parseFloatLoose(value) {
  if (!value) return 0;
  const v = String(value).replace(/[%,$,+]/g, "").trim();
  if (v === "-" || v === "N/A") return 0;
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
}

function scoreRow(row) {
  const peg = parseNumber(row.peg);
  const roe = parseNumber(row.roe);
  const roa = parseNumber(row.roa);
  const roi = parseNumber(row.roi);
  const epsThisY = parseNumber(row.epsThisY);
  const epsNextY = parseNumber(row.epsNextY);
  const epsPast5Y = parseNumber(row.epsPast5Y);
  const salesPast5Y = parseNumber(row.salesPast5Y);

  let score = 0;

  if (peg > 0) {
    if (peg <= 1) score += 18;
    else if (peg <= 1.5) score += 14;
    else if (peg <= 2) score += 10;
  }

  if (roe >= 25) score += 15;
  else if (roe >= 15) score += 10;
  else if (roe >= 10) score += 6;

  if (roa >= 15) score += 12;
  else if (roa >= 10) score += 8;
  else if (roa >= 5) score += 4;

  if (roi >= 15) score += 12;
  else if (roi >= 10) score += 8;
  else if (roi >= 5) score += 4;

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

function trendFromChange(change) {
  const n = parseFloatLoose(change);
  if (n > 0.15) return "up";
  if (n < -0.15) return "down";
  return "flat";
}

async function fetchPage(filters, page = 1) {
  const start = (page - 1) * 20 + 1;
  const finvizUrl =
    `https://finviz.com/screener.ashx?v=150&f=${filters}&o=-marketcap&c=${COLUMNS}&r=${start}`;

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
    if (!/^[A-Z.\-]{1,8}$/.test(ticker)) return;

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
      roi: clean($(cells[16]).text()),
      price: clean($(cells[17]).text()),
      change: clean($(cells[18]).text()),
    });
  });

  return rows;
}

async function fetchAll(filters, maxPages) {
  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    const rows = await fetchPage(filters, page);
    if (!rows.length) break;
    all.push(...rows);
    if (rows.length < 20) break;
  }
  return all;
}

function mapRows(rows, scannerType) {
  const ts = new Date().toISOString();

  return rows.map((row) => ({
    ticker: row.ticker,
    company: row.company,
    company_name: row.company,
    sector: row.sector,
    industry: row.industry,
    country: row.country,
    market_cap: row.marketCap,
    pe: parseFloatLoose(row.pe),
    forward_pe: parseFloatLoose(row.fwdPe),
    peg: parseFloatLoose(row.peg),
    eps_this_y: parseFloatLoose(row.epsThisY),
    eps_next_y: parseFloatLoose(row.epsNextY),
    eps_next_5y: parseFloatLoose(row.epsPast5Y),
    sales_qoq: parseFloatLoose(row.salesPast5Y),
    eps_qoq: 0,
    roe: parseFloatLoose(row.roe),
    roa: parseFloatLoose(row.roa),
    roi: parseFloatLoose(row.roi),
    debt_eq: 0,
    current_ratio: 0,
    quick_ratio: 0,
    profit_margin: 0,
    oper_margin: 0,
    inst_own: 0,
    insider_own: 0,
    target_price: 0,
    price: parseFloatLoose(row.price),
    change_percent: parseFloatLoose(row.change),
    score: scoreRow(row),
    trend: trendFromChange(row.change),
    scanner_type: scannerType,
    source: "finviz",
    source_list: ["finviz"],
    scanner_run_at: ts,
    fetched_at: ts,
    updated_at: ts,
  }));
}

async function run() {
  console.log("Scanner sync started");

  const coreRaw = await fetchAll(CORE_FILTERS, 4);
  const altRaw = await fetchAll(ALT_FILTERS, 8);

  const coreRows = mapRows(coreRaw, "core");
  const altRows = mapRows(altRaw, "alternative");

  // Deduplicate: remove from alt if already in core
  const coreTickers = new Set(coreRows.map((r) => r.ticker));
  const dedupedAlt = altRows.filter((r) => !coreTickers.has(r.ticker));
  console.log(`Deduped alternative: ${altRows.length} → ${dedupedAlt.length}`);

  const combined = [...coreRows, ...dedupedAlt];

  const { error: deleteError } = await supabase
    .from("scanner_results")
    .delete()
    .not("id", "is", null);

  if (deleteError) throw deleteError;

  const chunkSize = 200;
  for (let i = 0; i < combined.length; i += chunkSize) {
    const chunk = combined.slice(i, i + chunkSize);
    const { error } = await supabase.from("scanner_results").insert(chunk);
    if (error) throw error;
  }

  console.log(`Inserted rows: ${combined.length}`);
  console.log(`Core rows: ${coreRows.length}`);
  console.log(`Alternative rows: ${dedupedAlt.length}`);

  // Fetch live prices from Yahoo Finance to fix Finviz parsing issues
  console.log("Fetching live prices from Yahoo Finance...");
  const { data: allStocks } = await supabase
    .from("scanner_results")
    .select("ticker");

  let priceUpdated = 0;
  for (let i = 0; i < (allStocks || []).length; i += 10) {
    const batch = (allStocks || []).slice(i, i + 10);
    await Promise.all(
      batch.map(async (s) => {
        try {
          const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${s.ticker}?interval=1d&range=1d`,
            { headers: { "User-Agent": "Mozilla/5.0" } }
          );
          const json = await res.json();
          const meta = json?.chart?.result?.[0]?.meta;
          if (!meta?.regularMarketPrice) return;
          const prev = meta.chartPreviousClose || meta.previousClose || 0;
          const changePct = prev > 0
            ? ((meta.regularMarketPrice - prev) / prev) * 100
            : 0;
          await supabase
            .from("scanner_results")
            .update({
              price: meta.regularMarketPrice,
              change_percent: Math.round(changePct * 100) / 100,
              high_52w: meta.fiftyTwoWeekHigh || null,
              low_52w: meta.fiftyTwoWeekLow || null,
            })
            .eq("ticker", s.ticker);
          priceUpdated++;
        } catch {
          // skip
        }
      })
    );
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log(`Updated live prices for ${priceUpdated} stocks`);

  // Recalculate Aurora Readiness from peak data
  console.log("Calculating Aurora Readiness...");
  const cutoff = new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000)
    .toISOString().split("T")[0];

  const { data: peaks } = await supabase
    .from("stock_peaks")
    .select("ticker, peak_date, peak_price, rise_percent")
    .gte("rise_percent", 20)
    .gte("peak_date", cutoff);

  const byTicker = {};
  for (const p of peaks || []) {
    if (!byTicker[p.ticker]) byTicker[p.ticker] = [];
    byTicker[p.ticker].push(p);
  }

  const { data: updatedStocks } = await supabase
    .from("scanner_results")
    .select("ticker, price");

  let green = 0, amber = 0, red = 0, grey = 0;

  for (const stock of updatedStocks || []) {
    const tickerPeaks = byTicker[stock.ticker] || [];
    const risesCount = tickerPeaks.length;
    const sorted = [...tickerPeaks].sort((a, b) =>
      new Date(b.peak_date) - new Date(a.peak_date));
    const latestHat = sorted[0]?.peak_price || null;
    const latestHatDate = sorted[0]?.peak_date || null;
    const currentPrice = parseFloat(stock.price || "0");
    const dropPct = latestHat && currentPrice > 0
      ? Math.round(((latestHat - currentPrice) / latestHat * 100) * 10) / 10
      : null;

    let readiness = "grey";
    if (risesCount >= 3 && dropPct !== null) {
      if (dropPct >= 20) { readiness = "green"; green++; }
      else if (dropPct >= 10) { readiness = "amber"; amber++; }
      else { readiness = "red"; red++; }
    } else { grey++; }

    await supabase.from("scanner_results").update({
      rises_count_18m: risesCount,
      most_recent_hat_price: latestHat,
      most_recent_hat_date: latestHatDate,
      drop_from_hat_pct: dropPct,
      readiness,
    }).eq("ticker", stock.ticker);
  }

  console.log(`Readiness: green=${green} amber=${amber} red=${red} grey=${grey}`);

  // ── Update watchlist in_scanner status ──
  console.log("[Scanner] Updating watchlist scanner status...");

  const { data: scannerStocks } = await supabase
    .from("scanner_results")
    .select("ticker");

  const scannerTickers = new Set(
    (scannerStocks || []).map((s) => s.ticker)
  );

  for (const tbl of ["watchlist_live", "watchlist_demo"]) {
    const { data: wl } = await supabase
      .from(tbl)
      .select("symbol, user_id, is_invested");

    let offCount = 0;
    for (const item of wl || []) {
      const inScanner = scannerTickers.has(item.symbol);
      await supabase
        .from(tbl)
        .update({ in_scanner: inScanner })
        .eq("user_id", item.user_id)
        .eq("symbol", item.symbol);
      if (!inScanner && !item.is_invested) offCount++;
    }
    console.log(`[Scanner] ${tbl}: ${offCount} non-invested stocks off list`);
  }

  console.log("Scanner sync complete");
}

run().catch((err) => {
  console.error("Scanner sync failed:");
  console.error(err);
  process.exit(1);
});
