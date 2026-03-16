import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // Pass through any screener params if you want:
    // /api/aurora-core?f=...&o=... etc
    const screenerUrl = new URL(url.origin + "/api/finviz/screener");
    url.searchParams.forEach((v, k) => screenerUrl.searchParams.set(k, v));

    const r = await fetch(screenerUrl.toString(), { cache: "no-store" });
    const data = await r.json();

    if (!data?.ok) {
      return NextResponse.json(
        {
          ok: false,
          engine: "Aurora Core",
          error: data?.error || "Screener error",
          hint: data?.hint || "Fix screener first",
          count: 0,
          results: [],
        },
        { status: 200 }
      );
    }

    // Your dashboard can evolve this into full parsed rows later.
    // For now, return tickers list as results.
    const results = (data.tickers || []).map((t: string) => ({
      ticker: t,
      source: "finviz",
    }));

    return NextResponse.json(
      {
        ok: true,
        engine: "Aurora Core",
        count: results.length,
        results,
        meta: {
          source: data.source,
          targetUrl: data.targetUrl,
          fetchedAt: data.fetchedAt,
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, engine: "Aurora Core", error: String(e?.message || e), count: 0, results: [] },
      { status: 200 }
    );
  }
}
