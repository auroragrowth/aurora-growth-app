import { NextResponse } from "next/server";

type VolatilityRow = {
  symbol: string;
  company_name?: string;
  sector?: string;
  price: number;
  change_pct: number;
  volatility: number;
  atr?: number;
  score?: number;
  trend?: "Bullish" | "Bearish" | "Neutral";
  sparkline?: number[];
};

function trendFromChange(change: number): "Bullish" | "Bearish" | "Neutral" {
  if (change > 1) return "Bullish";
  if (change < -1) return "Bearish";
  return "Neutral";
}

function scoreFromRow(row: Pick<VolatilityRow, "change_pct" | "volatility">) {
  const move = Math.min(Math.abs(row.change_pct) * 10, 40);
  const vol = Math.min(row.volatility * 10, 60);
  return Math.round(move + vol);
}

function makeSparkline(seed: number, length = 16) {
  const values: number[] = [];
  let current = seed;

  for (let i = 0; i < length; i++) {
    const wave = Math.sin((i + seed) * 0.9) * 1.8;
    const drift = Math.cos((i + seed) * 0.35) * 0.9;
    current = Math.max(8, current + wave + drift);
    values.push(Number(current.toFixed(2)));
  }

  return values;
}

export async function GET() {
  const baseRows: VolatilityRow[] = [
    { symbol: "COIN", company_name: "Coinbase", sector: "Financials", price: 242.90, change_pct: 5.18, volatility: 7.2 },
    { symbol: "TOST", company_name: "Toast", sector: "Technology", price: 24.18, change_pct: 4.26, volatility: 6.4 },
    { symbol: "TSLA", company_name: "Tesla", sector: "Consumer Discretionary", price: 211.35, change_pct: -3.16, volatility: 6.1 },
    { symbol: "SPOT", company_name: "Spotify", sector: "Communication Services", price: 309.22, change_pct: 3.42, volatility: 5.3 },
    { symbol: "NVDA", company_name: "NVIDIA", sector: "Technology", price: 886.42, change_pct: 2.84, volatility: 4.8 },
    { symbol: "SHOP", company_name: "Shopify", sector: "Technology", price: 81.54, change_pct: -2.21, volatility: 4.7 },
    { symbol: "AMD", company_name: "Advanced Micro Devices", sector: "Technology", price: 176.14, change_pct: 1.94, volatility: 4.2 },
    { symbol: "PLTR", company_name: "Palantir", sector: "Technology", price: 28.04, change_pct: 2.12, volatility: 4.1 },
    { symbol: "META", company_name: "Meta Platforms", sector: "Communication Services", price: 498.32, change_pct: 1.62, volatility: 3.2 },
    { symbol: "AMZN", company_name: "Amazon", sector: "Consumer Discretionary", price: 179.84, change_pct: 1.31, volatility: 2.8 },
    { symbol: "ISRG", company_name: "Intuitive Surgical", sector: "Healthcare", price: 411.28, change_pct: -0.74, volatility: 2.3 },
    { symbol: "MSFT", company_name: "Microsoft", sector: "Technology", price: 412.67, change_pct: 0.84, volatility: 1.9 },
  ];

  const rows = baseRows
    .map((row, index) => ({
      ...row,
      atr: Number((row.price * (row.volatility / 100)).toFixed(2)),
      score: scoreFromRow(row),
      trend: trendFromChange(row.change_pct),
      sparkline: makeSparkline(20 + index * 3 + row.volatility),
    }))
    .sort((a, b) => b.volatility - a.volatility);

  const fearGauge = Math.min(
    90,
    Math.max(
      12,
      Math.round(rows.reduce((sum, row) => sum + row.volatility, 0) / rows.length * 12)
    )
  );

  return NextResponse.json({
    ok: true,
    source: "Aurora Volatility Engine",
    updatedAt: new Date().toISOString(),
    fearGauge,
    rows,
  });
}
