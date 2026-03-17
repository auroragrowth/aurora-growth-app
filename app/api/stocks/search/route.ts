import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json({
        ok: true,
        rows: [],
      });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("scanner_results")
      .select(
        "ticker, company, sector, industry, market_cap, price, aurora_score, updated_at"
      )
      .or(`ticker.ilike.%${q}%,company.ilike.%${q}%`)
      .order("aurora_score", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          rows: [],
        },
        { status: 500 }
      );
    }

    const rows = (data || []).map((row: any) => ({
      ...row,
      change_pct: 0,
    }));

    return NextResponse.json({
      ok: true,
      rows,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Search failed",
        rows: [],
      },
      { status: 500 }
    );
  }
}
