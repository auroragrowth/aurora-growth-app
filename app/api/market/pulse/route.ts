import { NextResponse } from "next/server";

/*
  Aurora Market Pulse API
  Fetches VIX, S&P 500, FTSE 100, NASDAQ from Yahoo Finance
  Endpoint: /api/market/pulse
*/

const SYMBOLS = [
  { key: "vix", symbol: "^VIX", label: "VIX" },
  { key: "sp500", symbol: "^GSPC", label: "S&P 500" },
  { key: "ftse", symbol: "^FTSE", label: "FTSE 100" },
  { key: "nasdaq", symbol: "^IXIC", label: "NASDAQ" },
];

function getMarketStatus(): string {
  const now = new Date();
  const et = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const day = et.getDay();
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const time = hours * 60 + minutes;

  if (day === 0 || day === 6) return "CLOSED";
  if (time >= 570 && time < 630) return "PRE-MARKET";
  if (time >= 630 && time < 1200) return "OPEN";
  return "CLOSED";
}

export async function GET() {
  try {
    const symbolString = SYMBOLS.map((s) => s.symbol).join(",");
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolString)}`;

    const response = await fetch(url, {
      headers: { "User-Agent": "Aurora-Growth-App" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance returned ${response.status}`);
    }

    const data = await response.json();
    const results = data?.quoteResponse?.result ?? [];

    const indices: Record<string, any> = {};

    for (const sym of SYMBOLS) {
      const match = results.find(
        (r: any) => r.symbol === sym.symbol
      );

      indices[sym.key] = {
        label: sym.label,
        price: match?.regularMarketPrice ?? null,
        change: match?.regularMarketChange ?? null,
        changePercent: match?.regularMarketChangePercent ?? null,
      };
    }

    // Determine sector of the day from top sector ETFs
    const sectorETFs = [
      { symbol: "XLK", name: "Technology" },
      { symbol: "XLF", name: "Financials" },
      { symbol: "XLV", name: "Healthcare" },
      { symbol: "XLE", name: "Energy" },
      { symbol: "XLY", name: "Consumer Disc." },
      { symbol: "XLP", name: "Consumer Staples" },
      { symbol: "XLI", name: "Industrials" },
      { symbol: "XLU", name: "Utilities" },
      { symbol: "XLRE", name: "Real Estate" },
      { symbol: "XLB", name: "Materials" },
      { symbol: "XLC", name: "Communication" },
    ];

    let sectorOfDay = { name: "Technology", change: 0 };

    try {
      const sectorSymbols = sectorETFs.map((s) => s.symbol).join(",");
      const sectorRes = await fetch(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(sectorSymbols)}`,
        {
          headers: { "User-Agent": "Aurora-Growth-App" },
          cache: "no-store",
        }
      );

      if (sectorRes.ok) {
        const sectorData = await sectorRes.json();
        const sectorResults = sectorData?.quoteResponse?.result ?? [];

        let bestChange = -Infinity;
        for (const etf of sectorETFs) {
          const match = sectorResults.find(
            (r: any) => r.symbol === etf.symbol
          );
          const pct = match?.regularMarketChangePercent ?? -Infinity;
          if (pct > bestChange) {
            bestChange = pct;
            sectorOfDay = { name: etf.name, change: pct };
          }
        }
      }
    } catch {
      // keep default
    }

    return NextResponse.json({
      indices,
      sectorOfDay,
      marketStatus: getMarketStatus(),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Market pulse API error:", error);
    return NextResponse.json(
      {
        indices: {},
        sectorOfDay: { name: "—", change: 0 },
        marketStatus: getMarketStatus(),
        timestamp: Date.now(),
        error: "Unable to fetch market data",
      },
      { status: 500 }
    );
  }
}
