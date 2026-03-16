// scripts/seed-full-cache.js
// Run: node scripts/seed-full-cache.js
// This script calls your existing fetcher to scrape the full screener
// and writes the results to data/finviz-cache.json

const fs = require("fs");
const path = require("path");

// Adjust the import path if needed; this assumes your fetcher exports from lib/finviz/fetchers
const { fetchFinvizScreener } = require("../lib/finviz/fetchers");

async function main() {
  try {
    console.log("Starting full screener fetch...");

    // This should try to fetch multiple pages according to your fetcher logic
    const result = await fetchFinvizScreener();

    if (!result || !Array.isArray(result.rows)) {
      throw new Error("Fetcher returned invalid result");
    }

    const rows = result.rows;
    const cachePath = path.join(process.cwd(), "data", "finviz-cache.json");

    fs.writeFileSync(cachePath, JSON.stringify(rows, null, 2), "utf8");

    console.log(`Wrote ${rows.length} rows to ${cachePath} (source: ${result.source})`);
  } catch (err) {
    console.error("Error seeding full cache:", err);
    process.exit(1);
  }
}

main();
