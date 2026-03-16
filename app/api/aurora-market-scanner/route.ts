import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scanner = searchParams.get("scanner") || "core";

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json(
      { error: "Missing Supabase environment variables" },
      { status: 500 }
    );
  }

  let url =
    `${SUPABASE_URL}/rest/v1/scanner_results` +
    `?select=ticker,company,company_name,sector,industry,market_cap,price,change_percent,score,trend,scanner_type,updated_at` +
    `&order=score.desc`;

  if (scanner === "core") {
    url += `&scanner_type=eq.core`;
  } else if (scanner === "alternative") {
    url += `&scanner_type=eq.alternative`;
  }

  url += `&limit=200`;

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `Failed to load scanner results: ${text}` },
      { status: 500 }
    );
  }

  const raw = await res.json();

  const rows = (raw || []).map((row: any) => ({
    ticker: row.ticker,
    company_name: row.company_name || row.company || null,
    market_cap: row.market_cap ?? null,
    sector: row.sector ?? null,
    industry: row.industry ?? null,
    price: row.price ?? null,
    change_percent: row.change_percent ?? null,
    score: row.score ?? null,
    trend: row.trend ?? "flat",
    scanner_type: row.scanner_type ?? "core",
    updated_at: row.updated_at ?? null,
  }));

  return NextResponse.json({ rows });
}
