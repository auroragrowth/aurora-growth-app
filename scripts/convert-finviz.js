// scripts/convert-finviz.js
// Usage: node scripts/convert-finviz.js path/to/finviz-export.csv

const fs = require("fs");
const path = require("path");
const parse = require("csv-parse/sync"); // <<-- correct subpath

if (process.argv.length < 3) {
  console.error("Usage: node scripts/convert-finviz.js <csv-file>");
  process.exit(1);
}

const csvPath = process.argv[2];

if (!fs.existsSync(csvPath)) {
  console.error(`File not found: ${csvPath}`);
  process.exit(1);
}

const csvRaw = fs.readFileSync(csvPath, "utf8");

// parse CSV rows
const records = parse(csvRaw, {
  columns: true,
  skip_empty_lines: true,
});

// Helper parsers
function parseNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(/[$,%+]/g, "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parsePercent(value) {
  if (value == null || value === "") return null;
  const text = String(value).trim().replace("%", "");
  const n = Number(text.replace(/[+,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseMarketCap(value) {
  if (value == null || value === "") return null;
  const v = String(value).trim().toUpperCase();
  const match = v.match(/^([+-]?\d+(?:\.\d+)?)([KMBT])?$/);
  if (!match) {
    const raw = Number(v.replace(/[$,%+]/g, "").replace(/,/g, ""));
    return Number.isFinite(raw) ? raw : null;
  }
  const num = Number(match[1]);
  const suffix = match[2];
  switch (suffix) {
    case "K":
      return num * 1e3;
    case "M":
      return num * 1e6;
    case "B":
      return num * 1e9;
    case "T":
      return num * 1e12;
    default:
      return num;
  }
}

// Map CSV rows to the app’s FinvizRow shape
const output = records.map((r) => ({
  ticker: r.Ticker || r.Symbol || "",
  company: r.Company || "",
  sector: r.Sector || "",
  industry: r.Industry || "",
  country: r.Country || "",
  marketCap: parseMarketCap(r["Market Cap"] || r.MarketCap),
  marketCapText: r["Market Cap"] || r.MarketCap || "",
  pe: parseNumber(r["P/E"] || r.PE),
  price: parseNumber(r.Price),
  changePct: parsePercent(r.Change),
  changeText: r.Change || "",
  volume: parseNumber(r.Volume),
  instOwn: parsePercent(r["Inst Own"] || r.InstOwn),
  roe: parsePercent(r.ROE),
  roa: parsePercent(r.ROA),
  roi: parsePercent(r.ROI),
  epsThisY: parsePercent(
    r["EPS this Y"] || r["EPS this Y%"] || r.EPSThisY
  ),
  epsNextY: parsePercent(
    r["EPS next Y"] || r["EPS next Y%"] || r.EPSNextY
  ),
  salesQoq: parsePercent(r["Sales Q/Q"] || r.SalesQoq),
  perf52w: parsePercent(
    r["Perf Year"] || r["Perf 52W"] || r.PerfYear
  ),
}));

// Save to cache file
const cachePath = path.join(process.cwd(), "data", "finviz-cache.json");
fs.writeFileSync(cachePath, JSON.stringify(output, null, 2), "utf8");

console.log(`Wrote ${output.length} rows to ${cachePath}`);
