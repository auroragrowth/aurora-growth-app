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
    const universe = (req.nextUrl.searchParams.get("universe") || "core")
      .trim()
      .toLowerCase();

    const supabase = getSupabase();

    let query = supabase
      .from("scanner_results")
      .select("*")
      .order("score", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false, nullsFirst: false });

    if (universe === "core") {
      query = query.eq("scanner_type", "core");
    } else if (universe === "alternative" || universe === "alt") {
      query = query.eq("scanner_type", "alternative");
    } else if (universe === "active") {
      query = query.limit(100);
    } else if (universe === "top10") {
      query = query.limit(10);
    } else {
      query = query.limit(100);
    }

    if (universe !== "top10" && universe !== "active") {
      query = query.limit(200);
    }

    const { data, error } = await query;

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

    return NextResponse.json({
      ok: true,
      rows: data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Scanner load failed",
        rows: [],
      },
      { status: 500 }
    );
  }
}
